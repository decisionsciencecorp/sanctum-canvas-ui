<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Library;

/**
 * Deterministic openui-lang system prompt from Sanctum library JSON.
 * Section order mirrors upstream lang-core prompt.ts (ee54f66).
 */
final class PromptCompiler
{
    public const PREAMBLE = 'You are an AI assistant that responds using openui-lang, a declarative UI language. Your ENTIRE response must be valid openui-lang code — no markdown, no explanations, just openui-lang.';

    /**
     * @param array<string, mixed> $library Validated library document
     * @param array<string, mixed> $options Prompt options (tools, examples, flags, …)
     */
    public static function generate(array $library, array $options = []): string
    {
        ContractLoader::validateLibrary($library);

        $rootName = (string) ($library['root'] ?? 'Root');
        $tools = $options['tools'] ?? [];
        $hasTools = is_array($tools) && count($tools) > 0;
        $toolCalls = (bool) ($options['toolCalls'] ?? $hasTools);
        $bindings = (bool) ($options['bindings'] ?? $toolCalls);
        $supportsExpressions = $toolCalls || $bindings;

        $components = [];
        foreach ($library['components'] as $name => $comp) {
            $sig = $comp['signature'] ?? self::buildSignature((string) $name, $comp);
            $components[(string) $name] = [
                'signature' => $sig,
                'description' => $comp['prompt']['description'] ?? null,
            ];
        }

        $usesAction = false;
        foreach ($components as $c) {
            if (str_contains($c['signature'], 'ActionExpression')) {
                $usesAction = true;
                break;
            }
        }

        $parts = [];
        $parts[] = (string) ($options['preamble'] ?? self::PREAMBLE);
        $parts[] = '';
        $parts[] = self::syntaxRules($rootName, $supportsExpressions, $bindings);
        $parts[] = '';
        $parts[] = self::componentSignaturesSection(
            $components,
            $library['componentGroups'] ?? [],
            $usesAction,
            $toolCalls,
            $bindings
        );

        if ($supportsExpressions) {
            $parts[] = '';
            $parts[] = self::builtinFunctionsSection();
        }
        if ($toolCalls) {
            $parts[] = '';
            $parts[] = self::querySection();
            $parts[] = '';
            $parts[] = self::mutationSection();
        }
        if ($usesAction) {
            $parts[] = '';
            $parts[] = self::actionSection($toolCalls, $bindings);
        }
        if ($toolCalls && $bindings) {
            $parts[] = '';
            $parts[] = self::interactiveFiltersSection();
        }
        if ($hasTools) {
            $parts[] = '';
            $parts[] = self::toolsSection($tools);
        }

        $parts[] = '';
        $parts[] = self::streamingRules($rootName, $supportsExpressions);

        $examples = array_merge(
            is_array($options['examples'] ?? null) ? $options['examples'] : [],
            is_array($options['toolExamples'] ?? null) ? $options['toolExamples'] : []
        );
        if ($examples !== []) {
            $parts[] = '';
            $parts[] = '## Examples';
            foreach ($examples as $ex) {
                $parts[] = '';
                $parts[] = (string) $ex;
            }
        }

        $parts[] = '';
        $parts[] = self::importantRules($rootName, $toolCalls, $bindings);

        if (!empty($options['additionalRules']) && is_array($options['additionalRules'])) {
            foreach ($options['additionalRules'] as $rule) {
                $parts[] = '- ' . $rule;
            }
        }

        return implode("\n", $parts);
    }

    /**
     * @param array<string, mixed> $component
     */
    public static function buildSignature(string $name, array $component): string
    {
        $order = $component['propertyOrder'] ?? [];
        $required = $component['required'] ?? [];
        $reactive = $component['reactiveProps'] ?? [];
        $properties = $component['properties'] ?? [];
        $params = [];
        foreach ($order as $prop) {
            $opt = in_array($prop, $required, true) ? '' : '?';
            $schema = is_array($properties[$prop] ?? null) ? $properties[$prop] : ['type' => 'any'];
            $type = self::schemaTypeStr($schema);
            if ($prop === 'action' || (($schema['format'] ?? '') === 'ActionExpression')) {
                $type = 'ActionExpression';
            }
            if (in_array($prop, $reactive, true)) {
                $type = '$binding<' . $type . '>';
            }
            $params[] = $prop . $opt . ': ' . $type;
        }
        return $name . '(' . implode(', ', $params) . ')';
    }

    /**
     * @param array<string, mixed> $schema
     */
    public static function schemaTypeStr(array $schema): string
    {
        if (isset($schema['$ref'])) {
            $ref = (string) $schema['$ref'];
            if (str_contains($ref, '/')) {
                $ref = basename(str_replace('#/$defs/', '', $ref));
            }
            return $ref === 'Component' ? 'Component' : $ref;
        }
        if (isset($schema['anyOf']) && is_array($schema['anyOf'])) {
            $parts = [];
            foreach ($schema['anyOf'] as $option) {
                if (is_array($option)) {
                    $parts[] = self::schemaTypeStr($option);
                }
            }
            $parts = array_values(array_unique($parts));
            return $parts === [] ? 'any' : implode(' | ', $parts);
        }
        $type = $schema['type'] ?? 'any';
        if ($type === 'string') {
            if (!empty($schema['enum']) && is_array($schema['enum'])) {
                return implode(' | ', array_map(static fn ($v) => '"' . $v . '"', $schema['enum']));
            }
            return 'string';
        }
        if ($type === 'number' || $type === 'integer') {
            return 'number';
        }
        if ($type === 'boolean') {
            return 'boolean';
        }
        if ($type === 'array') {
            $items = is_array($schema['items'] ?? null) ? $schema['items'] : null;
            if ($items) {
                $inner = self::schemaTypeStr($items);
                return (str_contains($inner, ' | ') ? '(' . $inner . ')' : $inner) . '[]';
            }
            return 'any[]';
        }
        if ($type === 'object') {
            return 'object';
        }
        return 'any';
    }

    private static function syntaxRules(string $rootName, bool $supportsExpressions, bool $bindings): string
    {
        $lines = [
            '## Syntax Rules',
            '',
            '1. Each statement is on its own line: `identifier = Expression`',
            "2. `root` is the entry point — every program must define `root = {$rootName}(...)`",
            '3. Expressions are: strings ("..."), numbers, booleans (true/false), null, arrays ([...]), objects ({...}), or component calls TypeName(arg1, arg2, ...)',
            '4. Use references for readability: define `name = ...` on one line, then use `name` later',
            '5. EVERY variable (except root) MUST be referenced by at least one other variable. Unreferenced variables are silently dropped and will NOT render. Always include defined variables in their parent\'s children/items array.',
            '6. Arguments are POSITIONAL (order matters, not names). Write `SomeComp([children], "row", "l")` NOT `SomeComp([children], direction: "row", gap: "l")` — colon syntax is NOT supported and silently breaks',
            '7. Optional arguments can be omitted from the end',
        ];
        $n = 8;
        if ($bindings) {
            $lines[] = $n++ . '. Declare mutable state with `$varName = defaultValue`. Components marked with `$binding` can read/write these. Undeclared $variables are auto-created with null default.';
        }
        if ($supportsExpressions) {
            $lines[] = $n++ . '. String concatenation: `"text" + $var + "more"`';
            $lines[] = $n++ . '. Dot member access: `query.field` reads a field; on arrays it extracts that field from every element';
            $lines[] = $n++ . '. Index access: `arr[0]`, `data[index]`';
            $lines[] = $n++ . '. Arithmetic operators: +, -, *, /, % (work on numbers; + is string concat when either side is a string)';
            $lines[] = $n++ . '. Comparison: ==, !=, >, <, >=, <=';
            $lines[] = $n++ . '. Logical: &&, ||, ! (prefix)';
            $lines[] = $n++ . '. Ternary: `condition ? valueIfTrue : valueIfFalse`';
            $lines[] = $n++ . '. Parentheses for grouping: `(a + b) * c`';
        }
        $lines[] = '- Strings use double quotes with backslash escaping';
        return implode("\n", $lines);
    }

    /**
     * @param array<string, array{signature: string, description: ?string}> $components
     * @param list<array<string, mixed>> $groups
     */
    private static function componentSignaturesSection(
        array $components,
        array $groups,
        bool $usesAction,
        bool $toolCalls,
        bool $bindings
    ): string {
        $lines = [
            '## Component Signatures',
            '',
            'Arguments marked with ? are optional. Sub-components can be inline or referenced; prefer references for better streaming.',
        ];
        if ($usesAction) {
            $steps = ['@ToAssistant', '@OpenUrl'];
            if ($toolCalls) {
                array_unshift($steps, '@Run');
            }
            if ($bindings) {
                $steps[] = '@Set';
                $steps[] = '@Reset';
            }
            $lines[] = 'ActionExpression accepts Action([...]) with steps: ' . implode(', ', $steps) . '.';
        }
        $anyBinding = $bindings;
        if (!$anyBinding) {
            foreach ($components as $c) {
                if (str_contains($c['signature'], '$binding')) {
                    $anyBinding = true;
                    break;
                }
            }
        }
        if ($anyBinding) {
            $lines[] = 'Props marked `$binding<type>` accept a `$variable` reference for two-way binding.';
        }

        $emitted = [];
        if ($groups !== []) {
            foreach ($groups as $group) {
                $gName = (string) ($group['name'] ?? 'Group');
                $lines[] = '';
                $lines[] = '### ' . $gName;
                foreach ($group['components'] ?? [] as $cname) {
                    $cname = (string) $cname;
                    if (!isset($components[$cname]) || isset($emitted[$cname])) {
                        continue;
                    }
                    $emitted[$cname] = true;
                    $lines[] = self::formatComponentLine($components[$cname]);
                }
                foreach ($group['notes'] ?? [] as $note) {
                    $lines[] = (string) $note;
                }
            }
            $other = array_diff(array_keys($components), array_keys($emitted));
            sort($other);
            if ($other !== []) {
                $lines[] = '';
                $lines[] = '### Other';
                foreach ($other as $cname) {
                    $lines[] = self::formatComponentLine($components[$cname]);
                }
            }
        } else {
            $names = array_keys($components);
            sort($names);
            $lines[] = '';
            foreach ($names as $cname) {
                $lines[] = self::formatComponentLine($components[$cname]);
            }
        }

        return implode("\n", $lines);
    }

    /** @param array{signature: string, description: ?string} $c */
    private static function formatComponentLine(array $c): string
    {
        if (!empty($c['description'])) {
            return $c['signature'] . ' — ' . $c['description'];
        }
        return $c['signature'];
    }

    private static function builtinFunctionsSection(): string
    {
        return <<<'TXT'
## Built-in Functions

Data functions prefixed with `@` to distinguish from components. These are the ONLY functions available — do NOT invent new ones.
Use @-prefixed built-in functions (@Count, @Sum, @Avg, @Min, @Max, @Round) on Query results — do NOT hardcode computed values.

@Count(arr) — Count items in an array
@First(arr) — First item
@Last(arr) — Last item
@Sum(arr) — Sum of numeric array
@Avg(arr) — Average of numeric array
@Min(arr) — Minimum
@Max(arr) — Maximum
@Sort(arr, key?, dir?) — Sort array
@Filter(arr, field, op, value) — Filter array rows
@Round(n, digits?) — Round number
@Abs(n) — Absolute value
@Floor(n) — Floor
@Ceil(n) — Ceil
@Each(arr, varName, template) — Map array to components (lazy)

Builtins compose — output of one is input to the next:
`@Count(@Filter(data.rows, "field", "==", "val"))` for KPIs/chart values, `@Round(@Avg(data.rows.score), 1)`, `@Each(data.rows, "item", Comp(item.field))` for per-item rendering.
Array pluck: `data.rows.field` extracts a field from every row → use with @Sum, @Avg, charts, tables.

IMPORTANT @Each rule: The loop variable (e.g. "item") is ONLY available inside the @Each template expression. Always inline the template — do NOT extract it to a separate statement.
CORRECT: `Col("Actions", @Each(rows, "t", Button("Edit", Action([@Set($id, t.id)]))))`
WRONG: `myBtn = Button("Edit", Action([@Set($id, t.id)]))` then `Col("Actions", @Each(rows, "t", myBtn))` — t is undefined in myBtn.
TXT;
    }

    private static function querySection(): string
    {
        return <<<'TXT'
## Query — Live Data Fetching

Fetch data from available tools. Returns defaults instantly, swaps in real data when it arrives.

```
metrics = Query("tool_name", {arg1: value, arg2: $binding}, {defaultField: 0, defaultData: []}, refreshInterval?)
```

- First arg: tool name (string)
- Second arg: arguments object (may reference $bindings — re-fetches automatically on change)
- Third arg: default data (rendered immediately before fetch resolves)
- Fourth arg (optional): refresh interval in seconds (e.g. 30 for auto-refresh every 30s)
- Use dot access on results: metrics.totalEvents, metrics.data.day (array pluck)
- Query results must use regular identifiers: `metrics = Query(...)`, NOT `$metrics = Query(...)`
- Manual refresh: `Button("Refresh", Action([@Run(query1), @Run(query2)]), "secondary")` — re-fetches the listed queries
TXT;
    }

    private static function mutationSection(): string
    {
        return <<<'TXT'
## Mutation — Write Operations

Execute state-changing tool calls (create, update, delete). Unlike Query (auto-fetches on render), Mutation fires only on button click via Action.

```
result = Mutation("tool_name", {arg1: $binding, arg2: "value"})
```

- First arg: tool name (string)
- Second arg: arguments object (evaluated with current $binding values at click time)
- result.status: "idle" | "loading" | "success" | "error"
- result.data: tool response on success
- result.error: error message on failure
- Mutation results use regular identifiers: `result = Mutation(...)`, NOT `$result`
- Show loading state: `result.status == "loading" ? TextContent("Saving...") : null`
TXT;
    }

    private static function actionSection(bool $toolCalls, bool $bindings): string
    {
        $steps = [
            '- @ToAssistant("message") — Send a message to the assistant',
            '- @OpenUrl("https://...") — Navigate to a URL',
        ];
        if ($bindings) {
            $steps[] = '- @Set($variable, value) — Set a $variable to a specific value';
            $steps[] = '- @Reset($var1, $var2, ...) — Reset $variables to their declared defaults';
        }
        if ($toolCalls) {
            array_unshift($steps, '- @Run(queryOrMutationRef) — Execute a Mutation or re-fetch a Query');
        }
        return "## Action — Button Behavior\n\nAction([@steps...]) wires button clicks to operations. Steps execute in order.\n\nAvailable steps:\n" . implode("\n", $steps);
    }

    private static function interactiveFiltersSection(): string
    {
        return <<<'TXT'
## Interactive Filters

To let the user filter data with a dropdown:
1. Declare a $variable with a default: `$dateRange = "14"`
2. Create a Select with name, items, and binding
3. Pass $dateRange in Query args
4. When the user changes the Select, $dateRange updates and the Query automatically re-fetches

FILTER WIRING RULE: If a $binding filter is visible in the UI, EVERY relevant Query MUST reference that $binding in its args.
TXT;
    }

    /** @param list<mixed> $tools */
    private static function toolsSection(array $tools): string
    {
        $lines = [
            '## Available Tools',
            '',
            'CRITICAL: Only use tool names listed here. Do NOT invent tool names.',
            '',
        ];
        foreach ($tools as $tool) {
            if (is_string($tool)) {
                $lines[] = '- ' . $tool;
                continue;
            }
            if (!is_array($tool)) {
                continue;
            }
            $name = (string) ($tool['name'] ?? 'tool');
            $desc = (string) ($tool['description'] ?? '');
            $lines[] = '- `' . $name . '`' . ($desc !== '' ? ' — ' . $desc : '');
        }
        return implode("\n", $lines);
    }

    private static function streamingRules(string $rootName, bool $supportsExpressions): string
    {
        $extra = $supportsExpressions
            ? "\n- Prefer defining Query/Mutation statements before components that reference them when possible."
            : '';
        return <<<TXT
## Hoisting & Streaming (CRITICAL)

Define `root = {$rootName}(...)` early so the UI can appear progressively while later statements stream in.
{$extra}
TXT;
    }

    private static function importantRules(string $rootName, bool $toolCalls, bool $bindings): string
    {
        $lines = [
            '## Important Rules',
            '',
            "1. Always define `root = {$rootName}(...)`.",
            '2. Use only registered components and listed tools.',
            '3. Arguments are positional — never use named/colon arguments.',
            '4. Prefer references over deeply nested inline trees for streaming.',
        ];
        if ($bindings) {
            $lines[] = '5. Use `$binding` props with `$variables` for interactive state.';
        }
        if ($toolCalls) {
            $lines[] = '6. Never invent tool names; Query/Mutation must use Available Tools.';
        }
        $lines[] = '';
        $lines[] = '## Final Verification';
        $lines[] = '';
        $lines[] = '- [ ] root is defined';
        $lines[] = '- [ ] every non-root statement is referenced';
        $lines[] = '- [ ] no unknown components';
        return implode("\n", $lines);
    }
}
