import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createParser, createStreamingParser } from "../../src/Browser/lang/parser.js";
import { libraryToJsonSchema } from "../../src/Browser/lang/librarySchema.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const library = JSON.parse(
  readFileSync(join(root, "resources/libraries/dashboard/library.examples.json"), "utf8"),
);
const schema = libraryToJsonSchema(library);
schema.$defs.Title = {
  type: "object",
  properties: { text: { type: "string" } },
  required: ["text"],
};

describe("streaming parser", () => {
  it("resolves forward references across chunks", () => {
    const sp = createStreamingParser(schema, "Stack");
    sp.push("root = Stack([header])\n");
    const mid = sp.getResult();
    assert.ok(mid.meta.incomplete || mid.meta.unresolved.includes("header") || mid.root);
    const final = sp.push('header = Title("Hi")\n');
    assert.equal(final.root?.typeName, "Stack");
    assert.equal(final.meta.errors.length, 0);
  });
});

describe("golden fixtures", () => {
  const parser = createParser(schema, "Stack");
  const dir = join(root, "resources/fixtures/lang-core/golden");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    it(`runs ${file}`, () => {
      const fix = JSON.parse(readFileSync(join(dir, file), "utf8"));
      if (!fix.input) return; // merge fixtures handled later
      const result = parser.parse(fix.input);
      const codes = (result.meta?.errors || []).map((e) => e.code);
      for (const exp of fix.expect?.errors || []) {
        if (exp.code) {
          assert.ok(codes.includes(exp.code), `${file} missing ${exp.code}: ${codes}`);
        }
      }
      if (fix.expect?.rootType) {
        assert.equal(result.root?.typeName, fix.expect.rootType);
      }
      if (fix.expect?.meta?.unresolved) {
        for (const u of fix.expect.meta.unresolved) {
          assert.ok(result.meta.unresolved.includes(u), `${file} unresolved ${u}`);
        }
      }
    });
  }
});
