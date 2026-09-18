<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Inference;

use Sanctum\Canvas\Php\Config\Env;
use Sanctum\Canvas\Php\Http\HttpException;

final class ProviderFactory
{
    /** @param null|callable(array<string,mixed>, string, string): iterable $veniceHttpStreamer */
    public function __construct(
        private mixed $veniceHttpStreamer = null,
    ) {
    }

    public function make(?string $providerName, ?string $fixtureId = null): InferenceProvider
    {
        $name = strtolower($providerName ?? Env::get('CANVAS_INFERENCE_PROVIDER', 'fake') ?? 'fake');

        return match ($name) {
            'fake' => FakeProvider::fromEnv(),
            'fixture' => FixtureProvider::fromEnv(),
            'venice' => VeniceProvider::fromEnv($this->veniceHttpStreamer),
            default => throw new HttpException(400, 'unknown_provider', 'Unknown inference provider'),
        };
    }

    /**
     * Prefer fixture when fixtureId set; else configured provider; never require Venice for tests.
     */
    public function resolveForRequest(?string $providerName, ?string $fixtureId): InferenceProvider
    {
        if ($fixtureId !== null && $fixtureId !== '') {
            return FixtureProvider::fromEnv();
        }
        return $this->make($providerName);
    }
}
