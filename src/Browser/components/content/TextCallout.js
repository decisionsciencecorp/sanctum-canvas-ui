/**
 * TextCallout — compact left-border callout (title + description).
 */

import {
  applySurfaceStatus,
  applyVariantCue,
  asText,
  clearChildren,
  lifecycle,
  setClass,
} from "./shared.js";

const VARIANTS = new Set(["neutral", "info", "warning", "success", "danger"]);
const VARIANT_LABELS = {
  neutral: "Neutral callout",
  info: "Information",
  warning: "Warning",
  success: "Success",
  danger: "Danger",
};

function resolveVariant(props) {
  const v = asText(props.variant) || "neutral";
  return VARIANTS.has(v) ? v : "neutral";
}

export const TextCallout = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "TextCallout");
    el.setAttribute("role", "note");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const variant = resolveVariant(props);
    setClass(el, `canvas-text-callout canvas-text-callout--${variant}`);
    applyVariantCue(el, variant, VARIANT_LABELS);

    clearChildren(el);
    const { status } = applySurfaceStatus(el, doc, props);
    if (status !== "ready") return;

    const content = doc.createElement("div");
    content.setAttribute("class", "canvas-text-callout__content");

    const title = asText(props.title);
    const description = asText(props.description);
    if (title) {
      const t = doc.createElement("span");
      t.setAttribute("class", "canvas-text-callout__title");
      t.textContent = title;
      content.appendChild(t);
    }
    if (description) {
      const d = doc.createElement("span");
      d.setAttribute("class", "canvas-text-callout__description");
      d.textContent = description;
      content.appendChild(d);
    }
    if (!title && !description) {
      applySurfaceStatus(el, doc, { ...props, status: "empty" }, {
        emptyMessage: "Empty callout",
      });
      return;
    }
    el.insertBefore(content, el.firstChild);
  },
});

export default TextCallout;
