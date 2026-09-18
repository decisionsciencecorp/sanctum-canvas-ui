<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Inference;

/**
 * Provider-neutral chat request after server-side prompt injection.
 */
final class ChatRequest
{
    /**
     * @param list<array{role: string, content: string}> $messages Including system prompt as first message when present
     */
    public function __construct(
        public readonly string $runId,
        public readonly array $messages,
        public readonly string $libraryId,
        public readonly string $libraryVersion,
        public readonly ?string $existingProgram = null,
        public readonly string $format = 'ndjson',
        public readonly ?string $fixtureId = null,
        public readonly ?string $model = null,
    ) {
    }
}
