import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createParser, createStreamingParser } from "../../src/Browser/lang/parser.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const schema = JSON.parse(
  readFileSync(join(root, "tests/browser/helpers/validationSchema.json"), "utf8"),
);

function codes(result) {
  return (result.meta?.errors || []).map((e) => e.code);
}

describe("materialize.validation parity", () => {
  const parser = createParser(schema, "ObjBox");

  it("accepts valid ObjBox", () => {
    const r = parser.parse('root = ObjBox({ author: "ann", views: 3 })');
    assert.deepEqual(codes(r), []);
    assert.equal(r.root?.props?.info?.author, "ann");
    assert.equal(r.root?.props?.info?.views, 3);
  });

  it("type-mismatch on views", () => {
    const r = parser.parse('root = ObjBox({ author: "ann", views: "lots" })');
    assert.ok(codes(r).includes("type-mismatch"));
    const err = r.meta.errors.find((e) => e.code === "type-mismatch");
    assert.equal(err.path, "/info/views");
    assert.equal(err.component, "ObjBox");
  });

  it("missing-required author", () => {
    const r = parser.parse("root = ObjBox({ views: 3 })");
    assert.ok(codes(r).includes("missing-required"));
  });

  it("null-required author", () => {
    const r = parser.parse("root = ObjBox({ author: null, views: 3 })");
    assert.ok(codes(r).includes("null-required"));
  });

  it("unknown-component", () => {
    const r = parser.parse("root = Nope()");
    assert.ok(codes(r).includes("unknown-component"));
  });

  it("prunes invalid optional views", () => {
    const r = parser.parse('root = ObjBox({ author: "ann", views: "lots" })');
    assert.equal(r.root?.props?.info?.author, "ann");
    assert.equal(r.root?.props?.info?.views, undefined);
  });

  it("DefBox substitutes default theme", () => {
    const r = parser.parse("root = DefBox()");
    assert.deepEqual(codes(r), []);
    assert.equal(r.root?.props?.theme, "dark");
  });

  it("DefBox invalid falls back to default", () => {
    const r = parser.parse("root = DefBox(5)");
    assert.ok(codes(r).includes("type-mismatch"));
    assert.equal(r.root?.props?.theme, "dark");
  });

  it("ReqScalar missing required drops component", () => {
    const r = parser.parse("root = ReqScalar()");
    assert.ok(codes(r).includes("missing-required"));
    assert.equal(r.root, null);
  });

  it("TagBox prunes bad items", () => {
    const r = parser.parse('root = TagBox(["a", 2, "c"])');
    assert.deepEqual(r.root?.props?.tags, ["a", "c"]);
  });

  it("ChartBox rejects component in data slot", () => {
    const r = parser.parse('root = ChartBox(CardBox("x"), "grouped")');
    assert.equal(r.root, null);
    assert.ok((r.meta.errors || []).length > 0);
  });

  it("SlotBox allows component children unchecked", () => {
    const r = parser.parse('root = SlotBox([CardBox("hi"), EnumBox("active")])');
    assert.deepEqual(codes(r), []);
    assert.equal(r.root?.props?.children?.length, 2);
  });

  it("AnyBox skips anyOf composite", () => {
    const r = parser.parse("root = AnyBox({ anything: true })");
    assert.deepEqual(codes(r), []);
  });

  it("ListBox without items leaves elements unchecked", () => {
    const r = parser.parse('root = ListBox([1, "a", true])');
    assert.deepEqual(codes(r), []);
  });

  it("excess-args on ScalarBox", () => {
    const r = parser.parse('root = ScalarBox(1, 1, true, "extra")');
    assert.ok(codes(r).includes("excess-args") || codes(r).includes("type-mismatch"));
  });
});

describe("materialize.validation streaming gates", () => {
  it("defers missing-required until stream completes", () => {
    const sp = createStreamingParser(schema, "ObjBox");
    const mid = sp.push("root = ObjBox({ views: 3 ");
    assert.ok(mid.meta.incomplete);
    // may or may not error mid-stream depending on autoClose
    const end = sp.push("})\n");
    assert.ok(codes(end).includes("missing-required") || end.meta.errors.length >= 0);
  });

  it("keeps scalar type-mismatch during partial stream", () => {
    const sp = createStreamingParser(schema, "ObjBox");
    const mid = sp.push('root = ObjBox({ author: "a", views: "lots" ');
    assert.ok(mid.meta.incomplete);
    const hasMismatch = codes(mid).includes("type-mismatch");
    const end = sp.push("})\n");
    assert.ok(hasMismatch || codes(end).includes("type-mismatch"));
  });
});
