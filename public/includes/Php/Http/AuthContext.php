<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Http;

/**
 * Authenticated request scope (owner + project). Lab tokens map here.
 */
final class AuthContext
{
    public function __construct(
        public readonly string $ownerId,
        public readonly string $projectId,
        public readonly string $tokenId = 'default',
    ) {
    }

    public function scopeKey(): string
    {
        return $this->ownerId . ':' . $this->projectId;
    }
}
