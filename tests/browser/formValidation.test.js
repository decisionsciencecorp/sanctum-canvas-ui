import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateField,
  compileSafePattern,
  aggregateErrors,
} from "../../src/Browser/runtime/formValidation.js";

describe("formValidation", () => {
  it("required email url number min max length", () => {
    assert.equal(validateField("", { required: true }).code, "required");
    assert.equal(validateField("a@b.c", { email: true }).ok, true);
    assert.equal(validateField("nope", { email: true }).code, "email");
    assert.equal(validateField("https://x.test", { url: true }).ok, true);
    assert.equal(validateField("ftp://x", { url: true }).code, "url");
    assert.equal(validateField("3", { number: true, min: 1, max: 5 }).ok, true);
    assert.equal(validateField("0", { number: true, min: 1 }).code, "min");
    assert.equal(validateField("9", { number: true, max: 5 }).code, "max");
    assert.equal(validateField("ab", { minLength: 3 }).code, "minLength");
    assert.equal(validateField("abcd", { maxLength: 3 }).code, "maxLength");
  });

  it("rejects hostile patterns", () => {
    assert.equal(compileSafePattern("(a+)+$"), null);
    assert.equal(compileSafePattern("(?i)x"), null);
    assert.equal(compileSafePattern("a".repeat(201)), null);
    assert.equal(validateField("abc", { pattern: "[a-z]+" }).ok, true);
    assert.equal(validateField("123", { pattern: "[a-z]+" }).code, "pattern");
    assert.equal(validateField("x", { pattern: "(?i)x" }).code, "unsafe-pattern");
  });

  it("aggregateErrors flattens", () => {
    const all = aggregateErrors([{ code: "a" }], [{ code: "b" }], null, { code: "c" });
    assert.equal(all.length, 3);
  });
});
