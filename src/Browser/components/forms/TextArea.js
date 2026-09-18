/**
 * A6.2 — TextArea.
 */

import {
  commitFieldValue,
  ensureFieldRegistration,
  resolveFieldValue,
  teardownField,
  wireControlA11y,
} from "./fieldControl.js";
import { asText, fieldName, lifecycle, setClass, setOrRemoveAttr } from "./shared.js";

/** @type {WeakMap<Element, { onInput: Function, onBlur: Function, onFocus: Function }>} */
const STATE = new WeakMap();

export const TextArea = lifecycle({
  mount(doc) {
    const el = doc.createElement("textarea");
    el.setAttribute("data-canvas-component", "TextArea");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const name = fieldName(props);
    setClass(el, "canvas-textarea");
    setOrRemoveAttr(el, "name", name || null);
    setOrRemoveAttr(el, "placeholder", asText(props.placeholder) || null);
    const rows = Number(props.rows) || 3;
    el.setAttribute("rows", String(rows));
    if (props.maxLength != null) el.setAttribute("maxlength", String(props.maxLength));
    else el.removeAttribute("maxlength");

    const value = resolveFieldValue(props, ctx, "");
    el.value = value == null ? "" : String(value);
    // Keep textContent in sync for miniDom / SSR-ish reads.
    if (el.childNodes.length === 0 || el.textContent !== el.value) {
      el.textContent = el.value;
    }

    wireControlA11y(el, props, ctx);
    ensureFieldRegistration(el, props, ctx, "TextArea", () => el.value, value);

    let state = STATE.get(el);
    if (!state) {
      state = {
        onInput: () => {
          commitFieldValue(el._canvasProps || {}, el._canvasCtx || {}, el.value, {
            clearError: true,
          });
        },
        onBlur: () => {
          commitFieldValue(el._canvasProps || {}, el._canvasCtx || {}, el.value, {
            validate: true,
          });
        },
        onFocus: () => {
          const p = el._canvasProps || {};
          const c = el._canvasCtx || {};
          const n = fieldName(p);
          if (c.formValidation && n) c.formValidation.clearFieldError(n);
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

export default TextArea;
