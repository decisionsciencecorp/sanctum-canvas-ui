<?php
declare(strict_types=1);

/**
 * POST /api/tools.php — fixed allowlisted tool dispatch.
 * GET  /api/tools.php — list registered tools (auth required).
 */

require __DIR__ . '/_bootstrap.php';

use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Http\JsonResponse;

$svc = canvas_api_services();
$req = $svc['request'];
$redactor = $svc['redactor'];

try {
    if ($req->method() === 'OPTIONS') {
        JsonResponse::send(['ok' => true]);
        exit;
    }

    $auth = $svc['auth']->authenticate($req->headers());

    if ($req->method() === 'GET') {
        JsonResponse::send([
            'tools' => $svc['tools']->registry()->describe(),
        ]);
        exit;
    }

    if ($req->method() !== 'POST') {
        throw new HttpException(405, 'method_not_allowed', 'GET or POST required');
    }

    $body = $req->jsonBody(262_144);
    $result = $svc['tools']->dispatch($auth, $body, $req->headers(), $req->cookies());
    JsonResponse::send($result);
} catch (Throwable $e) {
    canvas_api_handle($e, $redactor);
}
