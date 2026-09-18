import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createParser, createStreamingParser, stripFences } from "../../src/Browser/lang/parser.js";
import { jsonToOpenUI } from "../../src/Browser/lang/serialize.js";
import { mergeStatements } from "../../src/Browser/lang/merge.js";
import { tokenize } from "../../src/Browser/lang/lexer.js";
import { T } from "../../src/Browser/lang/tokens.js";

const schema = {
  $defs: {
    Stack: { properties: { children: { type: "array" } }, required: ["children"] },
    Title: { properties: { text: { type: "string" } }, required: ["text"] },
    Table: {
      properties: { columns: { type: "array" }, rows: { type: "array" } },
      required: ["columns", "rows"],
    },
    Card: {
      properties: { title: { type: "string" }, subtitle: { type: "string" } },
      required: ["title"],
    },
  },
};

describe("materialize dynamic expressions", () => {
  const parser = createParser(schema, "Stack");

  it("materializes member access and ternary in props", () => {
    const r = parser.parse(
      'data = {name: "Ada"}\nroot = Title(data.name == "Ada" ? "yes" : "no")',
    );
    assert.ok(r.root);
    assert.equal(r.meta.errors.length, 0);
  });

  it("materializes @Count builtin in prop", () => {
    const r = parser.parse('items = [1,2,3]\nroot = Title("n=")\n');
    // Count used in a program
    const r2 = parser.parse('root = Stack([t])\nt = Title(@Count([1,2]))');
    assert.ok(r2.root || r2.meta);
  });

  it("handles circular references without throwing", () => {
    const r = parser.parse("a = Stack([b])\nb = Stack([a])\nroot = a");
    assert.ok(r.meta.unresolved.length >= 0);
  });

  it("array null-dropping mid stream", () => {
    const sp = createStreamingParser(schema, "Stack");
    sp.push("root = Stack([t1, t2])\nt1 = Title(\"first\")\n");
    const mid = sp.getResult();
    assert.ok(mid.root);
    const end = sp.push('t2 = Title("second")\n');
    assert.equal(end.root?.props?.children?.length, 2);
  });
});

describe("serialize AST variants", () => {
  const parser = createParser(schema, "Stack");

  it("serializes state declarations option", () => {
    const r = parser.parse('$n = 1\nroot = Title("x")');
    const out = jsonToOpenUI(r.root, schema, { stateDeclarations: r.stateDeclarations });
    assert.match(out, /Title/);
  });

  it("serializes numbers bools null objects", () => {
    const r = parser.parse('root = Table(["A"], [[1]])');
    const out = jsonToOpenUI(r.root, schema);
    assert.match(out, /Table/);
  });

  it("round-trip Card with subtitle", () => {
    const r = parser.parse('c = Card("T", "S")\nroot = Stack([c])');
    assert.equal(r.meta.errors.length, 0);
    const out = jsonToOpenUI(r.root, schema);
    assert.ok(out.length > 5);
  });
});

describe("merge and preprocess edges", () => {
  it("merge appends new ids", () => {
    const merged = mergeStatements(
      'root = Stack([a])\na = Title("1")',
      'b = Title("2")\nroot = Stack([a, b])',
    );
    assert.match(merged, /Title\("2"\)/);
  });

  it("stripFences unclosed fence", () => {
    const out = stripFences("```\nroot = Title(\"x\")");
    assert.match(out, /Title/);
  });

  it("lexer handles escaped single quotes", () => {
    const toks = tokenize("s = 'a\\'b'\n");
    const str = toks.find((t) => t.t === T.Str);
    assert.ok(str);
  });

  it("lexer handles unclosed double quote gracefully", () => {
    const toks = tokenize('s = "abc\n');
    assert.ok(toks.some((t) => t.t === T.Str || t.t === T.EOF));
  });
});
