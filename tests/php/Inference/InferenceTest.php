<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Tests\Inference;

use PHPUnit\Framework\TestCase;
use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Inference\ChatRequest;
use Sanctum\Canvas\Php\Inference\ChatService;
use Sanctum\Canvas\Php\Inference\FakeProvider;
use Sanctum\Canvas\Php\Inference\FixtureProvider;
use Sanctum\Canvas\Php\Inference\LibraryPromptInjector;
use Sanctum\Canvas\Php\Inference\ProviderFactory;
use Sanctum\Canvas\Php\Inference\StreamEvent;
use Sanctum\Canvas\Php\Inference\StreamFormatter;
use Sanctum\Canvas\Php\Inference\VeniceProvider;

final class InferenceTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        $this->root = dirname(__DIR__, 3);
        putenv('CANVAS_LIBRARIES_PATH=' . $this->root . '/resources/libraries');
        putenv('CANVAS_FIXTURES_PATH=' . $this->root . '/resources/fixtures');
        $_ENV['CANVAS_LIBRARIES_PATH'] = $this->root . '/resources/libraries';
        $_ENV['CANVAS_FIXTURES_PATH'] = $this->root . '/resources/fixtures';
    }

    public function testFakeProviderStreamsEvents(): void
    {
        $p = new FakeProvider('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 5);
        $req = new ChatRequest('run1', [['role' => 'user', 'content' => 'hi']], 'dashboard', '1');
        $types = [];
        $text = '';
        foreach ($p->stream($req) as $ev) {
            $types[] = $ev->type;
            if ($ev->type === StreamEvent::TEXT_MESSAGE_CONTENT) {
                $text .= $ev->payload['delta'];
            }
        }
        $this->assertSame(StreamEvent::RUN_STARTED, $types[0]);
        $this->assertSame(StreamEvent::RUN_FINISHED, $types[array_key_last($types)]);
        $this->assertSame('ABCDEFGHIJKLMNOPQRSTUVWXYZ', $text);
    }

    public function testFixtureProviderReplays(): void
    {
        $p = FixtureProvider::fromEnv();
        $req = new ChatRequest('run-fix', [], 'dashboard', '1', null, 'ndjson', 'text-message-basic');
        $events = iterator_to_array($p->stream($req));
        $this->assertGreaterThanOrEqual(3, count($events));
        $this->assertSame(StreamEvent::RUN_STARTED, $events[0]->type);
        $this->assertSame('run-fix', $events[0]->payload['runId']);
    }

    public function testLibraryPromptInjectedServerSide(): void
    {
        $inj = LibraryPromptInjector::fromEnv();
        $msgs = $inj->inject('dashboard', '1', [
            ['role' => 'system', 'content' => 'HACKED'],
            ['role' => 'user', 'content' => 'Build a card'],
        ]);
        $this->assertSame('system', $msgs[0]['role']);
        $this->assertStringContainsString('openui-lang', $msgs[0]['content']);
        $this->assertStringNotContainsString('HACKED', $msgs[0]['content']);
        $this->assertSame('user', $msgs[1]['role']);
    }

    public function testChatServiceCapsBytes(): void
    {
        $provider = new FakeProvider(str_repeat('X', 200), 50);
        $inj = LibraryPromptInjector::fromEnv();
        $svc = new ChatService($provider, $inj, maxDurationSeconds: 60, maxBytes: 80);
        $prepared = $svc->prepare([
            'runId' => 'cap-run',
            'libraryId' => 'dashboard',
            'libraryVersion' => '1',
            'messages' => [['role' => 'user', 'content' => 'hi']],
        ]);
        $codes = [];
        foreach ($prepared['events'] as $ev) {
            if ($ev->type === StreamEvent::RUN_ERROR) {
                $codes[] = $ev->payload['error']['code'] ?? '';
            }
        }
        $this->assertContains('byte_cap', $codes);
    }

    public function testChatServiceStopsOnDisconnect(): void
    {
        $provider = new FakeProvider(str_repeat('Y', 100), 10);
        $inj = LibraryPromptInjector::fromEnv();
        $calls = 0;
        $svc = new ChatService(
            $provider,
            $inj,
            maxDurationSeconds: 60,
            maxBytes: 1_000_000,
            connectionAborted: static function () use (&$calls): bool {
                $calls++;
                return $calls > 2;
            }
        );
        $req = new ChatRequest('d1', [['role' => 'system', 'content' => 'x'], ['role' => 'user', 'content' => 'y']], 'dashboard', '1');
        // Bypass inject — use boundedStream directly
        $codes = [];
        foreach ($svc->boundedStream($req) as $ev) {
            if ($ev->type === StreamEvent::RUN_ERROR) {
                $codes[] = $ev->payload['error']['code'] ?? '';
            }
        }
        $this->assertContains('client_disconnected', $codes);
    }

    public function testStreamFormatterNdjsonAndSse(): void
    {
        $ev = StreamEvent::runStarted('r1');
        $nd = (new StreamFormatter('ndjson'))->format($ev);
        $this->assertStringEndsWith("\n", $nd);
        $this->assertStringContainsString('"type":"RUN_STARTED"', $nd);

        $sse = (new StreamFormatter('sse'))->format($ev);
        $this->assertStringContainsString("event: RUN_STARTED\n", $sse);
        $this->assertStringContainsString('data: ', $sse);
    }

    public function testProviderFactoryFixturePreferred(): void
    {
        $f = new ProviderFactory();
        $p = $f->resolveForRequest('venice', 'text-message-basic');
        $this->assertSame('fixture', $p->name());
    }

    public function testVeniceRequiresKey(): void
    {
        putenv('VENICE_API_KEY');
        putenv('VENICE_INFERENCE_KEY');
        unset($_ENV['VENICE_API_KEY'], $_ENV['VENICE_INFERENCE_KEY'], $_SERVER['VENICE_API_KEY'], $_SERVER['VENICE_INFERENCE_KEY']);
        $this->expectException(HttpException::class);
        VeniceProvider::fromEnv();
    }

    public function testVeniceStreamsViaInjectedHttp(): void
    {
        $lines = [
            'data: {"choices":[{"delta":{"content":"Hel"}}]}',
            'data: {"choices":[{"delta":{"content":"lo"}}]}',
            'data: [DONE]',
        ];
        $provider = new VeniceProvider(
            'test-key-not-real',
            'https://example.test/v1',
            'test-model',
            static function () use ($lines): \Generator {
                foreach ($lines as $l) {
                    yield $l;
                }
            }
        );
        $req = new ChatRequest('vr1', [['role' => 'user', 'content' => 'hi']], 'dashboard', '1');
        $text = '';
        foreach ($provider->stream($req) as $ev) {
            if ($ev->type === StreamEvent::TEXT_MESSAGE_CONTENT) {
                $text .= $ev->payload['delta'];
            }
        }
        $this->assertSame('Hello', $text);
    }

    public function testVeniceRedactsProviderErrors(): void
    {
        $provider = new VeniceProvider(
            'sk-secret-key-value',
            'https://example.test/v1',
            'm',
            static function (): \Generator {
                yield 'data: {"error":{"message":"bad Bearer sk-secret-key-value"}}';
            }
        );
        $req = new ChatRequest('vr2', [['role' => 'user', 'content' => 'hi']], 'dashboard', '1');
        $err = null;
        foreach ($provider->stream($req) as $ev) {
            if ($ev->type === StreamEvent::RUN_ERROR) {
                $err = $ev->payload['error']['message'] ?? '';
            }
        }
        $this->assertNotNull($err);
        $this->assertStringNotContainsString('sk-secret-key-value', (string) $err);
    }
}
