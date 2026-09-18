<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Tools;

/**
 * Redacted audit records for tool calls (no secrets / large payloads).
 */
final class ToolAuditLog
{
    /** @var list<array<string, mixed>> */
    private array $records = [];

    /**
     * @param array<string, mixed> $record
     */
    public function record(array $record): void
    {
        $safe = [
            'ts' => $record['ts'] ?? gmdate('c'),
            'tool' => (string) ($record['tool'] ?? ''),
            'classification' => (string) ($record['classification'] ?? ''),
            'ownerId' => (string) ($record['ownerId'] ?? ''),
            'projectId' => (string) ($record['projectId'] ?? ''),
            'ok' => (bool) ($record['ok'] ?? false),
            'errorCode' => $record['errorCode'] ?? null,
            'idempotencyKeyHash' => isset($record['idempotencyKey']) && is_string($record['idempotencyKey'])
                ? substr(hash('sha256', $record['idempotencyKey']), 0, 16)
                : null,
            'durationMs' => (int) ($record['durationMs'] ?? 0),
            'argBytes' => (int) ($record['argBytes'] ?? 0),
            'resultBytes' => (int) ($record['resultBytes'] ?? 0),
        ];
        $this->records[] = $safe;
        if (count($this->records) > 500) {
            $this->records = array_slice($this->records, -500);
        }
    }

    /** @return list<array<string, mixed>> */
    public function all(): array
    {
        return $this->records;
    }
}
