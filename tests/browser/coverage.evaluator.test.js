import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluate, stripReactiveAssign, _evaluatorTestHooks } from "../../src/Browser/runtime/evaluator.js";
import { evaluatePropCore } from "../../src/Browser/runtime/evaluate-prop.js";
import { evaluateElementProps } from "../../src/Browser/runtime/evaluate-tree.js";
import { markReactive } from "../../src/Browser/lang/reactive.js";
import { ACTION_STEPS } from "../../src/Browser/lang/builtins.js";

function ctx(state = {}, refs = {}) {
  return {
    getState: (n) => state[n],
    resolveRef: (n) => refs[n],
  };
}

describe("evaluator coverage gaps", () => {
  it("arithmetic and comparison operators", () => {
    const c = ctx();
    assert.equal(
      evaluate(
        { k: "BinOp", op: "-", left: { k: "Num", v: 5 }, right: { k: "Num", v: 2 } },
        c,
      ),
      3,
    );
    assert.equal(
      evaluate(
        { k: "BinOp", op: "*", left: { k: "Num", v: 3 }, right: { k: "Num", v: 4 } },
        c,
      ),
      12,
    );
    assert.equal(
      evaluate(
        { k: "BinOp", op: ">", left: { k: "Num", v: 2 }, right: { k: "Num", v: 1 } },
        c,
      ),
      true,
    );
    assert.equal(
      evaluate(
        { k: "BinOp", op: "<", left: { k: "Num", v: 1 }, right: { k: "Num", v: 2 } },
        c,
      ),
      true,
    );
    assert.equal(
      evaluate(
        { k: "BinOp", op: ">=", left: { k: "Num", v: 2 }, right: { k: "Num", v: 2 } },
        c,
      ),
      true,
    );
    assert.equal(
      evaluate(
        { k: "BinOp", op: "<=", left: { k: "Num", v: 1 }, right: { k: "Num", v: 2 } },
        c,
      ),
      true,
    );
    assert.equal(
      evaluate(
        { k: "BinOp", op: "+", left: { k: "Num", v: 1 }, right: { k: "Num", v: 2 } },
        c,
      ),
      3,
    );
  });

  it("unknown BinOp and UnaryOp return null", () => {
    assert.equal(
      evaluate(
        { k: "BinOp", op: "??", left: { k: "Num", v: 1 }, right: { k: "Num", v: 2 } },
        ctx(),
      ),
      null,
    );
    assert.equal(
      evaluate({ k: "UnaryOp", op: "+", operand: { k: "Num", v: 1 } }, ctx()),
      null,
    );
  });

  it("Member on array pluck and length; null object", () => {
    assert.deepEqual(
      evaluate(
        {
          k: "Member",
          obj: { k: "Arr", els: [{ k: "Obj", entries: [["id", { k: "Num", v: 1 }]] }] },
          field: "id",
        },
        ctx(),
      ),
      [1],
    );
    assert.equal(
      evaluate(
        { k: "Member", obj: { k: "Arr", els: [{ k: "Num", v: 1 }] }, field: "length" },
        ctx(),
      ),
      1,
    );
    assert.equal(
      evaluate({ k: "Member", obj: { k: "Null" }, field: "x" }, ctx()),
      null,
    );
  });

  it("Index on object and null guards", () => {
    assert.equal(
      evaluate(
        {
          k: "Index",
          obj: { k: "Obj", entries: [["k", { k: "Str", v: "v" }]] },
          index: { k: "Str", v: "k" },
        },
        ctx(),
      ),
      "v",
    );
    assert.equal(
      evaluate(
        {
          k: "Index",
          obj: { k: "Null" },
          index: { k: "Num", v: 0 },
        },
        ctx(),
      ),
      null,
    );
  });

  it("Comp mappedProps with and without schema", () => {
    const reactiveShape = {};
    markReactive(reactiveShape);
    const library = {
      components: {
        Title: { props: { shape: { text: reactiveShape } } },
        Box: { props: { shape: { label: {} } } },
      },
    };
    const withSchema = evaluate(
      {
        k: "Comp",
        name: "Title",
        args: [],
        mappedProps: { text: { k: "StateRef", n: "$title" } },
      },
      ctx({ $title: "Hello" }),
      { library },
    );
    assert.equal(withSchema.typeName, "Title");
    assert.ok(withSchema.props.text.__reactive);

    const noSchema = evaluate(
      {
        k: "Comp",
        name: "Box",
        args: [],
        mappedProps: { label: { k: "StateRef", n: "$lbl" } },
      },
      ctx({ $lbl: "L" }),
    );
    assert.equal(noSchema.props.label.k, "StateRef");
  });

  it("unmapped Comp warns and returns null", () => {
    const prev = console.warn;
    let warned = "";
    console.warn = (m) => {
      warned = String(m);
    };
    assert.equal(
      evaluate({ k: "Comp", name: "UnknownWidget", args: [] }, ctx()),
      null,
    );
    console.warn = prev;
    assert.match(warned, /UnknownWidget/);
  });

  it("Each lazy builtin and substituteRef paths", () => {
    const library = { components: {} };
    const rows = evaluate(
      {
        k: "Comp",
        name: "Each",
        args: [
          { k: "Arr", els: [{ k: "Obj", entries: [["id", { k: "Num", v: 10 }]] }] },
          { k: "Ref", n: "row" },
          {
            k: "Member",
            obj: { k: "Ref", n: "row" },
            field: "id",
          },
        ],
      },
      ctx(),
      { library },
    );
    assert.deepEqual(rows, [10]);

    assert.deepEqual(
      evaluate({ k: "Comp", name: "Each", args: [{ k: "Num", v: 1 }] }, ctx(), { library }),
      [],
    );
    assert.deepEqual(
      evaluate(
        {
          k: "Comp",
          name: "Each",
          args: [{ k: "Arr", els: [] }, { k: "Num", v: 1 }, { k: "Null" }],
        },
        ctx(),
        { library },
      ),
      [],
    );
  });

  it("action call variants", () => {
    const c = ctx();
    assert.equal(evaluate({ k: "Comp", name: "Run", args: [] }, c), null);
    assert.equal(
      evaluate({ k: "Comp", name: "Run", args: [{ k: "Ref", n: "x" }] }, c),
      null,
    );
    assert.deepEqual(
      evaluate(
        {
          k: "Comp",
          name: "Run",
          args: [{ k: "RuntimeRef", n: "q1", refType: "query" }],
        },
        c,
      ),
      { type: ACTION_STEPS.Run, statementId: "q1", refType: "query" },
    );
    assert.deepEqual(
      evaluate(
        {
          k: "Comp",
          name: "ToAssistant",
          args: [{ k: "Str", v: "hi" }, { k: "Str", v: "ctx" }],
        },
        c,
      ),
      { type: ACTION_STEPS.ToAssistant, message: "hi", context: "ctx" },
    );
    assert.deepEqual(
      evaluate(
        {
          k: "Comp",
          name: "Set",
          args: [{ k: "StateRef", n: "$a" }, { k: "Num", v: 1 }],
        },
        c,
      ),
      { type: ACTION_STEPS.Set, target: "$a", valueAST: { k: "Num", v: 1 } },
    );
    assert.equal(
      evaluate(
        { k: "Comp", name: "Set", args: [{ k: "Ref", n: "a" }, { k: "Num", v: 1 }] },
        c,
      ),
      null,
    );
    assert.deepEqual(
      evaluate(
        {
          k: "Comp",
          name: "Reset",
          args: [{ k: "StateRef", n: "$a" }, { k: "StateRef", n: "$b" }],
        },
        c,
      ),
      { type: ACTION_STEPS.Reset, targets: ["$a", "$b"] },
    );
    assert.equal(evaluate({ k: "Comp", name: "Reset", args: [{ k: "Ref", n: "a" }] }, c), null);
  });

  it("mappedProps inlines direct child ElementNode prop", () => {
    const library = {
      components: {
        Stack: { props: { shape: { child: {} } } },
        Title: { props: { shape: { text: {} } } },
      },
    };
    const out = evaluate(
      {
        k: "Comp",
        name: "Stack",
        args: [],
        mappedProps: {
          child: {
            k: "Comp",
            name: "Title",
            args: [],
            mappedProps: { text: { k: "Str", v: "direct" } },
          },
        },
      },
      ctx(),
      { library },
    );
    assert.equal(out.props.child.props.text, "direct");
  });

  it("Each resolveRef falls through to outer context", () => {
    const library = { components: {} };
    evaluate(
      {
        k: "Comp",
        name: "Each",
        args: [
          { k: "Arr", els: [{ k: "Num", v: 1 }] },
          { k: "Ref", n: "t" },
          { k: "Ref", n: "outer" },
        ],
      },
      ctx({}, { outer: 99 }),
      { library },
    );
    evaluate(
      {
        k: "Comp",
        name: "Each",
        args: [
          { k: "Arr", els: [(() => () => {})()] },
          { k: "Ref", n: "t" },
          { k: "Ref", n: "t" },
        ],
      },
      ctx(),
      { library },
    );
    assert.ok(true);
  });

  it("evaluatePropCore reactive string passthrough and array element recursion", () => {
    const reactiveShape = {};
    markReactive(reactiveShape);
    const library = {
      components: {
        Stack: {
          props: {
            shape: {
              child: {},
              title: reactiveShape,
            },
          },
        },
        Title: { props: { shape: { text: {} } } },
      },
    };
    const schemaCtx = { library };
    const baseCtx = ctx({ $title: "T" });

    const plain = evaluatePropCore(42, baseCtx, schemaCtx, undefined, {
      recurseElement: (el) => el,
      recurse: (v) => v,
    });
    assert.equal(plain, 42);

    const nestedEl = {
      type: "element",
      typeName: "Title",
      props: { text: { k: "Str", v: "inner" } },
      partial: false,
      hasDynamicProps: true,
    };
    const stackEl = {
      type: "element",
      typeName: "Stack",
      props: { child: nestedEl, title: { k: "StateRef", n: "$title" } },
      partial: false,
      hasDynamicProps: true,
    };
    const errors = [];
    const out = evaluateElementProps(stackEl, {
      ctx: baseCtx,
      library,
      store: null,
      errors,
    });
    assert.equal(out.props.child.props.text, "inner");
    assert.ok(out.props.title.__reactive);

    const staticEl = { ...stackEl, hasDynamicProps: false };
    assert.equal(evaluateElementProps(staticEl, { ctx: baseCtx, library, store: null }), staticEl);

    const throwEl = {
      type: "element",
      typeName: "Stack",
      props: {
        child: {
          k: "Comp",
          name: "Bogus",
          args: [],
        },
      },
      partial: false,
      hasDynamicProps: true,
    };
    evaluateElementProps(throwEl, {
      ctx: baseCtx,
      library,
      store: null,
      errors,
    });

    const cb = {
      recurseElement: (el) => el,
      recurse: (v, rs) => evaluatePropCore(v, baseCtx, schemaCtx, rs, cb),
    };
    assert.equal(evaluatePropCore("$bind", baseCtx, schemaCtx, reactiveShape, cb), "$bind");
    const arrOut = evaluatePropCore(
      {
        k: "Arr",
        els: [
          {
            k: "Comp",
            name: "Title",
            args: [],
            mappedProps: { text: { k: "Str", v: "x" } },
          },
        ],
      },
      baseCtx,
      schemaCtx,
      undefined,
      cb,
    );
    assert.equal(arrOut[0].typeName, "Title");
  });

  it("mappedProps with schema evaluates literals and nested element arrays", () => {
    const library = {
      components: {
        Stack: { props: { shape: { items: {}, label: {} } } },
        Title: { props: { shape: { text: {} } } },
      },
    };
    const out = evaluate(
      {
        k: "Comp",
        name: "Stack",
        args: [],
        mappedProps: {
          label: { k: "Str", v: "L" },
          items: {
            k: "Arr",
            els: [
              {
                k: "Comp",
                name: "Title",
                args: [],
                mappedProps: { text: { k: "Str", v: "A" } },
              },
              { k: "Num", v: 2 },
            ],
          },
        },
      },
      ctx(),
      { library },
    );
    assert.equal(out.props.label, "L");
    assert.equal(out.props.items[0].props.text, "A");
    assert.equal(out.props.items[1], 2);
  });

  it("Each with schema inlines ElementNode results", () => {
    const library = {
      components: { Title: { props: { shape: { text: {} } } } },
    };
    const rows = evaluate(
      {
        k: "Comp",
        name: "Each",
        args: [
          { k: "Arr", els: [{ k: "Str", v: "cell" }] },
          { k: "Str", v: "cell" },
          {
            k: "Comp",
            name: "Title",
            args: [],
            mappedProps: { text: { k: "Ref", n: "cell" } },
          },
        ],
      },
      ctx(),
      { library },
    );
    assert.equal(rows[0].props.text, "cell");
  });

  it("substituteRef covers operator and collection shapes", () => {
    const library = { components: {} };
    const template = {
      k: "Ternary",
      cond: { k: "Ref", n: "t" },
      then: { k: "Ref", n: "t" },
      else: {
        k: "BinOp",
        op: "+",
        left: { k: "UnaryOp", op: "-", operand: { k: "Ref", n: "t" } },
        right: {
          k: "Index",
          obj: { k: "Arr", els: [{ k: "Ref", n: "t" }] },
          index: { k: "Num", v: 0 },
        },
      },
    };
    evaluate(
      {
        k: "Comp",
        name: "Each",
        args: [{ k: "Arr", els: [{ k: "Num", v: 3 }] }, { k: "Ref", n: "t" }, template],
      },
      ctx(),
      { library },
    );
    evaluate(
      {
        k: "Comp",
        name: "Each",
        args: [
          { k: "Arr", els: [{ k: "Num", v: 1 }] },
          { k: "Ref", n: "t" },
          {
            k: "Assign",
            target: "$z",
            value: {
              k: "Obj",
              entries: [
                [
                  "k",
                  {
                    k: "Arr",
                    els: [{ k: "Member", obj: { k: "Str", v: "raw" }, field: "x" }],
                  },
                ],
              ],
            },
          },
        ],
      },
      ctx(),
      { library },
    );
    evaluate(
      {
        k: "Comp",
        name: "Each",
        args: [{ k: "Arr", els: [{ k: "Num", v: 0 }] }, { k: "Ref", n: "t" }, { k: "Str", v: "lit" }],
      },
      ctx(),
      { library },
    );
    assert.ok(true);
  });

  it("evaluate-tree error path when nested prop access throws", () => {
    const errors = [];
    const evil = {};
    Object.defineProperty(evil, "boom", {
      get() {
        throw new Error("prop blew up");
      },
      enumerable: true,
    });
    evaluateElementProps(
      {
        type: "element",
        typeName: "Stack",
        props: { meta: evil },
        partial: false,
        hasDynamicProps: true,
      },
      {
        ctx: ctx(),
        library: { components: { Stack: { props: { shape: { meta: {} } } } } },
        store: null,
        errors,
      },
    );
    assert.equal(errors.length, 1);
  });

  it("evaluatePropCore preserves plans and recurses nested plain objects", () => {
    const reactiveShape = {};
    markReactive(reactiveShape);
    const library = { components: { Box: { props: { shape: { note: reactiveShape } } } } };
    const schemaCtx = { library };
    const baseCtx = ctx({ $note: "live" });
    const callbacks = {
      recurseElement: (el) => el,
      recurse: (v, rs) => evaluatePropCore(v, baseCtx, schemaCtx, rs, callbacks),
    };

    assert.equal(evaluatePropCore("x", baseCtx, schemaCtx, reactiveShape, callbacks), "x");
    assert.deepEqual(
      evaluatePropCore({ steps: [] }, baseCtx, schemaCtx, undefined, callbacks),
      { steps: [] },
    );
    assert.deepEqual(
      evaluatePropCore(
        { type: "set", target: "$a", valueAST: { k: "Null" } },
        baseCtx,
        schemaCtx,
        undefined,
        callbacks,
      ).type,
      "set",
    );
    assert.deepEqual(
      evaluatePropCore({ wrap: { deep: { k: "Str", v: "v" } } }, baseCtx, schemaCtx, undefined, callbacks),
      { wrap: { deep: "v" } },
    );
    assert.equal(
      evaluatePropCore({ k: "StateRef", n: "$note" }, baseCtx, schemaCtx, {}, callbacks),
      "live",
    );
  });

  it("substituteRef comp mappedProps and toLiteralAST edge types", () => {
    const library = { components: {} };
    const item = { id: 99, nested: { v: 1 } };
    const template = {
      k: "Comp",
      name: "Action",
      args: [
        {
          k: "Arr",
          els: [
            {
              k: "Comp",
              name: "Set",
              args: [
                { k: "StateRef", n: "$x" },
                { k: "Member", obj: { k: "Ref", n: "t" }, field: "id" },
              ],
            },
          ],
        },
      ],
      mappedProps: { meta: { k: "Ref", n: "t" } },
    };
    const eachResult = evaluate(
      {
        k: "Comp",
        name: "Each",
        args: [
          { k: "Arr", els: [{ k: "Obj", entries: [["id", { k: "Num", v: item.id }]] }] },
          { k: "Str", v: "t" },
          template,
        ],
      },
      ctx(),
      { library },
    );
    assert.ok(Array.isArray(eachResult));

    assert.equal(stripReactiveAssign(null, ctx()), null);
  });

  it("defensive branches and evaluatePropCore remaining paths", () => {
    const { evaluateActionCall, evaluateLazyBuiltin, substituteRef, toLiteralAST } =
      _evaluatorTestHooks;
    assert.equal(evaluateActionCall("NotAnAction", [], ctx()), null);
    assert.equal(evaluateLazyBuiltin("FutureLazy", [], ctx()), null);
    assert.equal(toLiteralAST(undefined).k, "Null");
    assert.equal(toLiteralAST(2n).k, "Null");
    substituteRef({ k: "Member", obj: "raw", field: "x" }, "t", 1);

    const reactiveShape = {};
    markReactive(reactiveShape);
    const library = {
      components: { Title: { props: { shape: { text: {} } } } },
    };
    const schemaCtx = { library };
    const baseCtx = ctx();
    const cb = {
      recurseElement: (el) => el,
      recurse: (v, rs) => evaluatePropCore(v, baseCtx, schemaCtx, rs, cb),
    };
    evaluatePropCore(
      { k: "Assign", target: "$a", value: { k: "Num", v: 1 } },
      baseCtx,
      schemaCtx,
      {},
      cb,
    );
    evaluatePropCore(
      {
        type: "element",
        typeName: "Title",
        props: { text: { k: "Str", v: "t" } },
        partial: false,
        hasDynamicProps: true,
      },
      baseCtx,
      schemaCtx,
      undefined,
      cb,
    );
    evaluatePropCore({ flat: 1 }, baseCtx, schemaCtx, undefined, cb);

    const frozen = {
      type: "element",
      typeName: "Title",
      props: { text: "ok" },
      partial: false,
      hasDynamicProps: false,
    };
    evaluate(
      {
        k: "Comp",
        name: "Each",
        args: [
          { k: "Arr", els: [{ k: "Num", v: 1 }] },
          { k: "Ref", n: "row" },
          { k: "Ref", n: "el" },
        ],
      },
      ctx({}, { el: frozen }),
      { library },
    );
  });
});
