import { describe, it, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createQueryManager } from "../../src/Browser/runtime/queryManager.js";
import { McpToolError } from "../../src/Browser/runtime/mcp.js";
import { ToolNotFoundError } from "../../src/Browser/runtime/toolProvider.js";
import { evaluatePropCore } from "../../src/Browser/runtime/evaluate-prop.js";
import { markReactive } from "../../src/Browser/lang/reactive.js";

function node(id, overrides = {}) {
  return {
    statementId: id,
    toolName: "get_data",
    args: {},
    defaults: { placeholder: true },
    deps: null,
    refreshInterval: 0,
    complete: true,
    ...overrides,
  };
}

async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

describe("queryManager coverage gaps", () => {
  afterEach(() => {
    mock.timers.reset();
  });

  it("no-ops evaluateQueries when disposed", async () => {
    const qm = createQueryManager({ callTool: async () => ({}) });
    qm.dispose();
    qm.evaluateQueries([node("q1")]);
    await flush();
    assert.equal(qm.getResult("q1"), null);
  });

  it("skips incomplete query nodes", async () => {
    let calls = 0;
    const qm = createQueryManager({
      callTool: async () => {
        calls += 1;
        return {};
      },
    });
    qm.evaluateQueries([node("q1", { complete: false })]);
    await flush();
    assert.equal(calls, 0);
  });

  it("works without toolProvider", async () => {
    const qm = createQueryManager(null);
    qm.evaluateQueries([node("q1")]);
    assert.deepEqual(qm.getResult("q1"), { placeholder: true });
    qm.invalidate();
    assert.equal(await qm.fireMutation("m", {}), false);
  });

  it("invalidate all queries when ids omitted", async () => {
    let calls = 0;
    const qm = createQueryManager({
      callTool: async () => {
        calls += 1;
        return { c: calls };
      },
    });
    qm.evaluateQueries([node("q1"), node("q2", { toolName: "other", args: { x: 1 } })]);
    await flush();
    const start = calls;
    qm.invalidate();
    await flush();
    assert.ok(calls > start);
  });

  it("needsRefetch when invalidate during in-flight", async () => {
    let resolveFirst;
    let calls = 0;
    const qm = createQueryManager({
      callTool: async () => {
        calls += 1;
        if (calls === 1) {
          return new Promise((r) => {
            resolveFirst = r;
          });
        }
        return { pass: calls };
      },
    });
    qm.evaluateQueries([node("q1")]);
    await flush();
    qm.invalidate(["q1"]);
    resolveFirst({ pass: 1 });
    await flush();
    assert.ok(calls >= 2);
  });

  it("registerMutations updates tool name and prunes removed", async () => {
    const qm = createQueryManager({ callTool: async () => ({}) });
    qm.registerMutations([{ statementId: "m1", toolName: "a" }]);
    qm.registerMutations([{ statementId: "m1", toolName: "b" }]);
    assert.equal(qm.getMutationResult("m1").status, "idle");
    qm.registerMutations([]);
    assert.equal(qm.getMutationResult("m1"), null);
  });

  it("generic query tool-error path", async () => {
    const qm = createQueryManager({
      callTool: async () => {
        throw new Error("boom");
      },
    });
    qm.evaluateQueries([node("q1")]);
    await flush();
    assert.equal(qm.getSnapshot().__openui_errors[0].code, "tool-error");
  });

  it("mcp query error path", async () => {
    const qm = createQueryManager({
      callTool: async () => {
        throw new McpToolError("x");
      },
    });
    qm.evaluateQueries([node("q1")]);
    await flush();
    assert.equal(qm.getSnapshot().__openui_errors[0].code, "mcp-error");
  });

  it("mutation ToolNotFoundError maps structured error", async () => {
    const qm = createQueryManager({
      callTool: async () => {
        throw new ToolNotFoundError("save", ["get_data"]);
      },
    });
    qm.registerMutations([{ statementId: "m1", toolName: "save" }]);
    await qm.fireMutation("m1", {});
    const snap = qm.getSnapshot();
    assert.equal(snap.__openui_errors[0].code, "tool-not-found");
    assert.equal(snap.__openui_errors[0].source, "mutation");
  });

  it("mutation generic tool-error maps structured error", async () => {
    const qm = createQueryManager({
      callTool: async () => {
        throw new Error("mut boom");
      },
    });
    qm.registerMutations([{ statementId: "m2", toolName: "other" }]);
    await qm.fireMutation("m2", {});
    assert.equal(qm.getSnapshot().__openui_errors[0].code, "tool-error");
  });

  it("mutation generation guard after dispose", async () => {
    const qm = createQueryManager({
      callTool: async () => {
        await new Promise((r) => setTimeout(r, 5));
        return {};
      },
    });
    qm.registerMutations([{ statementId: "m1", toolName: "save" }]);
    const p = qm.fireMutation("m1", {});
    qm.dispose();
    assert.equal(await p, false);
  });

  it("clamps sub-second refresh to minimum interval", async () => {
    mock.timers.enable({ apis: ["setInterval"] });
    let calls = 0;
    const qm = createQueryManager({
      callTool: async () => {
        calls += 1;
        return {};
      },
    });
    qm.evaluateQueries([node("q1", { refreshInterval: 0.2 })]);
    await flush();
    const afterMount = calls;
    mock.timers.tick(1000);
    await flush();
    assert.ok(calls > afterMount);
  });

  it("removing query clears cache when unreferenced", async () => {
    mock.timers.enable({ apis: ["setInterval"] });
    const qm = createQueryManager({ callTool: async () => ({ v: 1 }) });
    qm.evaluateQueries([node("q1", { refreshInterval: 5 })]);
    await flush();
    qm.evaluateQueries([]);
    await flush();
    assert.equal(qm.getResult("q1"), null);
  });

  it("activate re-enables after dispose", async () => {
    const qm = createQueryManager({ callTool: async () => ({ ok: 1 }) });
    qm.dispose();
    qm.activate();
    qm.evaluateQueries([node("q1")]);
    await flush();
    assert.deepEqual(qm.getResult("q1"), { ok: 1 });
  });

  it("snapshot uses prevCacheKey data while refetching after deps change", async () => {
    let calls = 0;
    const qm = createQueryManager({
      callTool: async (_n, args) => {
        calls += 1;
        if (args.id === 1) return { id: 1 };
        return new Promise(() => {});
      },
    });
    qm.evaluateQueries([node("q1", { args: { id: 1 }, deps: { id: 1 } })]);
    await flush();
    qm.evaluateQueries([node("q1", { args: { id: 2 }, deps: { id: 2 } })]);
    await flush();
    assert.deepEqual(qm.getSnapshot().q1, { id: 1 });
    assert.equal(qm.getSnapshot().__openui_refetching.includes("q1"), true);
  });

  it("drops fetch result when query removed before settle", async () => {
    let resolve;
    const qm = createQueryManager({
      callTool: async () =>
        new Promise((r) => {
          resolve = r;
        }),
    });
    qm.evaluateQueries([node("q1")]);
    await flush();
    qm.evaluateQueries([]);
    resolve({ late: true });
    await flush();
    assert.equal(qm.getResult("q1"), null);
  });

  it("rebuildSnapshot survives circular query data", async () => {
    const circular = { tag: "loop" };
    circular.self = circular;
    const qm = createQueryManager({
      callTool: async () => circular,
    });
    qm.evaluateQueries([node("q1")]);
    await flush();
    assert.equal(qm.getSnapshot().q1.tag, "loop");
  });

  it("finally rebuilds when in-flight fetch outlives cache key change", async () => {
    let calls = 0;
    let releaseFirst;
    const qm = createQueryManager({
      callTool: async (_n, args) => {
        calls += 1;
        if (args.id === 1) {
          return new Promise((r) => {
            releaseFirst = r;
          });
        }
        return { id: 2 };
      },
    });
    qm.evaluateQueries([node("q1", { args: { id: 1 }, deps: { id: 1 } })]);
    await flush();
    qm.evaluateQueries([node("q1", { args: { id: 2 }, deps: { id: 2 } })]);
    await flush();
    assert.equal(calls, 2);
    releaseFirst({ id: 1 });
    await flush();
    assert.deepEqual(qm.getResult("q1"), { id: 2 });
  });
});

describe("evaluate-prop coverage (queryManager suite)", () => {
  it("recurseElement when evaluate returns an element", () => {
    const library = {
      components: {
        Title: { props: { shape: { text: {} } } },
      },
    };
    const schemaCtx = { library };
    const baseCtx = { getState: () => null, getRuntime: () => null };
    let hit = false;
    const callbacks = {
      recurseElement: (el) => {
        hit = true;
        return el;
      },
      recurse: (v) => v,
    };
    evaluatePropCore(
      {
        k: "Comp",
        name: "Title",
        args: [],
        mappedProps: { text: { k: "Str", v: "hi" } },
      },
      baseCtx,
      schemaCtx,
      undefined,
      callbacks,
    );
    assert.equal(hit, true);
  });

  it("recurse array props under reactive schema", () => {
    const reactiveShape = markReactive({});
    const schemaCtx = { library: { components: {} } };
    const baseCtx = { getState: () => null, getRuntime: () => null };
    let recurseCount = 0;
    const callbacks = {
      recurseElement: (el) => el,
      recurse: (v, rs) => {
        recurseCount += 1;
        return evaluatePropCore(v, baseCtx, schemaCtx, rs, callbacks);
      },
    };
    evaluatePropCore(
      [{ k: "Str", v: "a" }, { k: "Str", v: "b" }],
      baseCtx,
      schemaCtx,
      reactiveShape,
      callbacks,
    );
    assert.ok(recurseCount >= 2);
  });
});
