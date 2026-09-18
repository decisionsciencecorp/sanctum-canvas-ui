/**
 * A5.5 — StepsItem (leaf). Usually consumed via Steps.items;
 * registered for reconciler / fixture mounts.
 */

import {
  asText,
  clearChildren,
  lifecycle,
  normalizeStepEntry,
  renderPanelContent,
  requireDocument,
  setClass,
} from "./shared.js";

export const StepsItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "StepsItem");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = requireDocument(ctx);
    const step = normalizeStepEntry(props, Number(props.index) || 0);
    setClass(el, "canvas-steps__item canvas-steps-item--standalone");
    el.setAttribute("data-step-number", String(step.number));

    clearChildren(el);
    const num = doc.createElement("span");
    setClass(num, "canvas-steps__number-inner");
    num.textContent = String(step.number);
    const title = doc.createElement("span");
    setClass(title, "canvas-steps__title");
    title.textContent = step.title || asText(props.title);
    const details = doc.createElement("div");
    setClass(details, "canvas-steps__details");
    renderPanelContent(details, step.details, ctx);
    el.appendChild(num);
    el.appendChild(title);
    el.appendChild(details);
  },
});

export default StepsItem;
