/**
 * Central URL policy (H4) — links, images, CSS urls, window.open.
 * Ports `old/packages/react-ui/.../safeUrl.ts` with scheme allowlist.
 */

const DANGEROUS_URI_RE = /^\s*(?:javascript|data|vbscript|file)\s*:/i;
const SCHEME_OBFUSCATION_RE = /[\u0000-\u001F\u007F]/g;
const ABSOLUTE_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const ALLOWED_ABSOLUTE_SCHEME_RE = /^(?:https?|mailto):/i;

/**
 * @param {string} url
 * @returns {string}
 */
function stripControlCharsForSchemeCheck(url) {
  return url.replace(SCHEME_OBFUSCATION_RE, "");
}

/**
 * @param {string} normalized
 * @returns {boolean}
 */
function hasAbsoluteScheme(normalized) {
  return ABSOLUTE_SCHEME_RE.test(normalized);
}

/**
 * @param {string} trimmed
 * @returns {boolean}
 */
function isAllowedRelative(trimmed) {
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("/")) return true;
  if (trimmed.startsWith("./") || trimmed.startsWith("../")) return true;
  if (trimmed.startsWith("#")) return true;
  const normalized = stripControlCharsForSchemeCheck(trimmed);
  return !hasAbsoluteScheme(normalized);
}

/**
 * @param {string | null | undefined} url
 * @returns {string | undefined}
 */
export function safeUrl(url) {
  if (typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  const normalized = stripControlCharsForSchemeCheck(trimmed);
  if (DANGEROUS_URI_RE.test(normalized)) return undefined;
  if (hasAbsoluteScheme(normalized)) {
    if (!ALLOWED_ABSOLUTE_SCHEME_RE.test(normalized)) return undefined;
  } else if (!isAllowedRelative(trimmed)) {
    return undefined;
  }
  return trimmed;
}

/** Alias used by markdown / richtext sinks (H4). */
export const sanitizeUrl = safeUrl;

/**
 * @param {string} [features]
 * @returns {string}
 */
export function mergeNoopenerFeatures(features = "") {
  const parts = new Set(
    String(features)
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  parts.add("noopener");
  parts.add("noreferrer");
  return [...parts].join(",");
}

/**
 * @param {string} [target]
 * @returns {string}
 */
export function relForTarget(target = "_self") {
  if (target === "_blank") return "noopener noreferrer";
  return "";
}

/**
 * @param {string | null | undefined} url
 * @param {string} [target]
 * @param {string} [features]
 * @returns {Window | null}
 */
export function safeOpenUrl(url, target = "_blank", features = "noopener,noreferrer") {
  if (typeof globalThis.window === "undefined") return null;
  const safe = safeUrl(url);
  if (!safe) return null;
  const merged = mergeNoopenerFeatures(features);
  return globalThis.window.open(safe, target, merged);
}

/**
 * @param {string | null | undefined} url
 * @returns {string | undefined}
 */
export function toCssUrl(url) {
  const safe = safeUrl(url);
  if (!safe) return undefined;
  const escaped = safe.replace(/[\\"\n\r]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `);
  return `url("${escaped}")`;
}
