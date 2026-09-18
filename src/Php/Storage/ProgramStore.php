<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Storage;

/**
 * Program + state + edit-history persistence (owner/project scoped).
 */
interface ProgramStore
{
    /**
     * @param array{source: string, libraryId: string, libraryVersion: string, state?: array<string, mixed>|null} $payload
     * @return array<string, mixed> saved record
     */
    public function save(string $ownerId, string $projectId, string $programId, array $payload): array;

    /** @return array<string, mixed>|null */
    public function get(string $ownerId, string $projectId, string $programId): ?array;

    /**
     * Merge patch source / state; append revision.
     *
     * @param array{source?: string, state?: array<string, mixed>, libraryVersion?: string} $patch
     * @return array<string, mixed>
     */
    public function patch(string $ownerId, string $projectId, string $programId, array $patch): array;

    /**
     * Roll back to a prior revision index (0-based) or previous (-1).
     *
     * @return array<string, mixed>
     */
    public function rollback(string $ownerId, string $projectId, string $programId, int $toRevision = -1): array;

    /** @return list<array{revision: int, createdAt: string, sourceBytes: int}> */
    public function listRevisions(string $ownerId, string $projectId, string $programId): array;

    public function delete(string $ownerId, string $projectId, string $programId): bool;
}
