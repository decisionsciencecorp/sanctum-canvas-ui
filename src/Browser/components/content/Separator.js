/**
 * Separator — horizontal/vertical rule (Radix-compatible props, plain DOM).
 */

import { asText, lifecycle, setClass, setOrRemoveAttr } from "./shared.js";

export const Separator = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Separator");
    return el;
  },
  patch(el, props = {}) {
    const orientation =
      asText(props.orientation) === "vertical" ? "vertical" : "horizontal";
    const decorative = props.decorative !== false;

    setClass(el, `canvas-separator canvas-separator--${orientation}`);
    el.setAttribute("data-orientation", orientation);
    el.setAttribute("data-status", "ready");

    if (decorative) {
      el.setAttribute("role", "none");
      el.removeAttribute("aria-orientation");
      setOrRemoveAttr(el, "aria-hidden", "true");
    } else {
      el.setAttribute("role", "separator");
      el.setAttribute("aria-orientation", orientation);
      el.removeAttribute("aria-hidden");
    }
  },
});

export default Separator;
