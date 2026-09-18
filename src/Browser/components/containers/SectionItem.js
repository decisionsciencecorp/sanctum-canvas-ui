/**
 * A5.5 — SectionItem (leaf). Usually consumed via SectionBlock.sections;
 * registered so reconciler / fixtures can mount a single section shell.
 */

import {
  asText,
  clearChildren,
  lifecycle,
  normalizeSectionEntry,
  renderPanelContent,
  requireDocument,
  setClass,
} from "./shared.js";

export const SectionItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "SectionItem");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = requireDocument(ctx);
    const section = normalizeSectionEntry(props, 0);
    setClass(el, "canvas-section-item canvas-section-v2");
    el.setAttribute("data-section-value", section.value);
    el.setAttribute("data-state", "open");

    clearChildren(el);
    const head = doc.createElement("div");
    setClass(head, "canvas-section-v2__header");
    const trigger = doc.createElement("div");
    setClass(trigger, "canvas-section-v2__trigger");
    trigger.textContent = section.trigger || asText(props.trigger);
    head.appendChild(trigger);

    const panel = doc.createElement("div");
    setClass(panel, "canvas-section-v2__content");
    renderPanelContent(panel, section.content, ctx);

    el.appendChild(head);
    el.appendChild(panel);
  },
});

export default SectionItem;
