// src/Browser/runtime/formValidation.js
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
var SAFE_PATTERN_RE = /^[\^]?[\[\]a-zA-Z0-9\s\\\.\+\*\?\-\|_(){,}]+[$]?$/;
function compileSafePattern(pattern) {
  if (typeof pattern !== "string" || pattern.length === 0 || pattern.length > 200) {
    return null;
  }
  if (!SAFE_PATTERN_RE.test(pattern)) return null;
  if (/\(\?/.test(pattern) || /\*\*/.test(pattern)) return null;
  if (/\([^)]*[+*][^)]*\)[+*]/.test(pattern)) return null;
  try {
    return new RegExp(`^(?:${pattern})$`);
  } catch {
    return null;
  }
}
function validateField(value, rules = {}) {
  const str = value == null ? "" : String(value);
  if (rules.required && (value == null || str.trim() === "")) {
    return { ok: false, code: "required", message: "required" };
  }
  if (!rules.required && (value == null || str === "")) {
    return { ok: true };
  }
  if (rules.email && !EMAIL_RE.test(str)) {
    return { ok: false, code: "email", message: "invalid email" };
  }
  if (rules.url && !URL_RE.test(str)) {
    return { ok: false, code: "url", message: "invalid url" };
  }
  if (rules.number || rules.numeric) {
    if (Number.isNaN(Number(str)) || str.trim() === "") {
      return { ok: false, code: "number", message: "not a number" };
    }
  }
  const num = Number(str);
  if (rules.min != null && num < rules.min) {
    return { ok: false, code: "min", message: `min ${rules.min}` };
  }
  if (rules.max != null && num > rules.max) {
    return { ok: false, code: "max", message: `max ${rules.max}` };
  }
  if (rules.minLength != null && str.length < rules.minLength) {
    return { ok: false, code: "minLength", message: `minLength ${rules.minLength}` };
  }
  if (rules.maxLength != null && str.length > rules.maxLength) {
    return { ok: false, code: "maxLength", message: `maxLength ${rules.maxLength}` };
  }
  if (rules.pattern) {
    const re = compileSafePattern(rules.pattern);
    if (!re) {
      return { ok: false, code: "unsafe-pattern", message: "pattern rejected" };
    }
    if (!re.test(str)) {
      return { ok: false, code: "pattern", message: "pattern mismatch" };
    }
  }
  return { ok: true };
}

export {
  validateField
};
