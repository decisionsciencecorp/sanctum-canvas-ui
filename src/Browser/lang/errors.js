/**
 * Safe, structured failures produced by the language kernel.
 *
 * Low-level helpers throw LanguageError so callers can stop bounded work.
 * Public parser factories convert these exceptions into ParseResult errors.
 */
export class LanguageError extends Error {
  constructor(code, message, location = undefined, hint = undefined) {
    super(message);
    this.name = "LanguageError";
    this.code = code;
    this.location = location;
    this.hint = hint;
  }

  toRecord(extra = {}) {
    return {
      code: this.code,
      component: "",
      path: "",
      message: this.message,
      ...(this.location || {}),
      ...(this.hint ? { hint: this.hint } : {}),
      ...extra,
    };
  }
}

export class LanguageLimitError extends LanguageError {
  constructor(code, message, location = undefined) {
    super(code, message, location, "Reduce the program size or complexity and retry.");
    this.name = "LanguageLimitError";
  }
}

export const DEFAULT_LIMITS = Object.freeze({
  maxSourceBytes: 1_048_576,
  maxTokens: 100_000,
  maxStringBytes: 262_144,
  maxStatements: 10_000,
  maxNestingDepth: 128,
  maxCollectionItems: 10_000,
  maxReferences: 10_000,
  maxAstNodes: 100_000,
});

export function mergeLimits(overrides = {}) {
  const limits = { ...DEFAULT_LIMITS, ...overrides };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new TypeError(`Language limit '${name}' must be a positive safe integer`);
    }
  }
  return Object.freeze(limits);
}

export function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}
