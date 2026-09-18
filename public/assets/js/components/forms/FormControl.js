/**
 * A6.1 — FormControl: label + input slot + hint / error message.
 */

import {
  asText,
  clearChildren,
  lifecycle,
  renderContent,
  resolveFormValidation,
  setClass,
  setOrRemoveAttr,
  unwrapProps,
} from "./shared.js";
import { controlId } from "./shared.js";

/**
 * Extract field name from nested input vnode / props.
 * @param {unknown} input
 * @returns {string}
 */
export function extractInputName(input) {
  const p = unwrapProps(input);
  if (!p) return "";
  if (typeof p.name === "string") return p.name;
  if (p.name && typeof p.name === "object" && "name" in /** @type {object} */ (p.name)) {
    return asText(/** @type {{ name: unknown }} */ (p.name).name);
  }
  return asText(p.name);
}

/**
 * Whether nested input declares required rule.
 * @param {unknown} input
 */
export function inputIsRequired(input) {
  const p = unwrapProps(input);
  const rules = p?.rules;
  if (!rules || typeof rules !== "object") return false;
  return /** @type {Record<string, unknown>} */ (rules).required === true;
}

export const FormControl = lifecycle({
  ownsChildren: true,
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "FormControl");
    const label = doc.createElement("label");
    label.setAttribute("data-canvas-part", "label");
    label.setAttribute("class", "canvas-form-control__label");
    const inputHost = doc.createElement("div");
    inputHost.setAttribute("data-canvas-part", "input");
    inputHost.setAttribute("class", "canvas-form-control__input");
    const message = doc.createElement("div");
    message.setAttribute("data-canvas-part", "message");
    message.setAttribute("class", "canvas-form-control__message");
    el.appendChild(label);
    el.appendChild(inputHost);
    el.appendChild(message);
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const field = extractInputName(props.input) || asText(props.name);
    const fv = resolveFormValidation(ctx);
    const error = field && fv?.errors ? fv.errors[field] : undefined;
    const hasError = !!(error || props.hasError);
    const required = props.required === true || inputIsRequired(props.input);
    const id = field ? controlId(field) : controlId("", "control");
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    setClass(el, `canvas-form-control${hasError ? " canvas-form-control--error" : ""}`);
    setOrRemoveAttr(el, "data-invalid", hasError ? "1" : null);
    setOrRemoveAttr(el, "data-required", required ? "1" : null);
    if (field) el.setAttribute("data-field", field);

    const labelEl = el.childNodes[0];
    const inputHost = el.childNodes[1];
    const messageEl = el.childNodes[2];

    if (labelEl) {
      labelEl.setAttribute("for", id);
      labelEl.setAttribute("id", `${id}-label`);
      clearChildren(labelEl);
      const text = asText(props.label);
      if (text) labelEl.appendChild((ctx.document ?? el.ownerDocument).createTextNode(text));
      if (required) {
        const req = (ctx.document ?? el.ownerDocument).createElement("span");
        req.setAttribute("aria-hidden", "true");
        req.setAttribute("class", "canvas-form-control__required");
        req.textContent = " *";
        labelEl.appendChild(req);
      }
    }

    if (inputHost) {
      const inputProps =
        props.input && typeof props.input === "object"
          ? {
              ...(unwrapProps(props.input) || {}),
              id,
              labelledBy: `${id}-label`,
              hintId: !hasError && props.hint ? hintId : undefined,
              errorId: hasError ? errorId : undefined,
            }
          : { id, labelledBy: `${id}-label` };

      if (props.input && typeof props.input === "object" && "type" in /** @type {object} */ (props.input)) {
        const vnode = {
          .../** @type {object} */ (props.input),
          props: inputProps,
        };
        renderContent(inputHost, [vnode], ctx);
      } else if (props.input != null) {
        // Plain props bag — render via children hook if host provided a factory.
        if (typeof ctx.renderInput === "function") {
          clearChildren(inputHost);
          ctx.renderInput(inputHost, inputProps, ctx);
        } else {
          renderContent(inputHost, props.input, ctx);
        }
      } else {
        clearChildren(inputHost);
      }
    }

    if (messageEl) {
      clearChildren(messageEl);
      const doc = ctx.document ?? el.ownerDocument;
      if (hasError && error) {
        messageEl.setAttribute("id", errorId);
        messageEl.setAttribute("role", "alert");
        messageEl.setAttribute("data-kind", "error");
        messageEl.textContent = String(error);
      } else if (props.hint) {
        messageEl.setAttribute("id", hintId);
        messageEl.removeAttribute("role");
        messageEl.setAttribute("data-kind", "hint");
        messageEl.textContent = asText(props.hint);
      } else {
        messageEl.removeAttribute("id");
        messageEl.removeAttribute("role");
        messageEl.removeAttribute("data-kind");
      }
      void doc;
    }
  },
});

export default FormControl;
