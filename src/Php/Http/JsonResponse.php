<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Http;

final class JsonResponse
{
    /**
     * @param array<string, mixed> $data
     * @param array<string, string> $headers
     */
    public static function send(array $data, int $status = 200, array $headers = []): void
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
            header('X-Content-Type-Options: nosniff');
            foreach ($headers as $k => $v) {
                header("{$k}: {$v}");
            }
        }
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }

    public static function error(HttpException $e, ErrorRedactor $redactor): void
    {
        self::send($redactor->publicError($e->errorCode, $e->getMessage(), $e->status), $e->status);
    }
}
