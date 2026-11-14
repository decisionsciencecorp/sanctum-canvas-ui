import {
  __export
} from "./chunk-MLKGABMK.js";

// src/Browser/security/urlPolicy.js
var urlPolicy_exports = {};
__export(urlPolicy_exports, {
  isHostAllowed: () => isHostAllowed,
  mergeNoopenerFeatures: () => mergeNoopenerFeatures,
  relForTarget: () => relForTarget,
  safeOpenUrl: () => safeOpenUrl,
  safeUrl: () => safeUrl,
  sanitizeUrl: () => sanitizeUrl,
  toCssUrl: () => toCssUrl
});
var DANGEROUS_URI_RE = /^\s*(?:javascript|data|vbscript|file)\s*:/i;
var SCHEME_OBFUSCATION_RE = /[\u0000-\u001F\u007F]/g;
var ABSOLUTE_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
var ALLOWED_ABSOLUTE_SCHEME_RE = /^(?:https?|mailto):/i;
function stripControlCharsForSchemeCheck(url) {
  return url.replace(SCHEME_OBFUSCATION_RE, "");
}
function hasAbsoluteScheme(normalized) {
  return ABSOLUTE_SCHEME_RE.test(normalized);
}
function isAllowedRelative(trimmed) {
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("/")) return true;
  if (trimmed.startsWith("./") || trimmed.startsWith("../")) return true;
  if (trimmed.startsWith("#")) return true;
  const normalized = stripControlCharsForSchemeCheck(trimmed);
  return !hasAbsoluteScheme(normalized);
}
function isHostAllowed(hostname, allowedHosts) {
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
function safeUrl(url, opts = {}) {
  if (typeof url !== "string") return void 0;
  const trimmed = url.trim();
  if (!trimmed) return void 0;
  const normalized = stripControlCharsForSchemeCheck(trimmed);
  if (DANGEROUS_URI_RE.test(normalized)) return void 0;
  if (hasAbsoluteScheme(normalized)) {
    if (!ALLOWED_ABSOLUTE_SCHEME_RE.test(normalized)) return void 0;
  } else if (!isAllowedRelative(trimmed)) {
    return void 0;
  }
  if (!passesHostAllowlist(trimmed, opts)) return void 0;
  return trimmed;
}
var sanitizeUrl = safeUrl;
function mergeNoopenerFeatures(features = "") {
  const parts = new Set(
    String(features).split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
  );
  parts.add("noopener");
  parts.add("noreferrer");
  return [...parts].join(",");
}
function relForTarget(target = "_self") {
  if (target === "_blank") return "noopener noreferrer";
  return "";
}
function safeOpenUrl(url, target = "_blank", features = "noopener,noreferrer", opts = {}) {
  if (typeof globalThis.window === "undefined") return null;
  const safe = safeUrl(url, opts);
  if (!safe) return null;
  const merged = mergeNoopenerFeatures(features);
  return globalThis.window.open(safe, target, merged);
}
function toCssUrl(url, opts = {}) {
  const safe = safeUrl(url, opts);
  if (!safe) return void 0;
  const resolved = resolveAgainstDocument(safe, opts);
  const escaped = resolved.replace(/[\\"\n\r]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `);
  return `url("${escaped}")`;
}
function resolveAgainstDocument(url, opts = {}) {
  if (hasAbsoluteScheme(url)) return url;
  const base = typeof opts.baseUrl === "string" && opts.baseUrl ? opts.baseUrl : globalThis.document?.baseURI ?? globalThis.location?.href;
  if (!base) return url;
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

export {
  safeUrl,
  sanitizeUrl,
  safeOpenUrl,
  toCssUrl,
  urlPolicy_exports
};
