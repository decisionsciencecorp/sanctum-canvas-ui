<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Tests\Storage;

use PHPUnit\Framework\TestCase;
use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Storage\LabControlStore;

final class LabControlStoreTest extends TestCase
{
    private string $tmp;

    protected function setUp(): void
    {
        $this->tmp = sys_get_temp_dir() . '/canvas-lab-ctrl-' . bin2hex(random_bytes(4));
        mkdir($this->tmp, 0700, true);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->tmp . '/*') ?: [] as $f) {
            @unlink($f);
        }
        @rmdir($this->tmp);
    }

    public function testPaintClearSubmitAndRevBump(): void
    {
        $store = new LabControlStore($this->tmp);
        $empty = $store->read('deep-research');
        $this->assertSame(0, $empty['rev']);
        $this->assertSame('idle', $empty['action']);

        $painted = $store->paint('deep-research', [
            'lang_source' => 'root = TextContent("hi")',
            'title' => 'smoke',
        ]);
        $this->assertSame(1, $painted['rev']);
        $this->assertSame('paint', $painted['action']);
        $this->assertSame('root = TextContent("hi")', $painted['lang_source']);

        $again = $store->read('deep-research');
        $this->assertSame(1, $again['rev']);

        $sub = $store->recordSubmit('deep-research', [
            'form_id' => 'deep-research-scope-v1',
            'values' => ['depth' => 'deep'],
            'text' => 'locked',
        ]);
        $this->assertSame(2, $sub['rev']);
        $this->assertSame('submit', $sub['action']);
        $this->assertSame('deep', $sub['last_submit']['values']['depth']);

        $cleared = $store->clear('deep-research');
        $this->assertSame(3, $cleared['rev']);
        $this->assertSame('clear', $cleared['action']);
        $this->assertNull($cleared['lang_source']);
        $this->assertNotNull($cleared['last_submit']);
    }

    public function testRejectsBadSurfaceAndEmptyPaint(): void
    {
        $store = new LabControlStore($this->tmp);
        $this->expectException(HttpException::class);
        $store->paint('../evil', ['lang_source' => 'root = TextContent("x")']);
    }

    public function testRejectsEmptyLangSource(): void
    {
        $store = new LabControlStore($this->tmp);
        $this->expectException(HttpException::class);
        $store->paint('deep-research', ['lang_source' => '  ']);
    }
}
