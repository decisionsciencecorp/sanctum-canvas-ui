<?php
declare(strict_types=1);

/**
 * GET /api/csrf.php — mint a CSRF token for the authenticated scope.
 */

require __DIR__ . '/_bootstrap.php';

use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Http\JsonResponse;

$svc = canvas_api_services();
$req = $svc['request'];
$redactor = $svc['redactor'];

try {
    if ($req->method() !== 'GET' && $req->method() !== 'POST') {
        throw new HttpException(405, 'method_not_allowed', 'GET or POST required');
    }
    $auth = $svc['auth']->authenticate($req->headers());
    $token = $svc['csrf']->mint($auth->scopeKey());
    if (!headers_sent()) {
        setcookie('canvas_csrf', $token, [
            'expires' => time() + 3600,
            'path' => '/',
            'httponly' => false,
            'samesite' => 'Strict',
        ]);
    }
    JsonResponse::send(['csrfToken' => $token, 'header' => 'X-CSRF-Token']);
} catch (Throwable $e) {
    canvas_api_handle($e, $redactor);
}
