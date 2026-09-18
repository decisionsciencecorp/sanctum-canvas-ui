/**
 * A6.2 — Input (text/number/email/password/url).
 */

import {
  commitFieldValue,
  ensureFieldRegistration,
  resolveFieldValue,
  teardownField,
  wireControlA11y,
} from "./fieldControl.js";
import {
  asText,
  fieldName,
  lifecycle,
  setClass,
  setOrRemoveAttr,
} from "./shared.js";

const TYPES = new Set(["text", "number", "email", "password", "url", "search", "tel"]);

/** @type {WeakMap<Element, { onInput: Function, onBlur: Function, onFocus: Function }>} */
const STATE = new WeakMap();

function resolveType(props) {
  const t = asText(props.type) || "text";
  return TYPES.has(t) ? t : "text";
}

export const Input = lifecycle({
  mount(doc) {
    const el = doc.createElement("input");
    el.setAttribute("data-canvas-component", "Input");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const name = fieldName(props);
    const type = resolveType(props);
    setClass(el, `canvas-input canvas-input--${type}`);
    el.setAttribute("type", type);
    setOrRemoveAttr(el, "name", name || null);
    setOrRemoveAttr(el, "placeholder", asText(props.placeholder) || null);
    if (props.min != null) el.setAttribute("min", String(props.min));
    else el.removeAttribute("min");
    if (props.max != null) el.setAttribute("max", String(props.max));
    else el.removeAttribute("max");
    if (props.step != null) el.setAttribute("step", String(props.step));
    else el.removeAttribute("step");
    if (props.maxLength != null) el.setAttribute("maxlength", String(props.maxLength));
    else el.removeAttribute("maxlength");

    const value = resolveFieldValue(props, ctx, "");
    el.value = value == null ? "" : String(value);

    wireControlA11y(el, props, ctx);
    ensureFieldRegistration(
      el,
      props,
      ctx,
      "Input",
      () => el.value,
      value,
    );

    let state = STATE.get(el);
    if (!state) {
      state = {
        onInput: () => {
          const p = el._canvasProps || {};
          const c = el._canvasCtx || {};
          commitFieldValue(p, c, el.value, { clearError: true });
        },
        onBlur: () => {
          const p = el._canvasProps || {};
          const c = el._canvasCtx || {};
          commitFieldValue(p, c, el.value, { validate: true });
        },
        onFocus: () => {
          const p = el._canvasProps || {};
          const c = el._canvasCtx || {};
          const fv = c.formValidation;
          const n = fieldName(p);
          if (fv && n) fv.clearFieldError(n);
        },
      };
      el.addEventListener("input", state.onInput);
      el.addEventListener("change", state.onInput);
      el.addEventListener("blur", state.onBlur);
      el.addEventListener("focus", state.onFocus);
      STATE.set(el, state);
    }
    el._canvasProps = props;
    el._canvasCtx = ctx;
  },
  unmount(el, ctx) {
    const state = STATE.get(el);
    if (state) {
      el.removeEventListener("input", state.onInput);
      el.removeEventListener("change", state.onInput);
      el.removeEventListener("blur", state.onBlur);
      el.removeEventListener("focus", state.onFocus);
    }
    STATE.delete(el);
    teardownField(el, ctx);
  },
});

export default Input;
