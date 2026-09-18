<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Inference;

/**
 * Encode canonical events as NDJSON or AG-UI SSE frames.
 */
final class StreamFormatter
{
    public function __construct(
        private readonly string $format = 'ndjson',
    ) {
    }

    public function contentType(): string
    {
        return $this->format === 'sse'
            ? 'text/event-stream; charset=utf-8'
            : 'application/x-ndjson; charset=utf-8';
    }

    public function format(StreamEvent $event): string
    {
        $json = json_encode($event->toArray(), JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        if ($this->format === 'sse') {
            return "event: {$event->type}\ndata: {$json}\n\n";
        }
        return $json . "\n";
    }
}
