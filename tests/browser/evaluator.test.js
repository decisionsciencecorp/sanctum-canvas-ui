import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluate, isReactiveAssign, stripReactiveAssign } from "../../src/Browser/runtime/evaluator.js";
import { ACTION_STEPS } from "../../src/Browser/lang/builtins.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const evaluatorSrc = readFileSync(
  join(__dir, "../../src/Browser/runtime/evaluator.js"),
  "utf8",
);

function ctx(state = {}, refs = {}) {
  return {
    getState: (n) => state[n],
    resolveRef: (n) => refs[n],
  };
}

describe("evaluator — core semantics (A3.1)", () => {
  it("evaluates literals and placeholder", () => {
    assert.equal(evaluate({ k: "Str", v: "hi" }, ctx()), "hi");
    assert.equal(evaluate({ k: "Num", v: 3.5 }, ctx()), 3.5);
    assert.equal(evaluate({ k: "Bool", v: true }, ctx()), true);
    assert.equal(evaluate({ k: "Null" }, ctx()), null);
    assert.equal(evaluate({ k: "Ph" }, ctx()), null);
  });

  it("StateRef uses getState and extraScope", () => {
    assert.equal(evaluate({ k: "StateRef", n: "$x" }, ctx({ $x: 9 })), 9);
    assert.equal(
      evaluate({ k: "StateRef", n: "$x" }, { ...ctx({ $x: 1 }), extraScope: { $x: 2 } }),
      2,
    );
  });

  it("Ref and RuntimeRef resolve via resolveRef", () => {
    assert.equal(evaluate({ k: "Ref", n: "a" }, ctx({}, { a: "ok" })), "ok");
    assert.equal(evaluate({ k: "RuntimeRef", n: "r1", refType: "query" }, ctx({}, { r1: 1 })), 1);
  });

  it("BinOp short-circuits && and ||", () => {
    let calls = 0;
    const base = {
      getState: () => null,
      resolveRef: (n) => {
        if (n === "side") {
          calls += 1;
          return 1;
        }
        return null;
      },
    };
    assert.equal(
      evaluate(
        { k: "BinOp", op: "&&", left: { k: "Bool", v: false }, right: { k: "Ref", n: "side" } },
        base,
      ),
      false,
    );
    assert.equal(calls, 0);
    assert.equal(
      evaluate(
        { k: "BinOp", op: "||", left: { k: "Bool", v: true }, right: { k: "Ref", n: "side" } },
        base,
      ),
      true,
    );
    assert.equal(calls, 0);
  });

  it("null coerces to empty string in string concat", () => {
    const r = evaluate(
      {
        k: "BinOp",
        op: "+",
        left: { k: "Str", v: "a" },
        right: { k: "Null" },
      },
      ctx(),
    );
    assert.equal(r, "a");
  });

  it("division and modulo by zero return 0", () => {
    assert.equal(
      evaluate(
        {
          k: "BinOp",
          op: "/",
          left: { k: "Num", v: 10 },
          right: { k: "Num", v: 0 },
        },
        ctx(),
      ),
      0,
    );
    assert.equal(
      evaluate(
        {
          k: "BinOp",
          op: "%",
          left: { k: "Num", v: 10 },
          right: { k: "Num", v: 0 },
        },
        ctx(),
      ),
      0,
    );
  });

  it("loose equality", () => {
    assert.equal(
      evaluate(
        {
          k: "BinOp",
          op: "==",
          left: { k: "Num", v: 5 },
          right: { k: "Str", v: "5" },
        },
        ctx(),
      ),
      true,
    );
    assert.equal(
      evaluate(
        {
          k: "BinOp",
          op: "!=",
          left: { k: "Num", v: 5 },
          right: { k: "Str", v: "6" },
        },
        ctx(),
      ),
      true,
    );
  });

  it("unary and ternary", () => {
    assert.equal(evaluate({ k: "UnaryOp", op: "!", operand: { k: "Bool", v: false } }, ctx()), true);
    assert.equal(evaluate({ k: "UnaryOp", op: "-", operand: { k: "Num", v: 4 } }, ctx()), -4);
    assert.equal(
      evaluate(
        {
          k: "Ternary",
          cond: { k: "Bool", v: true },
          then: { k: "Str", v: "y" },
          else: { k: "Str", v: "n" },
        },
        ctx(),
      ),
      "y",
    );
  });

  it("Arr and Obj", () => {
    assert.deepEqual(
      evaluate({ k: "Arr", els: [{ k: "Num", v: 1 }, { k: "Num", v: 2 }] }, ctx()),
      [1, 2],
    );
    assert.deepEqual(
      evaluate(
        {
          k: "Obj",
          entries: [
            ["a", { k: "Num", v: 1 }],
            ["b", { k: "Str", v: "x" }],
          ],
        },
        ctx(),
      ),
      { a: 1, b: "x" },
    );
  });

  it("builtin Count and Sum", () => {
    assert.equal(
      evaluate(
        {
          k: "Comp",
          name: "Count",
          args: [{ k: "Arr", els: [{ k: "Num", v: 1 }, { k: "Num", v: 2 }] }],
        },
        ctx(),
      ),
      2,
    );
    assert.equal(
      evaluate(
        {
          k: "Comp",
          name: "Sum",
          args: [{ k: "Arr", els: [{ k: "Num", v: 2 }, { k: "Num", v: 3 }] }],
        },
        ctx(),
      ),
      5,
    );
  });

  it("never uses eval or Function in evaluator source", () => {
    assert.doesNotMatch(evaluatorSrc, /\beval\s*\(/);
    assert.doesNotMatch(evaluatorSrc, /\bnew\s+Function\b/);
    assert.doesNotMatch(evaluatorSrc, /\bFunction\s*\(/);
  });

  it("Member and Index access", () => {
    assert.equal(
      evaluate(
        { k: "Member", obj: { k: "Obj", entries: [["x", { k: "Num", v: 7 }]] }, field: "x" },
        ctx(),
      ),
      7,
    );
    assert.equal(
      evaluate(
        {
          k: "Index",
          obj: { k: "Arr", els: [{ k: "Str", v: "z" }] },
          index: { k: "Num", v: 0 },
        },
        ctx(),
      ),
      "z",
    );
  });

  it("Assign and stripReactiveAssign", () => {
    const a = evaluate(
      { k: "Assign", target: "$t", value: { k: "Num", v: 1 } },
      ctx(),
    );
    assert.ok(isReactiveAssign(a));
    assert.equal(stripReactiveAssign(a, ctx({ $t: "live" })), "live");
    assert.equal(stripReactiveAssign("plain", ctx()), "plain");
  });

  it("Action builtins produce structured steps", () => {
    const plan = evaluate(
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
                args: [{ k: "Str", v: "https://example.com" }],
              },
            ],
          },
        ],
      },
      ctx(),
    );
    assert.deepEqual(plan, {
      steps: [{ type: ACTION_STEPS.OpenUrl, url: "https://example.com" }],
    });
  });
});
