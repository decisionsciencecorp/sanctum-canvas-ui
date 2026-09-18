<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Tools;

use Sanctum\Canvas\Php\Http\AuthContext;

final class ToolCallContext
{
    /**
     * @param array<string, mixed> $meta
     */
    public function __construct(
        public readonly AuthContext $auth,
        public readonly ?string $idempotencyKey = null,
        public readonly bool $confirmed = false,
        public readonly array $meta = [],
    ) {
    }
}
