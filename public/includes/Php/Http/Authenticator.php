<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Http;

use Sanctum\Canvas\Php\Config\Env;

/**
 * Lab/API authentication.
 *
 * Accepts:
 * - Authorization: Bearer <token>
 * - X-Canvas-Auth: <token>
 *
 * Token map from CANVAS_AUTH_TOKENS JSON: {"token":{"ownerId":"…","projectId":"…"}}
 * Or CANVAS_LAB_TOKEN + CANVAS_LAB_OWNER_ID + CANVAS_LAB_PROJECT_ID for a single lab user.
 */
final class Authenticator
{
    /** @var array<string, array{ownerId: string, projectId: string}> */
    private array $tokens;

    /**
     * @param array<string, array{ownerId: string, projectId: string}>|null $tokens
     */
    public function __construct(?array $tokens = null)
    {
        $this->tokens = $tokens ?? self::loadFromEnv();
    }

    /**
     * @return array<string, array{ownerId: string, projectId: string}>
     */
    public static function loadFromEnv(): array
    {
        $raw = Env::get('CANVAS_AUTH_TOKENS');
        if ($raw !== null) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $out = [];
                foreach ($decoded as $token => $meta) {
                    if (!is_string($token) || !is_array($meta)) {
                        continue;
                    }
                    $owner = (string) ($meta['ownerId'] ?? '');
                    $project = (string) ($meta['projectId'] ?? '');
                    if ($owner !== '' && $project !== '') {
                        $out[$token] = ['ownerId' => $owner, 'projectId' => $project];
                    }
                }
                return $out;
            }
        }

        $lab = Env::get('CANVAS_LAB_TOKEN');
        if ($lab !== null) {
            return [
                $lab => [
                    'ownerId' => Env::get('CANVAS_LAB_OWNER_ID', 'lab-owner') ?? 'lab-owner',
                    'projectId' => Env::get('CANVAS_LAB_PROJECT_ID', 'lab-project') ?? 'lab-project',
                ],
            ];
        }

        // Dev/test default — never a production secret; override in real deploys.
        return [
            'canvas-lab-dev' => [
                'ownerId' => 'lab-owner',
                'projectId' => 'lab-project',
            ],
        ];
    }

    /**
     * @param array<string, string> $headers Lowercased header map
     */
    public function authenticate(array $headers): AuthContext
    {
        $token = $this->extractToken($headers);
        if ($token === null || !isset($this->tokens[$token])) {
            throw new HttpException(401, 'unauthorized', 'Authentication required');
        }
        $meta = $this->tokens[$token];
        return new AuthContext($meta['ownerId'], $meta['projectId'], substr(hash('sha256', $token), 0, 12));
    }

    /**
     * @param array<string, string> $headers
     */
    private function extractToken(array $headers): ?string
    {
        if (isset($headers['x-canvas-auth']) && $headers['x-canvas-auth'] !== '') {
            return trim($headers['x-canvas-auth']);
        }
        $auth = $headers['authorization'] ?? '';
        if (preg_match('/^\s*Bearer\s+(\S+)\s*$/i', $auth, $m)) {
            return $m[1];
        }
        return null;
    }
}
