<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Inference;

use Sanctum\Canvas\Php\Config\Env;
use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Library\ContractLoader;
use Sanctum\Canvas\Php\Library\PromptCompiler;

/**
 * Load library JSON by id/version and compile system prompt server-side.
 */
final class LibraryPromptInjector
{
    public function __construct(
        private readonly string $librariesPath,
    ) {
    }

    public static function fromEnv(): self
    {
        return new self(Env::librariesPath());
    }

    /**
     * @param list<array{role: string, content: string}> $clientMessages
     * @param array<string, mixed> $promptOptions
     * @return list<array{role: string, content: string}>
     */
    public function inject(
        string $libraryId,
        string $libraryVersion,
        array $clientMessages,
        ?string $existingProgram = null,
        array $promptOptions = [],
    ): array {
        $library = $this->loadLibrary($libraryId, $libraryVersion);
        $system = PromptCompiler::generate($library, $promptOptions);
        if ($existingProgram !== null && $existingProgram !== '') {
            $system .= "\n\n## Existing program to patch\n```\n"
                . $this->boundProgram($existingProgram)
                . "\n```\nEmit a minimal patch (statement merges), not a full rewrite unless necessary.";
        }

        $out = [['role' => 'system', 'content' => $system]];
        foreach ($clientMessages as $msg) {
            $role = (string) ($msg['role'] ?? '');
            $content = (string) ($msg['content'] ?? '');
            if ($role === 'system') {
                // Ignore client-supplied system prompts — server owns the library prompt.
                continue;
            }
            if (!in_array($role, ['user', 'assistant', 'tool'], true)) {
                throw new HttpException(400, 'invalid_message_role', 'Invalid message role');
            }
            if (strlen($content) > 200_000) {
                throw new HttpException(413, 'message_too_large', 'Message too large');
            }
            $out[] = ['role' => $role, 'content' => $content];
        }
        return $out;
    }

    /** @return array<string, mixed> */
    public function loadLibrary(string $libraryId, string $libraryVersion): array
    {
        if (!preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/', $libraryId)) {
            throw new HttpException(400, 'invalid_library', 'Invalid library id');
        }
        $base = rtrim($this->librariesPath, '/') . '/' . $libraryId;
        $candidates = [
            $base . '/library.v' . $libraryVersion . '.json',
            $base . '/library.v1.json',
            $base . '/library.json',
        ];
        foreach ($candidates as $path) {
            if (is_file($path)) {
                return ContractLoader::loadFile($path);
            }
        }
        throw new HttpException(404, 'library_not_found', 'Library not found');
    }

    private function boundProgram(string $program): string
    {
        if (strlen($program) > 500_000) {
            throw new HttpException(413, 'program_too_large', 'Existing program too large');
        }
        return $program;
    }
}
