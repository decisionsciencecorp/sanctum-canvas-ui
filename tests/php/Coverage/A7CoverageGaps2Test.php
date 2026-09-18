<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Tests\Coverage;

use PHPUnit\Framework\TestCase;
use Sanctum\Canvas\Php\Http\AuthContext;
use Sanctum\Canvas\Php\Http\Csrf;
use Sanctum\Canvas\Php\Http\ErrorRedactor;
use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Http\Request;
use Sanctum\Canvas\Php\Inference\ChatRequest;
use Sanctum\Canvas\Php\Inference\ChatService;
use Sanctum\Canvas\Php\Inference\FakeProvider;
use Sanctum\Canvas\Php\Inference\LibraryPromptInjector;
use Sanctum\Canvas\Php\Inference\StreamEvent;
use Sanctum\Canvas\Php\Inference\VeniceProvider;
use Sanctum\Canvas\Php\Storage\SqliteProgramStore;
use Sanctum\Canvas\Php\Tools\ToolDefinition;
use Sanctum\Canvas\Php\Tools\ToolDispatcher;
use Sanctum\Canvas\Php\Tools\ToolRegistry;

final class A7CoverageGaps2Test extends TestCase
{
    private string $root;
    private string $tmp;

    protected function setUp(): void
    {
        $this->root = dirname(__DIR__, 3);
        $this->tmp = sys_get_temp_dir() . '/canvas-cov2-' . bin2hex(random_bytes(4));
        mkdir($this->tmp, 0700, true);
        putenv('CANVAS_LIBRARIES_PATH=' . $this->root . '/resources/libraries');
        $_ENV['CANVAS_LIBRARIES_PATH'] = $this->root . '/resources/libraries';
    }

    protected function tearDown(): void
    {
        foreach (glob($this->tmp . '/*') ?: [] as $f) {
            @unlink($f);
        }
        @rmdir($this->tmp);
    }

    public function testChatServiceHttpExceptionAndThrowablePaths(): void
    {
        $provider = new class implements \Sanctum\Canvas\Php\Inference\InferenceProvider {
            public function name(): string
            {
                return 'boom';
            }
            public function stream(ChatRequest $request): \Generator
            {
                throw new HttpException(502, 'provider_boom', 'Bearer sk-leaksecret999');
                yield StreamEvent::runStarted($request->runId); // @phpstan-ignore-line
            }
        };
        $svc = new ChatService($provider, LibraryPromptInjector::fromEnv());
        $codes = [];
        $msgs = [];
        foreach ($svc->boundedStream(new ChatRequest('r', [['role' => 'user', 'content' => 'x']], 'dashboard', '1')) as $ev) {
            if ($ev->type === StreamEvent::RUN_ERROR) {
                $codes[] = $ev->payload['error']['code'];
                $msgs[] = $ev->payload['error']['message'];
            }
        }
        $this->assertContains('provider_boom', $codes);
        $this->assertStringNotContainsString('sk-leak', implode('', $msgs));

        $provider2 = new class implements \Sanctum\Canvas\Php\Inference\InferenceProvider {
            public function name(): string
            {
                return 'throw';
            }
            public function stream(ChatRequest $request): \Generator
            {
                throw new \RuntimeException('raw');
                yield StreamEvent::runStarted($request->runId); // @phpstan-ignore-line
            }
        };
        $svc2 = ChatService::capsFromEnv($provider2, LibraryPromptInjector::fromEnv());
        $codes2 = [];
        foreach ($svc2->boundedStream(new ChatRequest('r2', [['role' => 'user', 'content' => 'x']], 'dashboard', '1')) as $ev) {
            if ($ev->type === StreamEvent::RUN_ERROR) {
                $codes2[] = $ev->payload['error']['code'];
            }
        }
        $this->assertContains('internal_error', $codes2);
    }

    public function testToolDispatcherHandlerFailuresAndHugeResult(): void
    {
        $reg = new ToolRegistry();
        $reg->register(new ToolDefinition(
            name: 'boom_read',
            classification: ToolDefinition::CLASS_READ,
            argumentSchema: ['type' => 'object', 'properties' => [], 'additionalProperties' => false],
            handler: static function (): array {
                throw new \RuntimeException('nope');
            },
        ));
        $reg->register(new ToolDefinition(
            name: 'huge_read',
            classification: ToolDefinition::CLASS_READ,
            argumentSchema: ['type' => 'object', 'properties' => [], 'additionalProperties' => false],
            handler: static function (): array {
                return ['ok' => true, 'data' => str_repeat('Z', 100)];
            },
            maxResultBytes: 10,
        ));
        $reg->register(new ToolDefinition(
            name: 'bad_shape',
            classification: ToolDefinition::CLASS_READ,
            argumentSchema: ['type' => 'object', 'properties' => [], 'additionalProperties' => false],
            handler: static fn (): string => 'nope',
        ));

        $d = new ToolDispatcher($reg);
        $auth = new AuthContext('o', 'p');
        try {
            $d->dispatch($auth, ['tool' => 'boom_read', 'arguments' => []]);
            $this->fail('handler');
        } catch (HttpException $e) {
            $this->assertSame('handler_error', $e->errorCode);
        }
        try {
            $d->dispatch($auth, ['tool' => 'huge_read', 'arguments' => []]);
            $this->fail('huge');
        } catch (HttpException $e) {
            $this->assertSame('result_too_large', $e->errorCode);
        }
        try {
            $d->dispatch($auth, ['tool' => 'bad_shape', 'arguments' => []]);
            $this->fail('shape');
        } catch (HttpException $e) {
            $this->assertSame('handler_invalid_result', $e->errorCode);
        }
        $this->assertNotEmpty($d->audit()->all());
    }

    public function testRequestRawBodyDefaultAndCookiesDefault(): void
    {
        // Exercise constructors that read globals carefully
        $req = new Request(['REQUEST_METHOD' => 'GET', 'QUERY_STRING' => '']);
        $this->assertNull($req->queryParam('missing', null));
        $this->assertSame('d', $req->queryParam('missing', 'd'));
        $this->assertSame([], $req->jsonBody());
    }

    public function testSqliteDeleteAndTrimAndVeniceFromEnvWithKey(): void
    {
        $store = new SqliteProgramStore($this->tmp . '/t.sqlite');
        $store->save('o', 'p', 'id1', ['source' => 'a', 'libraryId' => 'dashboard', 'libraryVersion' => '1']);
        for ($i = 0; $i < 55; $i++) {
            $store->patch('o', 'p', 'id1', ['source' => "s{$i}"]);
        }
        $revs = $store->listRevisions('o', 'p', 'id1');
        $this->assertLessThanOrEqual(50, count($revs));
        $this->assertTrue($store->delete('o', 'p', 'id1'));
        $this->assertNull($store->get('o', 'p', 'id1'));

        putenv('VENICE_API_KEY=test-key-for-from-env');
        $_ENV['VENICE_API_KEY'] = 'test-key-for-from-env';
        $v = VeniceProvider::fromEnv(static function (): \Generator {
            yield 'data: {"choices":[{"delta":{"content":"ok"}}]}';
        });
        $this->assertSame('venice', $v->name());
        putenv('VENICE_API_KEY');
        unset($_ENV['VENICE_API_KEY']);
    }

    public function testToolDefinitionNonCallableRejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        new ToolDefinition('x', 'read', [], 'not-callable');
    }

    public function testWriteWithoutCsrf(): void
    {
        $d = new ToolDispatcher(ToolRegistry::labDefaults(), csrf: new Csrf('z'));
        $this->expectException(HttpException::class);
        $d->dispatch(new AuthContext('o', 'p'), [
            'tool' => 'note_set',
            'arguments' => ['key' => 'k', 'value' => 'v'],
            'idempotencyKey' => 'i',
        ], []);
    }
}
