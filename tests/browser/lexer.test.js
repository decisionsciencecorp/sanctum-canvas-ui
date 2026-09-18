import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { T } from "../../src/Browser/lang/tokens.js";
import { tokenize } from "../../src/Browser/lang/lexer.js";

describe("tokenize", () => {
  it("tokenizes a simple assignment", () => {
    const toks = tokenize('root = Title("Hello")\n');
    const kinds = toks.map((t) => t.t);
    assert.equal(toks[0].t, T.Ident);
    assert.equal(toks[0].v, "root");
    assert.equal(toks[1].t, T.Equals);
    assert.equal(toks[2].t, T.Type);
    assert.equal(toks[2].v, "Title");
    assert.equal(toks[3].t, T.LParen);
    assert.equal(toks[4].t, T.Str);
    assert.equal(toks[4].v, "Hello");
    assert.equal(toks[5].t, T.RParen);
    assert.equal(toks.at(-1).t, T.EOF);
    assert.ok(kinds.includes(T.Newline));
  });

  it("tokenizes state vars, builtins, and operators", () => {
    const toks = tokenize('$count = 0\nx = @Count(items) + 1 == 2 && true\n');
    assert.equal(toks[0].t, T.StateVar);
    assert.equal(toks[0].v, "$count");
    const builtins = toks.filter((t) => t.t === T.BuiltinCall);
    assert.equal(builtins[0].v, "Count");
    assert.ok(toks.some((t) => t.t === T.Plus));
    assert.ok(toks.some((t) => t.t === T.EqEq));
    assert.ok(toks.some((t) => t.t === T.And));
    assert.ok(toks.some((t) => t.t === T.True));
  });

  it("distinguishes Type vs Ident", () => {
    const toks = tokenize("a = Stack([child])\n");
    assert.equal(toks.find((t) => t.v === "Stack").t, T.Type);
    assert.equal(toks.find((t) => t.v === "a").t, T.Ident);
    assert.equal(toks.find((t) => t.v === "child").t, T.Ident);
  });

  it("parses numbers including negative and float", () => {
    const toks = tokenize("n = -3.5\n");
    const num = toks.find((t) => t.t === T.Num);
    assert.equal(num.v, -3.5);
  });

  it("handles escaped double-quoted strings", () => {
    const toks = tokenize('s = "a\\"b"\n');
    assert.equal(toks.find((t) => t.t === T.Str).v, 'a"b');
  });
});
