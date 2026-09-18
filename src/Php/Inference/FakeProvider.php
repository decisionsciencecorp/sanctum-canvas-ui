<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Inference;

use Sanctum\Canvas\Php\Config\Env;

/**
 * Deterministic fake provider for tests and offline lab smokes (no Venice).
 */
final class FakeProvider implements InferenceProvider
{
    public function __construct(
        private readonly string $assistantText = "root = TextContent(\"Hello from fixture\")\n",
        private readonly int $chunkSize = 24,
    ) {
    }

    public function name(): string
    {
        return 'fake';
    }

    public function stream(ChatRequest $request): \Generator
    {
        $messageId = 'msg_' . substr(hash('sha256', $request->runId), 0, 10);
        yield StreamEvent::runStarted($request->runId);
        yield StreamEvent::textStart($messageId);

        $text = $this->assistantText;
        if ($request->existingProgram !== null && $request->existingProgram !== '') {
            $text = "// patch against existing\n" . $text;
        }

        $len = strlen($text);
        for ($i = 0; $i < $len; $i += $this->chunkSize) {
            yield StreamEvent::textDelta($messageId, substr($text, $i, $this->chunkSize));
        }

        yield StreamEvent::textEnd($messageId);
        yield StreamEvent::runFinished($request->runId);
    }

    public static function fromEnv(): self
    {
        $text = Env::get('CANVAS_FAKE_ASSISTANT_TEXT');
        return new self($text ?? "root = TextContent(\"Hello from fixture\")\n");
    }
}
