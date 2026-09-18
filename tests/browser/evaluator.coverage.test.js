import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluate, stripReactiveAssign } from "../../src/Browser/runtime/evaluator.js";
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

describe("evaluator coverage — Each and ops", () => {
  it("Each maps templates with scoped refs", () => {
    const out = evaluate(
      {
        k: "Comp",
        name: "Each",
        args: [
          {
            k: "Arr",
            els: [
              { k: "Obj", entries: [["n", { k: "Num", v: 1 }]] },
              { k: "Obj", entries: [["n", { k: "Num", v: 2 }]] },
            ],
          },
          { k: "Str", v: "item" },
          { k: "Member", obj: { k: "Ref", n: "item" }, field: "n" },
        ],
      },
      ctx(),
    );
    assert.deepEqual(out, [1, 2]);
  });

  it("Each edge cases", () => {
    assert.deepEqual(
      evaluate({ k: "Comp", name: "Each", args: [{ k: "Num", v: 1 }] }, ctx()),
      [],
    );
    assert.deepEqual(
      evaluate(
        {
          k: "Comp",
          name: "Each",
          args: [
            { k: "Str", v: "nope" },
            { k: "Str", v: "i" },
            { k: "Ref", n: "i" },
          ],
        },
        ctx(),
      ),
      [],
    );
    assert.deepEqual(
      evaluate(
        {
          k: "Comp",
          name: "Each",
          args: [
            { k: "Arr", els: [{ k: "Num", v: 1 }] },
            { k: "Num", v: 0 },
            { k: "Ref", n: "i" },
          ],
        },
        ctx(),
      ),
      [],
    );
  });

  it("Each resolves outer refs via child resolveRef", () => {
    const library = { components: {} };
    const out = evaluate(
      {
        k: "Comp",
        name: "Each",
        args: [
          { k: "Arr", els: [{ k: "Num", v: 1 }] },
          { k: "Ref", n: "row" },
          {
            k: "BinOp",
            op: "+",
            left: { k: "Ref", n: "row" },
            right: { k: "Ref", n: "bonus" },
          },
        ],
      },
      ctx({}, { bonus: 10 }),
      { library },
    );
    assert.deepEqual(out, [11]);
  });

  it("arithmetic and comparisons", () => {
    const c = ctx();
    const bin = (op, a, b) =>
      evaluate({ k: "BinOp", op, left: { k: "Num", v: a }, right: { k: "Num", v: b } }, c);
    assert.equal(bin("-", 5, 2), 3);
    assert.equal(bin("*", 3, 4), 12);
    assert.equal(bin("/", 8, 2), 4);
    assert.equal(bin("%", 7, 4), 3);
    assert.equal(bin(">", 2, 1), true);
    assert.equal(bin("<", 2, 1), false);
    assert.equal(bin(">=", 2, 2), true);
    assert.equal(bin("<=", 1, 2), true);
    assert.equal(bin("!=", 1, 2), true);
    assert.equal(
      evaluate({ k: "BinOp", op: "??", left: { k: "Num", v: 1 }, right: { k: "Num", v: 2 } }, c),
      null,
    );
    assert.equal(
      evaluate({ k: "UnaryOp", op: "+", operand: { k: "Num", v: 1 } }, c),
      null,
    );
  });

  it("Member pluck and Index", () => {
    const rows = evaluate(
      {
        k: "Member",
        obj: {
          k: "Arr",
          els: [
            { k: "Obj", entries: [["title", { k: "Str", v: "a" }]] },
            { k: "Obj", entries: [["title", { k: "Str", v: "b" }]] },
          ],
        },
        field: "title",
      },
      ctx(),
    );
    assert.deepEqual(rows, ["a", "b"]);
    assert.equal(
      evaluate(
        {
          k: "Member",
          obj: { k: "Arr", els: [{ k: "Num", v: 1 }] },
          field: "length",
        },
        ctx(),
      ),
      1,
    );
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
    assert.equal(
      evaluate({ k: "Member", obj: { k: "Null" }, field: "x" }, ctx()),
      null,
    );
  });
});

describe("evaluator coverage — actions and mapped Comp", () => {
  it("Action plan steps", () => {
    const c = ctx({ $x: 1 });
    assert.deepEqual(
      evaluate(
        {
          k: "Comp",
          name: "Action",
          args: [
            {
              k: "Arr",
              els: [
                {
                  k: "Comp",
                  name: "OpenUrl",
                  args: [{ k: "Str", v: "https://noop.test" }],
                },
              ],
            },
          ],
        },
        c,
      ),
      { steps: [{ type: ACTION_STEPS.OpenUrl, url: "https://noop.test" }] },
    );
    assert.deepEqual(evaluate({ k: "Comp", name: "Action", args: [] }, c), { steps: [] });
    assert.deepEqual(
      evaluate(
        {
          k: "Comp",
          name: "Set",
          args: [{ k: "StateRef", n: "$x" }, { k: "Num", v: 2 }],
        },
        c,
      ),
      { type: ACTION_STEPS.Set, target: "$x", valueAST: { k: "Num", v: 2 } },
    );
    assert.equal(
      evaluate({ k: "Comp", name: "Set", args: [{ k: "Ref", n: "a" }] }, c),
      null,
    );
    assert.deepEqual(
      evaluate(
        {
          k: "Comp",
          name: "Reset",
          args: [{ k: "StateRef", n: "$x" }],
        },
        c,
      ),
      { type: ACTION_STEPS.Reset, targets: ["$x"] },
    );
    assert.equal(
      evaluate({ k: "Comp", name: "Reset", args: [{ k: "Ref", n: "a" }] }, c),
      null,
    );
    assert.deepEqual(
      evaluate({ k: "Comp", name: "OpenUrl", args: [{ k: "Str", v: "https://x.test" }] }, c),
      { type: ACTION_STEPS.OpenUrl, url: "https://x.test" },
    );
    assert.deepEqual(
      evaluate({ k: "Comp", name: "ToAssistant", args: [{ k: "Str", v: "hi" }] }, c),
      { type: ACTION_STEPS.ToAssistant, message: "hi", context: undefined },
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
  });

  it("mappedProps Comp without schema preserves StateRef", () => {
    const node = {
      k: "Comp",
      name: "Title",
      mappedProps: {
        text: { k: "StateRef", n: "$t" },
      },
    };
    const r = evaluate(node, ctx({ $t: "hello" }));
    assert.equal(r.type, "element");
    assert.equal(r.typeName, "Title");
    assert.equal(r.props.text.k, "StateRef");
  });

  it("mappedProps with reactive schema emits ReactiveAssign", () => {
    const schema = { type: "string" };
    markReactive(schema);
    const node = {
      k: "Comp",
      name: "Input",
      mappedProps: {
        value: { k: "StateRef", n: "$v" },
      },
    };
    const schemaCtx = {
      library: {
        components: {
          Input: { props: { shape: { value: schema } } },
        },
      },
    };
    const r = evaluate(node, ctx({ $v: "x" }), schemaCtx);
    assert.equal(r.props.value.__reactive, "assign");
    assert.equal(r.props.value.target, "$v");
  });

  it("mappedProps evaluates literal props and inlines nested elements", () => {
    const library = {
      components: {
        Stack: { props: { shape: { child: {}, items: {}, label: {} } } },
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
          child: {
            k: "Comp",
            name: "Title",
            args: [],
            mappedProps: { text: { k: "Str", v: "solo" } },
          },
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
    assert.equal(out.props.child.props.text, "solo");
    assert.equal(out.props.items[0].props.text, "A");
    assert.equal(out.props.items[1], 2);
  });

  it("unmapped Comp warns and returns null", () => {
    const prev = console.warn;
    let warned = "";
    console.warn = (m) => {
      warned = String(m);
    };
    const r = evaluate({ k: "Comp", name: "Mystery", args: [] }, ctx());
    console.warn = prev;
    assert.equal(r, null);
    assert.match(warned, /Mystery/);
  });
});

describe("evaluator coverage — substituteRef and lazy paths", () => {
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

  it("substituteRef covers operators, collections, and Member Obj collapse", () => {
    const library = { components: {} };
    const template = {
      k: "Ternary",
      cond: { k: "Ref", n: "t" },
      then: { k: "Bool", v: true },
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
    assert.deepEqual(
      evaluate(
        {
          k: "Comp",
          name: "Each",
          args: [{ k: "Arr", els: [{ k: "Num", v: 3 }] }, { k: "Ref", n: "t" }, template],
        },
        ctx(),
        { library },
      ),
      [true],
    );

    const memberObjCollapse = evaluate(
      {
        k: "Comp",
        name: "Each",
        args: [
          { k: "Arr", els: [{ k: "Obj", entries: [["id", { k: "Num", v: 7 }]] }] },
          { k: "Ref", n: "t" },
          {
            k: "Member",
            obj: { k: "Ref", n: "t" },
            field: "id",
          },
        ],
      },
      ctx(),
      { library },
    );
    assert.deepEqual(memberObjCollapse, [7]);

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
                    els: [
                      {
                        k: "Member",
                        obj: { notAnAst: true },
                        field: "x",
                      },
                    ],
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

    const compMapped = evaluate(
      {
        k: "Comp",
        name: "Each",
        args: [
          { k: "Arr", els: [{ k: "Num", v: 99 }] },
          { k: "Str", v: "t" },
          {
            k: "Comp",
            name: "Action",
            args: [],
            mappedProps: { meta: { k: "Ref", n: "t" } },
          },
        ],
      },
      ctx(),
      { library },
    );
    assert.ok(Array.isArray(compMapped));

    assert.deepEqual(
      evaluate(
        {
          k: "Comp",
          name: "Each",
          args: [
            { k: "Arr", els: [{ k: "Obj", entries: [["x", { k: "Num", v: 1 }]] }] },
            { k: "Ref", n: "t" },
            {
              k: "Member",
              obj: { k: "Ref", n: "t" },
              field: "missing",
            },
          ],
        },
        ctx(),
        { library },
      ),
      [undefined],
    );

    assert.deepEqual(
      evaluate(
        {
          k: "Comp",
          name: "Each",
          args: [
            { k: "Arr", els: [{ k: "Null" }] },
            { k: "Ref", n: "t" },
            { k: "Ref", n: "t" },
          ],
        },
        ctx(),
        { library },
      ),
      [null],
    );

    const sym = Symbol("row");
    assert.deepEqual(
      evaluate(
        {
          k: "Comp",
          name: "Each",
          args: [
            { k: "StateRef", n: "$rows" },
            { k: "Ref", n: "t" },
            { k: "Ref", n: "t" },
          ],
        },
        ctx({ $rows: [sym] }),
        { library },
      ),
      [null],
    );
  });

  it("evaluatePropCore and evaluateElementProps recurse paths", () => {
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
    const callbacks = {
      recurseElement: (el) => el,
      recurse: (v, rs) => evaluatePropCore(v, baseCtx, schemaCtx, rs, callbacks),
    };

    assert.equal(evaluatePropCore(42, baseCtx, schemaCtx, undefined, callbacks), 42);
    assert.equal(evaluatePropCore("x", baseCtx, schemaCtx, reactiveShape, callbacks), "x");

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

    assert.deepEqual(
      evaluatePropCore({ wrap: { deep: { k: "Str", v: "v" } } }, baseCtx, schemaCtx, undefined, callbacks),
      { wrap: { deep: "v" } },
    );
    assert.equal(
      evaluatePropCore(
        { k: "Assign", target: "$title", value: { k: "Num", v: 1 } },
        baseCtx,
        schemaCtx,
        {},
        callbacks,
      ),
      "T",
    );
    assert.equal(stripReactiveAssign(null, ctx()), null);
  });
});
