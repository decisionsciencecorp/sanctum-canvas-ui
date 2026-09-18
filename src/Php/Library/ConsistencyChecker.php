<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Library;

/**
 * CI-style consistency: every component has propertyOrder ↔ properties,
 * renderer path declared, reactiveProps reflected in signatures.
 */
final class ConsistencyChecker
{
    /**
     * @param array<string, mixed> $library
     * @return list<string> error messages (empty = ok)
     */
    public static function check(array $library): array
    {
        $errors = [];
        try {
            ContractLoader::validateLibrary($library);
        } catch (\InvalidArgumentException $e) {
            return [$e->getMessage()];
        }

        foreach ($library['components'] as $name => $comp) {
            $name = (string) $name;
            $renderer = (string) ($comp['renderer'] ?? '');
            if ($renderer === '') {
                $errors[] = "{$name}: missing renderer";
            }
            $sig = PromptCompiler::buildSignature($name, $comp);
            if (!str_starts_with($sig, $name . '(')) {
                $errors[] = "{$name}: bad signature {$sig}";
            }
            $reactive = $comp['reactiveProps'] ?? [];
            if (is_array($reactive) && $reactive !== [] && !str_contains($sig, '$binding')) {
                $errors[] = "{$name}: reactive props missing \$binding in signature";
            }
        }
        return $errors;
    }
}
