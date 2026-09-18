<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Inference;

use Sanctum\Canvas\Php\Config\Env;
use Sanctum\Canvas\Php\Http\ErrorRedactor;
use Sanctum\Canvas\Php\Http\HttpException;

/**
 * Venice OpenAI-compatible chat completions streaming adapter.
 *
 * Key loading: Env::veniceApiKey() reads VENICE_API_KEY / VENICE_INFERENCE_KEY
 * from the process environment (source ~/.ssh/venice-api-moya.pass — never hardcode).
 */
final class VeniceProvider implements InferenceProvider
{
    public function __construct(
        private readonly string $apiKey,
        private readonly string $baseUrl = 'https://api.venice.ai/api/v1',
        private readonly string $defaultModel = 'venice-uncensored',
        /** @var null|callable(array<string,mixed>, string, string): iterable */
        private mixed $httpStreamer = null,
        private readonly ErrorRedactor $redactor = new ErrorRedactor(),
    ) {
        if ($this->apiKey === '') {
            throw new HttpException(503, 'venice_unconfigured', 'Venice inference key is not configured');
        }
    }

    public function name(): string
    {
        return 'venice';
    }

    /** @param null|callable(array<string,mixed>, string, string): iterable $httpStreamer */
    public static function fromEnv(mixed $httpStreamer = null): self
    {
        $key = Env::veniceApiKey();
        if ($key === null || $key === '') {
            throw new HttpException(503, 'venice_unconfigured', 'Venice inference key is not configured');
        }
        return new self(
            $key,
            Env::veniceBaseUrl(),
            Env::get('VENICE_MODEL', 'venice-uncensored') ?? 'venice-uncensored',
            $httpStreamer,
        );
    }

    public function stream(ChatRequest $request): \Generator
    {
        $messageId = 'msg_' . substr(hash('sha256', $request->runId), 0, 10);
        yield StreamEvent::runStarted($request->runId);
        yield StreamEvent::textStart($messageId);

        $model = $request->model ?? $this->defaultModel;
        $payload = [
            'model' => $model,
            'messages' => $request->messages,
            'stream' => true,
        ];

        try {
            foreach ($this->openStream($payload) as $line) {
                $delta = $this->parseDelta($line);
                if ($delta !== null && $delta !== '') {
                    yield StreamEvent::textDelta($messageId, $delta);
                }
            }
        } catch (HttpException $e) {
            yield StreamEvent::runError(
                $request->runId,
                $e->errorCode,
                $this->redactor->redact($e->getMessage())
            );
            return;
        } catch (\Throwable $e) {
            yield StreamEvent::runError(
                $request->runId,
                'provider_error',
                $this->redactor->redact('Inference provider failed')
            );
            return;
        }

        yield StreamEvent::textEnd($messageId);
        yield StreamEvent::runFinished($request->runId);
    }

    /**
     * @param array<string, mixed> $payload
     * @return \Generator<int, string> raw SSE/NDJSON lines
     */
    private function openStream(array $payload): \Generator
    {
        if ($this->httpStreamer !== null) {
            $gen = ($this->httpStreamer)($payload, $this->apiKey, $this->baseUrl);
            if ($gen instanceof \Generator) {
                yield from $gen;
                return;
            }
            if (is_iterable($gen)) {
                foreach ($gen as $line) {
                    yield (string) $line;
                }
                return;
            }
            throw new HttpException(500, 'provider_misconfigured', 'HTTP streamer returned invalid type');
        }

        yield from $this->curlStream($payload);
    }

    /**
     * Real cURL path — exercised in live smokes when Venice is configured.
     * Unit tests inject httpStreamer instead.
     *
     * @param array<string, mixed> $payload
     * @return \Generator<int, string>
     * @codeCoverageIgnore
     */
    private function curlStream(array $payload): \Generator
    {
        $url = $this->baseUrl . '/chat/completions';
        $ch = curl_init($url);
        if ($ch === false) {
            throw new HttpException(502, 'provider_connect', 'Could not init HTTP client');
        }

        $buffer = '';
        $lines = [];
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->apiKey,
                'Accept: text/event-stream',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_THROW_ON_ERROR),
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_TIMEOUT => 120,
            CURLOPT_WRITEFUNCTION => static function ($ch, string $data) use (&$buffer, &$lines): int {
                $buffer .= $data;
                while (($pos = strpos($buffer, "\n")) !== false) {
                    $line = substr($buffer, 0, $pos);
                    $buffer = substr($buffer, $pos + 1);
                    $lines[] = rtrim($line, "\r");
                }
                return strlen($data);
            },
        ]);

        $ok = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($ok === false || $status >= 400) {
            throw new HttpException(
                502,
                'provider_http_error',
                $this->redactor->redact($err !== '' ? $err : "HTTP {$status}")
            );
        }

        foreach ($lines as $line) {
            yield $line;
        }
        if ($buffer !== '') {
            yield rtrim($buffer, "\r");
        }
    }

    private function parseDelta(string $line): ?string
    {
        $line = trim($line);
        if ($line === '' || $line === 'data: [DONE]' || $line === '[DONE]') {
            return null;
        }
        if (str_starts_with($line, 'data:')) {
            $line = trim(substr($line, 5));
        }
        if ($line === '' || $line === '[DONE]') {
            return null;
        }
        try {
            $json = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }
        if (!is_array($json)) {
            return null;
        }
        if (isset($json['error'])) {
            $msg = is_array($json['error'])
                ? (string) ($json['error']['message'] ?? 'provider error')
                : (string) $json['error'];
            throw new HttpException(502, 'provider_error', $this->redactor->redact($msg));
        }
        $choice = $json['choices'][0] ?? null;
        if (!is_array($choice)) {
            return null;
        }
        $delta = $choice['delta']['content'] ?? $choice['message']['content'] ?? null;
        return is_string($delta) ? $delta : null;
    }
}
