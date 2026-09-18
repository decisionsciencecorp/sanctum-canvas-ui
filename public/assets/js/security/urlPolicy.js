/**
 * Central URL policy (H4) — links, images, CSS urls, window.open.
 * Ports `old/packages/react-ui/.../safeUrl.ts` with scheme allowlist
 * and optional host allowlists (A4.4).
 */

const DANGEROUS_URI_RE = /^\s*(?:javascript|data|vbscript|file)\s*:/i;
const SCHEME_OBFUSCATION_RE = /[\u0000-\u001F\u007F]/g;
const ABSOLUTE_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const ALLOWED_ABSOLUTE_SCHEME_RE = /^(?:https?|mailto):/i;

/**
 * @typedef {{ allowedHosts?: string[] }} UrlPolicyOptions
 * Entries are exact hostnames (`example.com`) or suffix forms
 * (`.example.com` / `*.example.com`) matching the apex and subdomains.
 */

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
 * @param {string} hostname
 * @param {string[]} allowedHosts
 * @returns {boolean}
 */
export function isHostAllowed(hostname, allowedHosts) {
  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0) return true;
  const host = String(hostname || "").toLowerCase();
  if (!host) return false;
  for (const entry of allowedHosts) {
    if (typeof entry !== "string" || !entry) continue;
    let pattern = entry.toLowerCase().trim();
    if (pattern.startsWith("*.")) pattern = pattern.slice(1);
    if (pattern.startsWith(".")) {
      const apex = pattern.slice(1);
      if (host === apex || host.endsWith(pattern)) return true;
    } else if (host === pattern) {
      return true;
    }
  }
  return false;
}

/**
 * When `allowedHosts` is set, absolute http(s) URLs must match.
 * Relative / hash URLs pass (same-origin). mailto: is not host-gated.
 * @param {string} trimmed
 * @param {UrlPolicyOptions} [opts]
 * @returns {boolean}
 */
function passesHostAllowlist(trimmed, opts = {}) {
  const allowedHosts = opts.allowedHosts;
  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0) return true;

  const normalized = stripControlCharsForSchemeCheck(trimmed);
  if (!hasAbsoluteScheme(normalized)) {
    return isAllowedRelative(trimmed);
  }
  if (/^mailto:/i.test(normalized)) return true;

  try {
    const parsed = new URL(normalized);
    return isHostAllowed(parsed.hostname, allowedHosts);
  } catch {
    return false;
  }
}

/**
 * @param {string | null | undefined} url
 * @param {UrlPolicyOptions} [opts]
 * @returns {string | undefined}
 */
export function safeUrl(url, opts = {}) {
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
  if (!passesHostAllowlist(trimmed, opts)) return undefined;
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
 * @param {UrlPolicyOptions} [opts]
 * @returns {Window | null}
 */
export function safeOpenUrl(url, target = "_blank", features = "noopener,noreferrer", opts = {}) {
  if (typeof globalThis.window === "undefined") return null;
  const safe = safeUrl(url, opts);
  if (!safe) return null;
  const merged = mergeNoopenerFeatures(features);
  return globalThis.window.open(safe, target, merged);
}

/**
 * @param {string | null | undefined} url
 * @param {UrlPolicyOptions} [opts]
 * @returns {string | undefined}
 */
export function toCssUrl(url, opts = {}) {
  const safe = safeUrl(url, opts);
  if (!safe) return undefined;
  const escaped = safe.replace(/[\\"\n\r]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `);
  return `url("${escaped}")`;
}
