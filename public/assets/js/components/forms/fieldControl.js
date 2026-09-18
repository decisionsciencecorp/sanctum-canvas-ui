/**
 * Shared field wiring for A6.2 / A6.3 controls.
 */

import {
  applyA11yIds,
  applyControlState,
  asText,
  controlId,
  fieldName,
  loadFieldValue,
  normalizeRules,
  persistFieldValue,
  readBound,
  registerFormField,
  resolveFormValidation,
  resolveIsStreaming,
  runFieldValidation,
  writeBound,
} from "./shared.js";

/** @type {WeakMap<Element, { unregister?: () => void, name?: string, getValue?: () => unknown }>} */
const FIELD_STATE = new WeakMap();

/**
 * @param {Element} el
 */
export function getFieldState(el) {
  let s = FIELD_STATE.get(el);
  if (!s) {
    s = {};
    FIELD_STATE.set(el, s);
  }
  return s;
}

/**
 * Resolve display value: binding → persisted → props.value → default.
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 * @param {unknown} [fallback]
 */
export function resolveFieldValue(props, ctx, fallback = "") {
  const name = fieldName(props);
  const bound = readBound(props.value, undefined);
  if (bound !== undefined) return bound;
  const persisted = loadFieldValue(ctx, name, undefined);
  if (persisted !== undefined) return persisted;
  if (props.defaultValue !== undefined) return props.defaultValue;
  return fallback;
}

/**
 * @param {Element} root
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 * @param {string} componentType
 * @param {() => unknown} getValue
 * @param {unknown} initial
 */
export function ensureFieldRegistration(root, props, ctx, componentType, getValue, initial) {
  const state = getFieldState(root);
  const name = fieldName(props);
  const rules = normalizeRules(props.rules);
  const streaming = resolveIsStreaming(props, ctx);

  if (state.unregister && (state.name !== name || streaming)) {
    state.unregister();
    state.unregister = undefined;
    state.name = undefined;
  }

  if (!streaming && name && !state.unregister) {
    state.unregister = registerFormField(ctx, name, componentType, initial, rules, getValue);
    state.name = name;
    state.getValue = getValue;
  }
}

/**
 * @param {Element} root
 * @param {Record<string, unknown>} [ctx]
 */
export function teardownField(root, ctx = {}) {
  const state = getFieldState(root);
  state.unregister?.();
  state.unregister = undefined;
  state.name = undefined;
  FIELD_STATE.delete(root);
  void ctx;
}

/**
 * Commit a new value: bind write, persist, optional validate.
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 * @param {unknown} value
 * @param {{ validate?: boolean, clearError?: boolean }} [opts]
 */
export function commitFieldValue(props, ctx, value, opts = {}) {
  const name = fieldName(props);
  writeBound(props.value, value, props);
  persistFieldValue(ctx, name, value);
  const fv = resolveFormValidation(ctx);
  const rules = normalizeRules(props.rules);
  if (opts.clearError && fv && name) fv.clearFieldError(name);
  if (opts.validate) {
    if (fv && typeof fv.validateField === "function" && Object.keys(rules).length) {
      fv.validateField(name, value, rules);
    } else {
      runFieldValidation(fv, name, value, rules);
    }
  }
}

/**
 * Apply standard a11y id wiring for a control element.
 * @param {Element} control
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 * @param {{ describedBy?: string[], labelledBy?: string }} [extra]
 */
export function wireControlA11y(control, props, ctx, extra = {}) {
  const name = fieldName(props);
  const id = asText(props.id) || controlId(name);
  const fv = resolveFormValidation(ctx);
  const invalid = !!(name && fv?.errors?.[name]);
  const described = [...(extra.describedBy ?? [])];
  if (props.hintId) described.push(asText(props.hintId));
  if (props.errorId) described.push(asText(props.errorId));
  applyA11yIds(control, {
    id,
    labelledBy: extra.labelledBy || asText(props.labelledBy) || undefined,
    describedBy: described,
    invalid,
  });
  applyControlState(control, props, ctx);
  return id;
}

/**
 * Normalize selection for Chips / OptionCards.
 * @param {"single" | "multiple"} type
 * @param {unknown} existing
 * @param {unknown} defaultValue
 * @returns {string[]}
 */
export function normalizeSelection(type, existing, defaultValue) {
  if (type === "single") {
    if (typeof existing === "string" && existing) return [existing];
    if (Array.isArray(existing) && existing[0]) return [String(existing[0])];
    if (typeof defaultValue === "string" && defaultValue) return [defaultValue];
    if (Array.isArray(defaultValue) && defaultValue[0]) return [String(defaultValue[0])];
    return [];
  }
  if (Array.isArray(existing)) return existing.map(String);
  if (typeof existing === "string" && existing) return [existing];
  if (Array.isArray(defaultValue)) return defaultValue.map(String);
  if (typeof defaultValue === "string" && defaultValue) return [defaultValue];
  return [];
}

/**
 * @param {"single" | "multiple"} type
 * @param {string[]} selection
 * @param {string} itemValue
 * @returns {string[]}
 */
export function toggleSelection(type, selection, itemValue) {
  const v = String(itemValue);
  if (type === "single") {
    return selection[0] === v ? [] : [v];
  }
  if (selection.includes(v)) return selection.filter((x) => x !== v);
  return [...selection, v];
}
