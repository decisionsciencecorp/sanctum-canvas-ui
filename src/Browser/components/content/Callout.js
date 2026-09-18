/**
 * Callout — status callout with optional CSS autodismiss (duration ms).
 */

import {
  applySurfaceStatus,
  applyVariantCue,
  asText,
  clearChildren,
  lifecycle,
  setClass,
  setOrRemoveAttr,
} from "./shared.js";
import { setInlineStyle, clearInlineStyle } from "../../renderer/inlineStyle.js";

const VARIANTS = new Set(["neutral", "info", "warning", "success", "danger"]);
const VARIANT_LABELS = {
  neutral: "Neutral notice",
  info: "Information",
  warning: "Warning",
  success: "Success",
  danger: "Danger",
};

/** @type {WeakMap<Element, ReturnType<typeof setTimeout>>} */
const dismissTimers = new WeakMap();

function resolveVariant(props) {
  const v = asText(props.variant) || "neutral";
  return VARIANTS.has(v) ? v : "neutral";
}

function clearDismiss(el) {
  const t = dismissTimers.get(el);
  if (t != null) {
    clearTimeout(t);
    dismissTimers.delete(el);
  }
}

export const Callout = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Callout");
    el.setAttribute("role", "status");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const variant = resolveVariant(props);
    const duration = Number(props.duration);
    const autodismiss = Number.isFinite(duration) && duration > 0;

    let cls = `canvas-callout canvas-callout--${variant}`;
    if (autodismiss) cls += " canvas-callout--autodismiss";
    setClass(el, cls);
    applyVariantCue(el, variant, VARIANT_LABELS);
    if (autodismiss) {
      setInlineStyle(el, { "--canvas-callout-duration": `${duration}ms` });
      el.setAttribute("data-autodismiss", "true");
    } else {
      clearInlineStyle(el);
      el.removeAttribute("data-autodismiss");
    }

    setOrRemoveAttr(el, "hidden", props.visible === false ? "true" : null);

    clearChildren(el);
    const { status } = applySurfaceStatus(el, doc, props);
    if (status !== "ready") {
      clearDismiss(el);
      return;
    }

    const title = asText(props.title);
    const description = asText(props.description);
    if (title) {
      const t = doc.createElement("span");
      t.setAttribute("class", "canvas-callout__title");
      t.textContent = title;
      el.appendChild(t);
    }
    if (description) {
      const d = doc.createElement("span");
      d.setAttribute("class", "canvas-callout__description");
      d.textContent = description;
      el.appendChild(d);
    }
    if (!title && !description) {
      applySurfaceStatus(el, doc, { ...props, status: "empty" }, {
        emptyMessage: "Empty callout",
      });
    }

    clearDismiss(el);
    if (autodismiss && typeof setTimeout === "function") {
      const timer = setTimeout(() => {
        el.setAttribute("data-dismissed", "true");
        el.setAttribute("hidden", "true");
        dismissTimers.delete(el);
      }, duration);
      dismissTimers.set(el, timer);
    }
  },
  unmount(el) {
    clearDismiss(el);
  },
});

export default Callout;
