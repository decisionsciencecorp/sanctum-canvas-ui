/**
 * A6.10 — Text / BoldText slot primitives used inside card composites.
 */

import { asText, clearChildren, lifecycle, setClass } from "./shared.js";

function bodyText(props = {}) {
  return asText(props.text ?? props.content ?? props.children ?? props.title ?? props.value);
}

export const Text = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Text");
    return el;
  },
  patch(el, props = {}) {
    setClass(el, "canvas-text canvas-text--plain");
    el.setAttribute("data-weight", "normal");
    clearChildren(el);
    const primary = docCreateBody(el, props, false);
    if (primary) el.appendChild(primary);
  },
});

export const BoldText = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "BoldText");
    return el;
  },
  patch(el, props = {}) {
    setClass(el, "canvas-text canvas-text--bold");
    el.setAttribute("data-weight", "bold");
    clearChildren(el);
    const primary = docCreateBody(el, props, true);
    if (primary) el.appendChild(primary);
  },
});

/**
 * @param {Element} el
 * @param {Record<string, unknown>} props
 * @param {boolean} bold
 */
function docCreateBody(el, props, bold) {
  const doc = el.ownerDocument;
  const text = bodyText(props);
  if (!text) {
    el.setAttribute("data-status", "empty");
    return null;
  }
  el.setAttribute("data-status", "ready");
  const span = doc.createElement("span");
  span.setAttribute("class", bold ? "canvas-text__primary canvas-text__primary--bold" : "canvas-text__primary");
  span.textContent = text;
  return span;
}

export default Text;
