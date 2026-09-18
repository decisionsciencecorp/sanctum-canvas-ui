import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../../src/Browser/runtime/store.js";
import { createMutationManager } from "../../src/Browser/runtime/mutations.js";
import { createActionRunner } from "../../src/Browser/runtime/actionRunner.js";
import { ACTION_STEPS } from "../../src/Browser/lang/builtins.js";

describe("createActionRunner", () => {
  it("evaluates Set at click time and Reset restores defaults", async () => {
    const store = createStore();
    store.initialize({ $n: 0 }, {});
    const runner = createActionRunner({ store });
    const r = await runner.run({
      steps: [
        {
          type: ACTION_STEPS.Set,
          target: "$n",
          valueAST: {
            k: "BinOp",
            op: "+",
            left: { k: "StateRef", n: "$n" },
            right: { k: "Num", v: 5 },
          },
        },
      ],
    });
    assert.equal(r.ok, true);
    assert.equal(store.get("$n"), 5);
    await runner.run({ steps: [{ type: ACTION_STEPS.Reset, targets: ["$n"] }] });
    assert.equal(store.get("$n"), 0);
  });

  it("stops after failed mutation", async () => {
    const store = createStore();
    store.initialize({ $n: 0 }, {});
    const mm = createMutationManager({
      async callTool() {
        throw new Error("nope");
      },
    });
    mm.register({ statementId: "m1", toolName: "write", args: {} });
    const runner = createActionRunner({ store, mutations: mm });
    const r = await runner.run({
      steps: [
        { type: ACTION_STEPS.Run, statementId: "m1" },
        {
          type: ACTION_STEPS.Set,
          target: "$n",
          valueAST: { k: "Num", v: 9 },
        },
      ],
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "mutation-failed");
    assert.equal(store.get("$n"), 0);
    mm.dispose();
  });

  it("requires user gesture for OpenUrl and ToAssistant", async () => {
    const store = createStore();
    const opened = [];
    const msgs = [];
    const runner = createActionRunner({
      store,
      host: {
        openUrl: (u) => opened.push(u),
        continueConversation: (m) => msgs.push(m),
      },
    });
    let r = await runner.run({
      steps: [{ type: ACTION_STEPS.OpenUrl, url: "https://x.test" }],
    });
    assert.equal(r.reason, "gesture-required");
    r = await runner.run(
      { steps: [{ type: ACTION_STEPS.OpenUrl, url: "https://x.test" }] },
      { userGesture: true },
    );
    assert.equal(r.ok, true);
    assert.deepEqual(opened, ["https://x.test"]);
    await runner.run(
      { steps: [{ type: ACTION_STEPS.ToAssistant, message: "hi" }] },
      { userGesture: true },
    );
    assert.deepEqual(msgs, ["hi"]);
  });

  it("blocks side effects while program incomplete", async () => {
    const store = createStore();
    const runner = createActionRunner({
      store,
      isProgramComplete: () => false,
    });
    const r = await runner.run({
      steps: [
        {
          type: ACTION_STEPS.Set,
          target: "$n",
          valueAST: { k: "Num", v: 1 },
        },
      ],
    });
    assert.equal(r.reason, "incomplete-program");
  });
});
