<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Inference;

/**
 * Canonical AG-UI-shaped stream event (provider-neutral).
 *
 * @phpstan-type EventArray array{type: string, runId?: string, messageId?: string, role?: string, delta?: string, toolCallId?: string, toolName?: string, result?: mixed, error?: array{code: string, message: string}}
 */
final class StreamEvent
{
    public const RUN_STARTED = 'RUN_STARTED';
    public const RUN_FINISHED = 'RUN_FINISHED';
    public const RUN_ERROR = 'RUN_ERROR';
    public const TEXT_MESSAGE_START = 'TEXT_MESSAGE_START';
    public const TEXT_MESSAGE_CONTENT = 'TEXT_MESSAGE_CONTENT';
    public const TEXT_MESSAGE_END = 'TEXT_MESSAGE_END';
    public const TOOL_CALL_START = 'TOOL_CALL_START';
    public const TOOL_CALL_ARGS = 'TOOL_CALL_ARGS';
    public const TOOL_CALL_END = 'TOOL_CALL_END';
    public const TOOL_CALL_RESULT = 'TOOL_CALL_RESULT';

    /**
     * @param array<string, mixed> $payload
     */
    public function __construct(
        public readonly string $type,
        public readonly array $payload = [],
    ) {
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return array_merge(['type' => $this->type], $this->payload);
    }

    public static function runStarted(string $runId): self
    {
        return new self(self::RUN_STARTED, ['runId' => $runId]);
    }

    public static function runFinished(string $runId): self
    {
        return new self(self::RUN_FINISHED, ['runId' => $runId]);
    }

    public static function runError(string $runId, string $code, string $message): self
    {
        return new self(self::RUN_ERROR, [
            'runId' => $runId,
            'error' => ['code' => $code, 'message' => $message],
        ]);
    }

    public static function textStart(string $messageId, string $role = 'assistant'): self
    {
        return new self(self::TEXT_MESSAGE_START, ['messageId' => $messageId, 'role' => $role]);
    }

    public static function textDelta(string $messageId, string $delta): self
    {
        return new self(self::TEXT_MESSAGE_CONTENT, ['messageId' => $messageId, 'delta' => $delta]);
    }

    public static function textEnd(string $messageId): self
    {
        return new self(self::TEXT_MESSAGE_END, ['messageId' => $messageId]);
    }
}
