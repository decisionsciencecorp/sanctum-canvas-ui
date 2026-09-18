/**
 * A6.5 — Col is a language-contract carrier (label + data array).
 * Rendered as a no-op; Table consumes Col props from columns[] / children.
 */

import { lifecycle, setClass } from "./shared.js";

export const Col = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Col");
    el.setAttribute("hidden", "");
    return el;
  },
  patch(el, props = {}) {
    setClass(el, "canvas-table-col");
    el.setAttribute("data-label", String(props.label ?? ""));
    el.setAttribute("data-col-type", String(props.type ?? "string"));
  },
});

export default Col;
