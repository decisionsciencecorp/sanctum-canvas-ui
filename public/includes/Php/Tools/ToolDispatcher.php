<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Tools;

use Sanctum\Canvas\Php\Http\AuthContext;
use Sanctum\Canvas\Php\Http\Csrf;
use Sanctum\Canvas\Php\Http\ErrorRedactor;
use Sanctum\Canvas\Php\Http\HttpException;
use Sanctum\Canvas\Php\Http\RateLimiter;

/**
 * Dispatch allowlisted tools with auth, CSRF, schema, rate, timeout, idempotency.
 */
final class ToolDispatcher
{
    /** @var array<string, array{ok: bool, data?: mixed, error?: string}> */
    private array $idempotencyCache = [];

    public function __construct(
        private readonly ToolRegistry $registry,
        private readonly JsonSchemaValidator $validator = new JsonSchemaValidator(),
        private readonly RateLimiter $rateLimiter = new RateLimiter(null, 120, 60),
        private readonly Csrf $csrf = new Csrf(),
        private readonly ToolAuditLog $audit = new ToolAuditLog(),
        private readonly ErrorRedactor $redactor = new ErrorRedactor(),
    ) {
    }

    public function audit(): ToolAuditLog
    {
        return $this->audit;
    }

    public function registry(): ToolRegistry
    {
        return $this->registry;
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, string> $headers
     * @param array<string, string> $cookies
     * @return array{ok: bool, tool: string, data?: mixed, error?: string}
     */
    public function dispatch(
        AuthContext $auth,
        array $body,
        array $headers = [],
        array $cookies = [],
    ): array {
        $started = hrtime(true);
        $toolName = (string) ($body['tool'] ?? $body['name'] ?? '');

        // Reject before any handler — including hostile names
        try {
            $def = $this->registry->resolve($toolName);
        } catch (HttpException $e) {
            $this->audit->record([
                'tool' => $toolName,
                'classification' => 'unknown',
                'ownerId' => $auth->ownerId,
                'projectId' => $auth->projectId,
                'ok' => false,
                'errorCode' => $e->errorCode,
                'argBytes' => 0,
                'resultBytes' => 0,
                'durationMs' => 0,
            ]);
            throw $e;
        }

        $this->rateLimiter->hit('tools:' . $auth->scopeKey());

        if ($def->isWrite()) {
            $this->csrf->requireValid($auth->scopeKey(), $headers, $cookies);
        }

        $args = $body['arguments'] ?? $body['args'] ?? [];
        if (!is_array($args)) {
            throw new HttpException(400, 'invalid_arguments', 'arguments must be an object');
        }
        // Ensure associative
        if ($args !== [] && array_keys($args) === range(0, count($args) - 1)) {
            throw new HttpException(400, 'invalid_arguments', 'arguments must be an object');
        }

        $schemaErrors = $this->validator->validate($def->argumentSchema, $args);
        if ($schemaErrors !== []) {
            throw new HttpException(400, 'schema_validation_failed', 'Tool arguments failed schema validation', ['errors' => $schemaErrors]);
        }

        $confirmed = (bool) ($body['confirmed'] ?? false);
        if ($def->requiresConfirmation && !$confirmed) {
            throw new HttpException(409, 'confirmation_required', 'Destructive tool requires confirmed=true');
        }

        $idem = isset($body['idempotencyKey']) && is_string($body['idempotencyKey'])
            ? $body['idempotencyKey']
            : null;
        if ($def->isWrite() && ($idem === null || $idem === '')) {
            throw new HttpException(400, 'idempotency_required', 'Write tools require idempotencyKey');
        }
        if ($idem !== null && strlen($idem) > 128) {
            throw new HttpException(400, 'invalid_idempotency_key', 'idempotencyKey too long');
        }

        $cacheKey = null;
        if ($idem !== null) {
            $cacheKey = $auth->scopeKey() . '|' . $def->name . '|' . $idem;
            if (isset($this->idempotencyCache[$cacheKey])) {
                return array_merge(['tool' => $def->name], $this->idempotencyCache[$cacheKey]);
            }
        }

        $ctx = new ToolCallContext($auth, $idem, $confirmed);
        $argBytes = strlen(json_encode($args) ?: '');

        try {
            $result = $this->invokeWithTimeout($def, $args, $ctx);
        } catch (HttpException $e) {
            $this->audit->record([
                'tool' => $def->name,
                'classification' => $def->classification,
                'ownerId' => $auth->ownerId,
                'projectId' => $auth->projectId,
                'ok' => false,
                'errorCode' => $e->errorCode,
                'idempotencyKey' => $idem,
                'argBytes' => $argBytes,
                'resultBytes' => 0,
                'durationMs' => (int) ((hrtime(true) - $started) / 1_000_000),
            ]);
            throw $e;
        } catch (\Throwable $e) {
            $this->audit->record([
                'tool' => $def->name,
                'classification' => $def->classification,
                'ownerId' => $auth->ownerId,
                'projectId' => $auth->projectId,
                'ok' => false,
                'errorCode' => 'handler_error',
                'idempotencyKey' => $idem,
                'argBytes' => $argBytes,
                'resultBytes' => 0,
                'durationMs' => (int) ((hrtime(true) - $started) / 1_000_000),
            ]);
            throw new HttpException(500, 'handler_error', $this->redactor->redact('Tool handler failed'));
        }

        if (!is_array($result) || !isset($result['ok'])) {
            throw new HttpException(500, 'handler_invalid_result', 'Tool handler returned invalid result');
        }

        $encoded = json_encode($result['data'] ?? null);
        $resultBytes = $encoded === false ? 0 : strlen($encoded);
        if ($resultBytes > $def->maxResultBytes) {
            throw new HttpException(413, 'result_too_large', 'Tool result too large');
        }

        $out = [
            'ok' => (bool) $result['ok'],
            'data' => $result['data'] ?? null,
        ];
        if (isset($result['error']) && is_string($result['error'])) {
            $out['error'] = $this->redactor->redact($result['error']);
        }

        if ($cacheKey !== null) {
            $this->idempotencyCache[$cacheKey] = $out;
        }

        $this->audit->record([
            'tool' => $def->name,
            'classification' => $def->classification,
            'ownerId' => $auth->ownerId,
            'projectId' => $auth->projectId,
            'ok' => $out['ok'],
            'errorCode' => $out['ok'] ? null : 'tool_reported_error',
            'idempotencyKey' => $idem,
            'argBytes' => $argBytes,
            'resultBytes' => $resultBytes,
            'durationMs' => (int) ((hrtime(true) - $started) / 1_000_000),
        ]);

        return array_merge(['tool' => $def->name], $out);
    }

    /**
     * @param array<string, mixed> $args
     * @return array{ok: bool, data?: mixed, error?: string}
     */
    private function invokeWithTimeout(ToolDefinition $def, array $args, ToolCallContext $ctx): array
    {
        // Soft timeout: record intent; PHP cannot preempt safely without pcntl.
        // Handlers must be bounded; we enforce maxResultBytes after.
        $handler = $def->handler;
        $result = $handler($args, $ctx);
        if (!is_array($result)) {
            throw new HttpException(500, 'handler_invalid_result', 'Tool handler returned invalid result');
        }
        /** @var array{ok: bool, data?: mixed, error?: string} $result */
        return $result;
    }
}
