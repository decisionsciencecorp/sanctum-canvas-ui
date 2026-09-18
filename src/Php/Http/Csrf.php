<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Http;

/**
 * Double-submit CSRF for browser-originated writes.
 */
final class Csrf
{
    public const HEADER = 'X-CSRF-Token';
    public const COOKIE = 'canvas_csrf';

    public function __construct(
        private readonly string $secret = 'canvas-csrf-dev',
    ) {
    }

    public function mint(string $sessionKey): string
    {
        $nonce = bin2hex(random_bytes(16));
        $sig = hash_hmac('sha256', $sessionKey . '|' . $nonce, $this->secret);
        return $nonce . '.' . $sig;
    }

    public function validate(string $sessionKey, ?string $token): bool
    {
        if ($token === null || $token === '' || !str_contains($token, '.')) {
            return false;
        }
        [$nonce, $sig] = explode('.', $token, 2);
        if ($nonce === '' || $sig === '' || !ctype_xdigit($nonce)) {
            return false;
        }
        $expected = hash_hmac('sha256', $sessionKey . '|' . $nonce, $this->secret);
        return hash_equals($expected, $sig);
    }

    /**
     * @param array<string, string> $headers
     * @param array<string, string> $cookies
     */
    public function requireValid(string $sessionKey, array $headers, array $cookies = []): void
    {
        $token = $headers['x-csrf-token'] ?? $cookies[self::COOKIE] ?? null;
        if (!$this->validate($sessionKey, $token)) {
            throw new HttpException(403, 'csrf_failed', 'CSRF validation failed');
        }
    }
}
