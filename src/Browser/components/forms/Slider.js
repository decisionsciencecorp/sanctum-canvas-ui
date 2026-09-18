/**
 * A6.2 — Slider (continuous / discrete).
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
  setClass,
  setOrRemoveAttr,
} from "./shared.js";

/** @type {WeakMap<Element, { onInput: Function, onChange: Function }>} */
const STATE = new WeakMap();

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const Slider = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Slider");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const name = fieldName(props);
    const variant = asText(props.variant) === "discrete" ? "discrete" : "continuous";
    const min = num(props.min, 0);
    const max = num(props.max, 100);
    const step =
      props.step != null
        ? num(props.step, 1)
        : variant === "discrete"
          ? 1
          : "any";

    setClass(el, `canvas-slider canvas-slider--${variant}`);
    el.setAttribute("data-variant", variant);

    const raw = resolveFieldValue(props, ctx, props.defaultValue ?? min);
    let current;
    if (Array.isArray(raw)) current = num(raw[0], min);
    else current = num(raw, min);
    current = Math.min(max, Math.max(min, current));

    clearChildren(el);

    const labelText = asText(props.label);
    if (labelText) {
      const lab = doc.createElement("div");
      lab.setAttribute("class", "canvas-slider__label");
      lab.setAttribute("data-canvas-part", "label");
      lab.textContent = labelText;
      el.appendChild(lab);
    }

    const input = doc.createElement("input");
    input.setAttribute("type", "range");
    input.setAttribute("class", "canvas-slider__input");
    input.setAttribute("data-canvas-part", "input");
    input.setAttribute("min", String(min));
    input.setAttribute("max", String(max));
    input.setAttribute("step", String(step));
    input.value = String(current);
    setOrRemoveAttr(input, "name", name || null);
    wireControlA11y(input, props, ctx);
    el.appendChild(input);

    const valueEl = doc.createElement("output");
    valueEl.setAttribute("class", "canvas-slider__value");
    valueEl.setAttribute("data-canvas-part", "value");
    valueEl.textContent = String(current);
    el.appendChild(valueEl);

    ensureFieldRegistration(
      el,
      props,
      ctx,
      "Slider",
      () => [Number(input.value)],
      [current],
    );

    let state = STATE.get(el);
    if (!state) {
      state = {
        onInput: () => {
          valueEl.textContent = input.value;
          commitFieldValue(el._canvasProps || {}, el._canvasCtx || {}, [Number(input.value)], {
            clearError: true,
          });
        },
        onChange: () => {
          valueEl.textContent = input.value;
          commitFieldValue(el._canvasProps || {}, el._canvasCtx || {}, [Number(input.value)], {
            validate: true,
          });
        },
      };
      STATE.set(el, state);
    }
    input.addEventListener("input", state.onInput);
    input.addEventListener("change", state.onChange);

    el._canvasProps = props;
    el._canvasCtx = ctx;
  },
  unmount(el, ctx) {
    STATE.delete(el);
    teardownField(el, ctx);
  },
});

export default Slider;
