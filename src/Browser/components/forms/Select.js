/**
 * A6.3 — Select + SelectItem.
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
  clearChildren,
  fieldName,
  lifecycle,
  mapItems,
  setClass,
  setOrRemoveAttr,
  unwrapProps,
} from "./shared.js";

/** @type {WeakMap<Element, { onChange: Function }>} */
const STATE = new WeakMap();

export const SelectItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("option");
    el.setAttribute("data-canvas-component", "SelectItem");
    return el;
  },
  patch(el, props = {}) {
    const value = asText(props.value);
    el.setAttribute("value", value);
    el.textContent = asText(props.label) || value;
    setOrRemoveAttr(el, "disabled", props.disabled === true ? true : null);
  },
});

export const Select = lifecycle({
  mount(doc) {
    const el = doc.createElement("select");
    el.setAttribute("data-canvas-component", "Select");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const name = fieldName(props);
    const size = asText(props.size) || "md";
    setClass(el, `canvas-select canvas-select--${size}`);
    setOrRemoveAttr(el, "name", name || null);

    const items = mapItems(props.items, (p) => ({
      value: asText(p.value),
      label: asText(p.label) || asText(p.value),
      disabled: p.disabled === true,
    })).filter((i) => i.value);

    clearChildren(el);
    const doc = ctx.document ?? el.ownerDocument;
    const placeholder = asText(props.placeholder) || "Select...";
    const ph = doc.createElement("option");
    ph.setAttribute("value", "");
    ph.textContent = placeholder;
    el.appendChild(ph);
    for (const item of items) {
      const opt = doc.createElement("option");
      opt.setAttribute("value", item.value);
      opt.textContent = item.label;
      if (item.disabled) opt.setAttribute("disabled", "true");
      el.appendChild(opt);
    }

    const value = resolveFieldValue(props, ctx, "");
    el.value = value == null ? "" : String(value);

    wireControlA11y(el, props, ctx);
    ensureFieldRegistration(el, props, ctx, "Select", () => el.value || undefined, value);

    let state = STATE.get(el);
    if (!state) {
      state = {
        onChange: () => {
          commitFieldValue(el._canvasProps || {}, el._canvasCtx || {}, el.value, {
            validate: true,
          });
        },
      };
      el.addEventListener("change", state.onChange);
      STATE.set(el, state);
    }
    el._canvasProps = props;
    el._canvasCtx = ctx;
  },
  unmount(el, ctx) {
    const state = STATE.get(el);
    if (state) el.removeEventListener("change", state.onChange);
    STATE.delete(el);
    teardownField(el, ctx);
  },
});

export { unwrapProps };
export default Select;
