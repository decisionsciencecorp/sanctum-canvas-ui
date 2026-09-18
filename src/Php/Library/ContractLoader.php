<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Library;

/**
 * Loads Sanctum canonical component library JSON (contract format v1).
 * Same file is consumed by Browser/lang contract loader.
 */
final class ContractLoader
{
    /** @return array<string, mixed> */
    public static function loadFile(string $path): array
    {
        if (!is_file($path)) {
            throw new \InvalidArgumentException("Library file not found: {$path}");
        }
        $raw = file_get_contents($path);
        // is_file() already gated; treat read failure as invalid path.
        if ($raw === false || $raw === '') {
            throw new \InvalidArgumentException("Library file empty or unreadable: {$path}");
        }
        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($data)) {
            throw new \InvalidArgumentException('Library root must be an object');
        }
        self::validateLibrary($data);
        return $data;
    }

    /** @param array<string, mixed> $library */
    public static function validateLibrary(array $library): void
    {
        foreach (['contractFormatVersion', 'id', 'variant', 'root', 'components'] as $key) {
            if (!array_key_exists($key, $library)) {
                throw new \InvalidArgumentException("Library missing required field: {$key}");
            }
        }
        if (!is_array($library['components'])) {
            throw new \InvalidArgumentException('components must be an object/map');
        }
        foreach ($library['components'] as $key => $component) {
            if (!is_array($component)) {
                throw new \InvalidArgumentException("Component {$key} must be an object");
            }
            self::validateComponent((string) $key, $component);
        }
        $root = (string) $library['root'];
        if (!isset($library['components'][$root])) {
            throw new \InvalidArgumentException("root component '{$root}' is not in components");
        }
    }

    /** @param array<string, mixed> $component */
    public static function validateComponent(string $key, array $component): void
    {
        foreach (['name', 'version', 'propertyOrder', 'properties', 'required', 'reactiveProps', 'renderer', 'securityCapabilities', 'prompt'] as $field) {
            if (!array_key_exists($field, $component)) {
                throw new \InvalidArgumentException("Component {$key} missing field: {$field}");
            }
        }
        if (($component['name'] ?? null) !== $key) {
            throw new \InvalidArgumentException("Component key '{$key}' must equal name");
        }
        if (!is_array($component['propertyOrder'])) {
            throw new \InvalidArgumentException("{$key}.propertyOrder must be an array");
        }
        if (!is_array($component['properties'])) {
            throw new \InvalidArgumentException("{$key}.properties must be an object");
        }
        if (!is_array($component['reactiveProps'])) {
            throw new \InvalidArgumentException("{$key}.reactiveProps must be an array (use [] if none)");
        }
        if (!array_key_exists('allowedChildren', $component)) {
            throw new \InvalidArgumentException("{$key}.allowedChildren is required (null for leaf)");
        }
        foreach ($component['propertyOrder'] as $prop) {
            if (!is_string($prop) || $prop === '') {
                throw new \InvalidArgumentException("{$key}.propertyOrder entries must be non-empty strings");
            }
            if (!array_key_exists($prop, $component['properties'])) {
                throw new \InvalidArgumentException("{$key}.propertyOrder lists '{$prop}' but properties map lacks it");
            }
        }
        foreach (array_keys($component['properties']) as $prop) {
            if (!in_array($prop, $component['propertyOrder'], true)) {
                throw new \InvalidArgumentException("{$key}.properties has '{$prop}' missing from propertyOrder");
            }
        }
        foreach ($component['reactiveProps'] as $prop) {
            if (!in_array($prop, $component['propertyOrder'], true)) {
                throw new \InvalidArgumentException("{$key}.reactiveProps '{$prop}' is not in propertyOrder");
            }
        }
        foreach ($component['required'] as $prop) {
            if (!in_array($prop, $component['propertyOrder'], true)) {
                throw new \InvalidArgumentException("{$key}.required '{$prop}' is not in propertyOrder");
            }
        }
    }

    /**
     * Map positional arguments to named props using explicit propertyOrder.
     *
     * @param array<string, mixed> $component
     * @param list<mixed> $args
     * @return array<string, mixed>
     */
    public static function mapPositionalArgs(array $component, array $args): array
    {
        $order = $component['propertyOrder'];
        $out = [];
        foreach ($order as $i => $name) {
            if (array_key_exists($i, $args)) {
                $out[$name] = $args[$i];
            } elseif (isset($component['properties'][$name]['default'])) {
                $out[$name] = $component['properties'][$name]['default'];
            }
        }
        return $out;
    }

    public static function isReactive(array $component, string $prop): bool
    {
        return in_array($prop, $component['reactiveProps'] ?? [], true);
    }
}
