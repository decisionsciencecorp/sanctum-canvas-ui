<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Tests\Tools;

use PHPUnit\Framework\TestCase;
use Sanctum\Canvas\Php\Http\AuthContext;
use Sanctum\Canvas\Php\Http\Csrf;
use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Tools\JsonSchemaValidator;
use Sanctum\Canvas\Php\Tools\ToolDefinition;
use Sanctum\Canvas\Php\Tools\ToolDispatcher;
use Sanctum\Canvas\Php\Tools\ToolRegistry;

final class ToolDispatcherTest extends TestCase
{
    private ToolDispatcher $dispatcher;
    private Csrf $csrf;
    private AuthContext $auth;

    protected function setUp(): void
    {
        $this->csrf = new Csrf('test-secret');
        $this->dispatcher = new ToolDispatcher(ToolRegistry::labDefaults(), csrf: $this->csrf);
        $this->auth = new AuthContext('owner-a', 'project-a');
    }

    public function testReadToolWorksWithoutCsrf(): void
    {
        $res = $this->dispatcher->dispatch($this->auth, [
            'tool' => 'echo_read',
            'arguments' => ['message' => 'hello'],
        ]);
        $this->assertTrue($res['ok']);
        $this->assertSame('hello', $res['data']['echo']);
    }

    public function testWriteRequiresCsrfAndIdempotency(): void
    {
        $token = $this->csrf->mint($this->auth->scopeKey());
        $this->expectException(HttpException::class);
        $this->dispatcher->dispatch($this->auth, [
            'tool' => 'note_set',
            'arguments' => ['key' => 'k1', 'value' => 'v1'],
        ], ['x-csrf-token' => $token]);
    }

    public function testWriteSucceedsWithCsrfAndIdempotency(): void
    {
        $token = $this->csrf->mint($this->auth->scopeKey());
        $res = $this->dispatcher->dispatch($this->auth, [
            'tool' => 'note_set',
            'arguments' => ['key' => 'k1', 'value' => 'v1'],
            'idempotencyKey' => 'idem-1',
        ], ['x-csrf-token' => $token]);
        $this->assertTrue($res['ok']);

        $again = $this->dispatcher->dispatch($this->auth, [
            'tool' => 'note_set',
            'arguments' => ['key' => 'k1', 'value' => 'CHANGED'],
            'idempotencyKey' => 'idem-1',
        ], ['x-csrf-token' => $token]);
        $this->assertTrue($again['ok']);

        $got = $this->dispatcher->dispatch($this->auth, [
            'tool' => 'note_get',
            'arguments' => ['key' => 'k1'],
        ]);
        // Idempotent replay returns first result; underlying may or may not update —
        // cache returns first response without re-executing.
        $this->assertSame('v1', $got['data']['value']);
    }

    public function testDestructiveRequiresConfirmation(): void
    {
        $token = $this->csrf->mint($this->auth->scopeKey());
        $this->dispatcher->dispatch($this->auth, [
            'tool' => 'note_set',
            'arguments' => ['key' => 'k2', 'value' => 'x'],
            'idempotencyKey' => 'idem-2',
        ], ['x-csrf-token' => $token]);

        try {
            $this->dispatcher->dispatch($this->auth, [
                'tool' => 'note_delete',
                'arguments' => ['key' => 'k2'],
                'idempotencyKey' => 'idem-3',
            ], ['x-csrf-token' => $token]);
            $this->fail('expected confirmation_required');
        } catch (HttpException $e) {
            $this->assertSame('confirmation_required', $e->errorCode);
        }

        $res = $this->dispatcher->dispatch($this->auth, [
            'tool' => 'note_delete',
            'arguments' => ['key' => 'k2'],
            'idempotencyKey' => 'idem-4',
            'confirmed' => true,
        ], ['x-csrf-token' => $token]);
        $this->assertTrue($res['ok']);
    }

    public function testSchemaValidationRejectsExtraProps(): void
    {
        $this->expectException(HttpException::class);
        $this->dispatcher->dispatch($this->auth, [
            'tool' => 'echo_read',
            'arguments' => ['message' => 'hi', 'extra' => true],
        ]);
    }

    public function testJsonSchemaValidatorBasics(): void
    {
        $v = new JsonSchemaValidator();
        $schema = [
            'type' => 'object',
            'properties' => ['n' => ['type' => 'integer', 'minimum' => 1]],
            'required' => ['n'],
            'additionalProperties' => false,
        ];
        $this->assertSame([], $v->validate($schema, ['n' => 2]));
        $this->assertNotEmpty($v->validate($schema, ['n' => 0]));
        $this->assertNotEmpty($v->validate($schema, []));
    }

    public function testAuditIsRedacted(): void
    {
        $this->dispatcher->dispatch($this->auth, [
            'tool' => 'echo_read',
            'arguments' => ['message' => 'secret-payload-should-not-appear'],
        ]);
        $recs = $this->dispatcher->audit()->all();
        $this->assertNotEmpty($recs);
        $json = json_encode($recs);
        $this->assertStringNotContainsString('secret-payload-should-not-appear', (string) $json);
    }

    public function testHandlerMissingOkKeyIsRejected(): void
    {
        $reg = new ToolRegistry([
            new ToolDefinition(
                'bad_result',
                ToolDefinition::CLASS_READ,
                ['type' => 'object', 'additionalProperties' => false],
                static fn (): array => ['data' => ['x' => 1]],
            ),
        ]);
        $dispatcher = new ToolDispatcher($reg, csrf: $this->csrf);
        try {
            $dispatcher->dispatch($this->auth, ['tool' => 'bad_result', 'arguments' => []]);
            $this->fail('expected handler_invalid_result');
        } catch (HttpException $e) {
            $this->assertSame('handler_invalid_result', $e->errorCode);
        }
    }

    public function testHandlerErrorStringIsRedactedOntoResponse(): void
    {
        $reg = new ToolRegistry([
            new ToolDefinition(
                'soft_fail',
                ToolDefinition::CLASS_READ,
                ['type' => 'object', 'additionalProperties' => false],
                static fn (): array => ['ok' => false, 'error' => 'token=sk-secret-should-redact'],
            ),
        ]);
        $dispatcher = new ToolDispatcher($reg, csrf: $this->csrf);
        $res = $dispatcher->dispatch($this->auth, ['tool' => 'soft_fail', 'arguments' => []]);
        $this->assertFalse($res['ok']);
        $this->assertArrayHasKey('error', $res);
        $this->assertIsString($res['error']);
        $this->assertStringNotContainsString('sk-secret-should-redact', $res['error']);
    }

    public function testEmptyAndOversizedToolNamesRejected(): void
    {
        try {
            $this->dispatcher->dispatch($this->auth, ['tool' => '', 'arguments' => []]);
            $this->fail('expected invalid_tool_name');
        } catch (HttpException $e) {
            $this->assertSame('invalid_tool_name', $e->errorCode);
        }

        try {
            $this->dispatcher->dispatch($this->auth, [
                'tool' => str_repeat('a', 65),
                'arguments' => [],
            ]);
            $this->fail('expected invalid_tool_name');
        } catch (HttpException $e) {
            $this->assertSame('invalid_tool_name', $e->errorCode);
        }
    }
}
