<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Inference;

use Sanctum\Canvas\Php\Config\Env;
use Sanctum\Canvas\Php\Http\HttpException;

/**
 * Replay a frozen AG-UI event fixture (resources/fixtures/stream/*.json).
 */
final class FixtureProvider implements InferenceProvider
{
    public function __construct(
        private readonly string $fixturesDir,
    ) {
    }

    public function name(): string
    {
        return 'fixture';
    }

    public static function fromEnv(): self
    {
        return new self(Env::fixturesPath() . '/stream');
    }

    public function stream(ChatRequest $request): \Generator
    {
        $id = $request->fixtureId ?? 'text-message-basic';
        if (!preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/', $id)) {
            throw new HttpException(400, 'invalid_fixture', 'Invalid fixture id');
        }
        $path = rtrim($this->fixturesDir, '/') . '/' . $id . '.json';
        if (!is_file($path)) {
            throw new HttpException(404, 'fixture_not_found', 'Fixture not found');
        }
        $raw = file_get_contents($path);
        if ($raw === false) {
            throw new HttpException(500, 'fixture_read_failed', 'Could not read fixture');
        }
        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        $events = $data['events'] ?? [];
        if (!is_array($events)) {
            throw new HttpException(500, 'fixture_invalid', 'Fixture events must be an array');
        }
        foreach ($events as $ev) {
            if (!is_array($ev) || !isset($ev['type']) || !is_string($ev['type'])) {
                continue;
            }
            $type = $ev['type'];
            unset($ev['type']);
            // Force runId to request when present
            if (isset($ev['runId'])) {
                $ev['runId'] = $request->runId;
            }
            yield new StreamEvent($type, $ev);
        }
    }
}
