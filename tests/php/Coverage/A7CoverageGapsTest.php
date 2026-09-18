<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Tests\Coverage;

use PHPUnit\Framework\TestCase;
use Sanctum\Canvas\Php\Config\Env;
use Sanctum\Canvas\Php\Http\AuthContext;
use Sanctum\Canvas\Php\Http\Authenticator;
use Sanctum\Canvas\Php\Http\Csrf;
use Sanctum\Canvas\Php\Http\ErrorRedactor;
use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Http\JsonResponse;
use Sanctum\Canvas\Php\Http\RateLimiter;
use Sanctum\Canvas\Php\Http\Request;
use Sanctum\Canvas\Php\Inference\ChatRequest;
use Sanctum\Canvas\Php\Inference\ChatService;
use Sanctum\Canvas\Php\Inference\FakeProvider;
use Sanctum\Canvas\Php\Inference\FixtureProvider;
use Sanctum\Canvas\Php\Inference\LibraryPromptInjector;
use Sanctum\Canvas\Php\Inference\ProviderFactory;
use Sanctum\Canvas\Php\Inference\StreamEvent;
use Sanctum\Canvas\Php\Inference\StreamFormatter;
use Sanctum\Canvas\Php\Inference\VeniceProvider;
use Sanctum\Canvas\Php\Storage\FileProgramStore;
use Sanctum\Canvas\Php\Storage\ProgramController;
use Sanctum\Canvas\Php\Storage\ProgramLimits;
use Sanctum\Canvas\Php\Storage\SqliteProgramStore;
use Sanctum\Canvas\Php\Tools\JsonSchemaValidator;
use Sanctum\Canvas\Php\Tools\ToolDefinition;
use Sanctum\Canvas\Php\Tools\ToolDispatcher;
use Sanctum\Canvas\Php\Tools\ToolRegistry;

final class A7CoverageGapsTest extends TestCase
{
    private string $root;
    private string $tmp;

    protected function setUp(): void
    {
        $this->root = dirname(__DIR__, 3);
        $this->tmp = sys_get_temp_dir() . '/canvas-cov-' . bin2hex(random_bytes(4));
        mkdir($this->tmp, 0700, true);
        putenv('CANVAS_LIBRARIES_PATH=' . $this->root . '/resources/libraries');
        putenv('CANVAS_FIXTURES_PATH=' . $this->root . '/resources/fixtures');
        $_ENV['CANVAS_LIBRARIES_PATH'] = $this->root . '/resources/libraries';
        $_ENV['CANVAS_FIXTURES_PATH'] = $this->root . '/resources/fixtures';
    }

    protected function tearDown(): void
    {
        $this->rm($this->tmp);
    }

    private function rm(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        foreach (scandir($dir) ?: [] as $f) {
            if ($f === '.' || $f === '..') {
                continue;
            }
            $p = $dir . '/' . $f;
            is_dir($p) ? $this->rm($p) : @unlink($p);
        }
        @rmdir($dir);
    }

    public function testEnvHelpers(): void
    {
        putenv('CANVAS_TEST_INT=42');
        $_ENV['CANVAS_TEST_INT'] = '42';
        $this->assertSame(42, Env::int('CANVAS_TEST_INT', 0));
        $this->assertSame(7, Env::int('CANVAS_TEST_MISSING', 7));
        putenv('CANVAS_TEST_BOOL=true');
        $_ENV['CANVAS_TEST_BOOL'] = 'true';
        $this->assertTrue(Env::bool('CANVAS_TEST_BOOL'));
        $this->assertFalse(Env::bool('CANVAS_TEST_BOOL_MISSING'));
        $this->assertStringContainsString('venice.ai', Env::veniceBaseUrl());
        $this->assertNotSame('', Env::storageDriver());
        $this->assertNotSame('', Env::storagePath());
        $this->assertNotSame('', Env::librariesPath());
        $this->assertNotSame('', Env::fixturesPath());
    }

    public function testAuthenticatorFromJsonEnv(): void
    {
        putenv('CANVAS_AUTH_TOKENS={"abc":{"ownerId":"ow","projectId":"pr"}}');
        $_ENV['CANVAS_AUTH_TOKENS'] = '{"abc":{"ownerId":"ow","projectId":"pr"}}';
        $tokens = Authenticator::loadFromEnv();
        $this->assertSame('ow', $tokens['abc']['ownerId']);
        putenv('CANVAS_AUTH_TOKENS');
        unset($_ENV['CANVAS_AUTH_TOKENS']);
        putenv('CANVAS_LAB_TOKEN=labtok');
        $_ENV['CANVAS_LAB_TOKEN'] = 'labtok';
        $tokens2 = Authenticator::loadFromEnv();
        $this->assertArrayHasKey('labtok', $tokens2);
        putenv('CANVAS_LAB_TOKEN');
        unset($_ENV['CANVAS_LAB_TOKEN']);
    }

    public function testCsrfRequireValidAndErrorRedactorPublic(): void
    {
        $csrf = new Csrf('s');
        $tok = $csrf->mint('a:b');
        $csrf->requireValid('a:b', ['x-csrf-token' => $tok]);
        try {
            $csrf->requireValid('a:b', []);
            $this->fail('expected csrf');
        } catch (HttpException $e) {
            $this->assertSame('csrf_failed', $e->errorCode);
        }
        $r = new ErrorRedactor();
        $pub = $r->publicError('x', 'Bearer sk-abcdefghijklmnop', 400);
        $this->assertSame('x', $pub['error']['code']);
        $this->assertStringNotContainsString('sk-abc', $pub['error']['message']);
        $long = $r->redact(str_repeat('a', 600));
        $this->assertLessThanOrEqual(500, strlen($long));
    }

    public function testRateLimiterFileBackendAndRequestExtras(): void
    {
        $dir = $this->tmp . '/rate';
        $rl = new RateLimiter($dir, 1, 60);
        $rl->hit('file-key');
        try {
            $rl->hit('file-key');
            $this->fail('rate');
        } catch (HttpException $e) {
            $this->assertSame(429, $e->status);
        }

        $req = new Request(
            [
                'REQUEST_METHOD' => 'GET',
                'QUERY_STRING' => 'id=prog1',
                'HTTP_COOKIE' => 'ignored',
            ],
            '',
            ['canvas_csrf' => 'tok']
        );
        $this->assertSame('prog1', $req->queryParam('id'));
        $this->assertSame('tok', $req->cookies()['canvas_csrf']);
        try {
            (new Request(['REQUEST_METHOD' => 'POST'], 'not-json'))->jsonBody();
            $this->fail('json');
        } catch (HttpException $e) {
            $this->assertSame('invalid_json', $e->errorCode);
        }
        try {
            (new Request(['REQUEST_METHOD' => 'POST'], '"str"'))->jsonBody();
            $this->fail('root');
        } catch (HttpException $e) {
            $this->assertSame('invalid_json', $e->errorCode);
        }
    }

    public function testProviderFactoryMakeAndDurationCap(): void
    {
        $f = new ProviderFactory();
        $this->assertSame('fake', $f->make('fake')->name());
        $this->assertSame('fixture', $f->make('fixture')->name());
        try {
            $f->make('nope');
            $this->fail('provider');
        } catch (HttpException $e) {
            $this->assertSame('unknown_provider', $e->errorCode);
        }

        $provider = new class implements \Sanctum\Canvas\Php\Inference\InferenceProvider {
            public function name(): string
            {
                return 'slow';
            }
            public function stream(ChatRequest $request): \Generator
            {
                yield StreamEvent::runStarted($request->runId);
                // Simulate many events while duration clock is mocked via maxDurationSeconds=0
                yield StreamEvent::textStart('m');
                yield StreamEvent::textDelta('m', 'x');
                yield StreamEvent::textEnd('m');
                yield StreamEvent::runFinished($request->runId);
            }
        };
        $inj = LibraryPromptInjector::fromEnv();
        $svc = new ChatService($provider, $inj, maxDurationSeconds: -1, maxBytes: 1_000_000);
        $req = new ChatRequest('d', [['role' => 'user', 'content' => 'x']], 'dashboard', '1');
        $codes = [];
        foreach ($svc->boundedStream($req) as $ev) {
            if ($ev->type === StreamEvent::RUN_ERROR) {
                $codes[] = $ev->payload['error']['code'];
            }
        }
        $this->assertContains('duration_cap', $codes);

        $fmt = new StreamFormatter('sse');
        $this->assertStringContainsString('event-stream', $fmt->contentType());
    }

    public function testFakeFromEnvAndFixtureErrorsAndInjectorEdges(): void
    {
        putenv('CANVAS_FAKE_ASSISTANT_TEXT=ZZZ');
        $_ENV['CANVAS_FAKE_ASSISTANT_TEXT'] = 'ZZZ';
        $fake = FakeProvider::fromEnv();
        $text = '';
        foreach ($fake->stream(new ChatRequest('r', [], 'd', '1', 'existing')) as $ev) {
            if ($ev->type === StreamEvent::TEXT_MESSAGE_CONTENT) {
                $text .= $ev->payload['delta'];
            }
        }
        $this->assertStringContainsString('ZZZ', $text);
        $this->assertStringContainsString('patch', $text);

        $fp = FixtureProvider::fromEnv();
        try {
            iterator_to_array($fp->stream(new ChatRequest('r', [], 'd', '1', null, 'ndjson', '../bad')));
            $this->fail('fixture');
        } catch (HttpException $e) {
            $this->assertSame('invalid_fixture', $e->errorCode);
        }
        try {
            iterator_to_array($fp->stream(new ChatRequest('r', [], 'd', '1', null, 'ndjson', 'no-such-fixture')));
            $this->fail('missing');
        } catch (HttpException $e) {
            $this->assertSame('fixture_not_found', $e->errorCode);
        }

        $inj = LibraryPromptInjector::fromEnv();
        $withPatch = $inj->inject('dashboard', '1', [['role' => 'user', 'content' => 'u']], "root = X()\n");
        $this->assertStringContainsString('Existing program', $withPatch[0]['content']);
        try {
            $inj->inject('dashboard', '1', [['role' => 'hacker', 'content' => 'x']]);
            $this->fail('role');
        } catch (HttpException $e) {
            $this->assertSame('invalid_message_role', $e->errorCode);
        }
        try {
            $inj->loadLibrary('../x', '1');
            $this->fail('lib');
        } catch (HttpException $e) {
            $this->assertSame('invalid_library', $e->errorCode);
        }
        try {
            $inj->loadLibrary('nope-lib', '1');
            $this->fail('missing lib');
        } catch (HttpException $e) {
            $this->assertSame('library_not_found', $e->errorCode);
        }
    }

    public function testVeniceErrorAndMisconfiguredStreamer(): void
    {
        $p = new VeniceProvider('k', 'https://ex.test/v1', 'm', static function (): array {
            return ['data: {"choices":[{"delta":{"content":"A"}}]}'];
        });
        $out = '';
        foreach ($p->stream(new ChatRequest('r', [['role' => 'user', 'content' => 'h']], 'd', '1')) as $ev) {
            if ($ev->type === StreamEvent::TEXT_MESSAGE_CONTENT) {
                $out .= $ev->payload['delta'];
            }
        }
        $this->assertSame('A', $out);

        $bad = new VeniceProvider('k', 'https://ex.test/v1', 'm', static fn () => 'nope');
        $err = null;
        foreach ($bad->stream(new ChatRequest('r2', [['role' => 'user', 'content' => 'h']], 'd', '1')) as $ev) {
            if ($ev->type === StreamEvent::RUN_ERROR) {
                $err = $ev->payload['error']['code'];
            }
        }
        $this->assertSame('provider_misconfigured', $err);

        try {
            new VeniceProvider('');
            $this->fail('empty key');
        } catch (HttpException $e) {
            $this->assertSame('venice_unconfigured', $e->errorCode);
        }
    }

    public function testChatServicePrepareValidation(): void
    {
        $svc = new ChatService(new FakeProvider(), LibraryPromptInjector::fromEnv());
        try {
            $svc->prepare(['messages' => []]);
            $this->fail('runId');
        } catch (HttpException $e) {
            $this->assertSame('invalid_run_id', $e->errorCode);
        }
        try {
            $svc->prepare(['runId' => 'r', 'messages' => 'x']);
            $this->fail('msgs');
        } catch (HttpException $e) {
            $this->assertSame('invalid_messages', $e->errorCode);
        }
        $ok = $svc->prepare([
            'runId' => 'r',
            'messages' => [['role' => 'user', 'content' => 'hi']],
            'format' => 'weird',
            'libraryId' => 'dashboard',
        ]);
        $this->assertSame('ndjson', $ok['request']->format);
    }

    public function testJsonSchemaMoreBranches(): void
    {
        $v = new JsonSchemaValidator();
        $this->assertNotEmpty($v->validate(['type' => 'string', 'maxLength' => 2], 'abcd'));
        $this->assertNotEmpty($v->validate(['type' => 'string', 'enum' => ['a']], 'b'));
        $this->assertNotEmpty($v->validate(['type' => 'string', 'pattern' => '^a+$'], 'bbb'));
        $this->assertSame([], $v->validate(['type' => 'string', 'pattern' => '^a+$'], 'aaa'));
        $this->assertNotEmpty($v->validate(['type' => 'number', 'maximum' => 1], 5));
        $this->assertNotEmpty($v->validate([
            'type' => 'array',
            'maxItems' => 1,
            'items' => ['type' => 'integer'],
        ], [1, 2]));
        $this->assertNotEmpty($v->validate([
            'type' => 'object',
            'maxProperties' => 1,
            'properties' => ['a' => ['type' => 'string']],
        ], ['a' => '1', 'b' => '2']));
        $this->assertNotEmpty($v->validate(['type' => 'boolean'], 'no'));
        $this->assertSame([], $v->validate(['type' => 'null'], null));
    }

    public function testToolDefinitionAndRegistryEdges(): void
    {
        try {
            new ToolDefinition('BAD', 'read', [], static fn () => ['ok' => true]);
            $this->fail('name');
        } catch (\InvalidArgumentException $e) {
            $this->assertTrue(true);
        }
        try {
            new ToolDefinition('ok', 'nope', [], static fn () => ['ok' => true]);
            $this->fail('class');
        } catch (\InvalidArgumentException $e) {
            $this->assertTrue(true);
        }
        $reg = ToolRegistry::labDefaults();
        $this->assertContains('echo_read', $reg->names());
        $this->assertNotEmpty($reg->describe());
        $this->assertTrue($reg->get('echo_read')->isWrite() === false);
        try {
            $reg->get('missing');
            $this->fail('get');
        } catch (HttpException $e) {
            $this->assertSame('unknown_tool', $e->errorCode);
        }
        try {
            $reg->register($reg->get('echo_read'));
            $this->fail('dup');
        } catch (\InvalidArgumentException $e) {
            $this->assertTrue(true);
        }
    }

    public function testToolDispatcherMoreErrors(): void
    {
        $csrf = new Csrf('x');
        $d = new ToolDispatcher(ToolRegistry::labDefaults(), csrf: $csrf);
        $auth = new AuthContext('o', 'p');
        try {
            $d->dispatch($auth, ['tool' => 'echo_read', 'arguments' => ['a', 'b']]);
            $this->fail('list args');
        } catch (HttpException $e) {
            $this->assertSame('invalid_arguments', $e->errorCode);
        }
        try {
            $d->dispatch($auth, ['tool' => 'echo_read', 'arguments' => 'x']);
            $this->fail('str args');
        } catch (HttpException $e) {
            $this->assertSame('invalid_arguments', $e->errorCode);
        }
        $tok = $csrf->mint($auth->scopeKey());
        try {
            $d->dispatch($auth, [
                'tool' => 'note_set',
                'arguments' => ['key' => 'k', 'value' => 'v'],
                'idempotencyKey' => str_repeat('i', 200),
            ], ['x-csrf-token' => $tok]);
            $this->fail('idem len');
        } catch (HttpException $e) {
            $this->assertSame('invalid_idempotency_key', $e->errorCode);
        }
        $this->assertSame($d->registry()->names(), ToolRegistry::labDefaults()->names());
    }

    public function testFileStoreFullLifecycleAndLimits(): void
    {
        $store = new FileProgramStore($this->tmp . '/files');
        $store->save('o', 'p', 'a1', [
            'source' => 's0',
            'libraryId' => 'dashboard',
            'libraryVersion' => '1',
            'state' => ['k' => 1],
        ]);
        $store->patch('o', 'p', 'a1', ['source' => 's1', 'state' => ['k' => 2], 'libraryVersion' => '1']);
        $revs = $store->listRevisions('o', 'p', 'a1');
        $this->assertCount(2, $revs);
        $rolled = $store->rollback('o', 'p', 'a1', 0);
        $this->assertSame('s0', $rolled['source']);
        $this->assertTrue($store->delete('o', 'p', 'a1'));
        $this->assertFalse($store->delete('o', 'p', 'a1'));

        try {
            ProgramLimits::assertProgramId('');
            $this->fail('id');
        } catch (HttpException $e) {
            $this->assertSame('invalid_program_id', $e->errorCode);
        }
        try {
            ProgramLimits::assertState(['x' => str_repeat('z', 200_001)]);
            $this->fail('state');
        } catch (HttpException $e) {
            $this->assertSame('state_too_large', $e->errorCode);
        }
    }

    public function testProgramControllerPatchRollbackRevisions(): void
    {
        $csrf = new Csrf('c');
        $ctrl = new ProgramController(new SqliteProgramStore($this->tmp . '/pc.sqlite'), $csrf);
        $auth = new AuthContext('o', 'p');
        $tok = $csrf->mint($auth->scopeKey());
        $ctrl->save($auth, [
            'id' => 'x1',
            'source' => 'one',
            'libraryId' => 'dashboard',
        ], ['x-csrf-token' => $tok], []);
        $ctrl->patch($auth, 'x1', ['source' => 'two'], ['x-csrf-token' => $tok], []);
        $rb = $ctrl->rollback($auth, 'x1', [], ['x-csrf-token' => $tok], []);
        $this->assertSame('one', $rb['source']);
        $this->assertNotEmpty($ctrl->revisions($auth, 'x1'));
        $this->assertInstanceOf(SqliteProgramStore::class, $ctrl->store());
    }

    public function testSqliteRollbackToMissingAndAuthContextScope(): void
    {
        $store = new SqliteProgramStore($this->tmp . '/rb.sqlite');
        $store->save('o', 'p', 'z', ['source' => 'a', 'libraryId' => 'dashboard', 'libraryVersion' => '1']);
        try {
            $store->rollback('o', 'p', 'z', 99);
            $this->fail('rev');
        } catch (HttpException $e) {
            $this->assertSame('revision_not_found', $e->errorCode);
        }
        try {
            $store->rollback('o', 'p', 'z', -1);
            $this->fail('prior');
        } catch (HttpException $e) {
            $this->assertSame('no_prior_revision', $e->errorCode);
        }
        $ctx = new AuthContext('a', 'b', 'tid');
        $this->assertSame('a:b', $ctx->scopeKey());
    }

    public function testJsonResponseErrorPath(): void
    {
        ob_start();
        JsonResponse::error(new HttpException(400, 'x', 'msg'), new ErrorRedactor());
        $out = ob_get_clean();
        $this->assertStringContainsString('"code":"x"', (string) $out);
    }
}
