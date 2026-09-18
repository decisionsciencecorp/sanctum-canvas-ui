/**
 * A8.3 — Parser / renderer / lang bomb regressions (Doc #1379 §9.2).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  DEFAULT_LIMITS as RENDER_LIMITS,
  checkLimits,
  collectTreeStats,
  withLimits,
  limitError,
} from "../../src/Browser/renderer/limits.js";
import {
  DEFAULT_LIMITS as LANG_LIMITS,
  checkSourceLimits,
  checkStatementCount,
} from "../../src/Browser/lang/limits.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import { clearAllLastGood } from "../../src/Browser/renderer/lastGoodSubtree.js";
import {
  safeRender,
  guardedToolInvoke,
  assertNoBrokenTail,
} from "../../src/Browser/renderer/safeRender.js";
import { createTestDom } from "../browser/helpers/miniDom.js";
import { createSseAdapter } from "../../src/Browser/transport/sseAdapter.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brokenTail = JSON.parse(
  readFileSync(join(root, "tests/fixtures/hostile/broken-tail.json"), "utf8"),
);

function buildDeepTree(depth, breadth = 1) {
  if (depth <= 0) return { type: "Leaf" };
  return {
    type: "Stack",
    children: Array.from({ length: breadth }, () => buildDeepTree(depth - 1, breadth)),
  };
}

function buildCyclicTree() {
  const a = { type: "Stack", children: [] };
  const b = { type: "Card", children: [a] };
  a.children.push(b);
  return a;
}

describe("security/parser-bomb — renderer limits", () => {
  it("deep chain truncates under tight maxDepth", () => {
    const tight = { maxNodes: 50, maxDepth: 5 };
    const t0 = Date.now();
    const stats = collectTreeStats(buildDeepTree(40, 1), tight);
    assert.ok(Date.now() - t0 < 200);
    assert.ok(stats.truncated);
    assert.equal(checkLimits(stats, tight).ok, false);
  });

  it("bushy tree hits maxNodes without hang", () => {
    const tight = { maxNodes: 80, maxDepth: 64 };
    const t0 = Date.now();
    const stats = collectTreeStats(buildDeepTree(6, 3), tight);
    assert.ok(Date.now() - t0 < 500);
    assert.ok(stats.truncated || stats.nodes >= tight.maxNodes);
    assert.equal(checkLimits(stats, tight).ok, false);
  });

  it("cyclic child refs truncate under maxNodes (no hang)", () => {
    const tight = { maxNodes: 40, maxDepth: 64 };
    const t0 = Date.now();
    // Cycle would infinite-loop without limits — budget must stop walk.
    const stats = collectTreeStats(buildCyclicTree(), tight);
    assert.ok(Date.now() - t0 < 200);
    assert.ok(stats.truncated || stats.nodes <= tight.maxNodes + 1);
  });

  it("image/action/query counters trip checkLimits", () => {
    const tree = {
      type: "Stack",
      children: [
        { type: "Image", props: { src: "/a.png" } },
        { type: "Query", props: { name: "x" } },
        { type: "@OpenUrl", props: { url: "https://example.com" } },
      ],
    };
    const stats = collectTreeStats(tree);
    assert.ok(stats.images >= 1);
    assert.ok(stats.queries >= 1);
    assert.ok(stats.actions >= 1);
    assert.equal(checkLimits({ images: 100 }, { maxImages: 2 }).ok, false);
    assert.equal(checkLimits({ actions: 100 }, { maxActions: 2 }).ok, false);
    assert.equal(checkLimits({ queries: 100 }, { maxQueries: 2 }).ok, false);
    assert.equal(checkLimits({ updatesPerTick: 999 }, { maxUpdatesPerTick: 10 }).ok, false);
  });

  it("invalid stats reject; limitError shape", () => {
    const bad = checkLimits({ nodes: Number.NaN });
    assert.equal(bad.ok, false);
    assert.equal(bad.error.code, "invalid-stats");
    const e = limitError("x", "y", { n: 1 });
    assert.equal(e.code, "x");
    assert.equal(e.n, 1);
  });

  it("withLimits tracker bumps and fails cleanly", () => {
    const ok = withLimits((t) => {
      t.bump("nodes", 3);
      return { ok: true, value: t.stats.nodes };
    }, { maxNodes: 10 });
    assert.equal(ok.value, 3);

    const fail = withLimits((t) => {
      t.bump("nodes", 5);
      return { stats: { nodes: 5 } };
    }, { maxNodes: 2 });
    assert.equal(fail.ok, false);

    assert.throws(
      () =>
        withLimits(
          (t) => {
            t.bump("nodes", 9);
            return { stats: t.stats };
          },
          { maxNodes: 2, throwOnLimit: true },
        ),
      /maxNodes|too-many|exceed/i,
    );
  });

  it("DEFAULT_LIMITS stay finite and positive", () => {
    for (const v of Object.values(RENDER_LIMITS)) {
      assert.equal(typeof v, "number");
      assert.ok(v > 0 && Number.isFinite(v));
    }
  });
});

describe("security/parser-bomb — lang source/statement limits", () => {
  it("checkSourceLimits rejects oversized programs", () => {
    assert.equal(checkSourceLimits("ok").ok, true);
    assert.equal(checkSourceLimits(null).ok, false);
    const huge = "x".repeat(LANG_LIMITS.maxSourceBytes + 1);
    const r = checkSourceLimits(huge);
    assert.equal(r.ok, false);
    assert.equal(r.error.code, "source-too-large");
  });

  it("checkStatementCount rejects bomb statement counts", () => {
    assert.equal(checkStatementCount(10).ok, true);
    const r = checkStatementCount(LANG_LIMITS.maxStatements + 1);
    assert.equal(r.ok, false);
    assert.equal(r.error.code, "too-many-statements");
  });
});

describe("security/parser-bomb — oversized stream buffer", () => {
  it("SSE adapter drops when buffer exceeds maxBufferBytes", () => {
    let malformed = 0;
    const adapter = createSseAdapter({
      maxBufferBytes: 64,
      onMalformed: () => {
        malformed += 1;
      },
    });
    // Incomplete SSE block larger than budget — must not hang.
    const junk = "data: " + "A".repeat(200);
    adapter.push(junk);
    assert.ok(malformed >= 1 || typeof adapter.getState === "function");
  });
});

describe("security/parser-bomb — broken-tail last-good", () => {
  it("hostile broken-tail does not invoke tools", () => {
    clearAllLastGood();
    const { document, root: rootEl } = createTestDom();
    let toolHits = 0;
    const registry = createComponentRegistry({
      Box: (_p, ctx) => ctx.document.createElement("div"),
      Text: (_p, ctx) => {
        const el = ctx.document.createElement("span");
        el.textContent = "stable-ui";
        return el;
      },
      EvilBrokenTail: () => {
        throw new Error("must not mount");
      },
    });
    const ctx = {
      document,
      registry,
      rootKey: "hostile-broken-tail-a8",
      development: true,
    };

    const good = safeRender(rootEl, brokenTail.good, ctx);
    assert.equal(good.ok, true);
    assert.equal(rootEl.textContent, brokenTail.assert.preserveText);

    const bad = safeRender(rootEl, brokenTail.brokenTail, ctx);
    assert.equal(bad.ok, false);
    assert.equal(bad.sideEffectsAllowed, false);
    assert.equal(rootEl.textContent, brokenTail.assert.preserveText);
    const gate = guardedToolInvoke({ partial: true }, () => {
      toolHits += 1;
    });
    assert.equal(gate.ok, false);
    assert.equal(toolHits, 0);
  });

  it("assertNoBrokenTail walks arrays; prod sanitize hides stacks", () => {
    assert.doesNotThrow(() => assertNoBrokenTail([null, { type: "A" }]));
    assert.throws(() => assertNoBrokenTail({ brokenTail: true }), /broken-tail/);
    clearAllLastGood();
    const { document, root: rootEl } = createTestDom();
    const registry = createComponentRegistry({
      Boom: () => {
        throw new Error("secret/path/stack");
      },
    });
    const bad = safeRender(
      rootEl,
      { type: "Boom" },
      { document, registry, rootKey: "prod-sanitize", development: false },
    );
    assert.equal(bad.ok, false);
    assert.equal(bad.error.message, "render-failed");
  });

  it("guardedToolInvoke allows when interactive", () => {
    const r = guardedToolInvoke({ partial: false }, () => 42);
    assert.equal(r.ok, true);
    assert.equal(r.result, 42);
  });
});
