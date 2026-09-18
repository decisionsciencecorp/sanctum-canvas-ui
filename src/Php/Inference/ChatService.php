<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Inference;

use Sanctum\Canvas\Php\Config\Env;
use Sanctum\Canvas\Php\Http\ErrorRedactor;
use Sanctum\Canvas\Php\Http\HttpException;

/**
 * Run an inference stream with duration/byte caps and disconnect detection.
 */
final class ChatService
{
    public function __construct(
        private readonly InferenceProvider $provider,
        private readonly LibraryPromptInjector $injector,
        private readonly ErrorRedactor $redactor = new ErrorRedactor(),
        private readonly int $maxDurationSeconds = 120,
        private readonly int $maxBytes = 2_000_000,
        /** @var null|callable(): bool */
        private mixed $connectionAborted = null,
    ) {
    }

    public static function capsFromEnv(InferenceProvider $provider, LibraryPromptInjector $injector): self
    {
        return new self(
            $provider,
            $injector,
            new ErrorRedactor(),
            Env::int('CANVAS_STREAM_MAX_SECONDS', 120),
            Env::int('CANVAS_STREAM_MAX_BYTES', 2_000_000),
        );
    }

    /**
     * @param array<string, mixed> $body
     * @return array{request: ChatRequest, events: \Generator<int, StreamEvent>}
     */
    public function prepare(array $body): array
    {
        $runId = (string) ($body['runId'] ?? '');
        if ($runId === '' || strlen($runId) > 128) {
            throw new HttpException(400, 'invalid_run_id', 'runId is required');
        }
        $libraryId = (string) ($body['libraryId'] ?? $body['library'] ?? 'dashboard');
        $libraryVersion = (string) ($body['libraryVersion'] ?? '1');
        $messages = $body['messages'] ?? [];
        if (!is_array($messages)) {
            throw new HttpException(400, 'invalid_messages', 'messages must be an array');
        }
        /** @var list<array{role: string, content: string}> $normalized */
        $normalized = [];
        foreach ($messages as $m) {
            if (!is_array($m)) {
                continue;
            }
            $normalized[] = [
                'role' => (string) ($m['role'] ?? 'user'),
                'content' => (string) ($m['content'] ?? ''),
            ];
        }

        $existing = isset($body['existingProgram']) && is_string($body['existingProgram'])
            ? $body['existingProgram']
            : null;
        $format = strtolower((string) ($body['format'] ?? 'ndjson'));
        if (!in_array($format, ['ndjson', 'sse'], true)) {
            $format = 'ndjson';
        }
        $fixtureId = isset($body['fixtureId']) && is_string($body['fixtureId']) ? $body['fixtureId'] : null;
        $promptOptions = is_array($body['promptOptions'] ?? null) ? $body['promptOptions'] : [];

        $injected = $this->injector->inject($libraryId, $libraryVersion, $normalized, $existing, $promptOptions);
        $request = new ChatRequest(
            $runId,
            $injected,
            $libraryId,
            $libraryVersion,
            $existing,
            $format,
            $fixtureId,
            isset($body['model']) && is_string($body['model']) ? $body['model'] : null,
        );

        return [
            'request' => $request,
            'events' => $this->boundedStream($request),
        ];
    }

    /**
     * @return \Generator<int, StreamEvent>
     */
    public function boundedStream(ChatRequest $request): \Generator
    {
        $started = time();
        $bytes = 0;
        $aborted = is_callable($this->connectionAborted)
            ? $this->connectionAborted
            : static fn (): bool => function_exists('connection_aborted') && connection_aborted() === 1;

        try {
            foreach ($this->provider->stream($request) as $event) {
                if ($aborted()) {
                    yield StreamEvent::runError($request->runId, 'client_disconnected', 'Client disconnected');
                    return;
                }
                if ((time() - $started) > $this->maxDurationSeconds) {
                    yield StreamEvent::runError($request->runId, 'duration_cap', 'Stream duration cap reached');
                    return;
                }
                $encoded = json_encode($event->toArray());
                $bytes += $encoded === false ? 0 : strlen($encoded);
                if ($bytes > $this->maxBytes) {
                    yield StreamEvent::runError($request->runId, 'byte_cap', 'Stream byte cap reached');
                    return;
                }
                yield $event;
            }
        } catch (HttpException $e) {
            yield StreamEvent::runError(
                $request->runId,
                $e->errorCode,
                $this->redactor->redact($e->getMessage())
            );
        } catch (\Throwable $e) {
            yield StreamEvent::runError(
                $request->runId,
                'internal_error',
                $this->redactor->redact('Internal inference error')
            );
        }
    }
}
