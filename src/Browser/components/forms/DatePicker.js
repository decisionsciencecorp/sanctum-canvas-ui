/**
 * A6.2 — DatePicker (single / range via native date inputs).
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

/** @type {WeakMap<Element, { onChange: Function }>} */
const STATE = new WeakMap();

function toDateString(v) {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v.slice(0, 10);
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  return String(v).slice(0, 10);
}

export const DatePicker = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "DatePicker");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const name = fieldName(props);
    const mode = asText(props.mode) === "range" ? "range" : "single";
    setClass(el, `canvas-datepicker canvas-datepicker--${mode}`);
    el.setAttribute("data-mode", mode);

    const value = resolveFieldValue(props, ctx, mode === "range" ? {} : "");

    clearChildren(el);

    if (mode === "range") {
      const start = doc.createElement("input");
      start.setAttribute("type", "date");
      start.setAttribute("data-canvas-part", "start");
      start.setAttribute("class", "canvas-datepicker__input");
      const end = doc.createElement("input");
      end.setAttribute("type", "date");
      end.setAttribute("data-canvas-part", "end");
      end.setAttribute("class", "canvas-datepicker__input");
      const range =
        value && typeof value === "object"
          ? value
          : { from: "", to: "" };
      start.value = toDateString(range.from ?? range.start ?? "");
      end.value = toDateString(range.to ?? range.end ?? "");
      setOrRemoveAttr(start, "name", name ? `${name}.from` : null);
      setOrRemoveAttr(end, "name", name ? `${name}.to` : null);
      wireControlA11y(start, { ...props, id: props.id ? `${props.id}-from` : undefined }, ctx);
      wireControlA11y(end, { ...props, id: props.id ? `${props.id}-to` : undefined }, ctx);
      el.appendChild(start);
      el.appendChild(end);

      ensureFieldRegistration(
        el,
        props,
        ctx,
        "DatePicker",
        () => ({ from: start.value, to: end.value }),
        value,
      );

      let state = STATE.get(el);
      if (!state) {
        state = {
          onChange: () => {
            const next = { from: start.value, to: end.value };
            commitFieldValue(el._canvasProps || {}, el._canvasCtx || {}, next, {
              validate: true,
            });
          },
        };
        start.addEventListener("change", state.onChange);
        end.addEventListener("change", state.onChange);
        STATE.set(el, state);
      } else {
        start.addEventListener("change", state.onChange);
        end.addEventListener("change", state.onChange);
      }
    } else {
      const input = doc.createElement("input");
      input.setAttribute("type", "date");
      input.setAttribute("data-canvas-part", "single");
      input.setAttribute("class", "canvas-datepicker__input");
      input.value = toDateString(value);
      setOrRemoveAttr(input, "name", name || null);
      if (props.min) input.setAttribute("min", toDateString(props.min));
      if (props.max) input.setAttribute("max", toDateString(props.max));
      wireControlA11y(input, props, ctx);
      el.appendChild(input);

      ensureFieldRegistration(el, props, ctx, "DatePicker", () => input.value, value);

      let state = STATE.get(el);
      if (!state) {
        state = {
          onChange: () => {
            commitFieldValue(el._canvasProps || {}, el._canvasCtx || {}, input.value, {
              validate: true,
            });
          },
        };
        STATE.set(el, state);
      }
      input.addEventListener("change", state.onChange);
    }

    el._canvasProps = props;
    el._canvasCtx = ctx;
  },
  unmount(el, ctx) {
    STATE.delete(el);
    teardownField(el, ctx);
  },
});

export default DatePicker;
