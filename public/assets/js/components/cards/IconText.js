/**
 * A6.10 — IconText composite (icon badge + title/subtitle).
 */

import {
  asText,
  clearChildren,
  lifecycle,
  setClass,
} from "./shared.js";

const LAYOUTS = new Set(["horizontal", "vertical"]);
const VARIANTS = new Set([
  "neutral",
  "info",
  "success",
  "warning",
  "danger",
  "inverted",
  "filled",
  "soft",
]);

/**
 * @param {unknown} icon
 * @returns {string}
 */
export function resolveIconLabel(icon) {
  if (icon == null) return "";
  if (typeof icon === "string" || typeof icon === "number") return String(icon);
  if (typeof icon === "object") {
    const o = /** @type {Record<string, unknown>} */ (icon);
    const props =
      o.props && typeof o.props === "object"
        ? /** @type {Record<string, unknown>} */ (o.props)
        : o;
    return asText(props.name ?? props.icon ?? props.label ?? props.title);
  }
  return "";
}

export const IconText = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "IconText");
    return el;
  },
  patch(el, props = {}) {
    const doc = el.ownerDocument;
    const layout = LAYOUTS.has(asText(props.layout)) ? asText(props.layout) : "horizontal";
    let variant = asText(props.iconVariant) || "neutral";
    if (variant === "filled" || variant === "soft") variant = "neutral";
    if (!VARIANTS.has(variant)) variant = "neutral";
    const bold = props.bold === true;
    const title = asText(props.title);
    const subtitle = asText(props.subtitle);
    const iconLabel = resolveIconLabel(props.icon);

    setClass(
      el,
      `canvas-icon-text canvas-icon-text--${layout}${bold ? " canvas-icon-text--bold" : ""}`,
    );
    el.setAttribute("data-layout", layout);
    el.setAttribute("data-icon-variant", variant);

    clearChildren(el);

    const badge = doc.createElement("span");
    badge.setAttribute(
      "class",
      `canvas-icon-text__badge canvas-icon-text__badge--${variant}`,
    );
    badge.setAttribute("aria-hidden", "true");
    badge.setAttribute("data-icon", iconLabel || "•");
    badge.textContent = iconLabel ? iconLabel.slice(0, 2).toUpperCase() : "•";
    el.appendChild(badge);

    const content = doc.createElement("div");
    content.setAttribute("class", "canvas-icon-text__content");

    const titleEl = doc.createElement("div");
    titleEl.setAttribute("class", "canvas-icon-text__title");
    titleEl.textContent = title;
    content.appendChild(titleEl);

    if (subtitle) {
      const sub = doc.createElement("div");
      sub.setAttribute("class", "canvas-icon-text__subtitle");
      sub.textContent = subtitle;
      content.appendChild(sub);
    }

    el.appendChild(content);
    el.setAttribute("data-status", title ? "ready" : "empty");
  },
});

export default IconText;
