/**
 * Shared helpers for A6 form controls (plain DOM + --canvas-* tokens).
 */

import { validateField } from "../../runtime/formValidation.js";

/**
 * @param {Record<string, unknown>} [ctx]
 * @returns {Document}
 */
export function requireDocument(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("form component: ctx.document required");
  }
  return doc;
}

/**
 * @param {Element} el
 * @param {string} className
 */
export function setClass(el, className) {
  el.setAttribute("class", String(className).trim());
}

/**
 * @param {Element} el
 */
export function clearChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * @param {Element} el
 * @param {string} name
 * @param {string | boolean | null | undefined} value
 */
export function setOrRemoveAttr(el, name, value) {
  if (value == null || value === false || value === "") {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, value === true ? "true" : String(value));
  }
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/**
 * Whether the render context (or props) says the model is still streaming.
 * @param {Record<string, unknown>} [props]
 * @param {Record<string, unknown>} [ctx]
 * @returns {boolean}
 */
export function resolveIsStreaming(props = {}, ctx = {}) {
  if (props.isStreaming === true || props.streaming === true) return true;
  if (props.isStreaming === false || props.streaming === false) return false;
  if (props.disabled === true) return false; // explicit disabled handled separately
  const stream = ctx.stream;
  if (stream && typeof stream === "object" && stream.isStreaming === true) {
    return true;
  }
  return false;
}

/**
 * @param {Record<string, unknown>} [props]
 * @param {Record<string, unknown>} [ctx]
 * @returns {boolean}
 */
export function resolveDisabled(props = {}, ctx = {}) {
  if (props.disabled === true || props.loading === true) return true;
  if (resolveIsStreaming(props, ctx)) return true;
  if (ctx.form?.submitting === true) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} [props]
 * @returns {boolean}
 */
export function resolveReadonly(props = {}) {
  return props.readonly === true || props.readOnly === true;
}

/**
 * Normalize library rules bag into validateField-compatible object.
 * Upstream may pass a list of rule objects or a single bag.
 * @param {unknown} rules
 * @returns {Record<string, unknown>}
 */
export function normalizeRules(rules) {
  if (!rules) return {};
  if (Array.isArray(rules)) {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const r of rules) {
      if (r && typeof r === "object") Object.assign(out, r);
    }
    return out;
  }
  if (typeof rules === "object") {
    return /** @type {Record<string, unknown>} */ ({ ...rules });
  }
  return {};
}

/**
 * Read a reactive / bound / plain value.
 * @param {unknown} raw
 * @param {unknown} [fallback]
 */
export function readBound(raw, fallback) {
  if (raw && typeof raw === "object") {
    if (typeof /** @type {{ get?: unknown }} */ (raw).get === "function") {
      return /** @type {{ get: () => unknown }} */ (raw).get();
    }
    if ("value" in /** @type {object} */ (raw)) {
      return /** @type {{ value: unknown }} */ (raw).value;
    }
  }
  if (raw === undefined) return fallback;
  return raw;
}

/**
 * Write to a reactive binding or call onChange.
 * @param {unknown} raw
 * @param {unknown} value
 * @param {Record<string, unknown>} [props]
 */
export function writeBound(raw, value, props = {}) {
  if (raw && typeof raw === "object" && typeof /** @type {{ set?: unknown }} */ (raw).set === "function") {
    /** @type {{ set: (v: unknown) => void }} */ (raw).set(value);
  }
  if (typeof props.onChange === "function") {
    /** @type {(v: unknown) => void} */ (props.onChange)(value);
  }
}

/**
 * Resolve form field name from props.
 * @param {Record<string, unknown>} props
 * @returns {string}
 */
export function fieldName(props = {}) {
  return asText(props.name);
}

/**
 * Resolve current form name from ctx (Form provider).
 * @param {Record<string, unknown>} [ctx]
 * @returns {string}
 */
export function resolveFormName(ctx = {}) {
  return asText(ctx.formName);
}

/**
 * @param {Record<string, unknown>} [ctx]
 * @returns {import('./formValidationController.js').FormValidationController | null}
 */
export function resolveFormValidation(ctx = {}) {
  const fv = ctx.formValidation;
  if (fv && typeof fv === "object" && typeof fv.registerField === "function") {
    return /** @type {import('./formValidationController.js').FormValidationController} */ (fv);
  }
  return null;
}

/**
 * Stable control id: prefer field name, else generated.
 * @param {string} name
 * @param {string} [suffix]
 */
export function controlId(name, suffix = "") {
  const base = name ? `canvas-field-${name}` : `canvas-field-${nextUid()}`;
  return suffix ? `${base}-${suffix}` : base;
}

let _uid = 0;

/** @returns {string} */
export function nextUid() {
  _uid += 1;
  return `f${_uid}`;
}

/**
 * @param {{
 *   mount: (doc: Document, props: Record<string, unknown>, ctx: Record<string, unknown>) => Element,
 *   patch: (el: Element, props: Record<string, unknown>, ctx: Record<string, unknown>) => void,
 *   unmount?: (el: Element, ctx: Record<string, unknown>) => void,
 *   ownsChildren?: boolean,
 * }} impl
 */
export function lifecycle(impl) {
  return {
    create(props = {}, ctx = {}) {
      const doc = requireDocument(ctx);
      const el = impl.mount(doc, props, ctx);
      impl.patch(el, props, ctx);
      return el;
    },
    update(el, props = {}, ctx = {}) {
      impl.patch(el, props, ctx);
    },
    destroy(el, ctx = {}) {
      impl.unmount?.(el, ctx);
    },
    ownsChildren: impl.ownsChildren === true,
  };
}

/**
 * Render child vnodes / text into host.
 * @param {Element} host
 * @param {unknown} content
 * @param {Record<string, unknown>} ctx
 */
export function renderContent(host, content, ctx) {
  clearChildren(host);
  const doc = requireDocument(ctx);
  if (content == null) return;
  if (typeof content === "string" || typeof content === "number") {
    host.appendChild(doc.createTextNode(String(content)));
    return;
  }
  if (Array.isArray(content)) {
    if (typeof ctx.renderChildren === "function") {
      ctx.renderChildren(host, content);
    } else {
      for (const part of content) {
        if (typeof part === "string" || typeof part === "number") {
          host.appendChild(doc.createTextNode(String(part)));
        }
      }
    }
    return;
  }
  if (typeof content === "object" && content !== null && "type" in /** @type {object} */ (content)) {
    if (typeof ctx.renderChildren === "function") {
      ctx.renderChildren(host, [content]);
    }
  }
}

/**
 * Unwrap item bags / vnodes into props object.
 * @param {unknown} raw
 * @returns {Record<string, unknown> | null}
 */
export function unwrapProps(raw) {
  if (raw == null || typeof raw !== "object") return null;
  const obj = /** @type {Record<string, unknown>} */ (raw);
  if (obj.props && typeof obj.props === "object") {
    return /** @type {Record<string, unknown>} */ (obj.props);
  }
  return obj;
}

/**
 * Normalize select/chip/option items list.
 * @param {unknown} items
 * @param {(p: Record<string, unknown>, raw: unknown, index: number) => object | null} mapFn
 */
export function mapItems(items, mapFn) {
  if (!Array.isArray(items)) return [];
  /** @type {object[]} */
  const out = [];
  items.forEach((raw, i) => {
    const p = unwrapProps(raw);
    if (!p) return;
    const mapped = mapFn(p, raw, i);
    if (mapped) out.push(mapped);
  });
  return out;
}

/**
 * Register field with bindings + formValidation when not streaming.
 * @param {Record<string, unknown>} ctx
 * @param {string} name
 * @param {string} componentType
 * @param {unknown} initial
 * @param {Record<string, unknown>} rules
 * @param {() => unknown} getValue
 * @returns {() => void} unregister
 */
export function registerFormField(ctx, name, componentType, initial, rules, getValue) {
  if (!name) return () => {};
  const form = resolveFormName(ctx);
  const streaming = resolveIsStreaming({}, ctx);
  const bindings = ctx.bindings;
  if (form && bindings && typeof bindings.registerField === "function" && !streaming) {
    bindings.registerField(form, name, componentType, initial);
  }
  const fv = resolveFormValidation(ctx);
  const hasRules = rules && Object.keys(rules).length > 0;
  if (fv && hasRules && !streaming) {
    fv.registerField(name, rules, getValue);
  }
  return () => {
    if (form && bindings && typeof bindings.unregisterField === "function") {
      bindings.unregisterField(form, name);
    }
    if (fv && hasRules) {
      fv.unregisterField(name);
    }
  };
}

/**
 * Persist field value into bindings / store path.
 * @param {Record<string, unknown>} ctx
 * @param {string} name
 * @param {unknown} value
 */
export function persistFieldValue(ctx, name, value) {
  if (!name) return;
  const form = resolveFormName(ctx);
  const bindings = ctx.bindings;
  if (form && bindings && typeof bindings.setFieldValue === "function") {
    bindings.setFieldValue(form, name, value);
  }
}

/**
 * Read persisted field value.
 * @param {Record<string, unknown>} ctx
 * @param {string} name
 * @param {unknown} [fallback]
 */
export function loadFieldValue(ctx, name, fallback) {
  if (!name) return fallback;
  const form = resolveFormName(ctx);
  const bindings = ctx.bindings;
  if (form && bindings && typeof bindings.getFieldValue === "function") {
    const v = bindings.getFieldValue(form, name);
    if (v !== undefined) return v;
  }
  return fallback;
}

/**
 * Apply disabled/readonly attrs to a control element.
 * @param {Element} el
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
export function applyControlState(el, props, ctx) {
  const disabled = resolveDisabled(props, ctx);
  const readonly = resolveReadonly(props);
  setOrRemoveAttr(el, "disabled", disabled ? true : null);
  setOrRemoveAttr(el, "readonly", readonly ? true : null);
  setOrRemoveAttr(el, "aria-disabled", disabled ? "true" : null);
  setOrRemoveAttr(el, "aria-busy", props.loading === true ? "true" : null);
  if (disabled) el.setAttribute("data-disabled", "1");
  else el.removeAttribute("data-disabled");
  if (readonly) el.setAttribute("data-readonly", "1");
  else el.removeAttribute("data-readonly");
}

/**
 * Wire label/help/error ids onto a control.
 * @param {Element} el
 * @param {{ id: string, describedBy?: string[], labelledBy?: string, invalid?: boolean }} opts
 */
export function applyA11yIds(el, opts) {
  el.setAttribute("id", opts.id);
  if (opts.labelledBy) setOrRemoveAttr(el, "aria-labelledby", opts.labelledBy);
  if (opts.describedBy && opts.describedBy.length) {
    setOrRemoveAttr(el, "aria-describedby", opts.describedBy.filter(Boolean).join(" "));
  } else {
    el.removeAttribute("aria-describedby");
  }
  setOrRemoveAttr(el, "aria-invalid", opts.invalid ? "true" : null);
}

/**
 * Run validateField and sync error into formValidation.
 * @param {import('./formValidationController.js').FormValidationController | null} fv
 * @param {string} name
 * @param {unknown} value
 * @param {Record<string, unknown>} rules
 */
export function runFieldValidation(fv, name, value, rules) {
  if (!fv || !name || !rules || !Object.keys(rules).length) return { ok: true };
  const result = validateField(value, rules);
  if (result.ok) {
    fv.clearFieldError(name);
  } else {
    fv.setFieldError(name, result.message || result.code || "invalid");
  }
  return result;
}

export { validateField };
