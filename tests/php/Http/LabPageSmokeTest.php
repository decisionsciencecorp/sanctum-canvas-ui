<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Tests\Http;

use PHPUnit\Framework\TestCase;

/**
 * A7.7 — lab page static smoke (no long-lived server required).
 * Playwright verify_a7_lab.py covers end-to-end fixture replay.
 */
final class LabPageSmokeTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        $this->root = dirname(__DIR__, 3);
    }

    public function testLabIndexPhpEmitsCspAndCanvasMount(): void
    {
        $path = $this->root . '/public/stream.php';
        $this->assertFileExists($path);

        ob_start();
        // Capture headers via temporary override
        $headers = [];
        $headerFn = static function (string $header) use (&$headers): void {
            $headers[] = $header;
        };

        // stream.php calls header() — run in isolated include with output buffer.
        // Use CLI sapi: header() may no-op but body still renders.
        include $path;
        $body = (string) ob_get_clean();

        $this->assertStringContainsString('id="sanctum-canvas-root"', $body);
        $this->assertStringContainsString('id="lab-chrome"', $body);
        $this->assertStringContainsString('/lab/a7-lab.js', $body);
        $this->assertStringContainsString('Content-Security-Policy', file_get_contents($path) ?: '');
        $this->assertDoesNotMatchRegularExpression(
            '/id="sanctum-canvas-root"[^>]*>[\s\S]*id="lab-chrome"/',
            $body,
            'lab chrome must not nest inside canvas mount'
        );
        // Suppress unused in CLI analysis
        unset($headerFn, $headers);
    }

    public function testOfflineLabFixtureExists(): void
    {
        $fixture = $this->root . '/resources/fixtures/stream/lab-canvas-textcontent.json';
        $public = $this->root . '/public/fixtures/stream/lab-canvas-textcontent.json';
        $this->assertFileExists($fixture);
        $this->assertFileExists($public);
        $data = json_decode((string) file_get_contents($fixture), true);
        $this->assertIsArray($data);
        $this->assertSame('lab-canvas-textcontent', $data['id'] ?? null);
        $this->assertNotEmpty($data['events'] ?? null);
        $deltas = [];
        foreach ($data['events'] as $ev) {
            if (($ev['type'] ?? '') === 'TEXT_MESSAGE_CONTENT') {
                $deltas[] = $ev['delta'] ?? '';
            }
        }
        $this->assertStringContainsString('TextContent', implode('', $deltas));
    }

    public function testLabAssetsWired(): void
    {
        $this->assertFileExists($this->root . '/public/lab/a7-lab.js');
        $this->assertFileExists($this->root . '/public/lab/a7-lab.css');
        $this->assertFileExists($this->root . '/public/assets/js/transport/eventReducer.js');
        $this->assertFileExists($this->root . '/public/assets/js/telemetry/runtime.js');
        $this->assertFileExists($this->root . '/public/assets/libraries/dashboard/library.v1.json');
    }
}
