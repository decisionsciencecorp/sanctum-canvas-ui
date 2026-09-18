/**
 * InlineHeader — compact heading + description.
 */

import {
  applySurfaceStatus,
  asText,
  clearChildren,
  lifecycle,
  setClass,
} from "./shared.js";

export const InlineHeader = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "InlineHeader");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    setClass(el, "canvas-inline-header");

    clearChildren(el);
    const heading = asText(props.heading ?? props.title);
    const description = asText(props.description);

    const { status } = applySurfaceStatus(el, doc, props, {
      emptyMessage: "No heading",
    });
    if (status !== "ready") return;

    if (!heading && !description) {
      applySurfaceStatus(el, doc, { ...props, status: "empty" }, {
        emptyMessage: "No heading",
      });
      return;
    }

    if (heading) {
      const h = doc.createElement("div");
      h.setAttribute("class", "canvas-inline-header__heading");
      h.textContent = heading;
      el.appendChild(h);
    }
    if (description) {
      const d = doc.createElement("div");
      d.setAttribute("class", "canvas-inline-header__description");
      d.textContent = description;
      el.appendChild(d);
    }
  },
});

export default InlineHeader;
