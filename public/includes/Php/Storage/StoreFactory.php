<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Storage;

use Sanctum\Canvas\Php\Config\Env;

final class StoreFactory
{
    public static function make(?string $driver = null, ?string $path = null): ProgramStore
    {
        $driver = strtolower($driver ?? Env::storageDriver());
        $base = $path ?? Env::storagePath();
        return match ($driver) {
            'file', 'filesystem' => new FileProgramStore($base . '/programs'),
            'sqlite', 'db' => new SqliteProgramStore($base . '/programs.sqlite'),
            default => new SqliteProgramStore($base . '/programs.sqlite'),
        };
    }
}
