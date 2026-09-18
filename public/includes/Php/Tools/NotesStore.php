<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Tools;

/**
 * In-memory scoped notes for lab tools (per owner:project).
 */
final class NotesStore
{
    /** @var array<string, array<string, string>> */
    private array $data = [];

    public function get(string $scope, string $key): ?string
    {
        return $this->data[$scope][$key] ?? null;
    }

    public function set(string $scope, string $key, string $value): void
    {
        $this->data[$scope][$key] = $value;
    }

    public function delete(string $scope, string $key): void
    {
        unset($this->data[$scope][$key]);
    }
}
