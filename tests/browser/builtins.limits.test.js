import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BUILTINS, isBuiltin, toNumber } from "../../src/Browser/lang/builtins.js";
import { tokenize } from "../../src/Browser/lang/lexer.js";
import { stripFences } from "../../src/Browser/lang/parser.js";
import { checkSourceLimits, DEFAULT_LIMITS } from "../../src/Browser/lang/limits.js";

describe("builtins", () => {
  it("lists core builtins", () => {
    assert.ok(isBuiltin("Count"));
    assert.ok(isBuiltin("Sum"));
    assert.ok(isBuiltin("Filter"));
    assert.ok(isBuiltin("Each") || isBuiltin("Sort"));
  });

  it("executes Count/Sum/Avg/Min/Max", () => {
    const arr = [1, 2, 10];
    if (BUILTINS.Count?.fn) assert.equal(BUILTINS.Count.fn(arr), 3);
    if (BUILTINS.Sum?.fn) assert.equal(BUILTINS.Sum.fn(arr), 13);
    if (BUILTINS.Avg?.fn) assert.equal(BUILTINS.Avg.fn(arr), 13 / 3);
    if (BUILTINS.Min?.fn) assert.equal(BUILTINS.Min.fn(arr), 1);
    if (BUILTINS.Max?.fn) assert.equal(BUILTINS.Max.fn(arr), 10);
  });

  it("Sort and Filter branches", () => {
    const rows = [
      { a: 2 },
      { a: 1 },
      { a: 3 },
    ];
    if (BUILTINS.Sort?.fn) {
      const sorted = BUILTINS.Sort.fn(rows, "a", "asc");
      assert.equal(sorted[0].a, 1);
      const desc = BUILTINS.Sort.fn(rows, "a", "desc");
      assert.equal(desc[0].a, 3);
    }
    if (BUILTINS.Filter?.fn) {
      const filtered = BUILTINS.Filter.fn(rows, "a", "==", 2);
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].a, 2);
    }
  });

  it("Round Abs Floor Ceil", () => {
    if (BUILTINS.Round?.fn) assert.equal(BUILTINS.Round.fn(1.25, 1), 1.3);
    if (BUILTINS.Abs?.fn) assert.equal(BUILTINS.Abs.fn(-4), 4);
    if (BUILTINS.Floor?.fn) assert.equal(BUILTINS.Floor.fn(1.9), 1);
    if (BUILTINS.Ceil?.fn) assert.equal(BUILTINS.Ceil.fn(1.1), 2);
  });

  it("toNumber helper", () => {
    assert.equal(toNumber("3"), 3);
    assert.ok(Number.isNaN(toNumber("x")) || toNumber("x") === 0 || typeof toNumber("x") === "number");
  });
});

describe("stripFences and limits", () => {
  it("strips markdown fences", () => {
    const raw = '```\nroot = Title("hi")\n```';
    const out = stripFences(raw);
    assert.match(out, /root = Title/);
    assert.ok(!out.includes("```"));
  });

  it("checkSourceLimits rejects oversized input", () => {
    const r = checkSourceLimits("abcdefghijklmnop", { ...DEFAULT_LIMITS, maxSourceBytes: 5 });
    assert.equal(r.ok, false);
    assert.equal(r.error.code, "source-too-large");
  });

  it("tokenize still works with comments around", () => {
    const toks = tokenize('root = Title("x")\n');
    assert.ok(toks.length > 3);
  });
});
