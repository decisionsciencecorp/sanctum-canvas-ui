<?php
declare(strict_types=1);

/**
 * SMCP / Otto control channel for lab canvases (Deep Research twin, etc.).
 *
 * GET  ?surface=deep-research&since_rev=N  → status (poll)
 * POST { "action": "paint"|"clear"|"record_submit", "surface": "…", … }
 */

require __DIR__ . '/_bootstrap.php';

use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Http\JsonResponse;
use Sanctum\Canvas\Php\Storage\LabControlStore;

$svc = canvas_api_services();
$req = $svc['request'];
$redactor = $svc['redactor'];

try {
    $svc['auth']->authenticate($req->headers());
    $store = new LabControlStore();
    $method = $req->method();

    if ($method === 'GET') {
        $surface = (string) ($req->queryParam('surface') ?? 'deep-research');
        $since = (int) ($req->queryParam('since_rev') ?? 0);
        $state = $store->read($surface);
        JsonResponse::send([
            'ok' => true,
            'changed' => ((int) $state['rev']) > $since,
            'state' => $state,
        ]);
        return;
    }

    if ($method !== 'POST') {
        throw new HttpException(405, 'method_not_allowed', 'GET or POST required');
    }

    $body = $req->jsonBody();
    $action = strtolower(trim((string) ($body['action'] ?? '')));
    $surface = (string) ($body['surface'] ?? 'deep-research');

    switch ($action) {
        case 'paint':
            $state = $store->paint($surface, $body);
            break;
        case 'clear':
            $state = $store->clear($surface, $body);
            break;
        case 'record_submit':
            $state = $store->recordSubmit($surface, is_array($body['submit'] ?? null) ? $body['submit'] : $body);
            break;
        case 'status':
            $state = $store->read($surface);
            break;
        default:
            throw new HttpException(400, 'unknown_action', 'action must be paint|clear|record_submit|status');
    }

    JsonResponse::send(['ok' => true, 'state' => $state]);
} catch (Throwable $e) {
    canvas_api_handle($e, $redactor);
}
