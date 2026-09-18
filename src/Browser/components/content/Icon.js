/**
 * A8 — Icon: lucide-style glyph by kebab-case name (Doc #1380 allowlist).
 *
 * Wire contract (upstream + Sanctum a11y):
 *   name (required) · category (optional fallback) · size · decorative
 */

import {
  asText,
  clearChildren,
  lifecycle,
  setClass,
  setOrRemoveAttr,
} from "./shared.js";
import {
  DEFAULT_FALLBACK_ICON,
  resolveIconGlyph,
} from "./iconAllowlist.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Named sizes → px (upstream IconWrapper default is 14). */
const SIZE_PX = Object.freeze({
  "extra-small": 12,
  sm: 12,
  small: 12,
  md: 14,
  medium: 14,
  lg: 18,
  large: 20,
});

/**
 * @param {unknown} size
 * @returns {number}
 */
export function resolveIconSize(size) {
  if (typeof size === "number" && Number.isFinite(size) && size > 0) {
    return Math.round(size);
  }
  const key = asText(size).toLowerCase();
  if (key && SIZE_PX[key] != null) return SIZE_PX[key];
  const asNum = Number(key);
  if (key && Number.isFinite(asNum) && asNum > 0) return Math.round(asNum);
  return 14;
}

/**
 * @param {Record<string, unknown>} props
 * @returns {boolean}
 */
export function resolveIconDecorative(props = {}) {
  if (props.decorative === false || props.decorative === "false") return false;
  if (props.decorative === true || props.decorative === "true") return true;
  // Default decorative (icons are usually adornment); labelled when ariaLabel set.
  if (asText(props.ariaLabel) || asText(props.label) || asText(props.title)) {
    return false;
  }
  return true;
}

/**
 * @param {string} name
 * @returns {string}
 */
export function humanizeIconName(name) {
  return String(name || "")
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {Document} doc
 * @param {import("./iconAllowlist.js").IconNode[]} glyphs
 * @param {number} px
 * @returns {Element}
 */
function buildSvg(doc, glyphs, px) {
  const svg =
    typeof doc.createElementNS === "function"
      ? doc.createElementNS(SVG_NS, "svg")
      : doc.createElement("svg");
  svg.setAttribute("class", "canvas-icon__svg");
  svg.setAttribute("width", String(px));
  svg.setAttribute("height", String(px));
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  for (const node of glyphs) {
    const child =
      typeof doc.createElementNS === "function"
        ? doc.createElementNS(SVG_NS, node.tag)
        : doc.createElement(node.tag);
    for (const [k, v] of Object.entries(node.attrs || {})) {
      child.setAttribute(k, v);
    }
    svg.appendChild(child);
  }
  return svg;
}

export const Icon = lifecycle({
  mount(doc) {
    const el = doc.createElement("span");
    el.setAttribute("data-canvas-component", "Icon");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const name = asText(props.name);
    const category = asText(props.category);
    const px = resolveIconSize(props.size);
    const decorative = resolveIconDecorative(props);

    setClass(el, `canvas-icon canvas-icon--${px}`);
    el.setAttribute("data-size", String(px));

    clearChildren(el);

    if (!name) {
      el.setAttribute("data-status", "empty");
      el.removeAttribute("data-icon");
      el.removeAttribute("data-resolved");
      el.removeAttribute("data-exact");
      el.setAttribute("role", "presentation");
      setOrRemoveAttr(el, "aria-hidden", "true");
      el.removeAttribute("aria-label");
      return;
    }

    const { resolved, exact, glyphs } = resolveIconGlyph(name, category);
    const used = glyphs?.length ? resolved : DEFAULT_FALLBACK_ICON;
    const nodes = glyphs?.length
      ? glyphs
      : resolveIconGlyph(DEFAULT_FALLBACK_ICON).glyphs;

    el.setAttribute("data-status", "ready");
    el.setAttribute("data-icon", name);
    el.setAttribute("data-resolved", used);
    el.setAttribute("data-exact", exact ? "true" : "false");
    if (category) el.setAttribute("data-category", category);
    else el.removeAttribute("data-category");

    if (decorative) {
      el.setAttribute("role", "presentation");
      setOrRemoveAttr(el, "aria-hidden", "true");
      el.removeAttribute("aria-label");
    } else {
      el.setAttribute("role", "img");
      el.removeAttribute("aria-hidden");
      const label =
        asText(props.ariaLabel) ||
        asText(props.label) ||
        asText(props.title) ||
        humanizeIconName(name);
      el.setAttribute("aria-label", label);
    }

    el.appendChild(buildSvg(doc, nodes, px));
  },
});

export default Icon;
