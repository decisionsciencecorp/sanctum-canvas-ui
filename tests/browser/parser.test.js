import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createParser } from "../../src/Browser/lang/parser.js";
import { libraryToJsonSchema } from "../../src/Browser/lang/librarySchema.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const library = JSON.parse(
  readFileSync(join(root, "resources/libraries/dashboard/library.examples.json"), "utf8"),
);

// Parser fixtures expect Title/Table — extend minimal schema for parity cases
const schema = libraryToJsonSchema(library);
schema.$defs.Title = {
  type: "object",
  properties: { text: { type: "string" } },
  required: ["text"],
};
schema.$defs.Table = {
  type: "object",
  properties: {
    columns: { type: "array" },
    rows: { type: "array" },
  },
  required: ["columns", "rows"],
};

describe("createParser", () => {
  const parser = createParser(schema, "Stack");

  it("parses a simple Title program", () => {
    const result = parser.parse('root = Title("Hello")');
    assert.ok(result);
    assert.equal(result.meta?.errors?.length ?? 0, 0);
    assert.ok(result.root);
    assert.equal(result.root.typeName, "Title");
  });

  it("flags unknown components", () => {
    const result = parser.parse("root = DataTable()");
    const codes = (result.meta?.errors || []).map((e) => e.code);
    assert.ok(codes.includes("unknown-component"), JSON.stringify(result.meta?.errors));
  });

  it("parses nested Stack with reference", () => {
    const result = parser.parse('header = Title("Hi")\nroot = Stack([header])');
    assert.equal(result.meta?.errors?.length ?? 0, 0);
    assert.equal(result.root?.typeName, "Stack");
  });
});
