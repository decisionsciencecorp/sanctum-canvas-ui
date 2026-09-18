/**
 * Per-Form validation controller (A6.1).
 * Wraps runtime/formValidation.js rule bags (not upstream ParsedRule arrays).
 */

import { validateField } from "../../runtime/formValidation.js";

/**
 * @typedef {object} FormValidationController
 * @property {Record<string, string | undefined>} errors
 * @property {(name: string, rules: Record<string, unknown>, getValue: () => unknown) => void} registerField
 * @property {(name: string) => void} unregisterField
 * @property {(name: string, value: unknown, rules?: Record<string, unknown>) => boolean} validateField
 * @property {() => boolean} validateForm
 * @property {(name: string) => void} clearFieldError
 * @property {(name: string, message: string) => void} setFieldError
 * @property {() => string[]} fieldNames
 */

/**
 * @returns {FormValidationController}
 */
export function createFormValidationController() {
  /** @type {Record<string, string | undefined>} */
  const errors = Object.create(null);
  /** @type {Record<string, { rules: Record<string, unknown>, getValue: () => unknown }>} */
  const fields = Object.create(null);

  /**
   * @param {string} name
   * @param {unknown} value
   * @param {Record<string, unknown>} [rules]
   */
  function validateOne(name, value, rules) {
    const bag = rules ?? fields[name]?.rules ?? {};
    if (!bag || !Object.keys(bag).length) {
      errors[name] = undefined;
      return true;
    }
    const result = validateField(value, bag);
    if (result.ok) {
      errors[name] = undefined;
      return true;
    }
    errors[name] = result.message || result.code || "invalid";
    return false;
  }

  return {
    errors,
    registerField(name, rules, getValue) {
      if (!name) return;
      fields[name] = {
        rules: rules && typeof rules === "object" ? { ...rules } : {},
        getValue: typeof getValue === "function" ? getValue : () => undefined,
      };
    },
    unregisterField(name) {
      delete fields[name];
      delete errors[name];
    },
    validateField(name, value, rules) {
      return validateOne(name, value, rules);
    },
    validateForm() {
      let ok = true;
      for (const [name, reg] of Object.entries(fields)) {
        const value = reg.getValue();
        if (!validateOne(name, value, reg.rules)) ok = false;
      }
      return ok;
    },
    clearFieldError(name) {
      if (name in errors) errors[name] = undefined;
    },
    setFieldError(name, message) {
      errors[name] = String(message ?? "invalid");
    },
    fieldNames() {
      return Object.keys(fields);
    },
  };
}

export default createFormValidationController;
