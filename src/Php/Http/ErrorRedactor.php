<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Http;

/**
 * Strip secrets and provider internals from client-facing errors.
 */
final class ErrorRedactor
{
    private const SENSITIVE = [
        '/sk-[a-zA-Z0-9_\-]{8,}/',
        '/Bearer\s+\S+/i',
        '/VENICE_[A-Z_]+=\S+/',
        '/api[_-]?key["\']?\s*[:=]\s*["\']?[^\s"\']+/i',
        '/password["\']?\s*[:=]\s*["\']?[^\s"\']+/i',
    ];

    public function redact(string $message): string
    {
        $out = $message;
        foreach (self::SENSITIVE as $re) {
            $out = preg_replace($re, '[REDACTED]', $out) ?? $out;
        }
        // Cap length
        if (strlen($out) > 500) {
            $out = substr($out, 0, 497) . '...';
        }
        return $out;
    }

    public function publicError(string $code, string $safeMessage, int $status = 500): array
    {
        return [
            'error' => [
                'code' => $code,
                'message' => $this->redact($safeMessage),
                'status' => $status,
            ],
        ];
    }
}
