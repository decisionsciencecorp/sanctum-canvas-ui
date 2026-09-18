import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createParser } from "../../src/Browser/lang/parser.js";
import {
  buildParamsSignature,
  getSchemaDefaultValue,
  getTypeFromSchema,
  pushValidationIssue,
  validateSchemaValue,
} from "../../src/Browser/lang/validation.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const validationSchema = JSON.parse(
  readFileSync(join(root, "tests/browser/helpers/validationSchema.json"), "utf8"),
);

function makeCtx(partial = false) {
  return {
    errors: [],
    partial,
    currentStatementId: null,
  };
}

function element(typeName = "CardBox") {
  return { type: "element", typeName, props: {}, partial: false };
}

describe("validation.js branch coverage", () => {
  it("getSchemaDefaultValue returns undefined for non-object property", () => {
    assert.equal(getSchemaDefaultValue(null), undefined);
    assert.equal(getSchemaDefaultValue(undefined), undefined);
    assert.equal(getSchemaDefaultValue("not-an-object"), undefined);
    assert.equal(getSchemaDefaultValue([1, 2]), undefined);
  });

  it("getTypeFromSchema handles invalid property, $ref, integer, and const", () => {
    assert.equal(getTypeFromSchema(null), undefined);
    assert.equal(getTypeFromSchema(0), undefined);
    assert.equal(getTypeFromSchema(["array"]), undefined);
    assert.equal(getTypeFromSchema({ $ref: "#/$defs/EnumBox" }), "EnumBox");
    assert.equal(getTypeFromSchema({ type: "integer" }), "number");
    assert.equal(getTypeFromSchema({ const: true }), "true");
  });

  it("buildParamsSignature renders $ref param types", () => {
    const sig = buildParamsSignature("Wrap", [
      { name: "inner", required: true, schema: { $ref: "#/$defs/CardBox" } },
      { name: "opt", required: false, schema: { type: "string" } },
    ]);
    assert.equal(sig, "Wrap(inner*: CardBox, opt: string)");
  });

  it("validationMessage formats inline-reserved", () => {
    const ctx = makeCtx();
    pushValidationIssue(ctx, "Query", "", { code: "inline-reserved" });
    assert.equal(ctx.errors.length, 1);
    assert.match(ctx.errors[0].message, /top-level statement/);
    assert.match(ctx.errors[0].message, /Query\(\)/);
  });

  it("validateElementPosition returns false for union-type schema slots", () => {
    const ctx = makeCtx();
    const schema = { type: ["string", "object"] };
    const invalid = validateSchemaValue(element(), schema, "Host", "/slot", ctx);
    assert.equal(invalid, false);
    assert.equal(ctx.errors.length, 0);
  });

  it("validateObjectValue rejects non-object values", () => {
    const ctx = makeCtx();
    const schema = {
      type: "object",
      properties: { label: { type: "string" } },
    };
    assert.equal(validateSchemaValue("oops", schema, "ObjBox", "/info", ctx), true);
    assert.ok(ctx.errors.some((e) => e.message.includes('expects object')));
    assert.ok(ctx.errors.some((e) => e.message.includes("got string")));

    const ctx2 = makeCtx();
    assert.equal(validateSchemaValue([1, 2], schema, "ObjBox", "/info", ctx2), true);
    assert.ok(ctx2.errors.some((e) => e.message.includes("got array")));
  });

  it("validateArrayValue rejects non-array values", () => {
    const ctx = makeCtx();
    const schema = { type: "array", items: { type: "string" } };
    assert.equal(validateSchemaValue({ not: "array" }, schema, "TagBox", "/tags", ctx), true);
    assert.ok(ctx.errors.some((e) => e.message.includes('expects array')));
    assert.ok(ctx.errors.some((e) => e.message.includes("got object")));

    const ctx2 = makeCtx();
    assert.equal(validateSchemaValue(7, schema, "TagBox", "/tags", ctx2), true);
    assert.ok(ctx2.errors.some((e) => e.message.includes("got number")));
  });

  it("materialize emits inline-reserved for nested Query", () => {
    const parser = createParser(validationSchema, "CardBox");
    const r = parser.parse('root = CardBox(Query("get", {}, {}))');
    assert.ok((r.meta.errors || []).some((e) => e.code === "inline-reserved"));
  });
});
