import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMutationManager } from "../../src/Browser/runtime/mutations.js";

function fakeTools(handlers) {
  return {
    async callTool(name, args, opts = {}) {
      if (opts.signal?.aborted) {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }
      const fn = handlers[name];
      if (!fn) throw new Error(`no-tool:${name}`);
      return fn(args, opts);
    },
  };
}

describe("createMutationManager", () => {
  it("registers without executing", async () => {
    let calls = 0;
    const mm = createMutationManager(
      fakeTools({
        write: async () => {
          calls += 1;
          return { ok: true };
        },
      }),
    );
    mm.register({ statementId: "m1", toolName: "write", args: { x: 1 } });
    assert.equal(mm.getResult("m1").status, "idle");
    assert.equal(calls, 0);
    mm.dispose();
  });

  it("runs successfully and refreshes queries", async () => {
    const refreshed = [];
    const mm = createMutationManager(
      fakeTools({
        write: async (args, opts) => {
          assert.ok(opts.idempotencyKey);
          return { saved: args.x };
        },
      }),
      {
        refreshQueries: async (names) => {
          refreshed.push(...names);
        },
      },
    );
    mm.register({
      statementId: "m1",
      toolName: "write",
      args: { x: 1 },
      refreshQueries: ["q1"],
    });
    const r = await mm.runMutation("m1", { x: 2 });
    assert.equal(r.status, "success");
    assert.deepEqual(r.data, { saved: 2 });
    assert.deepEqual(refreshed, ["q1"]);
    mm.dispose();
  });

  it("rejects duplicate concurrent runs", async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const mm = createMutationManager(
      fakeTools({
        write: async () => {
          await gate;
          return 1;
        },
      }),
    );
    mm.register({ statementId: "m1", toolName: "write", args: {} });
    const p1 = mm.runMutation("m1");
    await Promise.resolve();
    await assert.rejects(() => mm.runMutation("m1"), /mutation-in-flight/);
    release();
    await p1;
    mm.dispose();
  });

  it("records errors without throwing", async () => {
    const mm = createMutationManager(
      fakeTools({
        write: async () => {
          throw new Error("boom");
        },
      }),
    );
    mm.register({ statementId: "m1", toolName: "write", args: {} });
    const r = await mm.runMutation("m1");
    assert.equal(r.status, "error");
    assert.match(String(r.error?.message ?? r.error), /boom/);
    mm.dispose();
  });

  it("dispose aborts inflight and clears registry", async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const mm = createMutationManager(
      fakeTools({
        write: async (_a, opts) => {
          await gate;
          if (opts.signal?.aborted) {
            const e = new Error("aborted");
            e.name = "AbortError";
            throw e;
          }
          return 1;
        },
      }),
    );
    mm.register({ statementId: "m1", toolName: "write", args: {} });
    const p = mm.runMutation("m1");
    await Promise.resolve();
    mm.dispose();
    release();
    await p;
    assert.equal(mm._registrySize(), 0);
    assert.equal(mm._inflightSize(), 0);
    await assert.rejects(() => mm.runMutation("m1"), /disposed/);
  });

  it("unregister cancels inflight", async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const mm = createMutationManager(
      fakeTools({
        write: async (_a, opts) => {
          await gate;
          if (opts.signal?.aborted) {
            const e = new Error("aborted");
            e.name = "AbortError";
            throw e;
          }
          return 1;
        },
      }),
    );
    mm.register({ statementId: "m1", toolName: "write", args: {} });
    const p = mm.runMutation("m1");
    await Promise.resolve();
    mm.unregister("m1");
    release();
    await p;
    assert.equal(mm.getResult("m1").status, "idle");
    assert.equal(mm._registrySize(), 0);
    mm.dispose();
  });

  it("unknown mutation throws", async () => {
    const mm = createMutationManager(fakeTools({}));
    await assert.rejects(() => mm.runMutation("missing"), /unknown-mutation/);
    mm.dispose();
  });

  it("rejects invalid args overrides", async () => {
    const mm = createMutationManager(fakeTools({ write: async () => 1 }));
    mm.register({ statementId: "m1", toolName: "write", args: { x: 1 } });
    await assert.rejects(() => mm.runMutation("m1", null), /mutation-invalid-args/);
    await assert.rejects(() => mm.runMutation("m1", []), /mutation-invalid-args/);
    mm.dispose();
  });

  it("rejects empty tool name", async () => {
    const mm = createMutationManager(fakeTools({ write: async () => 1 }));
    mm.register({ statementId: "m1", toolName: "  ", args: {} });
    await assert.rejects(() => mm.runMutation("m1"), /mutation-invalid-tool/);
    mm.dispose();
  });
});
