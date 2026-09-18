<?php
declare(strict_types=1);

namespace Sanctum\Canvas\Php\Inference;

/**
 * Provider-neutral streaming interface.
 */
interface InferenceProvider
{
    /**
     * Yield StreamEvent instances until the run completes or errors.
     *
     * @return \Generator<int, StreamEvent>
     */
    public function stream(ChatRequest $request): \Generator;

    public function name(): string;
}
