<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Http;

/**
 * Parse JSON body and normalize headers for API entrypoints.
 */
final class Request
{
    /**
     * @param array<string, mixed>|null $server
     * @param string|null $rawBody
     * @param array<string, string>|null $cookies
     */
    public function __construct(
        private readonly ?array $server = null,
        private readonly ?string $rawBody = null,
        private readonly ?array $cookies = null,
    ) {
    }

    public function method(): string
    {
        $s = $this->server ?? $_SERVER;
        return strtoupper((string) ($s['REQUEST_METHOD'] ?? 'GET'));
    }

    /** @return array<string, string> lowercase keys */
    public function headers(): array
    {
        $s = $this->server ?? $_SERVER;
        $out = [];
        foreach ($s as $k => $v) {
            if (!is_string($k) || !is_string($v) && !is_numeric($v)) {
                continue;
            }
            if (str_starts_with($k, 'HTTP_')) {
                $name = strtolower(str_replace('_', '-', substr($k, 5)));
                $out[$name] = (string) $v;
            }
        }
        if (isset($s['CONTENT_TYPE'])) {
            $out['content-type'] = (string) $s['CONTENT_TYPE'];
        }
        return $out;
    }

    /** @return array<string, string> */
    public function cookies(): array
    {
        if ($this->cookies !== null) {
            return $this->cookies;
        }
        $out = [];
        foreach ($_COOKIE as $k => $v) {
            if (is_string($k) && is_string($v)) {
                $out[$k] = $v;
            }
        }
        return $out;
    }

    public function rawBody(): string
    {
        if ($this->rawBody !== null) {
            return $this->rawBody;
        }
        $raw = file_get_contents('php://input');
        return $raw === false ? '' : $raw;
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonBody(int $maxBytes = 1_048_576): array
    {
        $raw = $this->rawBody();
        if (strlen($raw) > $maxBytes) {
            throw new HttpException(413, 'payload_too_large', 'Request body too large');
        }
        if ($raw === '') {
            return [];
        }
        try {
            $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            throw new HttpException(400, 'invalid_json', 'Request body must be JSON');
        }
        if (!is_array($data)) {
            throw new HttpException(400, 'invalid_json', 'JSON root must be an object');
        }
        return $data;
    }

    public function queryParam(string $name, ?string $default = null): ?string
    {
        $s = $this->server ?? $_SERVER;
        $qs = (string) ($s['QUERY_STRING'] ?? '');
        parse_str($qs, $params);
        if (!isset($params[$name])) {
            return $default;
        }
        $v = $params[$name];
        return is_string($v) ? $v : $default;
    }
}
