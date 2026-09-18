/**
 * A6.1 — Explicit Submit / Reset controls (form-scoped).
 */

import { submitForm, resetForm } from "./Form.js";
import {
  asText,
  lifecycle,
  resolveDisabled,
  resolveIsStreaming,
  setClass,
  setOrRemoveAttr,
} from "./shared.js";

/** @type {WeakMap<Element, { onClick: (e: any) => void }>} */
const STATE = new WeakMap();

function findParentForm(el) {
  let n = el?.parentNode;
  while (n) {
    if (n.nodeType === 1 && n.getAttribute?.("data-canvas-component") === "Form") {
      return n;
    }
    n = n.parentNode;
  }
  return null;
}

function makeButton(doc, kind) {
  const el = doc.createElement("button");
  el.setAttribute("data-canvas-component", kind);
  el.setAttribute("type", kind === "Submit" ? "submit" : "reset");
  return el;
}

function patchActionButton(el, kind, props, ctx) {
  const label = asText(props.label ?? props.text ?? (kind === "Submit" ? "Submit" : "Reset"));
  setClass(
    el,
    `canvas-button canvas-button--${kind === "Submit" ? "primary" : "secondary"} canvas-${kind.toLowerCase()}`,
  );
  el.textContent = label;
  const disabled = resolveDisabled(props, ctx) || resolveIsStreaming(props, ctx);
  setOrRemoveAttr(el, "disabled", disabled ? true : null);
  setOrRemoveAttr(el, "aria-disabled", disabled ? "true" : null);

  let state = STATE.get(el);
  if (!state) {
    state = {
      onClick: (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        if (el.getAttribute("disabled") != null || el.getAttribute("aria-disabled") === "true") {
          return;
        }
        const form = findParentForm(el);
        const p = el._canvasProps || {};
        const c = el._canvasCtx || {};
        if (!form) {
          if (kind === "Submit" && typeof p.onClick === "function") p.onClick(e);
          return;
        }
        if (kind === "Submit") {
          void submitForm(form, form._canvasProps || p, form._canvasCtx || c, {
            userGesture: true,
          });
        } else {
          resetForm(form, form._canvasProps || p, form._canvasCtx || c);
        }
      },
    };
    el.addEventListener("click", state.onClick);
    STATE.set(el, state);
  }
  el._canvasProps = props;
  el._canvasCtx = ctx;
}

export const Submit = lifecycle({
  ownsChildren: true,
  mount(doc) {
    return makeButton(doc, "Submit");
  },
  patch(el, props = {}, ctx = {}) {
    patchActionButton(el, "Submit", props, ctx);
  },
  unmount(el) {
    const state = STATE.get(el);
    if (state) el.removeEventListener("click", state.onClick);
    STATE.delete(el);
  },
});

export const Reset = lifecycle({
  ownsChildren: true,
  mount(doc) {
    return makeButton(doc, "Reset");
  },
  patch(el, props = {}, ctx = {}) {
    patchActionButton(el, "Reset", props, ctx);
  },
  unmount(el) {
    const state = STATE.get(el);
    if (state) el.removeEventListener("click", state.onClick);
    STATE.delete(el);
  },
});

export default Submit;
