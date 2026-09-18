<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Http;

/**
 * Simple fixed-window rate limiter (file or memory).
 */
final class RateLimiter
{
    /** @var array<string, array{count: int, reset: int}> */
    private array $memory = [];

    public function __construct(
        private readonly ?string $persistDir = null,
        private readonly int $maxRequests = 60,
        private readonly int $windowSeconds = 60,
    ) {
        if ($this->persistDir !== null && !is_dir($this->persistDir)) {
            mkdir($this->persistDir, 0700, true);
        }
    }

    public function hit(string $key): void
    {
        $now = time();
        $state = $this->load($key);
        if ($state === null || $state['reset'] <= $now) {
            $state = ['count' => 0, 'reset' => $now + $this->windowSeconds];
        }
        $state['count']++;
        $this->save($key, $state);
        if ($state['count'] > $this->maxRequests) {
            throw new HttpException(429, 'rate_limited', 'Rate limit exceeded');
        }
    }

    /** @return array{count: int, reset: int}|null */
    private function load(string $key): ?array
    {
        if ($this->persistDir === null) {
            return $this->memory[$key] ?? null;
        }
        $path = $this->pathFor($key);
        if (!is_file($path)) {
            return null;
        }
        $raw = file_get_contents($path);
        if ($raw === false) {
            return null;
        }
        $data = json_decode($raw, true);
        return is_array($data) ? ['count' => (int) ($data['count'] ?? 0), 'reset' => (int) ($data['reset'] ?? 0)] : null;
    }

    /** @param array{count: int, reset: int} $state */
    private function save(string $key, array $state): void
    {
        if ($this->persistDir === null) {
            $this->memory[$key] = $state;
            return;
        }
        file_put_contents($this->pathFor($key), json_encode($state), LOCK_EX);
    }

    private function pathFor(string $key): string
    {
        return rtrim((string) $this->persistDir, '/') . '/' . hash('sha256', $key) . '.json';
    }
}
