<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Storage;

use Sanctum\Canvas\Php\Http\AuthContext;
use Sanctum\Canvas\Php\Http\Csrf;
use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Http\RateLimiter;

/**
 * HTTP-facing program persistence with CSRF + IDOR (owner/project) enforcement.
 */
final class ProgramController
{
    public function __construct(
        private readonly ProgramStore $store,
        private readonly Csrf $csrf = new Csrf(),
        private readonly RateLimiter $rateLimiter = new RateLimiter(null, 120, 60),
    ) {
    }

    public function store(): ProgramStore
    {
        return $this->store;
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, string> $headers
     * @param array<string, string> $cookies
     * @return array<string, mixed>
     */
    public function save(AuthContext $auth, array $body, array $headers, array $cookies): array
    {
        $this->csrf->requireValid($auth->scopeKey(), $headers, $cookies);
        $this->rateLimiter->hit('programs:' . $auth->scopeKey());
        $programId = (string) ($body['id'] ?? $body['programId'] ?? '');
        ProgramLimits::assertProgramId($programId);
        // Ignore any client-supplied owner/project — scope from auth only (IDOR)
        return $this->store->save($auth->ownerId, $auth->projectId, $programId, [
            'source' => (string) ($body['source'] ?? ''),
            'libraryId' => (string) ($body['libraryId'] ?? 'dashboard'),
            'libraryVersion' => (string) ($body['libraryVersion'] ?? '1'),
            'state' => isset($body['state']) && is_array($body['state']) ? $body['state'] : null,
        ]);
    }

    public function get(AuthContext $auth, string $programId): array
    {
        $this->rateLimiter->hit('programs:' . $auth->scopeKey());
        $record = $this->store->get($auth->ownerId, $auth->projectId, $programId);
        if ($record === null) {
            throw new HttpException(404, 'program_not_found', 'Program not found');
        }
        return $record;
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, string> $headers
     * @param array<string, string> $cookies
     * @return array<string, mixed>
     */
    public function patch(AuthContext $auth, string $programId, array $body, array $headers, array $cookies): array
    {
        $this->csrf->requireValid($auth->scopeKey(), $headers, $cookies);
        $this->rateLimiter->hit('programs:' . $auth->scopeKey());
        return $this->store->patch($auth->ownerId, $auth->projectId, $programId, $body);
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, string> $headers
     * @param array<string, string> $cookies
     * @return array<string, mixed>
     */
    public function rollback(AuthContext $auth, string $programId, array $body, array $headers, array $cookies): array
    {
        $this->csrf->requireValid($auth->scopeKey(), $headers, $cookies);
        $this->rateLimiter->hit('programs:' . $auth->scopeKey());
        $to = isset($body['revision']) ? (int) $body['revision'] : -1;
        return $this->store->rollback($auth->ownerId, $auth->projectId, $programId, $to);
    }

    /**
     * @return list<array{revision: int, createdAt: string, sourceBytes: int}>
     */
    public function revisions(AuthContext $auth, string $programId): array
    {
        $this->rateLimiter->hit('programs:' . $auth->scopeKey());
        return $this->store->listRevisions($auth->ownerId, $auth->projectId, $programId);
    }
}
