<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Tools;

/**
 * Minimal JSON Schema (draft-07 subset) validator for tool arguments.
 */
final class JsonSchemaValidator
{
    /**
     * @param array<string, mixed> $schema
     * @param mixed $data
     * @return list<string> error messages (empty = ok)
     */
    public function validate(array $schema, mixed $data): array
    {
        return $this->check($schema, $data, '$');
    }

    /**
     * @param array<string, mixed> $schema
     * @return list<string>
     */
    private function check(array $schema, mixed $data, string $path): array
    {
        $errors = [];
        $type = $schema['type'] ?? null;

        if ($type !== null) {
            $ok = match ($type) {
                'object' => is_array($data) && $this->isObject($data),
                'array' => is_array($data) && !$this->isObject($data),
                'string' => is_string($data),
                'number' => is_int($data) || is_float($data),
                'integer' => is_int($data),
                'boolean' => is_bool($data),
                'null' => $data === null,
                default => true,
            };
            if (!$ok) {
                $errors[] = "{$path}: expected type {$type}";
                return $errors;
            }
        }

        if (($type === 'object' || $type === null) && is_array($data) && $this->isObject($data)) {
            $props = $schema['properties'] ?? [];
            $required = $schema['required'] ?? [];
            $additional = $schema['additionalProperties'] ?? true;
            if (is_array($required)) {
                foreach ($required as $req) {
                    if (!is_string($req)) {
                        continue;
                    }
                    if (!array_key_exists($req, $data)) {
                        $errors[] = "{$path}: missing required property {$req}";
                    }
                }
            }
            if (is_array($props)) {
                foreach ($data as $k => $v) {
                    if (!is_string($k)) {
                        $errors[] = "{$path}: property names must be strings";
                        continue;
                    }
                    if (isset($props[$k]) && is_array($props[$k])) {
                        $errors = array_merge($errors, $this->check($props[$k], $v, "{$path}.{$k}"));
                    } elseif ($additional === false) {
                        $errors[] = "{$path}: additional property {$k} not allowed";
                    }
                }
            }
            if (isset($schema['maxProperties']) && count($data) > (int) $schema['maxProperties']) {
                $errors[] = "{$path}: too many properties";
            }
        }

        if ($type === 'array' && is_array($data)) {
            if (isset($schema['maxItems']) && count($data) > (int) $schema['maxItems']) {
                $errors[] = "{$path}: too many items";
            }
            $items = $schema['items'] ?? null;
            if (is_array($items)) {
                foreach ($data as $i => $item) {
                    $errors = array_merge($errors, $this->check($items, $item, "{$path}[{$i}]"));
                }
            }
        }

        if (is_string($data)) {
            if (isset($schema['maxLength']) && strlen($data) > (int) $schema['maxLength']) {
                $errors[] = "{$path}: string too long";
            }
            if (isset($schema['enum']) && is_array($schema['enum']) && !in_array($data, $schema['enum'], true)) {
                $errors[] = "{$path}: value not in enum";
            }
            if (isset($schema['pattern']) && is_string($schema['pattern'])) {
                $pattern = $schema['pattern'];
                // Bound pattern complexity — reject catastrophic patterns at registration time;
                // here only apply short patterns.
                if (strlen($pattern) <= 200 && @preg_match('/' . $pattern . '/', $data) === 0) {
                    $errors[] = "{$path}: pattern mismatch";
                }
            }
        }

        if ((is_int($data) || is_float($data))) {
            if (isset($schema['minimum']) && $data < $schema['minimum']) {
                $errors[] = "{$path}: below minimum";
            }
            if (isset($schema['maximum']) && $data > $schema['maximum']) {
                $errors[] = "{$path}: above maximum";
            }
        }

        return $errors;
    }

    /** @param array<mixed> $data */
    private function isObject(array $data): bool
    {
        if ($data === []) {
            return true;
        }
        return array_keys($data) !== range(0, count($data) - 1);
    }
}
