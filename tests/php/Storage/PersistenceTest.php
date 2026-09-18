<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Tests\Storage;

use PHPUnit\Framework\TestCase;
use Sanctum\Canvas\Php\Http\AuthContext;
use Sanctum\Canvas\Php\Http\Csrf;
use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Storage\FileProgramStore;
use Sanctum\Canvas\Php\Storage\ProgramController;
use Sanctum\Canvas\Php\Storage\SqliteProgramStore;
use Sanctum\Canvas\Php\Storage\StoreFactory;

final class PersistenceTest extends TestCase
{
    private string $tmp;

    protected function setUp(): void
    {
        $this->tmp = sys_get_temp_dir() . '/canvas-store-' . bin2hex(random_bytes(4));
        mkdir($this->tmp, 0700, true);
    }

    protected function tearDown(): void
    {
        $this->rmTree($this->tmp);
    }

    private function rmTree(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        foreach (scandir($dir) ?: [] as $f) {
            if ($f === '.' || $f === '..') {
                continue;
            }
            $p = $dir . '/' . $f;
            is_dir($p) ? $this->rmTree($p) : @unlink($p);
        }
        @rmdir($dir);
    }

    public function testSqliteSaveReloadPatchRollback(): void
    {
        $store = new SqliteProgramStore($this->tmp . '/p.sqlite');
        // migrate twice — idempotent
        $store->migrate();
        $store->migrate();

        $saved = $store->save('o1', 'proj1', 'prog1', [
            'source' => 'root = TextContent("a")',
            'libraryId' => 'dashboard',
            'libraryVersion' => '1',
            'state' => ['x' => 1],
        ]);
        $this->assertSame(0, $saved['revision']);

        $got = $store->get('o1', 'proj1', 'prog1');
        $this->assertNotNull($got);
        $this->assertSame('root = TextContent("a")', $got['source']);

        $patched = $store->patch('o1', 'proj1', 'prog1', [
            'source' => 'root = TextContent("b")',
            'state' => ['x' => 2],
        ]);
        $this->assertSame(1, $patched['revision']);
        $this->assertSame('root = TextContent("b")', $patched['source']);

        $rolled = $store->rollback('o1', 'proj1', 'prog1', -1);
        $this->assertSame('root = TextContent("a")', $rolled['source']);
        $this->assertSame(1, $rolled['state']['x']);

        $revs = $store->listRevisions('o1', 'proj1', 'prog1');
        $this->assertGreaterThanOrEqual(3, count($revs));
    }

    public function testFileStoreIdorResistance(): void
    {
        $store = new FileProgramStore($this->tmp . '/files');
        $store->save('owner-a', 'proj-a', 'p1', [
            'source' => 'secret-a',
            'libraryId' => 'dashboard',
            'libraryVersion' => '1',
        ]);
        $this->assertNull($store->get('owner-b', 'proj-a', 'p1'));
        $this->assertNull($store->get('owner-a', 'proj-b', 'p1'));
        $this->assertNotNull($store->get('owner-a', 'proj-a', 'p1'));
    }

    public function testControllerEnforcesCsrfAndIgnoresSpoofedOwner(): void
    {
        $csrf = new Csrf('c');
        $ctrl = new ProgramController(new SqliteProgramStore($this->tmp . '/c.sqlite'), $csrf);
        $auth = new AuthContext('real-owner', 'real-project');
        $token = $csrf->mint($auth->scopeKey());

        $saved = $ctrl->save($auth, [
            'id' => 'demo',
            'source' => 'root = TextContent("ok")',
            'ownerId' => 'attacker',
            'projectId' => 'other',
        ], ['x-csrf-token' => $token], []);

        $this->assertSame('real-owner', $saved['ownerId']);
        $this->assertSame('real-project', $saved['projectId']);

        $attacker = new AuthContext('attacker', 'other');
        $this->expectException(HttpException::class);
        $ctrl->get($attacker, 'demo');
    }

    public function testStoreFactoryDrivers(): void
    {
        $sqlite = StoreFactory::make('sqlite', $this->tmp . '/fac');
        $this->assertInstanceOf(SqliteProgramStore::class, $sqlite);
        $file = StoreFactory::make('file', $this->tmp . '/fac');
        $this->assertInstanceOf(FileProgramStore::class, $file);
    }

    public function testSizeLimits(): void
    {
        $store = new SqliteProgramStore($this->tmp . '/lim.sqlite');
        $this->expectException(HttpException::class);
        $store->save('o', 'p', 'big', [
            'source' => str_repeat('x', 500_001),
            'libraryId' => 'dashboard',
            'libraryVersion' => '1',
        ]);
    }
}
