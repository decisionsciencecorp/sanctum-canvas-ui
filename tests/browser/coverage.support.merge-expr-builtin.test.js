import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeStatements } from "../../src/Browser/lang/merge.js";
import { tokenize } from "../../src/Browser/lang/lexer.js";
import { parseExpression } from "../../src/Browser/lang/expressions.js";
import { T } from "../../src/Browser/lang/tokens.js";
import { BUILTINS, toNumber } from "../../src/Browser/lang/builtins.js";

function expr(src) {
  return parseExpression(tokenize(src).filter((t) => t.t !== T.Newline && t.t !== T.EOF));
}

describe("mergeStatements edge paths", () => {
  it("returns patch when existing program is empty", () => {
    const patch = 'root = Title("only")';
    const merged = mergeStatements("   \n", patch);
    assert.equal(merged.trim(), patch);
  });

  it("splits statements inside quoted strings with escapes", () => {
    const base = 'a = Title("line\\n")\nroot = Title("y")';
    const patch = 'root = Title("patched")';
    const merged = mergeStatements(base, patch);
    assert.match(merged, /patched/);
  });

  it("garbage-collects unreachable statements after patch", () => {
    const base = 'orphan = Title("gone")\nroot = Title("stay")';
    const patch = 'root = Title("stay")';
    const merged = mergeStatements(base, patch);
    assert.ok(!merged.includes("orphan"));
    assert.match(merged, /stay/);
  });
});

describe("expression and builtin coverage gaps", () => {
  it("parses binary minus greater and less", () => {
    assert.equal(expr("a - b").op, "-");
    assert.equal(expr("1 > 2").op, ">");
    assert.equal(expr("1 < 2").op, "<");
    assert.equal(expr("1 / 2").op, "/");
    assert.equal(expr("1 % 2").op, "%");
  });

  it("parses unary minus on identifier", () => {
    const n = expr("-flag");
    assert.equal(n.k, "UnaryOp");
    assert.equal(n.op, "-");
  });

  it("stops infix at end of expression", () => {
    assert.equal(expr("answer").k, "Ref");
  });

  it("returns Null for unrecognized leading token", () => {
    const toks = tokenize(", junk");
    const ast = parseExpression(toks.filter((t) => t.t !== T.EOF));
    assert.equal(ast.k, "Null");
  });

  it("resolveField dotted paths and Filter contains/default", () => {
    const rows = [{ user: { name: "ada" } }, { user: { name: "bob" } }];
    if (BUILTINS.Sort?.fn) {
      const sorted = BUILTINS.Sort.fn(rows, "user.name", "asc");
      assert.equal(sorted[0].user.name, "ada");
    }
    if (BUILTINS.Filter?.fn) {
      const hit = BUILTINS.Filter.fn(rows, "user.name", "contains", "bo");
      assert.equal(hit.length, 1);
      assert.equal(BUILTINS.Filter.fn(rows, "user.name", "bogus-op", "x").length, 0);
    }
    assert.equal(toNumber(true), 1);
    assert.equal(toNumber(false), 0);
    assert.equal(toNumber(undefined), 0);
  });
});
