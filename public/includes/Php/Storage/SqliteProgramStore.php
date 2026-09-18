<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Storage;

use Sanctum\Canvas\Php\Http\HttpException;

/**
 * SQLite program store with idempotent schema migrations.
 */
final class SqliteProgramStore implements ProgramStore
{
    private \PDO $pdo;

    public function __construct(string $dbPath)
    {
        $dir = dirname($dbPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0700, true);
        }
        $this->pdo = new \PDO('sqlite:' . $dbPath, null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
        ]);
        $this->pdo->exec('PRAGMA foreign_keys = ON');
        $this->migrate();
    }

    /** Idempotent schema */
    public function migrate(): void
    {
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS schema_migrations (
                id TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            )'
        );
        $this->applyMigration('001_programs', function (): void {
            $this->pdo->exec(
                'CREATE TABLE IF NOT EXISTS programs (
                    owner_id TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    program_id TEXT NOT NULL,
                    library_id TEXT NOT NULL,
                    library_version TEXT NOT NULL,
                    source TEXT NOT NULL,
                    state_json TEXT,
                    revision INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (owner_id, project_id, program_id)
                )'
            );
            $this->pdo->exec(
                'CREATE TABLE IF NOT EXISTS program_revisions (
                    owner_id TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    program_id TEXT NOT NULL,
                    revision INTEGER NOT NULL,
                    source TEXT NOT NULL,
                    state_json TEXT,
                    library_version TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    rollback_of INTEGER,
                    PRIMARY KEY (owner_id, project_id, program_id, revision)
                )'
            );
            $this->pdo->exec(
                'CREATE INDEX IF NOT EXISTS idx_program_revisions_lookup
                 ON program_revisions (owner_id, project_id, program_id)'
            );
        });
    }

    private function applyMigration(string $id, callable $fn): void
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM schema_migrations WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->fetchColumn()) {
            return;
        }
        $fn();
        $ins = $this->pdo->prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');
        $ins->execute([$id, gmdate('c')]);
    }

    public function save(string $ownerId, string $projectId, string $programId, array $payload): array
    {
        ProgramLimits::assertProgramId($programId);
        $source = (string) ($payload['source'] ?? '');
        ProgramLimits::assertSource($source);
        $state = isset($payload['state']) && is_array($payload['state']) ? $payload['state'] : null;
        ProgramLimits::assertState($state);
        $now = gmdate('c');
        $libraryId = (string) ($payload['libraryId'] ?? 'dashboard');
        $libraryVersion = (string) ($payload['libraryVersion'] ?? '1');
        $stateJson = $state === null ? null : json_encode($state, JSON_THROW_ON_ERROR);

        $this->pdo->beginTransaction();
        try {
            $this->pdo->prepare(
                'INSERT OR REPLACE INTO programs
                 (owner_id, project_id, program_id, library_id, library_version, source, state_json, revision, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)'
            )->execute([$ownerId, $projectId, $programId, $libraryId, $libraryVersion, $source, $stateJson, $now, $now]);

            $this->pdo->prepare(
                'DELETE FROM program_revisions WHERE owner_id = ? AND project_id = ? AND program_id = ?'
            )->execute([$ownerId, $projectId, $programId]);

            $this->pdo->prepare(
                'INSERT INTO program_revisions
                 (owner_id, project_id, program_id, revision, source, state_json, library_version, created_at, rollback_of)
                 VALUES (?, ?, ?, 0, ?, ?, ?, ?, NULL)'
            )->execute([$ownerId, $projectId, $programId, $source, $stateJson, $libraryVersion, $now]);

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }

        return $this->get($ownerId, $projectId, $programId) ?? [];
    }

    public function get(string $ownerId, string $projectId, string $programId): ?array
    {
        ProgramLimits::assertProgramId($programId);
        $stmt = $this->pdo->prepare(
            'SELECT * FROM programs WHERE owner_id = ? AND project_id = ? AND program_id = ?'
        );
        $stmt->execute([$ownerId, $projectId, $programId]);
        $row = $stmt->fetch();
        if ($row === false) {
            return null;
        }
        return $this->rowToPublic($row);
    }

    public function patch(string $ownerId, string $projectId, string $programId, array $patch): array
    {
        ProgramLimits::assertProgramId($programId);
        $current = $this->get($ownerId, $projectId, $programId);
        if ($current === null) {
            throw new HttpException(404, 'program_not_found', 'Program not found');
        }
        $source = array_key_exists('source', $patch) ? (string) $patch['source'] : (string) $current['source'];
        ProgramLimits::assertSource($source);
        $state = array_key_exists('state', $patch)
            ? (is_array($patch['state']) ? $patch['state'] : null)
            : $current['state'];
        ProgramLimits::assertState($state);
        $libraryVersion = isset($patch['libraryVersion'])
            ? (string) $patch['libraryVersion']
            : (string) $current['libraryVersion'];
        $now = gmdate('c');
        $rev = (int) $current['revision'] + 1;
        $stateJson = $state === null ? null : json_encode($state, JSON_THROW_ON_ERROR);

        $this->pdo->beginTransaction();
        try {
            $this->pdo->prepare(
                'UPDATE programs SET source = ?, state_json = ?, library_version = ?, revision = ?, updated_at = ?
                 WHERE owner_id = ? AND project_id = ? AND program_id = ?'
            )->execute([$source, $stateJson, $libraryVersion, $rev, $now, $ownerId, $projectId, $programId]);

            $this->pdo->prepare(
                'INSERT INTO program_revisions
                 (owner_id, project_id, program_id, revision, source, state_json, library_version, created_at, rollback_of)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)'
            )->execute([$ownerId, $projectId, $programId, $rev, $source, $stateJson, $libraryVersion, $now]);

            $this->trimRevisions($ownerId, $projectId, $programId);
            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }

        return $this->get($ownerId, $projectId, $programId) ?? [];
    }

    public function rollback(string $ownerId, string $projectId, string $programId, int $toRevision = -1): array
    {
        ProgramLimits::assertProgramId($programId);
        $revs = $this->fetchRevisions($ownerId, $projectId, $programId);
        if ($revs === []) {
            throw new HttpException(404, 'program_not_found', 'Program not found');
        }
        if ($toRevision < 0) {
            if (count($revs) < 2) {
                throw new HttpException(409, 'no_prior_revision', 'No prior revision');
            }
            $target = $revs[count($revs) - 2];
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
        $current = $this->get($ownerId, $projectId, $programId);
        if ($current === null) {
            throw new HttpException(404, 'program_not_found', 'Program not found');
        }
        $newRev = (int) $current['revision'] + 1;
        $source = (string) $target['source'];
        $stateJson = $target['state_json'];
        $libraryVersion = (string) $target['library_version'];

        $this->pdo->beginTransaction();
        try {
            $this->pdo->prepare(
                'UPDATE programs SET source = ?, state_json = ?, library_version = ?, revision = ?, updated_at = ?
                 WHERE owner_id = ? AND project_id = ? AND program_id = ?'
            )->execute([$source, $stateJson, $libraryVersion, $newRev, $now, $ownerId, $projectId, $programId]);

            $this->pdo->prepare(
                'INSERT INTO program_revisions
                 (owner_id, project_id, program_id, revision, source, state_json, library_version, created_at, rollback_of)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                $ownerId, $projectId, $programId, $newRev, $source, $stateJson, $libraryVersion, $now,
                (int) $target['revision'],
            ]);
            $this->trimRevisions($ownerId, $projectId, $programId);
            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }

        return $this->get($ownerId, $projectId, $programId) ?? [];
    }

    public function listRevisions(string $ownerId, string $projectId, string $programId): array
    {
        ProgramLimits::assertProgramId($programId);
        $rows = $this->fetchRevisions($ownerId, $projectId, $programId);
        if ($rows === [] && $this->get($ownerId, $projectId, $programId) === null) {
            throw new HttpException(404, 'program_not_found', 'Program not found');
        }
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'revision' => (int) $r['revision'],
                'createdAt' => (string) $r['created_at'],
                'sourceBytes' => strlen((string) $r['source']),
            ];
        }
        return $out;
    }

    public function delete(string $ownerId, string $projectId, string $programId): bool
    {
        ProgramLimits::assertProgramId($programId);
        $this->pdo->prepare(
            'DELETE FROM program_revisions WHERE owner_id = ? AND project_id = ? AND program_id = ?'
        )->execute([$ownerId, $projectId, $programId]);
        $stmt = $this->pdo->prepare(
            'DELETE FROM programs WHERE owner_id = ? AND project_id = ? AND program_id = ?'
        );
        $stmt->execute([$ownerId, $projectId, $programId]);
        return $stmt->rowCount() > 0;
    }

    /** @return list<array<string, mixed>> */
    private function fetchRevisions(string $ownerId, string $projectId, string $programId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM program_revisions
             WHERE owner_id = ? AND project_id = ? AND program_id = ?
             ORDER BY revision ASC'
        );
        $stmt->execute([$ownerId, $projectId, $programId]);
        /** @var list<array<string, mixed>> */
        return $stmt->fetchAll();
    }

    private function trimRevisions(string $ownerId, string $projectId, string $programId): void
    {
        $rows = $this->fetchRevisions($ownerId, $projectId, $programId);
        if (count($rows) <= ProgramLimits::MAX_REVISIONS) {
            return;
        }
        $drop = array_slice($rows, 0, count($rows) - ProgramLimits::MAX_REVISIONS);
        $del = $this->pdo->prepare(
            'DELETE FROM program_revisions WHERE owner_id = ? AND project_id = ? AND program_id = ? AND revision = ?'
        );
        foreach ($drop as $r) {
            $del->execute([$ownerId, $projectId, $programId, (int) $r['revision']]);
        }
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function rowToPublic(array $row): array
    {
        $state = null;
        if (isset($row['state_json']) && is_string($row['state_json']) && $row['state_json'] !== '') {
            $decoded = json_decode($row['state_json'], true);
            $state = is_array($decoded) ? $decoded : null;
        }
        return [
            'id' => $row['program_id'],
            'ownerId' => $row['owner_id'],
            'projectId' => $row['project_id'],
            'libraryId' => $row['library_id'],
            'libraryVersion' => $row['library_version'],
            'source' => $row['source'],
            'state' => $state,
            'revision' => (int) $row['revision'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }
}
