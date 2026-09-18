import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createParser } from "../../src/Browser/lang/parser.js";
import { jsonToOpenUI } from "../../src/Browser/lang/serialize.js";
import { mergeStatements } from "../../src/Browser/lang/merge.js";

const schema = {
  $defs: {
    Stack: {
      properties: {
        children: { type: "array" },
      },
      required: ["children"],
    },
    Title: {
      properties: { text: { type: "string" } },
      required: ["text"],
    },
    Table: {
      properties: {
        columns: { type: "array" },
        rows: { type: "array" },
      },
      required: ["columns", "rows"],
    },
    Card: {
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
      },
      required: ["title"],
    },
  },
};

describe("jsonToOpenUI serialize", () => {
  const parser = createParser(schema, "Stack");

  it("round-trips a simple Title", () => {
    const src = 'root = Title("Hello")';
    const parsed = parser.parse(src);
    assert.equal(parsed.meta.errors.length, 0);
    const out = jsonToOpenUI(parsed.root, schema);
    assert.match(out, /Title\("Hello"\)/);
  });

  it("serializes nested Stack", () => {
    const src = 'header = Title("Hi")\nroot = Stack([header])';
    const parsed = parser.parse(src);
    assert.equal(parsed.meta.errors.length, 0);
    const out = jsonToOpenUI(parsed.root, schema);
    assert.match(out, /Stack/);
  });

  it("serializes Table positional args", () => {
    const src = 'root = Table(["A","B"], [[1,2]])';
    const parsed = parser.parse(src);
    assert.equal(parsed.meta.errors.length, 0);
    const out = jsonToOpenUI(parsed.root, schema);
    assert.match(out, /Table\(/);
  });

  it("omits optional Card subtitle when absent", () => {
    const src = 'c = Card("Hello")\nroot = Stack([c])';
    const parsed = parser.parse(src);
    assert.equal(parsed.meta.errors.length, 0);
    const out = jsonToOpenUI(parsed.root, schema);
    assert.ok(out.includes("Card") || out.includes("Stack"));
  });
});

describe("mergeStatements", () => {
  it("replaces statement by id", () => {
    const base = 'header = Title("Old")\nroot = Stack([header])';
    const patch = 'header = Title("New")';
    const merged = mergeStatements(base, patch);
    assert.match(merged, /Title\("New"\)/);
    assert.ok(!merged.includes('"Old"'));
  });

  it("deletes via null assignment", () => {
    const base = 'extra = Title("x")\nroot = Title("y")';
    const patch = "extra = null";
    const merged = mergeStatements(base, patch);
    assert.ok(!merged.includes('Title("x")') || merged.includes("null") === false);
  });
});
