import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../../src/Browser/runtime/evaluator.js";
import { BUILTINS, LAZY_BUILTINS } from "../../src/Browser/lang/builtins.js";

const ctx = {
  getState: () => null,
  resolveRef: () => null,
};

function arr(...nums) {
  return { k: "Arr", els: nums.map((v) => ({ k: "Num", v })) };
}

describe("A3.2 builtins via evaluate", () => {
  it("exposes expected builtin names", () => {
    for (const name of [
      "Count",
      "First",
      "Last",
      "Sum",
      "Avg",
      "Min",
      "Max",
      "Sort",
      "Filter",
      "Round",
      "Abs",
      "Floor",
      "Ceil",
    ]) {
      assert.ok(BUILTINS[name], name);
    }
    assert.ok(LAZY_BUILTINS.has("Each"));
  });

  it("aggregates and math", () => {
    const call = (name, args) => evaluate({ k: "Comp", name, args }, ctx);
    assert.equal(call("Count", [arr(1, 2, 3)]), 3);
    assert.equal(call("First", [arr(9, 8)]), 9);
    assert.equal(call("Last", [arr(9, 8)]), 8);
    assert.equal(call("Sum", [arr(1, 2, 3)]), 6);
    assert.equal(call("Avg", [arr(2, 4)]), 3);
    assert.equal(call("Min", [arr(5, 1, 3)]), 1);
    assert.equal(call("Max", [arr(5, 1, 3)]), 5);
    assert.equal(call("Abs", [{ k: "Num", v: -3 }]), 3);
    assert.equal(call("Floor", [{ k: "Num", v: 3.9 }]), 3);
    assert.equal(call("Ceil", [{ k: "Num", v: 3.1 }]), 4);
    assert.equal(call("Round", [{ k: "Num", v: 3.5 }]), 4);
  });

  it("Sort Filter and Each", () => {
    const rows = {
      k: "Arr",
      els: [
        { k: "Obj", entries: [["n", { k: "Num", v: 2 }]] },
        { k: "Obj", entries: [["n", { k: "Num", v: 1 }]] },
      ],
    };
    const sorted = evaluate(
      {
        k: "Comp",
        name: "Sort",
        args: [rows, { k: "Str", v: "n" }, { k: "Str", v: "asc" }],
      },
      ctx,
    );
    assert.equal(sorted[0].n, 1);
    const each = evaluate(
      {
        k: "Comp",
        name: "Each",
        args: [arr(1, 2), { k: "Str", v: "i" }, { k: "Ref", n: "i" }],
      },
      ctx,
    );
    assert.deepEqual(each, [1, 2]);
  });
});
