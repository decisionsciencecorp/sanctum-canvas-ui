<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Storage;

use Sanctum\Canvas\Php\Config\Env;
use Sanctum\Canvas\Php\Http\HttpException;

/**
 * File-backed control channel for SMCP-driven lab canvases.
 *
 * Surfaces (e.g. deep-research) poll this store; SMCP paint/clear writes it.
 * Not part of Track B companion chrome — lab / Otto troubleshooting only.
 */
final class LabControlStore
{
    private string $dir;

    public function __construct(?string $dir = null)
    {
        $base = $dir ?? (Env::storagePath() . '/lab-control');
        $this->dir = rtrim($base, '/');
        if (!is_dir($this->dir) && !mkdir($this->dir, 0770, true) && !is_dir($this->dir)) {
            throw new HttpException(500, 'storage_error', 'Cannot create lab-control storage');
        }
    }

    /**
     * @return array{
     *   surface: string,
     *   rev: int,
     *   updated_at: string,
     *   action: string,
     *   title: string|null,
     *   lang_source: string|null,
     *   note: string|null,
     *   last_submit: array<string, mixed>|null
     * }
     */
    public function read(string $surface): array
    {
        $surface = $this->normalizeSurface($surface);
        $path = $this->path($surface);
        if (!is_file($path)) {
            return $this->emptyState($surface);
        }
        $raw = file_get_contents($path);
        if ($raw === false || $raw === '') {
            return $this->emptyState($surface);
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return $this->emptyState($surface);
        }
        return $this->normalizeState($surface, $decoded);
    }

    /**
     * @param array{title?: string|null, lang_source?: string|null, note?: string|null} $payload
     * @return array<string, mixed>
     */
    public function paint(string $surface, array $payload): array
    {
        $surface = $this->normalizeSurface($surface);
        $lang = isset($payload['lang_source']) ? (string) $payload['lang_source'] : '';
        $lang = trim($lang);
        if ($lang === '') {
            throw new HttpException(400, 'missing_lang_source', 'lang_source required for paint');
        }
        if (strlen($lang) > 200000) {
            throw new HttpException(413, 'lang_source_too_large', 'lang_source exceeds 200KB');
        }

        $prev = $this->read($surface);
        $next = [
            'surface' => $surface,
            'rev' => ((int) $prev['rev']) + 1,
            'updated_at' => gmdate('c'),
            'action' => 'paint',
            'title' => $this->optionalString($payload['title'] ?? null, 120),
            'lang_source' => $lang,
            'note' => $this->optionalString($payload['note'] ?? null, 500),
            'last_submit' => $prev['last_submit'],
        ];
        $this->write($surface, $next);
        return $next;
    }

    /**
     * @param array{note?: string|null} $payload
     * @return array<string, mixed>
     */
    public function clear(string $surface, array $payload = []): array
    {
        $surface = $this->normalizeSurface($surface);
        $prev = $this->read($surface);
        $next = [
            'surface' => $surface,
            'rev' => ((int) $prev['rev']) + 1,
            'updated_at' => gmdate('c'),
            'action' => 'clear',
            'title' => null,
            'lang_source' => null,
            'note' => $this->optionalString($payload['note'] ?? null, 500),
            'last_submit' => $prev['last_submit'],
        ];
        $this->write($surface, $next);
        return $next;
    }

    /**
     * Browser lab reports a canvas submit (ContinueConversation path) for Otto inspection.
     *
     * @param array<string, mixed> $submit
     * @return array<string, mixed>
     */
    public function recordSubmit(string $surface, array $submit): array
    {
        $surface = $this->normalizeSurface($surface);
        $prev = $this->read($surface);
        $safe = [
            'at' => gmdate('c'),
            'values' => is_array($submit['values'] ?? null) ? $submit['values'] : [],
            'labels' => is_array($submit['labels'] ?? null) ? $submit['labels'] : [],
            'form_id' => $this->optionalString($submit['form_id'] ?? null, 120),
            'text' => $this->optionalString($submit['text'] ?? null, 2000),
        ];
        $next = $prev;
        $next['rev'] = ((int) $prev['rev']) + 1;
        $next['updated_at'] = gmdate('c');
        $next['action'] = 'submit';
        $next['last_submit'] = $safe;
        $this->write($surface, $next);
        return $next;
    }

    private function write(string $surface, array $state): void
    {
        $path = $this->path($surface);
        $tmp = $path . '.tmp.' . getmypid();
        $json = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if ($json === false) {
            throw new HttpException(500, 'encode_error', 'Cannot encode lab-control state');
        }
        if (file_put_contents($tmp, $json . "\n", LOCK_EX) === false) {
            throw new HttpException(500, 'storage_error', 'Cannot write lab-control state');
        }
        if (!rename($tmp, $path)) {
            @unlink($tmp);
            throw new HttpException(500, 'storage_error', 'Cannot publish lab-control state');
        }
        @chmod($path, 0660);
    }

    private function path(string $surface): string
    {
        return $this->dir . '/' . $surface . '.json';
    }

    private function normalizeSurface(string $surface): string
    {
        $surface = strtolower(trim($surface));
        if (!preg_match('/^[a-z0-9][a-z0-9_-]{0,63}$/', $surface)) {
            throw new HttpException(400, 'invalid_surface', 'surface must be [a-z0-9_-], max 64');
        }
        return $surface;
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyState(string $surface): array
    {
        return [
            'surface' => $surface,
            'rev' => 0,
            'updated_at' => gmdate('c'),
            'action' => 'idle',
            'title' => null,
            'lang_source' => null,
            'note' => null,
            'last_submit' => null,
        ];
    }

    /**
     * @param array<string, mixed> $decoded
     * @return array<string, mixed>
     */
    private function normalizeState(string $surface, array $decoded): array
    {
        $base = $this->emptyState($surface);
        $base['rev'] = max(0, (int) ($decoded['rev'] ?? 0));
        $base['updated_at'] = is_string($decoded['updated_at'] ?? null)
            ? (string) $decoded['updated_at']
            : $base['updated_at'];
        $base['action'] = is_string($decoded['action'] ?? null)
            ? (string) $decoded['action']
            : 'idle';
        $base['title'] = $this->optionalString($decoded['title'] ?? null, 120);
        $base['lang_source'] = isset($decoded['lang_source']) && is_string($decoded['lang_source'])
            ? $decoded['lang_source']
            : null;
        $base['note'] = $this->optionalString($decoded['note'] ?? null, 500);
        $base['last_submit'] = is_array($decoded['last_submit'] ?? null)
            ? $decoded['last_submit']
            : null;
        return $base;
    }

    private function optionalString(mixed $v, int $max): ?string
    {
        if ($v === null) {
            return null;
        }
        $s = trim((string) $v);
        if ($s === '') {
            return null;
        }
        if (strlen($s) > $max) {
            $s = substr($s, 0, $max);
        }
        return $s;
    }
}
