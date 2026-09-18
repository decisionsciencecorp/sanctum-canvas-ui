/**
 * CSP-safe inline styling.
 *
 * `el.setAttribute("style", …)` is blocked under `style-src 'self'` (the Canvas CSP,
 * A4.7). The CSSOM property API is not. Components must go through this helper so
 * per-instance values (chart colours, aspect ratios, CSS variables) survive the
 * production policy. Falls back to the attribute when the host DOM has no CSSOM
 * (test miniDom) so existing attribute-based assertions keep working.
 */

/**
 * @param {Element} el
 * @param {Record<string, string | number | null | undefined>} declarations
 *   CSS property → value. Custom properties (`--x`) allowed. Null/undefined removes.
 */
export function setInlineStyle(el, declarations) {
  if (!el || !declarations) return;
  const style = /** @type {any} */ (el).style;
  if (style && typeof style.setProperty === "function") {
    for (const [prop, value] of Object.entries(declarations)) {
      if (value == null || value === "") style.removeProperty(prop);
      else style.setProperty(prop, String(value));
    }
    return;
  }
  // miniDom / non-CSSOM fallback — serialize to the attribute.
  const existing = parseStyleAttr(el.getAttribute?.("style") || "");
  for (const [prop, value] of Object.entries(declarations)) {
    if (value == null || value === "") delete existing[prop];
    else existing[prop] = String(value);
  }
  const text = Object.entries(existing)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
  if (text) el.setAttribute("style", text);
  else el.removeAttribute("style");
}

/**
 * Remove every inline declaration.
 * @param {Element} el
 */
export function clearInlineStyle(el) {
  if (!el) return;
  const style = /** @type {any} */ (el).style;
  if (style && typeof style.setProperty === "function" && typeof style.cssText === "string") {
    style.cssText = "";
  }
  if (typeof el.removeAttribute === "function") el.removeAttribute("style");
}

/**
 * @param {string} text
 * @returns {Record<string, string>}
 */
function parseStyleAttr(text) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const part of text.split(";")) {
    const i = part.indexOf(":");
    if (i <= 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}
