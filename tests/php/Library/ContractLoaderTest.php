<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Tests\Library;

use PHPUnit\Framework\TestCase;
use Sanctum\Canvas\Php\Library\ContractLoader;

final class ContractLoaderTest extends TestCase
{
    private string $examplesPath;

    protected function setUp(): void
    {
        $this->examplesPath = dirname(__DIR__, 3) . '/resources/libraries/dashboard/library.examples.json';
    }

    public function testLoadsAndValidatesExamplesLibrary(): void
    {
        $lib = ContractLoader::loadFile($this->examplesPath);
        $this->assertSame('1.0.0', $lib['contractFormatVersion']);
        $this->assertSame('Stack', $lib['root']);
        $this->assertArrayHasKey('Input', $lib['components']);
        $this->assertSame(['value'], $lib['components']['Input']['reactiveProps']);
        $this->assertSame(
            ['name', 'placeholder', 'type', 'rules', 'value'],
            $lib['components']['Input']['propertyOrder']
        );
    }

    public function testPropertyOrderIsExplicitNotJsonKeyAccident(): void
    {
        $lib = ContractLoader::loadFile($this->examplesPath);
        $input = $lib['components']['Input'];
        $mapped = ContractLoader::mapPositionalArgs($input, ['email', 'you@x.com']);
        $this->assertSame('email', $mapped['name']);
        $this->assertSame('you@x.com', $mapped['placeholder']);
        $this->assertArrayNotHasKey('type', $mapped);
    }

    public function testReactivePropsRequiredEvenWhenEmpty(): void
    {
        $lib = ContractLoader::loadFile($this->examplesPath);
        foreach ($lib['components'] as $name => $c) {
            $this->assertIsArray($c['reactiveProps'], $name);
            $this->assertArrayHasKey('propertyOrder', $c);
        }
        $this->assertTrue(ContractLoader::isReactive($lib['components']['Input'], 'value'));
        $this->assertFalse(ContractLoader::isReactive($lib['components']['Stack'], 'children'));
    }

    public function testRejectsMissingPropertyOrderEntry(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ContractLoader::validateComponent('Bad', [
            'name' => 'Bad',
            'version' => '0.1.0',
            'propertyOrder' => ['a'],
            'properties' => ['a' => ['type' => 'string'], 'b' => ['type' => 'string']],
            'required' => [],
            'reactiveProps' => [],
            'allowedChildren' => null,
            'renderer' => 'x.js',
            'securityCapabilities' => ['none'],
            'prompt' => ['description' => 'x'],
        ]);
    }

    public function testRejectsReactivePropNotInOrder(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ContractLoader::validateComponent('Bad', [
            'name' => 'Bad',
            'version' => '0.1.0',
            'propertyOrder' => ['a'],
            'properties' => ['a' => ['type' => 'string']],
            'required' => [],
            'reactiveProps' => ['ghost'],
            'allowedChildren' => null,
            'renderer' => 'x.js',
            'securityCapabilities' => ['none'],
            'prompt' => ['description' => 'x'],
        ]);
    }

    public function testExampleComponentFilesMatchLibrary(): void
    {
        $root = dirname(__DIR__, 3) . '/resources/libraries/examples';
        $lib = ContractLoader::loadFile($this->examplesPath);
        foreach (['primitive.TextContent', 'container.Stack', 'form.Input', 'chart.BarChart', 'action.Button'] as $file) {
            $path = $root . '/' . $file . '.json';
            $this->assertFileExists($path);
            $comp = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
            ContractLoader::validateComponent($comp['name'], $comp);
            $this->assertSame($comp['propertyOrder'], $lib['components'][$comp['name']]['propertyOrder']);
            $this->assertSame($comp['reactiveProps'], $lib['components'][$comp['name']]['reactiveProps']);
        }
    }

    public function testLoadFileMissingPath(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ContractLoader::loadFile('/tmp/sanctum-canvas-missing-library.json');
    }

    public function testLoadFileEmpty(): void
    {
        $path = sys_get_temp_dir() . '/sanctum-empty-lib.json';
        file_put_contents($path, '');
        try {
            $this->expectException(\InvalidArgumentException::class);
            ContractLoader::loadFile($path);
        } finally {
            @unlink($path);
        }
    }

    public function testLoadFileNonObjectJson(): void
    {
        $path = sys_get_temp_dir() . '/sanctum-array-lib.json';
        file_put_contents($path, '[]');
        try {
            $this->expectException(\InvalidArgumentException::class);
            ContractLoader::loadFile($path);
        } finally {
            @unlink($path);
        }
    }

    public function testValidateLibraryMissingFieldAndBadRoot(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ContractLoader::validateLibrary(['id' => 'x']);
    }

    public function testValidateLibraryComponentsNotArray(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ContractLoader::validateLibrary([
            'contractFormatVersion' => '1.0.0',
            'id' => 'x',
            'variant' => 'dashboard',
            'root' => 'Stack',
            'components' => 'nope',
        ]);
    }

    public function testValidateLibraryComponentNotObject(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ContractLoader::validateLibrary([
            'contractFormatVersion' => '1.0.0',
            'id' => 'x',
            'variant' => 'dashboard',
            'root' => 'Stack',
            'components' => ['Stack' => 'bad'],
        ]);
    }

    public function testValidateLibraryMissingRootComponent(): void
    {
        $comp = [
            'name' => 'Only',
            'version' => '1',
            'propertyOrder' => [],
            'properties' => [],
            'required' => [],
            'reactiveProps' => [],
            'allowedChildren' => null,
            'renderer' => 'x.js',
            'securityCapabilities' => ['none'],
            'prompt' => ['description' => 'd'],
        ];
        $this->expectException(\InvalidArgumentException::class);
        ContractLoader::validateLibrary([
            'contractFormatVersion' => '1.0.0',
            'id' => 'x',
            'variant' => 'dashboard',
            'root' => 'Stack',
            'components' => ['Only' => $comp],
        ]);
    }

    public function testValidateComponentNameMismatchAndBadTypes(): void
    {
        $base = [
            'name' => 'Other',
            'version' => '1',
            'propertyOrder' => ['a'],
            'properties' => ['a' => ['type' => 'string']],
            'required' => [],
            'reactiveProps' => [],
            'allowedChildren' => null,
            'renderer' => 'x.js',
            'securityCapabilities' => ['none'],
            'prompt' => ['description' => 'd'],
        ];
        try {
            ContractLoader::validateComponent('Bad', $base);
            $this->fail('expected name mismatch');
        } catch (\InvalidArgumentException $e) {
            $this->assertStringContainsString('must equal name', $e->getMessage());
        }

        $base['name'] = 'Bad';
        $base['propertyOrder'] = 'nope';
        $this->expectException(\InvalidArgumentException::class);
        ContractLoader::validateComponent('Bad', $base);
    }

    public function testValidateComponentEmptyOrderEntryAndRequiredMismatch(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ContractLoader::validateComponent('Bad', [
            'name' => 'Bad',
            'version' => '1',
            'propertyOrder' => [''],
            'properties' => ['' => ['type' => 'string']],
            'required' => [],
            'reactiveProps' => [],
            'allowedChildren' => null,
            'renderer' => 'x.js',
            'securityCapabilities' => ['none'],
            'prompt' => ['description' => 'd'],
        ]);
    }

    public function testValidateComponentRequiredNotInOrder(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ContractLoader::validateComponent('Bad', [
            'name' => 'Bad',
            'version' => '1',
            'propertyOrder' => ['a'],
            'properties' => ['a' => ['type' => 'string']],
            'required' => ['ghost'],
            'reactiveProps' => [],
            'allowedChildren' => null,
            'renderer' => 'x.js',
            'securityCapabilities' => ['none'],
            'prompt' => ['description' => 'd'],
        ]);
    }

    public function testValidateComponentPropertiesNotArray(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ContractLoader::validateComponent('Bad', [
            'name' => 'Bad',
            'version' => '1',
            'propertyOrder' => [],
            'properties' => 'nope',
            'required' => [],
            'reactiveProps' => [],
            'allowedChildren' => null,
            'renderer' => 'x.js',
            'securityCapabilities' => ['none'],
            'prompt' => ['description' => 'd'],
        ]);
    }

    public function testValidateComponentReactivePropsNotArray(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ContractLoader::validateComponent('Bad', [
            'name' => 'Bad',
            'version' => '1',
            'propertyOrder' => [],
            'properties' => [],
            'required' => [],
            'reactiveProps' => 'nope',
            'allowedChildren' => null,
            'renderer' => 'x.js',
            'securityCapabilities' => ['none'],
            'prompt' => ['description' => 'd'],
        ]);
    }

    public function testValidateComponentMissingAllowedChildren(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ContractLoader::validateComponent('Bad', [
            'name' => 'Bad',
            'version' => '1',
            'propertyOrder' => [],
            'properties' => [],
            'required' => [],
            'reactiveProps' => [],
            'renderer' => 'x.js',
            'securityCapabilities' => ['none'],
            'prompt' => ['description' => 'd'],
        ]);
    }

    public function testMapPositionalArgsAppliesDefaults(): void
    {
        $lib = ContractLoader::loadFile($this->examplesPath);
        $mapped = ContractLoader::mapPositionalArgs($lib['components']['TextContent'], ['Hello']);
        $this->assertSame('Hello', $mapped['text']);
        $this->assertSame('md', $mapped['size']);
        $this->assertSame('normal', $mapped['weight']);
    }

    public function testIsReactiveMissingKeyIsFalse(): void
    {
        $this->assertFalse(ContractLoader::isReactive([], 'value'));
    }
}
