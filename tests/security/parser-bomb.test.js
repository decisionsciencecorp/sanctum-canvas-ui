/**
 * A8.3 — Parser / renderer bomb regressions (limits + last-good).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  DEFAULT_LIMITS,
  checkLimits,
  collectTreeStats,
} from "../../src/Browser/renderer/limits.js";
import { createComponentRegistry } from "../../src/Browser/renderer/registry.js";
import { clearAllLastGood } from "../../src/Browser/renderer/lastGoodSubtree.js";
import {
  safeRender,
  guardedToolInvoke,
} from "../../src/Browser/renderer/safeRender.js";
import { createTestDom } from "../browser/helpers/miniDom.js";

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

  it("DEFAULT_LIMITS stay finite and positive", () => {
    for (const v of Object.values(DEFAULT_LIMITS)) {
      assert.equal(typeof v, "number");
      assert.ok(v > 0 && Number.isFinite(v));
    }
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
});
