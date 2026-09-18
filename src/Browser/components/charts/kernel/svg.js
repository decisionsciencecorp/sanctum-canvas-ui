/**
 * Tiny SVG helpers (dependency-free; miniDom createElementNS-safe).
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * @param {Document} doc
 * @param {string} tag
 * @param {Record<string, string | number | null | undefined>} [attrs]
 * @returns {Element}
 */
export function svgEl(doc, tag, attrs = {}) {
  const el =
    typeof doc.createElementNS === "function"
      ? doc.createElementNS(SVG_NS, tag)
      : doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    el.setAttribute(k, String(v));
  }
  return el;
}

/**
 * @param {Element} el
 * @param {string} name
 * @param {string | number | null | undefined} value
 */
export function setAttr(el, name, value) {
  if (value == null || value === false || value === "") el.removeAttribute(name);
  else el.setAttribute(name, String(value));
}

export { SVG_NS };
