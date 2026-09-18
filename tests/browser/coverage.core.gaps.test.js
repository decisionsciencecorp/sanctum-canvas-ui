import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createParser,
  createStreamingParser,
  stripFences,
  compileSchema,
  parse,
} from "../../src/Browser/lang/parser.js";
import {
  getSchemaDefaultValue,
  getTypeFromSchema,
  buildParamsSignature,
  pushValidationIssue,
  validateSchemaValue,
} from "../../src/Browser/lang/validation.js";
import { checkSourceLimits, checkStatementCount, DEFAULT_LIMITS } from "../../src/Browser/lang/limits.js";
import {
  validateLibrary,
  validateComponent,
  mapPositionalArgs,
  isReactive,
  loadLibraryJson,
} from "../../src/Browser/lang/contractLoader.js";

const schema = {
  $defs: {
    Stack: {
      properties: { children: { type: "array" } },
      required: ["children"],
    },
    Title: {
      properties: { text: { type: "string" } },
      required: ["text"],
    },
    Card: {
      properties: {
        title: { type: "string" },
        meta: { type: "object", properties: { n: { type: "number" } }, required: ["n"] },
        tags: { type: "array", items: { type: "string" } },
        mode: { const: "dark" },
        count: { type: "integer" },
        refish: { $ref: "#/$defs/Title" },
      },
      required: ["title"],
    },
  },
};

describe("parser uncovered branches", () => {
  const parser = createParser(schema, "Stack");

  it("preferredComponent when rootName matches type not id", () => {
    const r = parser.parse('a = Title("x")\nb = Stack([a])');
    assert.equal(r.root?.typeName, "Stack");
  });

  it("stripFences handles escapes inside strings and unclosed fence", () => {
    const withEscape = 'x = Title("a\\"b")\n```openui\ny = Title("z")\n```';
    assert.match(stripFences(withEscape), /Title/);
    const unclosed = "```openui\nroot = Title(\"hi\")";
    assert.match(stripFences(unclosed), /Title/);
    const bare = "```\nroot = Title(\"a\")\n```";
    assert.match(stripFences(bare), /Title/);
    const bareOpen = "```\nroot = Title(\"a\")";
    assert.match(stripFences(bareOpen), /Title/);
  });

  it("hash and escaped-string comments strip", () => {
    const r = parser.parse('root = Title("a\\"b") # trailing\n# full line\n');
    assert.equal(r.root?.typeName, "Title");
  });

  it("streaming set resets when prefix diverges", () => {
    const sp = createStreamingParser(schema, "Title");
    sp.push('root = Title("aa")\n');
    const r = sp.set('other = Title("bb")\n');
    assert.equal(r.root?.typeName, "Title");
  });

  it("streaming completes prior stmt then empty pending", () => {
    const sp = createStreamingParser(schema, "Title");
    const r1 = sp.push('root = Title("done")\n');
    assert.equal(r1.root?.props?.text, "done");
    const r2 = sp.push("");
    assert.equal(r2.root?.props?.text, "done");
  });

  it("streaming escape sequences inside strings", () => {
    const sp = createStreamingParser(schema, "Title");
    const r = sp.push('root = Title("line\\nnext")\n');
    assert.equal(r.root?.typeName, "Title");
  });

  it("streaming incomplete pending without completed uses emptyResult", () => {
    const sp = createStreamingParser(schema, "Title");
    const r = sp.push("root = Tit");
    assert.equal(r.root, null);
  });
});

describe("validation uncovered branches", () => {
  it("getSchemaDefaultValue and getTypeFromSchema guards", () => {
    assert.equal(getSchemaDefaultValue(null), undefined);
    assert.equal(getSchemaDefaultValue([]), undefined);
    assert.equal(getTypeFromSchema(null), undefined);
    assert.equal(getTypeFromSchema({ $ref: "#/$defs/Title" }), "Title");
    assert.equal(getTypeFromSchema({ const: "dark" }), '"dark"');
    assert.equal(getTypeFromSchema({ type: "integer" }), "number");
  });

  it("buildParamsSignature and inline-reserved message", () => {
    const sig = buildParamsSignature("Title", [
      { name: "text", required: true, schema: { type: "string" } },
    ]);
    assert.match(sig, /text\*/);
    const ctx = { errors: [], currentStatementId: "x", partial: false };
    pushValidationIssue(ctx, "Query", "", { code: "inline-reserved" });
    assert.match(ctx.errors[0].message, /top-level/);
  });

  it("object/array type-mismatch and const/integer leaf", () => {
    const ctx = { errors: [], currentStatementId: "c", partial: false };
    assert.equal(
      validateSchemaValue(
        "nope",
        { type: "object", properties: { n: { type: "number" } }, required: ["n"] },
        "Card",
        "/meta",
        ctx,
      ),
      true,
    );
    assert.ok(ctx.errors.some((e) => e.code === "type-mismatch"));

    const ctx2 = { errors: [], currentStatementId: "c", partial: false };
    assert.equal(
      validateSchemaValue("nope", { type: "array", items: { type: "string" } }, "Card", "/tags", ctx2),
      true,
    );

    const ctx3 = { errors: [], currentStatementId: "c", partial: false };
    validateSchemaValue("light", { const: "dark" }, "Card", "/mode", ctx3);
    assert.ok(ctx3.errors.some((e) => e.code === "type-mismatch"));

    const ctx4 = { errors: [], currentStatementId: "c", partial: false };
    validateSchemaValue("x", { type: "integer" }, "Card", "/count", ctx4);
    assert.ok(ctx4.errors.some((e) => e.code === "type-mismatch"));
  });

  it("element against untyped schema returns false", () => {
    const ctx = { errors: [], currentStatementId: "c", partial: false };
    const el = {
      type: "element",
      typeName: "Title",
      props: { text: "a" },
      partial: false,
    };
    // schema without type/enum/const → validateElementPosition false
    assert.equal(validateSchemaValue(el, { properties: {} }, "Card", "/x", ctx), false);
  });

  it("element against scalar schema is type-mismatch", () => {
    const ctx = { errors: [], currentStatementId: "c", partial: false };
    const el = {
      type: "element",
      typeName: "Title",
      props: { text: "a" },
      partial: false,
    };
    assert.equal(validateSchemaValue(el, { type: "string" }, "Card", "/x", ctx), true);
    assert.ok(ctx.errors.some((e) => e.code === "type-mismatch"));
  });
});

describe("limits and contractLoader edges", () => {
  it("checkSourceLimits rejects non-string and oversized", () => {
    assert.equal(checkSourceLimits(1).ok, false);
    assert.equal(checkSourceLimits("x".repeat(DEFAULT_LIMITS.maxSourceBytes + 1)).ok, false);
    assert.equal(checkSourceLimits("ok").ok, true);
  });

  it("checkStatementCount rejects flood", () => {
    assert.equal(checkStatementCount(DEFAULT_LIMITS.maxStatements + 1).ok, false);
    assert.equal(checkStatementCount(1).ok, true);
  });

  it("validateLibrary error paths", () => {
    assert.throws(() => validateLibrary(null));
    assert.throws(() => validateLibrary({}));
    assert.throws(() =>
      validateLibrary({
        contractFormatVersion: 1,
        id: "x",
        variant: "v",
        root: "A",
        components: null,
      }),
    );
  });

  it("validateComponent field checks", () => {
    const base = {
      name: "A",
      version: "1",
      propertyOrder: ["t"],
      properties: { t: { type: "string", default: "d" } },
      required: ["t"],
      reactiveProps: ["t"],
      renderer: "dom",
      securityCapabilities: [],
      prompt: "",
      allowedChildren: null,
    };
    assert.throws(() => validateComponent("A", { ...base, name: "B" }));
    assert.throws(() => validateComponent("A", { ...base, propertyOrder: "x" }));
    assert.throws(() => {
      const { allowedChildren, ...rest } = base;
      validateComponent("A", rest);
    });
    assert.throws(() => validateComponent("A", { ...base, reactiveProps: "x" }));
    assert.throws(() =>
      validateComponent("A", { ...base, propertyOrder: ["missing"] }),
    );
    assert.throws(() =>
      validateComponent("A", {
        ...base,
        properties: { t: { type: "string" }, extra: { type: "string" } },
      }),
    );
    assert.throws(() =>
      validateComponent("A", { ...base, reactiveProps: ["nope"] }),
    );
    assert.throws(() => validateComponent("A", { ...base, required: ["nope"] }));

    const mapped = mapPositionalArgs(base, []);
    assert.equal(mapped.t, "d");
    assert.equal(isReactive(base, "t"), true);
    assert.equal(isReactive({}, "t"), false);
  });
});
