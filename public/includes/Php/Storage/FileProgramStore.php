<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Storage;

use Sanctum\Canvas\Php\Http\HttpException;

/**
 * File-backed program store (owner/project isolation via directory layout).
 */
final class FileProgramStore implements ProgramStore
{
    public function __construct(
        private readonly string $rootDir,
    ) {
        if (!is_dir($this->rootDir)) {
            mkdir($this->rootDir, 0700, true);
        }
    }

    public function save(string $ownerId, string $projectId, string $programId, array $payload): array
    {
        ProgramLimits::assertProgramId($programId);
        $source = (string) ($payload['source'] ?? '');
        ProgramLimits::assertSource($source);
        $state = isset($payload['state']) && is_array($payload['state']) ? $payload['state'] : null;
        ProgramLimits::assertState($state);

        $now = gmdate('c');
        $record = [
            'id' => $programId,
            'ownerId' => $ownerId,
            'projectId' => $projectId,
            'libraryId' => (string) ($payload['libraryId'] ?? 'dashboard'),
            'libraryVersion' => (string) ($payload['libraryVersion'] ?? '1'),
            'source' => $source,
            'state' => $state,
            'revision' => 0,
            'createdAt' => $now,
            'updatedAt' => $now,
            'revisions' => [
                [
                    'revision' => 0,
                    'createdAt' => $now,
                    'source' => $source,
                    'state' => $state,
                    'libraryVersion' => (string) ($payload['libraryVersion'] ?? '1'),
                ],
            ],
        ];
        $this->write($ownerId, $projectId, $programId, $record);
        return $this->publicView($record);
    }

    public function get(string $ownerId, string $projectId, string $programId): ?array
    {
        ProgramLimits::assertProgramId($programId);
        $record = $this->read($ownerId, $projectId, $programId);
        return $record === null ? null : $this->publicView($record);
    }

    public function patch(string $ownerId, string $projectId, string $programId, array $patch): array
    {
        ProgramLimits::assertProgramId($programId);
        $record = $this->read($ownerId, $projectId, $programId);
        if ($record === null) {
            throw new HttpException(404, 'program_not_found', 'Program not found');
        }
        if (isset($patch['source'])) {
            $source = (string) $patch['source'];
            ProgramLimits::assertSource($source);
            $record['source'] = $source;
        }
        if (array_key_exists('state', $patch)) {
            $state = is_array($patch['state']) ? $patch['state'] : null;
            ProgramLimits::assertState($state);
            $record['state'] = $state;
        }
        if (isset($patch['libraryVersion'])) {
            $record['libraryVersion'] = (string) $patch['libraryVersion'];
        }
        $now = gmdate('c');
        $rev = (int) $record['revision'] + 1;
        $record['revision'] = $rev;
        $record['updatedAt'] = $now;
        $record['revisions'][] = [
            'revision' => $rev,
            'createdAt' => $now,
            'source' => $record['source'],
            'state' => $record['state'],
            'libraryVersion' => $record['libraryVersion'],
        ];
        $record['revisions'] = $this->trimRevisions($record['revisions']);
        $this->write($ownerId, $projectId, $programId, $record);
        return $this->publicView($record);
    }

    public function rollback(string $ownerId, string $projectId, string $programId, int $toRevision = -1): array
    {
        ProgramLimits::assertProgramId($programId);
        $record = $this->read($ownerId, $projectId, $programId);
        if ($record === null) {
            throw new HttpException(404, 'program_not_found', 'Program not found');
        }
        /** @var list<array<string, mixed>> $revs */
        $revs = $record['revisions'];
        if ($revs === []) {
            throw new HttpException(409, 'no_revisions', 'No revisions to roll back');
        }
        if ($toRevision < 0) {
            // previous valid revision
            $idx = count($revs) - 2;
            if ($idx < 0) {
                throw new HttpException(409, 'no_prior_revision', 'No prior revision');
            }
            $target = $revs[$idx];
        } else {
            $target = null;
            foreach ($revs as $r) {
                if ((int) $r['revision'] === $toRevision) {
                    $target = $r;
                    break;
                }
            }
            if ($target === null) {
                throw new HttpException(404, 'revision_not_found', 'Revision not found');
            }
        }
        $now = gmdate('c');
        $newRev = (int) $record['revision'] + 1;
        $record['source'] = (string) $target['source'];
        $record['state'] = $target['state'] ?? null;
        $record['libraryVersion'] = (string) ($target['libraryVersion'] ?? $record['libraryVersion']);
        $record['revision'] = $newRev;
        $record['updatedAt'] = $now;
        $record['revisions'][] = [
            'revision' => $newRev,
            'createdAt' => $now,
            'source' => $record['source'],
            'state' => $record['state'],
            'libraryVersion' => $record['libraryVersion'],
            'rollbackOf' => (int) $target['revision'],
        ];
        $record['revisions'] = $this->trimRevisions($record['revisions']);
        $this->write($ownerId, $projectId, $programId, $record);
        return $this->publicView($record);
    }

    public function listRevisions(string $ownerId, string $projectId, string $programId): array
    {
        ProgramLimits::assertProgramId($programId);
        $record = $this->read($ownerId, $projectId, $programId);
        if ($record === null) {
            throw new HttpException(404, 'program_not_found', 'Program not found');
        }
        $out = [];
        foreach ($record['revisions'] as $r) {
            $out[] = [
                'revision' => (int) $r['revision'],
                'createdAt' => (string) $r['createdAt'],
                'sourceBytes' => strlen((string) $r['source']),
            ];
        }
        return $out;
    }

    public function delete(string $ownerId, string $projectId, string $programId): bool
    {
        ProgramLimits::assertProgramId($programId);
        $path = $this->path($ownerId, $projectId, $programId);
        if (!is_file($path)) {
            return false;
        }
        return unlink($path);
    }

    /** @param array<string, mixed> $record */
    private function write(string $ownerId, string $projectId, string $programId, array $record): void
    {
        $dir = $this->dir($ownerId, $projectId);
        if (!is_dir($dir)) {
            mkdir($dir, 0700, true);
        }
        $path = $this->path($ownerId, $projectId, $programId);
        $tmp = $path . '.tmp';
        file_put_contents($tmp, json_encode($record, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES), LOCK_EX);
        rename($tmp, $path);
    }

    /** @return array<string, mixed>|null */
    private function read(string $ownerId, string $projectId, string $programId): ?array
    {
        $path = $this->path($ownerId, $projectId, $programId);
        if (!is_file($path)) {
            return null;
        }
        $raw = file_get_contents($path);
        if ($raw === false) {
            return null;
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            return null;
        }
        // IDOR resistance: path already scopes; double-check embedded ids
        if (($data['ownerId'] ?? '') !== $ownerId || ($data['projectId'] ?? '') !== $projectId) {
            return null;
        }
        return $data;
    }

    private function dir(string $ownerId, string $projectId): string
    {
        return rtrim($this->rootDir, '/') . '/' . $this->safeSeg($ownerId) . '/' . $this->safeSeg($projectId);
    }

    private function path(string $ownerId, string $projectId, string $programId): string
    {
        return $this->dir($ownerId, $projectId) . '/' . $programId . '.json';
    }

    private function safeSeg(string $s): string
    {
        return hash('sha256', $s);
    }

    /**
     * @param list<array<string, mixed>> $revs
     * @return list<array<string, mixed>>
     */
    private function trimRevisions(array $revs): array
    {
        if (count($revs) <= ProgramLimits::MAX_REVISIONS) {
            return $revs;
        }
        return array_values(array_slice($revs, -ProgramLimits::MAX_REVISIONS));
    }

    /**
     * @param array<string, mixed> $record
     * @return array<string, mixed>
     */
    private function publicView(array $record): array
    {
        return [
            'id' => $record['id'],
            'ownerId' => $record['ownerId'],
            'projectId' => $record['projectId'],
            'libraryId' => $record['libraryId'],
            'libraryVersion' => $record['libraryVersion'],
            'source' => $record['source'],
            'state' => $record['state'],
            'revision' => $record['revision'],
            'createdAt' => $record['createdAt'],
            'updatedAt' => $record['updatedAt'],
        ];
    }
}
