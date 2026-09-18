/**
 * A6.4 — Buttons group (row / column).
 */

import {
  asText,
  clearChildren,
  lifecycle,
  renderContent,
  setClass,
} from "../forms/shared.js";

export const Buttons = lifecycle({
  ownsChildren: true,
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Buttons");
    el.setAttribute("role", "group");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const direction = asText(props.direction) || asText(props.variant) || "row";
    const orientation =
      direction === "column" || direction === "vertical" ? "vertical" : "horizontal";
    setClass(el, `canvas-buttons canvas-buttons--${orientation}`);
    el.setAttribute("data-orientation", orientation);

    const children = props.buttons ?? props.children;
    if (children != null) {
      renderContent(el, children, ctx);
    } else {
      clearChildren(el);
    }
  },
});

export default Buttons;
