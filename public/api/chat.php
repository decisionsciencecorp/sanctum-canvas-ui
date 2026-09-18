<?php
declare(strict_types=1);

/**
 * POST /api/chat.php — authenticated inference stream.
 *
 * JSON body: messages, runId, libraryId, libraryVersion?, existingProgram?,
 *            provider? (fake|fixture|venice), fixtureId?, format? (ndjson|sse)
 *
 * Venice key: VENICE_API_KEY / VENICE_INFERENCE_KEY from env (source
 * ~/.ssh/venice-api-moya.pass) — never hardcoded.
 */

require __DIR__ . '/_bootstrap.php';

use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Http\JsonResponse;
use Sanctum\Canvas\Php\Inference\ChatService;
use Sanctum\Canvas\Php\Inference\StreamFormatter;

$svc = canvas_api_services();
$req = $svc['request'];
$redactor = $svc['redactor'];
$body = [];

try {
    if ($req->method() === 'OPTIONS') {
        JsonResponse::send(['ok' => true]);
        exit;
    }
    if ($req->method() !== 'POST') {
        throw new HttpException(405, 'method_not_allowed', 'POST required');
    }

    $auth = $svc['auth']->authenticate($req->headers());
    $svc['rate']->hit('chat:' . $auth->scopeKey());

    $body = $req->jsonBody(1_048_576);
    $providerName = isset($body['provider']) && is_string($body['provider']) ? $body['provider'] : null;
    $fixtureId = isset($body['fixtureId']) && is_string($body['fixtureId']) ? $body['fixtureId'] : null;
    // Default offline: fixture when fixtureId set, else fake — never require Venice
    if ($providerName === null && $fixtureId === null) {
        $providerName = 'fake';
    }

    $provider = $svc['providers']->resolveForRequest($providerName, $fixtureId);
    if ($fixtureId !== null) {
        $body['fixtureId'] = $fixtureId;
    }

    $chat = ChatService::capsFromEnv($provider, $svc['injector']);
    $prepared = $chat->prepare($body);
    $formatter = new StreamFormatter($prepared['request']->format);

    if (!headers_sent()) {
        header('Content-Type: ' . $formatter->contentType());
        header('Cache-Control: no-cache, no-transform');
        header('X-Accel-Buffering: no');
        header('X-Content-Type-Options: nosniff');
    }
    // Disable output buffering for streaming
    while (ob_get_level() > 0) {
        ob_end_flush();
    }

    foreach ($prepared['events'] as $event) {
        echo $formatter->format($event);
        if (function_exists('flush')) {
            flush();
        }
        if (connection_aborted()) {
            break;
        }
    }
} catch (Throwable $e) {
    // If headers already streaming, emit a terminal error frame when possible
    if (headers_sent()) {
        $code = $e instanceof HttpException ? $e->errorCode : 'internal_error';
        $msg = $redactor->redact($e instanceof HttpException ? $e->getMessage() : 'Internal error');
        $runId = is_array($body ?? null) && isset($body['runId']) ? (string) $body['runId'] : 'unknown';
        $frame = json_encode([
            'type' => 'RUN_ERROR',
            'runId' => $runId,
            'error' => ['code' => $code, 'message' => $msg],
        ]);
        echo $frame . "\n";
        exit;
    }
    canvas_api_handle($e, $redactor);
}
