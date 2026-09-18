<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Tools;

/**
 * Fixed tool definition — never constructed from model-supplied callables/URLs/SQL.
 */
final class ToolDefinition
{
    public const CLASS_READ = 'read';
    public const CLASS_WRITE = 'write';
    public const CLASS_DESTRUCTIVE = 'destructive';

    /**
     * @param array<string, mixed> $argumentSchema JSON Schema
     * @param callable(array<string, mixed>, ToolCallContext): array{ok: bool, data?: mixed, error?: string} $handler
     */
    public function __construct(
        public readonly string $name,
        public readonly string $classification,
        public readonly array $argumentSchema,
        public readonly mixed $handler,
        public readonly string $description = '',
        public readonly bool $requiresConfirmation = false,
        public readonly int $timeoutMs = 5000,
        public readonly int $maxResultBytes = 65_536,
    ) {
        if (!preg_match('/^[a-z][a-z0-9_]{0,63}$/', $this->name)) {
            throw new \InvalidArgumentException('Invalid tool name');
        }
        if (!in_array($this->classification, [self::CLASS_READ, self::CLASS_WRITE, self::CLASS_DESTRUCTIVE], true)) {
            throw new \InvalidArgumentException('Invalid classification');
        }
        if (!is_callable($this->handler)) {
            throw new \InvalidArgumentException('Handler must be callable');
        }
    }

    public function isWrite(): bool
    {
        return $this->classification !== self::CLASS_READ;
    }
}
