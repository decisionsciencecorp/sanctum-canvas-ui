/**
 * A6.1 — Label + Description (hint) primitives.
 */

import { asText, clearChildren, lifecycle, setClass, setOrRemoveAttr } from "./shared.js";

export const Label = lifecycle({
  mount(doc) {
    const el = doc.createElement("label");
    el.setAttribute("data-canvas-component", "Label");
    return el;
  },
  patch(el, props = {}) {
    setClass(el, "canvas-label");
    const text = asText(props.text ?? props.children ?? props.label);
    clearChildren(el);
    if (text) {
      el.appendChild((el.ownerDocument).createTextNode(text));
    }
    if (props.htmlFor || props.for) {
      el.setAttribute("for", asText(props.htmlFor ?? props.for));
    }
    setOrRemoveAttr(el, "data-required", props.required === true ? "1" : null);
    if (props.required === true) {
      const star = el.ownerDocument.createElement("span");
      star.setAttribute("aria-hidden", "true");
      star.setAttribute("class", "canvas-label__required");
      star.textContent = " *";
      el.appendChild(star);
    }
  },
});

export const Description = lifecycle({
  mount(doc) {
    const el = doc.createElement("p");
    el.setAttribute("data-canvas-component", "Description");
    return el;
  },
  patch(el, props = {}) {
    const hasError = props.hasError === true || props.variant === "error";
    setClass(
      el,
      `canvas-description${hasError ? " canvas-description--error" : ""}`,
    );
    setOrRemoveAttr(el, "role", hasError ? "alert" : null);
    setOrRemoveAttr(el, "data-kind", hasError ? "error" : "hint");
    if (props.id) el.setAttribute("id", asText(props.id));
    clearChildren(el);
    const text = asText(props.text ?? props.children ?? props.hint ?? props.message);
    if (text) el.appendChild(el.ownerDocument.createTextNode(text));
  },
});

export default Label;
