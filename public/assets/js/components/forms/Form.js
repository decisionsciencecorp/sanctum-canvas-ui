/**
 * A6.1 — Form shell: validation context, field slot, buttons, nested reject,
 * partial-stream disable, action-plan submit via ctx.actions / actionRunner.
 */

import { createFormValidationController } from "./formValidationController.js";
import {
  asText,
  clearChildren,
  lifecycle,
  renderContent,
  requireDocument,
  resolveDisabled,
  resolveIsStreaming,
  setClass,
  setOrRemoveAttr,
} from "./shared.js";

/** @type {WeakMap<Element, { formName: string, formValidation: ReturnType<typeof createFormValidationController>, childCtx: Record<string, unknown>, submitting: boolean }>} */
const STATE = new WeakMap();

/**
 * @param {Element} el
 */
function getState(el) {
  return STATE.get(el);
}

/**
 * Build child ctx with form providers (does not mutate parent ctx).
 * @param {Record<string, unknown>} ctx
 * @param {string} formName
 * @param {ReturnType<typeof createFormValidationController>} formValidation
 * @param {{ submitting: boolean }} formMeta
 */
export function buildFormChildCtx(ctx, formName, formValidation, formMeta) {
  return {
    ...ctx,
    formName,
    formValidation,
    form: formMeta,
    parentFormName: ctx.formName,
  };
}

/**
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
function rejectNested(props, ctx) {
  const parent = asText(ctx.formName);
  if (parent) {
    const err = new Error(`Form: nested forms are not allowed (parent="${parent}")`);
    if (typeof ctx.reportError === "function") ctx.reportError(err);
    throw err;
  }
}

/**
 * Run form submit: validate → action plan.
 * @param {Element} el
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 * @param {{ userGesture?: boolean }} [opts]
 */
export async function submitForm(el, props = {}, ctx = {}, opts = {}) {
  const state = getState(el);
  if (!state) return { ok: false, reason: "no-state" };
  if (state.submitting) return { ok: false, reason: "busy" };
  if (resolveDisabled(props, ctx) || resolveIsStreaming(props, ctx)) {
    return { ok: false, reason: "disabled" };
  }

  const fv = state.formValidation;
  if (!fv.validateForm()) {
    el.setAttribute("data-invalid", "1");
    return { ok: false, reason: "invalid" };
  }
  el.removeAttribute("data-invalid");

  state.submitting = true;
  state.childCtx.form = { submitting: true };
  el.setAttribute("data-submitting", "1");
  el.setAttribute("aria-busy", "true");

  try {
    const plan = props.action ?? props.onSubmit ?? props.submitAction;
    const runner = ctx.actions ?? ctx.actionRunner;
    if (plan && runner && typeof runner.run === "function") {
      const result = await runner.run(plan, { userGesture: opts.userGesture === true });
      if (result && result.ok === false) {
        el.setAttribute("data-mutation-failed", "1");
        return result;
      }
      el.removeAttribute("data-mutation-failed");
      return result ?? { ok: true };
    }
    if (typeof props.onSubmit === "function") {
      await /** @type {(p: object) => unknown} */ (props.onSubmit)({ formName: state.formName });
    }
    return { ok: true };
  } finally {
    state.submitting = false;
    state.childCtx.form = { submitting: false };
    el.removeAttribute("data-submitting");
    el.removeAttribute("aria-busy");
  }
}

/**
 * @param {Element} el
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
export function resetForm(el, props = {}, ctx = {}) {
  const state = getState(el);
  if (!state) return;
  const fv = state.formValidation;
  for (const name of fv.fieldNames()) {
    fv.clearFieldError(name);
    const bindings = ctx.bindings;
    if (bindings && typeof bindings.setFieldValue === "function") {
      bindings.setFieldValue(state.formName, name, undefined);
    }
  }
  el.removeAttribute("data-invalid");
  el.removeAttribute("data-mutation-failed");
  if (typeof props.onReset === "function") {
    /** @type {() => void} */ (props.onReset)();
  }
  const plan = props.resetAction;
  const runner = ctx.actions ?? ctx.actionRunner;
  if (plan && runner && typeof runner.run === "function") {
    void runner.run(plan, { userGesture: true });
  }
}

export const Form = lifecycle({
  ownsChildren: true,
  mount(doc) {
    const el = doc.createElement("form");
    el.setAttribute("data-canvas-component", "Form");
    el.setAttribute("role", "form");
    el.setAttribute("novalidate", "");
    const fields = doc.createElement("div");
    fields.setAttribute("data-canvas-part", "fields");
    fields.setAttribute("class", "canvas-form__fields");
    const buttons = doc.createElement("div");
    buttons.setAttribute("data-canvas-part", "buttons");
    buttons.setAttribute("class", "canvas-form__buttons");
    el.appendChild(fields);
    el.appendChild(buttons);
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    rejectNested(props, ctx);
    const doc = requireDocument(ctx);
    const formName = asText(props.name) || "form";
    let state = getState(el);
    if (!state || state.formName !== formName) {
      const formValidation = createFormValidationController();
      const formMeta = { submitting: false };
      state = {
        formName,
        formValidation,
        childCtx: buildFormChildCtx(ctx, formName, formValidation, formMeta),
        submitting: false,
      };
      STATE.set(el, state);
    } else {
      // Refresh child ctx with latest parent ctx keys while keeping form providers.
      state.childCtx = buildFormChildCtx(
        ctx,
        formName,
        state.formValidation,
        state.childCtx.form || { submitting: state.submitting },
      );
    }

    setClass(el, "canvas-form");
    el.setAttribute("data-form-name", formName);
    el.setAttribute("name", formName);
    setOrRemoveAttr(el, "aria-busy", resolveIsStreaming(props, ctx) || state.submitting ? "true" : null);
    if (resolveIsStreaming(props, ctx)) el.setAttribute("data-streaming", "1");
    else el.removeAttribute("data-streaming");
    if (resolveDisabled(props, ctx)) el.setAttribute("data-disabled", "1");
    else el.removeAttribute("data-disabled");

    // Prevent native submit navigation in real browsers.
    if (!el._canvasSubmitBound) {
      el.addEventListener("submit", (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        void submitForm(el, el._canvasProps || {}, el._canvasCtx || {}, { userGesture: true });
      });
      el.addEventListener("reset", (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        resetForm(el, el._canvasProps || {}, el._canvasCtx || {});
      });
      el._canvasSubmitBound = true;
    }
    el._canvasProps = props;
    el._canvasCtx = ctx;

    const fieldsHost = el.querySelector?.('[data-canvas-part="fields"]') || el.childNodes[0];
    const buttonsHost = el.querySelector?.('[data-canvas-part="buttons"]') || el.childNodes[1];

    const childCtx = state.childCtx;
    if (fieldsHost) {
      if (props.fields != null) {
        renderContent(fieldsHost, props.fields, childCtx);
      } else if (props.children != null) {
        renderContent(fieldsHost, props.children, childCtx);
      } else {
        clearChildren(fieldsHost);
      }
    }
    if (buttonsHost) {
      if (props.buttons != null) {
        renderContent(buttonsHost, props.buttons, childCtx);
      } else {
        clearChildren(buttonsHost);
      }
    }
    void doc;
  },
  unmount(el) {
    STATE.delete(el);
  },
});

export default Form;
