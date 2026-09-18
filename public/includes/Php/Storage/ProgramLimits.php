<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Storage;

use Sanctum\Canvas\Php\Http\HttpException;

/**
 * Shared validation / size limits for program payloads.
 */
final class ProgramLimits
{
    public const MAX_SOURCE_BYTES = 500_000;
    public const MAX_STATE_BYTES = 200_000;
    public const MAX_REVISIONS = 50;
    public const MAX_PROGRAM_ID_LEN = 64;

    public static function assertProgramId(string $programId): void
    {
        if (!preg_match('/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/', $programId)) {
            throw new HttpException(400, 'invalid_program_id', 'Invalid program id');
        }
    }

    public static function assertSource(string $source): void
    {
        if (strlen($source) > self::MAX_SOURCE_BYTES) {
            throw new HttpException(413, 'source_too_large', 'Program source too large');
        }
    }

    /**
     * @param array<string, mixed>|null $state
     */
    public static function assertState(?array $state): void
    {
        if ($state === null) {
            return;
        }
        $encoded = json_encode($state);
        if ($encoded === false || strlen($encoded) > self::MAX_STATE_BYTES) {
            throw new HttpException(413, 'state_too_large', 'Program state too large');
        }
    }
}
