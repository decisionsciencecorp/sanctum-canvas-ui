<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Tools;

use Sanctum\Canvas\Php\Http\HttpException;

/**
 * Allowlisted tool registry. Unknown names are rejected before any handler runs.
 *
 * Model output may only select names present here — never PHP callables, URLs,
 * SQL, shell commands, filesystem paths, or MCP endpoints.
 */
final class ToolRegistry
{
    /** @var array<string, ToolDefinition> */
    private array $tools = [];

    /** @param list<ToolDefinition> $definitions */
    public function __construct(array $definitions = [])
    {
        foreach ($definitions as $def) {
            $this->register($def);
        }
    }

    public function register(ToolDefinition $def): void
    {
        if (isset($this->tools[$def->name])) {
            throw new \InvalidArgumentException("Duplicate tool: {$def->name}");
        }
        $this->tools[$def->name] = $def;
    }

    public function has(string $name): bool
    {
        return isset($this->tools[$name]);
    }

    public function get(string $name): ToolDefinition
    {
        if (!$this->has($name)) {
            throw new HttpException(404, 'unknown_tool', 'Unknown tool');
        }
        return $this->tools[$name];
    }

    /**
     * Reject hostile tool name shapes before lookup (defense in depth).
     */
    public function assertSafeName(string $name): void
    {
        if ($name === '' || strlen($name) > 64) {
            throw new HttpException(400, 'invalid_tool_name', 'Invalid tool name');
        }
        // Absolute ban on path/URL/SQL/shell/callable shapes
        $hostile = [
            '://', '/', '\\', '..', ';', '|', '`', '$', '(', ')', '{', '}',
            ' ', "\n", "\r", "\t", '<', '>', '"', "'",
        ];
        foreach ($hostile as $h) {
            if (str_contains($name, $h)) {
                throw new HttpException(400, 'hostile_tool_name', 'Tool name rejected');
            }
        }
        $lower = strtolower($name);
        $bannedExact = [
            'system', 'exec', 'passthru', 'shell_exec', 'proc_open', 'popen',
            'eval', 'assert', 'include', 'require', 'require_once', 'include_once',
            'curl_exec', 'fopen', 'unlink', 'rmdir', 'chmod', 'call_user_func',
        ];
        if (in_array($lower, $bannedExact, true)) {
            throw new HttpException(400, 'hostile_tool_name', 'Tool name rejected');
        }
        $bannedPrefixes = ['php:', 'mcp://', 'http://', 'https://', 'ftp://', 'ssh://',
            'sql_', 'mysql', 'sqlite', 'pdo_', 'file_', 'proc_', 'shell_', 'passthru'];
        foreach ($bannedPrefixes as $b) {
            if (str_starts_with($lower, $b)) {
                throw new HttpException(400, 'hostile_tool_name', 'Tool name rejected');
            }
        }
        // Never interpret as PHP callable string
        if (str_contains($name, '::') || str_contains($name, '->')) {
            throw new HttpException(400, 'hostile_tool_name', 'Tool name rejected');
        }
        if (!preg_match('/^[a-z][a-z0-9_]*$/', $name)) {
            throw new HttpException(400, 'invalid_tool_name', 'Invalid tool name');
        }
    }

    /**
     * Resolve tool: hostile check → allowlist membership → definition.
     * Unknown tools never reach handlers.
     */
    public function resolve(string $name): ToolDefinition
    {
        $this->assertSafeName($name);
        if (!$this->has($name)) {
            throw new HttpException(404, 'unknown_tool', 'Unknown tool');
        }
        return $this->tools[$name];
    }

    /** @return list<string> */
    public function names(): array
    {
        return array_keys($this->tools);
    }

    /** @return list<array{name: string, classification: string, description: string, argumentSchema: array<string, mixed>}> */
    public function describe(): array
    {
        $out = [];
        foreach ($this->tools as $t) {
            $out[] = [
                'name' => $t->name,
                'classification' => $t->classification,
                'description' => $t->description,
                'argumentSchema' => $t->argumentSchema,
                'requiresConfirmation' => $t->requiresConfirmation,
            ];
        }
        return $out;
    }

    /**
     * Default lab registry: deterministic echo + scoped notes store (in-memory/file via handler).
     */
    public static function labDefaults(?NotesStore $notes = null): self
    {
        $notes ??= new NotesStore();
        $reg = new self();

        $reg->register(new ToolDefinition(
            name: 'echo_read',
            classification: ToolDefinition::CLASS_READ,
            argumentSchema: [
                'type' => 'object',
                'properties' => [
                    'message' => ['type' => 'string', 'maxLength' => 2000],
                ],
                'required' => ['message'],
                'additionalProperties' => false,
            ],
            handler: static function (array $args, ToolCallContext $ctx): array {
                return [
                    'ok' => true,
                    'data' => [
                        'echo' => (string) $args['message'],
                        'ownerId' => $ctx->auth->ownerId,
                        'projectId' => $ctx->auth->projectId,
                    ],
                ];
            },
            description: 'Echo a message scoped to the caller (read-only)',
        ));

        $reg->register(new ToolDefinition(
            name: 'note_get',
            classification: ToolDefinition::CLASS_READ,
            argumentSchema: [
                'type' => 'object',
                'properties' => [
                    'key' => ['type' => 'string', 'maxLength' => 64, 'pattern' => '^[a-zA-Z0-9_-]+$'],
                ],
                'required' => ['key'],
                'additionalProperties' => false,
            ],
            handler: static function (array $args, ToolCallContext $ctx) use ($notes): array {
                $val = $notes->get($ctx->auth->scopeKey(), (string) $args['key']);
                return ['ok' => true, 'data' => ['key' => $args['key'], 'value' => $val]];
            },
            description: 'Read a scoped note',
        ));

        $reg->register(new ToolDefinition(
            name: 'note_set',
            classification: ToolDefinition::CLASS_WRITE,
            argumentSchema: [
                'type' => 'object',
                'properties' => [
                    'key' => ['type' => 'string', 'maxLength' => 64, 'pattern' => '^[a-zA-Z0-9_-]+$'],
                    'value' => ['type' => 'string', 'maxLength' => 8000],
                ],
                'required' => ['key', 'value'],
                'additionalProperties' => false,
            ],
            handler: static function (array $args, ToolCallContext $ctx) use ($notes): array {
                $notes->set($ctx->auth->scopeKey(), (string) $args['key'], (string) $args['value']);
                return ['ok' => true, 'data' => ['key' => $args['key'], 'saved' => true]];
            },
            description: 'Write a scoped note',
        ));

        $reg->register(new ToolDefinition(
            name: 'note_delete',
            classification: ToolDefinition::CLASS_DESTRUCTIVE,
            argumentSchema: [
                'type' => 'object',
                'properties' => [
                    'key' => ['type' => 'string', 'maxLength' => 64, 'pattern' => '^[a-zA-Z0-9_-]+$'],
                ],
                'required' => ['key'],
                'additionalProperties' => false,
            ],
            handler: static function (array $args, ToolCallContext $ctx) use ($notes): array {
                $notes->delete($ctx->auth->scopeKey(), (string) $args['key']);
                return ['ok' => true, 'data' => ['key' => $args['key'], 'deleted' => true]];
            },
            description: 'Delete a scoped note',
            requiresConfirmation: true,
        ));

        return $reg;
    }
}
