<?php
declare(strict_types=1);

/**
 * Program persistence router.
 *
 * POST   /api/programs/save.php
 * GET    /api/programs/get.php?id=
 * POST   /api/programs/patch.php
 * POST   /api/programs/rollback.php
 * GET    /api/programs/revisions.php?id=
 */

require dirname(__DIR__) . '/_bootstrap.php';

use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Http\JsonResponse;

$svc = canvas_api_services();
$req = $svc['request'];
$redactor = $svc['redactor'];
$action = basename($_SERVER['SCRIPT_NAME'] ?? 'save.php', '.php');

try {
    $auth = $svc['auth']->authenticate($req->headers());
    $ctrl = $svc['programs'];

    switch ($action) {
        case 'save':
            if ($req->method() !== 'POST') {
                throw new HttpException(405, 'method_not_allowed', 'POST required');
            }
            $body = $req->jsonBody();
            JsonResponse::send(['program' => $ctrl->save($auth, $body, $req->headers(), $req->cookies())]);
            break;

        case 'get':
            if ($req->method() !== 'GET' && $req->method() !== 'POST') {
                throw new HttpException(405, 'method_not_allowed', 'GET or POST required');
            }
            $id = $req->queryParam('id');
            if ($id === null && $req->method() === 'POST') {
                $body = $req->jsonBody();
                $id = isset($body['id']) ? (string) $body['id'] : null;
            }
            if ($id === null || $id === '') {
                throw new HttpException(400, 'missing_id', 'Program id required');
            }
            JsonResponse::send(['program' => $ctrl->get($auth, $id)]);
            break;

        case 'patch':
            if ($req->method() !== 'POST' && $req->method() !== 'PATCH') {
                throw new HttpException(405, 'method_not_allowed', 'POST required');
            }
            $body = $req->jsonBody();
            $id = (string) ($body['id'] ?? $body['programId'] ?? '');
            if ($id === '') {
                throw new HttpException(400, 'missing_id', 'Program id required');
            }
            JsonResponse::send(['program' => $ctrl->patch($auth, $id, $body, $req->headers(), $req->cookies())]);
            break;

        case 'rollback':
            if ($req->method() !== 'POST') {
                throw new HttpException(405, 'method_not_allowed', 'POST required');
            }
            $body = $req->jsonBody();
            $id = (string) ($body['id'] ?? $body['programId'] ?? '');
            if ($id === '') {
                throw new HttpException(400, 'missing_id', 'Program id required');
            }
            JsonResponse::send(['program' => $ctrl->rollback($auth, $id, $body, $req->headers(), $req->cookies())]);
            break;

        case 'revisions':
            $id = $req->queryParam('id');
            if ($id === null || $id === '') {
                throw new HttpException(400, 'missing_id', 'Program id required');
            }
            JsonResponse::send(['revisions' => $ctrl->revisions($auth, $id)]);
            break;

        default:
            throw new HttpException(404, 'unknown_action', 'Unknown programs action');
    }
} catch (Throwable $e) {
    canvas_api_handle($e, $redactor);
}
