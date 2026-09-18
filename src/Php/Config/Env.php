<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Config;

/**
 * Read environment configuration. Secrets are never hardcoded.
 *
 * Venice inference key (when needed): load from process env after sourcing
 * ~/.ssh/venice-api-moya.pass — variable names only: VENICE_API_KEY,
 * VENICE_INFERENCE_KEY. Never commit pass-file values.
 */
final class Env
{
    public static function get(string $key, ?string $default = null): ?string
    {
        $v = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
        if ($v === false || $v === null || $v === '') {
            return $default;
        }
        return (string) $v;
    }

    public static function int(string $key, int $default): int
    {
        $v = self::get($key);
        if ($v === null || !is_numeric($v)) {
            return $default;
        }
        return (int) $v;
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $v = self::get($key);
        if ($v === null) {
            return $default;
        }
        return in_array(strtolower($v), ['1', 'true', 'yes', 'on'], true);
    }

    /**
     * Resolve Venice Bearer token from env only (pass-file pattern documented above).
     */
    public static function veniceApiKey(): ?string
    {
        return self::get('VENICE_API_KEY')
            ?? self::get('VENICE_INFERENCE_KEY');
    }

    public static function veniceBaseUrl(): string
    {
        return rtrim(
            self::get('VENICE_API_BASE', 'https://api.venice.ai/api/v1') ?? 'https://api.venice.ai/api/v1',
            '/'
        );
    }

    public static function storageDriver(): string
    {
        return strtolower(self::get('CANVAS_STORAGE_DRIVER', 'sqlite') ?? 'sqlite');
    }

    public static function storagePath(): string
    {
        $default = dirname(__DIR__, 3) . '/var/storage';
        return self::get('CANVAS_STORAGE_PATH', $default) ?? $default;
    }

    public static function librariesPath(): string
    {
        $default = dirname(__DIR__, 3) . '/resources/libraries';
        return self::get('CANVAS_LIBRARIES_PATH', $default) ?? $default;
    }

    public static function fixturesPath(): string
    {
        $default = dirname(__DIR__, 3) . '/resources/fixtures';
        return self::get('CANVAS_FIXTURES_PATH', $default) ?? $default;
    }
}
