<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Tests\Security;

use PHPUnit\Framework\TestCase;
use Sanctum\Canvas\Php\Http\AuthContext;
use Sanctum\Canvas\Php\Http\Csrf;
use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Tools\ToolDispatcher;
use Sanctum\Canvas\Php\Tools\ToolRegistry;

/**
 * Prove model text cannot select PHP callables, URLs, SQL, shell, files, or MCP.
 */
final class ToolSecurityTest extends TestCase
{
    private ToolDispatcher $dispatcher;
    private AuthContext $auth;

    protected function setUp(): void
    {
        $this->dispatcher = new ToolDispatcher(ToolRegistry::labDefaults(), csrf: new Csrf('sec'));
        $this->auth = new AuthContext('o', 'p');
    }

    /** @return \Generator<string, array{0: string}> */
    public static function hostileNames(): \Generator
    {
        $names = [
            'system',
            'exec',
            'shell_exec',
            'passthru',
            'proc_open',
            'eval',
            'assert',
            'include',
            'require_once',
            'PDO::query',
            'mysqli_query',
            'sqlite3_query',
            'http://evil.test/x',
            'https://evil.test',
            'mcp://server/tool',
            'file_get_contents',
            'fopen',
            'unlink',
            '../etc/passwd',
            'foo;rm',
            'foo|bar',
            '`id`',
            '$(id)',
            'call_user_func',
            'ReflectionFunction',
            'curl_exec',
            'sql_drop_table',
            'select_star',
            'drop_users',
            'php:function',
            'Foo::bar',
            'obj->method',
            'unknown_tool_xyz',
            'note_set; DROP TABLE programs;--',
        ];
        foreach ($names as $name) {
            yield $name => [$name];
        }
    }

    /**
     * @dataProvider hostileNames
     */
    public function testHostileToolNamesRejectedBeforeHandler(string $name): void
    {
        try {
            $this->dispatcher->dispatch($this->auth, [
                'tool' => $name,
                'arguments' => [],
            ]);
            $this->fail("Expected rejection for tool name: {$name}");
        } catch (HttpException $e) {
            $this->assertContains(
                $e->errorCode,
                ['unknown_tool', 'invalid_tool_name', 'hostile_tool_name'],
                "Unexpected code {$e->errorCode} for {$name}"
            );
            $this->assertTrue(in_array($e->status, [400, 404], true));
        }
    }

    public function testRegistryResolveNeverReturnsCallableFromName(): void
    {
        $reg = ToolRegistry::labDefaults();
        foreach (self::hostileNames() as [$name]) {
            try {
                $reg->resolve($name);
                $this->assertTrue($reg->has($name), 'only registered tools may resolve');
            } catch (HttpException $e) {
                $this->assertTrue(true);
            }
        }
        $this->assertTrue($reg->has('echo_read'));
        $this->assertFalse($reg->has('system'));
    }

    public function testModelCannotPassHandlerOrUrlInArgumentsToEscalate(): void
    {
        // Even if args contain callable-looking strings, only schema fields apply
        $res = $this->dispatcher->dispatch($this->auth, [
            'tool' => 'echo_read',
            'arguments' => [
                'message' => 'phpinfo(); system("id"); https://evil.test',
            ],
        ]);
        $this->assertTrue($res['ok']);
        $this->assertSame(
            'phpinfo(); system("id"); https://evil.test',
            $res['data']['echo']
        );
        // Handler did not execute the string as code — echo only
        $this->assertArrayNotHasKey('uid', $res['data']);
    }
}
