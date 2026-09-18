import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
  buildCacheKey,
  clampRefreshInterval,
  createQueryManager,
  MAX_REFRESH_INTERVAL_SEC,
  MIN_REFRESH_INTERVAL_SEC,
  stableStringify,
} from "../../src/Browser/runtime/queryManager.js";
import { McpToolError } from "../../src/Browser/runtime/mcp.js";
import { ToolNotFoundError } from "../../src/Browser/runtime/toolProvider.js";

function node(statementId, refreshInterval = 0, overrides = {}) {
  return {
    statementId,
    toolName: "get_data",
    args: {},
    defaults: { placeholder: true },
    deps: null,
    refreshInterval,
    complete: true,
    ...overrides,
  };
}

async function flushMicrotasks(rounds = 8) {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
}

describe("queryManager utilities", () => {
  it("stableStringify sorts object keys recursively", () => {
    const a = stableStringify({ z: 1, a: { y: 2, b: 3 } });
    const b = stableStringify({ a: { b: 3, y: 2 }, z: 1 });
    assert.equal(a, b);
    assert.ok(buildCacheKey("t", { b: 1, a: 2 }, { id: 1 }).includes("t::"));
  });

  it("buildCacheKey includes deps when present", () => {
    const withDeps = buildCacheKey("get_item", { id: 1 }, { id: 1 });
    const noDeps = buildCacheKey("get_item", { id: 1 }, null);
    assert.notEqual(withDeps, noDeps);
    assert.ok(withDeps.includes("get_item"));
  });

  it("clampRefreshInterval enforces bounds", () => {
    assert.equal(clampRefreshInterval(0), 0);
    assert.equal(clampRefreshInterval(0.5), MIN_REFRESH_INTERVAL_SEC);
    assert.equal(clampRefreshInterval(99999), MAX_REFRESH_INTERVAL_SEC);
    assert.equal(clampRefreshInterval(30), 30);
  });
});

describe("QueryManager refresh interval lifecycle", () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ["setInterval"] });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  it("fires the refresh timer periodically on a steady mount", async () => {
    let calls = 0;
    const qm = createQueryManager({
      callTool: async () => {
        calls += 1;
        return { ok: true };
      },
    });

    qm.evaluateQueries([node("q1", 5)]);
    await flushMicrotasks();
    const afterMount = calls;

    mock.timers.tick(5_000);
    await flushMicrotasks();
    assert.ok(calls > afterMount);

    const afterFirstTick = calls;
    mock.timers.tick(5_000);
    await flushMicrotasks();
    assert.ok(calls > afterFirstTick);
  });

  it("re-creates the refresh timer after dispose() + re-evaluate (StrictMode re-attach)", async () => {
    let calls = 0;
    const qm = createQueryManager({
      callTool: async () => {
        calls += 1;
        return { ok: true };
      },
    });

    qm.evaluateQueries([node("q1", 5)]);
    await flushMicrotasks();

    qm.dispose();

    qm.activate();
    qm.evaluateQueries([node("q1", 5)]);
    await flushMicrotasks();

    const before = calls;

    mock.timers.tick(5_000);
    await flushMicrotasks();

    assert.ok(calls > before);
  });

  it("clears the timer when the interval is removed", async () => {
    let calls = 0;
    const qm = createQueryManager({
      callTool: async () => {
        calls += 1;
        return { ok: true };
      },
    });

    qm.evaluateQueries([node("q1", 5)]);
    await flushMicrotasks();

    qm.evaluateQueries([node("q1", 0)]);
    await flushMicrotasks();

    const before = calls;
    mock.timers.tick(30_000);
    await flushMicrotasks();
    assert.equal(calls, before);
  });
});

describe("QueryManager data lifecycle", () => {
  it("shows defaults then settled data; keeps last-good during refetch", async () => {
    let wave = 0;
    const qm = createQueryManager({
      callTool: async () => {
        wave += 1;
        if (wave === 1) return { items: [1] };
        await new Promise(() => {});
        return { items: [2] };
      },
    });

    qm.evaluateQueries([node("q1")]);
    assert.deepEqual(qm.getResult("q1"), { placeholder: true });
    await flushMicrotasks();
    assert.deepEqual(qm.getResult("q1"), { items: [1] });

    qm.invalidate(["q1"]);
    assert.deepEqual(qm.getResult("q1"), { items: [1] });
    assert.equal(qm.getSnapshot().__openui_refetching.includes("q1"), true);
  });

  it("deduplicates identical in-flight cache keys across statement ids", async () => {
    let calls = 0;
    let gate;
    const qm = createQueryManager({
      callTool: async () => {
        calls += 1;
        await new Promise((r) => {
          gate = r;
        });
        return { shared: true };
      },
    });

    qm.evaluateQueries([node("q1"), node("q2")]);
    await flushMicrotasks();
    assert.equal(calls, 1);
    assert.equal(qm.isLoading("q1"), true);
    assert.equal(qm.isLoading("q2"), true);

    gate();
    await flushMicrotasks();
    assert.equal(calls, 1);
    assert.deepEqual(qm.getResult("q1"), { shared: true });
    assert.deepEqual(qm.getResult("q2"), { shared: true });
  });

  it("suppresses stale responses when deps change mid-flight", async () => {
    let calls = 0;
    const resolvers = [];
    const qm = createQueryManager({
      callTool: async (_name, args, opts) => {
        calls += 1;
        const id = args.id;
        return new Promise((resolve, reject) => {
          const finish = () => resolve({ id });
          if (opts?.signal?.aborted) {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
            return;
          }
          opts?.signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
          resolvers.push(finish);
        });
      },
    });

    qm.evaluateQueries([
      node("q1", 0, { args: { id: 1 }, deps: { id: 1 } }),
    ]);
    await flushMicrotasks();
    assert.equal(calls, 1);

    qm.evaluateQueries([
      node("q1", 0, { args: { id: 2 }, deps: { id: 2 } }),
    ]);
    await flushMicrotasks();
    assert.equal(calls, 2);

    resolvers[0]();
    await flushMicrotasks();
    assert.deepEqual(qm.getResult("q1"), { placeholder: true });

    resolvers[1]();
    await flushMicrotasks();
    assert.deepEqual(qm.getResult("q1"), { id: 2 });
  });

  it("maps tool errors into snapshot errors", async () => {
    const qm = createQueryManager({
      callTool: async () => {
        throw new ToolNotFoundError("missing", ["a", "b"]);
      },
    });
    qm.evaluateQueries([node("q1")]);
    await flushMicrotasks();
    const snap = qm.getSnapshot();
    assert.equal(snap.__openui_errors.length, 1);
    assert.equal(snap.__openui_errors[0].code, "tool-not-found");
  });

  it("subscribe notifies on snapshot changes only", async () => {
    let n = 0;
    const qm = createQueryManager({
      callTool: async () => ({ v: 1 }),
    });
    qm.subscribe(() => {
      n += 1;
    });
    qm.evaluateQueries([node("q1")]);
    await flushMicrotasks();
    assert.ok(n >= 1);
    const before = n;
    qm.getSnapshot();
    assert.equal(n, before);
  });

  it("dispose clears listeners and aborts in-flight fetch", async () => {
    let aborted = false;
    const qm = createQueryManager({
      callTool: async (_n, _a, opts) => {
        opts?.signal?.addEventListener("abort", () => {
          aborted = true;
        });
        await new Promise(() => {});
      },
    });
    let notified = 0;
    qm.subscribe(() => {
      notified += 1;
    });
    qm.evaluateQueries([node("q1")]);
    await flushMicrotasks();
    qm.dispose();
    assert.equal(notified > 0, true);
    assert.equal(aborted, true);
    assert.equal(qm.isAnyLoading(), false);
  });
});

describe("QueryManager mutations", () => {
  it("rejects concurrent fireMutation on same id", async () => {
    let release;
    const qm = createQueryManager({
      callTool: () => new Promise((r) => {
        release = r;
      }),
    });
    qm.registerMutations([{ statementId: "m1", toolName: "save" }]);
    const first = qm.fireMutation("m1", { x: 1 });
    const second = qm.fireMutation("m1", { x: 2 });
    assert.equal(await second, false);
    release({ ok: true });
    assert.equal(await first, true);
    assert.equal(qm.getMutationResult("m1").status, "success");
  });

  it("invalidates named queries after successful mutation", async () => {
    let fetches = 0;
    const qm = createQueryManager({
      callTool: async (name) => {
        if (name === "get_data") {
          fetches += 1;
          return { n: fetches };
        }
        return { saved: true };
      },
    });
    qm.evaluateQueries([node("q1")]);
    await flushMicrotasks();
    assert.equal(fetches, 1);

    qm.registerMutations([{ statementId: "m1", toolName: "save" }]);
    await qm.fireMutation("m1", {}, ["q1"]);
    await flushMicrotasks();
    assert.ok(fetches >= 2);
  });

  it("records McpToolError on mutation failure", async () => {
    const qm = createQueryManager({
      callTool: async () => {
        throw new McpToolError("bad payload");
      },
    });
    qm.registerMutations([{ statementId: "m1", toolName: "save" }]);
    await qm.fireMutation("m1", {});
    const snap = qm.getSnapshot();
    assert.equal(snap.m1.status, "error");
    assert.equal(snap.__openui_errors[0].code, "mcp-error");
  });
});
