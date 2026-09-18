/**
 * A6.11 — Partial JSON parse for streamed tool arguments (presentation-only).
 * Port of openui react-headless `partialJSONParse` / `balanceOpenJSON`.
 * Never throws; returns {} when nothing recoverable.
 */

/**
 * Closes dangling brackets/quotes for a partial (mid-stream) JSON string.
 * @param {string} raw
 * @returns {string}
 */
export function balanceOpenJSON(raw) {
  /** @type {string[]} */
  const closers = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") closers.push("}");
    else if (ch === "[") closers.push("]");
    else if (ch === "}" || ch === "]") closers.pop();
  }

  let out = raw;
  if (inString) {
    if (escaped) out = out.slice(0, -1);
    out += '"';
  }

  out = out.replace(/(?:,\s*)?"(?:[^"\\]|\\.)*"\s*:\s*$/, "");
  out = out.replace(/,\s*$/, "");

  for (let i = closers.length - 1; i >= 0; i--) out += closers[i];
  return out;
}

/**
 * Tolerant single-pass JSON parse for streamed tool arguments.
 * @param {string} raw
 * @returns {unknown}
 */
export function partialJSONParse(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    /* fall through */
  }
  try {
    return JSON.parse(balanceOpenJSON(raw));
  } catch {
    return {};
  }
}

/**
 * True when the raw args string is incomplete / unparseable as full JSON.
 * Used only for presentation markers (data-partial) — never blocks rendering.
 * @param {string} raw
 * @returns {boolean}
 */
export function isPartialJsonString(raw) {
  if (!raw || !String(raw).trim()) return true;
  try {
    JSON.parse(raw);
    return false;
  } catch {
    return true;
  }
}
