import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { jsonToOpenUI } from "../../src/Browser/lang/serialize.js";

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
    UnknownWidget: {
      properties: { extra: { type: "string" } },
      required: [],
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

function el(typeName, props, statementId = undefined) {
  return {
    type: "element",
    typeName,
    props,
    partial: false,
    ...(statementId ? { statementId } : {}),
  };
}

describe("jsonToOpenUI serialize coverage", () => {
  it("serializes AST literals refs and operators in props", () => {
    const root = el("Title", {
      text: {
        k: "BinOp",
        op: "*",
        left: {
          k: "BinOp",
          op: "+",
          left: { k: "Num", v: 1 },
          right: { k: "Num", v: 2 },
        },
        right: { k: "Num", v: 3 },
      },
    });
    const out = jsonToOpenUI(root, schema);
    assert.match(out, /\(1 \+ 2\) \* 3/);
  });

  it("covers unary ternary member index assign and builtin comp", () => {
    const root = el("Title", {
      text: {
        k: "Ternary",
        cond: { k: "UnaryOp", op: "!", operand: { k: "Bool", v: false } },
        then: { k: "Member", obj: { k: "Ref", n: "row" }, field: "name" },
        else: {
          k: "Index",
          obj: { k: "Arr", els: [{ k: "Num", v: 1 }] },
          index: { k: "Num", v: 0 },
        },
      },
    });
    const out = jsonToOpenUI(root, schema);
    assert.match(out, /\?/);
    assert.match(out, /row\.name/);
    assert.match(out, /@Count|Title/);
  });

  it("serializes builtin calls state runtime refs and placeholders", () => {
    const root = el("Title", {
      text: {
        k: "Comp",
        name: "Count",
        args: [{ k: "StateRef", n: "$items" }],
      },
    });
    const out = jsonToOpenUI(root, schema);
    assert.match(out, /@Count\(\$items\)/);

    const runtime = el("Title", {
      text: { k: "RuntimeRef", n: "runtimeVar" },
    });
    assert.match(jsonToOpenUI(runtime, schema), /runtimeVar/);

    const ph = el("Title", { text: { k: "Ph", n: "placeholder" } });
    assert.match(jsonToOpenUI(ph, schema), /placeholder/);
  });

  it("uses fallback args for unknown component defs", () => {
    const root = el("MysteryBox", { alpha: { k: "Null" }, beta: { k: "Bool", v: true } });
    const out = jsonToOpenUI(root, { $defs: {} });
    assert.match(out, /MysteryBox/);
    assert.match(out, /null/);
    assert.match(out, /true/);
  });

  it("registers nested statementId and state declarations", () => {
    const child = el("Title", { text: { k: "Str", v: "child" } }, "childStmt");
    const root = el("Stack", { children: [child] });
    const out = jsonToOpenUI(root, schema, {
      stateDeclarations: {
        $count: { k: "Num", v: 3 },
        $skip: null,
        meta: { nested: { k: "Str", v: "z" } },
        list: [{ k: "Num", v: 1 }],
      },
    });
    assert.match(out, /childStmt = Title/);
    assert.match(out, /\$count = 3/);
    assert.match(out, /nested: "z"/);
  });

  it("resolveJsonSchema accepts toJSONSchema and bare defs map", () => {
    const root = el("Title", { text: "hi" });
    const viaMethod = {
      toJSONSchema() {
        return schema;
      },
    };
    assert.match(jsonToOpenUI(root, viaMethod), /Title\("hi"\)/);

    const bare = jsonToOpenUI(root, schema.$defs);
    assert.match(bare, /Title/);
  });

  it("serializes object array assign and unknown value fallback", () => {
    const root = el("Title", {
      text: {
        k: "Obj",
        entries: [
          ["k", { k: "Assign", target: "tmp", value: { k: "Num", v: 9 } }],
        ],
      },
    });
    const out = jsonToOpenUI(root, schema);
    assert.match(out, /tmp = 9/);

    const withPlain = el("UnknownWidget", { extra: "plain" });
    const plainOut = jsonToOpenUI(withPlain, schema);
    assert.match(plainOut, /UnknownWidget/);

    const nestedArr = el("Title", {
      text: { k: "Arr", els: [{ k: "Str", v: "a" }] },
    });
    assert.match(jsonToOpenUI(nestedArr, schema), /"a"/);

    const weird = el("Title", { text: Symbol.for("x") });
    assert.match(jsonToOpenUI(weird, schema), /null/);

    const plainObj = el("Blob", { cfg: { a: 1, b: false } });
    assert.match(jsonToOpenUI(plainObj, { $defs: {} }), /a: 1/);
  });

  it("serializes inline element without statementId registration", () => {
    const inline = el("Title", { text: { k: "Str", v: "inline" } });
    const wrapped = el("Stack", { children: [inline] });
    const out = jsonToOpenUI(wrapped, schema);
    assert.match(out, /Title\("inline"\)/);
    assert.ok(!out.includes("inline ="));
  });

  it("drops trailing optional null args", () => {
    const root = el("Card", {
      title: { k: "Str", v: "t" },
      subtitle: null,
    });
    const out = jsonToOpenUI(root, schema);
    assert.match(out, /Card\("t"\)/);
    assert.ok(!out.includes("null"));
  });

  it("serializes Action without @ prefix", () => {
    const root = el("Title", {
      text: {
        k: "Comp",
        name: "Action",
        args: [{ k: "Str", v: "open" }],
      },
    });
    const out = jsonToOpenUI(root, schema);
    assert.match(out, /Action\(/);
    assert.ok(!out.includes("@Action"));
  });
});
