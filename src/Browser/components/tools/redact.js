/**
 * A6.11 — Safe redaction for tool args / results shown in the lab UI.
 * Presentation-only: never claims to be a security boundary for storage.
 */

const SENSITIVE_KEY_RE =
  /^(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|authorization|auth|credential|cookie|session)$/i;

const REDACTED = "[REDACTED]";

/**
 * @param {string} key
 * @returns {boolean}
 */
export function isSensitiveKey(key) {
  return SENSITIVE_KEY_RE.test(String(key || ""));
}

/**
 * Deep-clone-ish redaction of objects/arrays/strings for display.
 * @param {unknown} value
 * @param {{ depth?: number }} [opts]
 * @returns {unknown}
 */
export function redactValue(value, opts = {}) {
  const depth = opts.depth ?? 0;
  if (depth > 12) return REDACTED;
  if (value == null) return value;
  if (typeof value === "string") {
    // Long opaque tokens
    if (/^(?:sk-|Bearer\s+)/i.test(value) || (value.length > 40 && /^[A-Za-z0-9_\-.=]+$/.test(value))) {
      return REDACTED;
    }
    return value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v, { depth: depth + 1 }));
  }
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (value))) {
    out[k] = isSensitiveKey(k) ? REDACTED : redactValue(v, { depth: depth + 1 });
  }
  return out;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function redactForDisplay(value) {
  try {
    const redacted = redactValue(value);
    if (typeof redacted === "string") return redacted;
    return JSON.stringify(redacted, null, 2);
  } catch {
    return String(value ?? "");
  }
}
