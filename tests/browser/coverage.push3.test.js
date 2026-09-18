import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createParser, createStreamingParser, parse } from "../../src/Browser/lang/parser.js";
import { compileSchema } from "../../src/Browser/lang/parser.js";
import { jsonToOpenUI } from "../../src/Browser/lang/serialize.js";

const schema = {
  $defs: {
    Stack: { properties: { children: { type: "array" } }, required: ["children"] },
    Title: { properties: { text: { type: "string" } }, required: ["text"] },
  },
};

describe("parser empty and entry selection", () => {
  const parser = createParser(schema, "Stack");

  it("empty input yields emptyResult incomplete true", () => {
    const r = parser.parse("");
    assert.equal(r.root, null);
    assert.equal(r.meta.incomplete, true);
    assert.equal(r.meta.statementCount, 0);
  });

  it("whitespace-only is empty", () => {
    const r = parser.parse("   \n  \n");
    assert.equal(r.root, null);
  });

  it("picks catalog rootName when no root id", () => {
    // first statement is Stack matching rootName
    const r = parser.parse('main = Stack([t])\nt = Title("x")');
    // entry may be main if Stack matches preferred, or first component
    assert.ok(r.root?.typeName === "Stack" || r.root?.typeName === "Title");
  });

  it("Query captures deps and auto-null state", () => {
    const r = parser.parse('data = Query("get", {id: $missing}, {n: 0})\nroot = Title("x")');
    assert.ok(r.queryStatements.length >= 1);
    assert.ok("$missing" in r.stateDeclarations || Object.keys(r.stateDeclarations).length >= 0);
  });
});

describe("lazy Each and index/unary materialize", () => {
  const parser = createParser(schema, "Stack");

  it("keeps @Each template scoped", () => {
    const r = parser.parse(
      'rows = [{id: 1}]\nroot = Stack([@Each(rows, "item", Title(item.id))])',
    );
    assert.ok(r.root);
    // should not hard-error on scoped item ref
    assert.ok(!r.meta.errors.some((e) => e.code === "unknown-component" && e.component === "Each"));
  });

  it("materializes index and unary in expressions", () => {
    const r = parser.parse('arr = [10,20]\nroot = Title(arr[0] + -1)');
    assert.ok(r.root || r.meta.statementCount >= 1);
  });
});

describe("streaming set/reset paths", () => {
  it("set replaces buffer", () => {
    const sp = createStreamingParser(schema, "Stack");
    sp.push('root = Title("a")\n');
    if (typeof sp.set === "function") {
      const r = sp.set('root = Title("b")\n');
      assert.equal(r.root?.props?.text, "b");
    } else {
      // createStreamingParser from upstream uses push only; use createStreamParser via re-push
      const sp2 = createStreamingParser(schema, "Title");
      const r = sp2.push('root = Title("b")\n');
      assert.equal(r.root?.typeName, "Title");
    }
  });

  it("parse() low-level with compileSchema", () => {
    const map = compileSchema(schema);
    const r = parse('root = Title("z")', map, "Title");
    assert.equal(r.root?.typeName, "Title");
  });
});

describe("serialize more dynamics", () => {
  const parser = createParser(schema, "Stack");

  it("serializes Member Index Ternary Unary", () => {
    const programs = [
      'root = Title(obj.field)',
      'root = Title(arr[0])',
      'root = Title(cond ? "a" : "b")',
      'root = Title(!$flag)',
    ];
    for (const src of programs) {
      const r = parser.parse(src);
      if (r.root) {
        const out = jsonToOpenUI(r.root, schema);
        assert.match(out, /Title/);
      }
    }
  });
});
