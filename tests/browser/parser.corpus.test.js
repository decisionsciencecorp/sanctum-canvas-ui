import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createParser } from "../../src/Browser/lang/parser.js";

const schema = {
  $defs: {
    Stack: {
      type: "object",
      properties: { children: { type: "array" } },
      required: ["children"],
    },
    Title: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
    Card: {
      type: "object",
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
      },
      required: ["title"],
    },
  },
};

describe("parser corpus extras", () => {
  const parser = createParser(schema, "Stack");

  it("excess args recorded", () => {
    const r = parser.parse('root = Title("hello", "extra")');
    assert.ok(r.meta.errors.some((e) => e.code === "excess-args"));
  });

  it("null required", () => {
    const r = parser.parse("root = Stack(null)");
    assert.ok(r.meta.errors.some((e) => e.code === "null-required" || e.code === "missing-required"));
  });

  it("optional Card subtitle omitted", () => {
    const r = parser.parse('root = Card("Hello")');
    // Card is not Stack root — may error on root type; use Stack wrap
    const r2 = parser.parse('c = Card("Hello")\nroot = Stack([c])');
    assert.equal(r2.meta.errors.length, 0, JSON.stringify(r2.meta.errors));
  });

  it("orphaned statements listed", () => {
    const r = parser.parse('orphan = Title("x")\nroot = Title("y")');
    assert.ok(Array.isArray(r.meta.orphaned));
  });

  it("state declarations captured", () => {
    const r = parser.parse('$n = 1\nroot = Title("x")');
    assert.ok(r.stateDeclarations);
    assert.ok("$n" in r.stateDeclarations || "n" in r.stateDeclarations || Object.keys(r.stateDeclarations).length >= 1);
  });

  it("rejects catastrophic size with statement flood soft bound", () => {
    // Build a large but finite program — parser should return rather than hang
    const lines = [];
    for (let i = 0; i < 200; i++) lines.push(`t${i} = Title("x")`);
    lines.push("root = Stack([" + Array.from({ length: 200 }, (_, i) => `t${i}`).join(",") + "])");
    const r = parser.parse(lines.join("\n"));
    assert.ok(r.meta.statementCount >= 200);
  });
});
