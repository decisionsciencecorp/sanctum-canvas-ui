/**
 * Tag — compact label chip with semantic variant + size.
 */

import {
  applySurfaceStatus,
  applyVariantCue,
  asText,
  clearChildren,
  lifecycle,
  resolveStatus,
  setClass,
} from "./shared.js";

const SIZES = new Set(["sm", "md", "lg"]);
const VARIANTS = new Set(["neutral", "info", "success", "warning", "danger"]);
const VARIANT_LABELS = {
  neutral: "Tag",
  info: "Info tag",
  success: "Success tag",
  warning: "Warning tag",
  danger: "Danger tag",
};

function resolveSize(props) {
  const s = asText(props.size) || "md";
  return SIZES.has(s) ? s : "md";
}

function resolveVariant(props) {
  const v = asText(props.variant) || "neutral";
  return VARIANTS.has(v) ? v : "neutral";
}

export const Tag = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Tag");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const size = resolveSize(props);
    const variant = resolveVariant(props);
    setClass(el, `canvas-tag canvas-tag--${size} canvas-tag--${variant}`);
    el.setAttribute("data-size", size);
    applyVariantCue(el, variant, VARIANT_LABELS);

    clearChildren(el);
    const text = asText(props.text);
    const effective =
      resolveStatus(props) === "ready" && !text
        ? { ...props, status: "empty" }
        : props;
    const { status } = applySurfaceStatus(el, doc, effective, {
      emptyMessage: "Empty tag",
      showStatusText: true,
    });
    if (status !== "ready") return;

    const icon = asText(props.icon);
    if (icon) {
      const iconEl = doc.createElement("span");
      iconEl.setAttribute("class", "canvas-tag__icon");
      iconEl.setAttribute("aria-hidden", "true");
      iconEl.textContent = icon;
      el.appendChild(iconEl);
    }

    const textEl = doc.createElement("span");
    textEl.setAttribute("class", "canvas-tag__text");
    textEl.textContent = text;
    el.appendChild(textEl);
  },
});

export default Tag;
