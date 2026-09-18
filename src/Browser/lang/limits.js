/** Sanctum hardening limits (Doc #1379 §4.3). */
export const DEFAULT_LIMITS = Object.freeze({
  maxSourceBytes: 512_000,
  maxStatements: 2_000,
  maxDepth: 64,
  maxExpressionOps: 10_000,
});

/**
 * @param {string} input
 * @param {typeof DEFAULT_LIMITS} limits
 * @returns {{ ok: true } | { ok: false, error: object }}
 */
export function checkSourceLimits(input, limits = DEFAULT_LIMITS) {
  if (typeof input !== "string") {
    return { ok: false, error: { code: "invalid-input", message: "source must be a string" } };
  }
  if (input.length > limits.maxSourceBytes) {
    return {
      ok: false,
      error: {
        code: "source-too-large",
        message: `Source exceeds ${limits.maxSourceBytes} bytes`,
      },
    };
  }
  return { ok: true };
}

export function checkStatementCount(count, limits = DEFAULT_LIMITS) {
  if (count > limits.maxStatements) {
    return {
      ok: false,
      error: {
        code: "too-many-statements",
        message: `Program exceeds ${limits.maxStatements} statements`,
      },
    };
  }
  return { ok: true };
}
