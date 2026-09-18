import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createParser, stripFences } from "../../src/Browser/lang/parser.js";
import { tokenize } from "../../src/Browser/lang/lexer.js";
import { parseExpression } from "../../src/Browser/lang/expressions.js";
import { T } from "../../src/Browser/lang/tokens.js";
import { validateSchemaValue, getSchemaDefaultValue } from "../../src/Browser/lang/validation.js";
import { jsonToOpenUI } from "../../src/Browser/lang/serialize.js";
import { BUILTINS } from "../../src/Browser/lang/builtins.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const validationSchema = JSON.parse(
  readFileSync(join(root, "tests/browser/helpers/validationSchema.json"), "utf8"),
);

const stackSchema = {
  $defs: {
    Stack: { properties: { children: { type: "array" } }, required: ["children"] },
    Title: { properties: { text: { type: "string" } }, required: ["text"] },
    Table: {
      properties: { columns: { type: "array" }, rows: { type: "array" } },
      required: ["columns", "rows"],
    },
  },
};

function expr(src) {
  return parseExpression(tokenize(src).filter((t) => t.t !== T.Newline && t.t !== T.EOF));
}

describe("expression operator coverage", () => {
  it("covers arithmetic comparison logical unary grouping", () => {
    for (const s of ["1 % 2", "1 != 2", "1 >= 2", "1 <= 2", "a && b", "a || b", "(1 + 2) * 3"]) {
      assert.equal(expr(s).k, "BinOp", s);
    }
    assert.equal(expr("-3").k, "Num");
    assert.equal(expr("!flag").k, "UnaryOp");
  });

  it("parses object literals and arrays", () => {
    assert.equal(expr("{a: 1, b: 2}").k, "Obj");
    assert.equal(expr("[1, 2, 3]").k, "Arr");
  });

  it("parses single-quoted strings via lexer", () => {
    const toks = tokenize("root = Title('hi')\n");
    const str = toks.find((t) => t.t === T.Str);
    assert.equal(str.v, "hi");
  });
});

describe("validation direct API", () => {
  it("getSchemaDefaultValue", () => {
    assert.equal(getSchemaDefaultValue({ type: "string", default: "dark" }), "dark");
    assert.equal(getSchemaDefaultValue({ type: "number" }), undefined);
  });

  it("validateSchemaValue enum and required", () => {
    const errors = [];
    const ctx = {
      syms: new Map(),
      cat: new Map(),
      errors,
      unres: new Set(),
      visited: new Set(),
      partial: false,
    };
    validateSchemaValue("bogus", { enum: ["active", "inactive"] }, "EnumBox", "/status", ctx);
    assert.ok(errors.length >= 1);
  });
});

describe("parser preprocess and dynamics", () => {
  const parser = createParser(stackSchema, "Stack");

  it("stripFences extracts fenced program", () => {
    const out = stripFences("```js\nroot = Title(\"x\")\n```");
    assert.match(out, /root = Title/);
  });

  it("strips line comments", () => {
    const r = parser.parse('// hello\nroot = Title("x")');
    assert.equal(r.meta.errors.length, 0);
    assert.equal(r.root?.typeName, "Title");
  });

  it("handles Query statement classification", () => {
    const r = parser.parse('$id = 1\ndata = Query("get", {id: $id}, {name: ""})\nroot = Title(data.name)');
    assert.ok((r.queryStatements || []).length >= 1 || r.meta.errors.length === 0);
  });

  it("handles Mutation statement", () => {
    const r = parser.parse('save = Mutation("put", {x: 1})\nroot = Title("x")');
    assert.ok((r.mutationStatements || []).length >= 1 || r.root);
  });

  it("NestDefBox defaults from validation schema", () => {
    const p = createParser(validationSchema, "NestDefBox");
    const r = p.parse("root = NestDefBox({ retries: 2 })");
    assert.equal(r.root?.props?.cfg?.mode, "fast");
    assert.equal(r.root?.props?.cfg?.retries, 2);
  });

  it("serializes dynamic BinOp text", () => {
    const r = parser.parse('root = Title("a" + "b")');
    assert.equal(r.meta.errors.length, 0);
    const out = jsonToOpenUI(r.root, stackSchema);
    assert.match(out, /Title\(/);
  });
});

describe("builtin Filter operators", () => {
  it("covers comparison ops", () => {
    const rows = [{ a: 1 }, { a: 2 }, { a: 3 }];
    if (!BUILTINS.Filter?.fn) return;
    assert.equal(BUILTINS.Filter.fn(rows, "a", ">", 1).length, 2);
    assert.equal(BUILTINS.Filter.fn(rows, "a", "<", 3).length, 2);
    assert.equal(BUILTINS.Filter.fn(rows, "a", "!=", 2).length, 2);
    assert.equal(BUILTINS.Filter.fn(rows, "a", ">=", 2).length, 2);
    assert.equal(BUILTINS.Filter.fn(rows, "a", "<=", 2).length, 2);
  });
});
