import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tokenize } from "../../src/Browser/lang/lexer.js";
import { parseExpression } from "../../src/Browser/lang/expressions.js";
import { T } from "../../src/Browser/lang/tokens.js";

function expr(src) {
  const toks = tokenize(src);
  // drop trailing newline/EOF for expression-only parse — expressions parse until end
  return parseExpression(toks.filter((t) => t.t !== T.Newline));
}

describe("parseExpression", () => {
  it("parses literals", () => {
    const s = expr('"hi"');
    assert.equal(s.k, "Str");
    assert.equal(s.v, "hi");
    const n = expr("42");
    assert.equal(n.k, "Num");
    assert.equal(n.v, 42);
  });

  it("parses binary arithmetic and comparison", () => {
    const n = expr("1 + 2 * 3");
    assert.ok(n);
    const c = expr("a == 1");
    assert.ok(c);
  });

  it("parses ternary", () => {
    const t = expr('flag ? "a" : "b"');
    assert.ok(t);
  });

  it("parses member and index access", () => {
    assert.ok(expr("obj.field"));
    assert.ok(expr("arr[0]"));
  });

  it("parses state var and builtin call", () => {
    assert.ok(expr("$count"));
    assert.ok(expr("@Count(items)"));
  });

  it("parses logical and unary", () => {
    assert.ok(expr("!flag && true || false"));
  });
});
