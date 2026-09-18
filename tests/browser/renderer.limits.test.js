/**
 * A4.7 — renderer resource limits stop hostile trees cleanly.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LIMITS,
  checkLimits,
  collectTreeStats,
  withLimits,
} from "../../src/Browser/renderer/limits.js";

/**
 * @param {number} depth
 * @param {number} [breadth]
 */
function buildDeepTree(depth, breadth = 2) {
  if (depth <= 0) return { type: "Leaf" };
  return {
    type: "Stack",
    children: Array.from({ length: breadth }, () => buildDeepTree(depth - 1, breadth)),
  };
}

/**
 * @param {number} n
 */
function buildWideTree(n) {
  return {
    type: "Stack",
    children: Array.from({ length: n }, (_, i) => ({ type: "Item", key: i })),
  };
}

describe("renderer limits", () => {
  it("exports DEFAULT_LIMITS with all budgets", () => {
    for (const key of [
      "maxNodes",
      "maxDepth",
      "maxActions",
      "maxQueries",
      "maxImages",
      "maxUpdatesPerTick",
    ]) {
      assert.equal(typeof DEFAULT_LIMITS[key], "number");
      assert.ok(DEFAULT_LIMITS[key] > 0);
    }
  });

  it("checkLimits accepts a small tree", () => {
    const stats = collectTreeStats({
      type: "Stack",
      children: [{ type: "Title" }, { type: "Image" }],
    });
    assert.equal(stats.nodes, 3);
    assert.equal(stats.images, 1);
    assert.equal(stats.depth, 2);
    const result = checkLimits(stats);
    assert.equal(result.ok, true);
  });

  it("rejects too many nodes", () => {
    const result = checkLimits({ nodes: DEFAULT_LIMITS.maxNodes + 1 }, DEFAULT_LIMITS);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "too-many-nodes");
    assert.equal(result.error.actual, DEFAULT_LIMITS.maxNodes + 1);
  });

  it("rejects excessive depth", () => {
    const result = checkLimits({ depth: DEFAULT_LIMITS.maxDepth + 1 });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "max-depth-exceeded");
  });

  it("rejects too many actions, queries, images, updates", () => {
    assert.equal(checkLimits({ actions: 999 }, { maxActions: 10 }).ok, false);
    assert.equal(checkLimits({ queries: 999 }, { maxQueries: 5 }).ok, false);
    assert.equal(checkLimits({ images: 999 }, { maxImages: 5 }).ok, false);
    assert.equal(checkLimits({ updatesPerTick: 999 }, { maxUpdatesPerTick: 10 }).ok, false);
  });

  it("hostile deep tree stops cleanly via collectTreeStats + checkLimits", () => {
    const tightLimits = { maxNodes: 50, maxDepth: 5 };
    // Chain depth (breadth 1) — exceeds maxDepth without allocating a combinatorial bomb.
    const tree = buildDeepTree(40, 1);
    const t0 = Date.now();
    const stats = collectTreeStats(tree, tightLimits);
    const elapsed = Date.now() - t0;
    assert.ok(stats.truncated, "should truncate once over budget");
    assert.ok(stats.depth >= tightLimits.maxDepth, `depth=${stats.depth}`);
    assert.ok(stats.nodes <= tightLimits.maxDepth + 2, `early abort expected, got ${stats.nodes} nodes`);
    assert.ok(elapsed < 200, `should not freeze (took ${elapsed}ms)`);
    const tight = checkLimits(stats, tightLimits);
    assert.equal(tight.ok, false);
    assert.equal(tight.error.code, "max-depth-exceeded");
  });

  it("hostile bushy tree exceeds maxNodes without hanging", () => {
    const tightLimits = { maxNodes: 80, maxDepth: 64 };
    const tree = buildDeepTree(6, 3);
    const t0 = Date.now();
    const stats = collectTreeStats(tree, tightLimits);
    const elapsed = Date.now() - t0;
    assert.ok(stats.truncated);
    assert.ok(stats.nodes <= tightLimits.maxNodes + 1);
    assert.ok(elapsed < 500, `should not freeze (took ${elapsed}ms)`);
    const result = checkLimits(stats, tightLimits);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "too-many-nodes");
  });

  it("hostile wide tree exceeds maxNodes without hanging", () => {
    const tree = buildWideTree(500);
    const stats = collectTreeStats(tree, { maxNodes: 100 });
    assert.ok(stats.truncated);
    assert.ok(stats.nodes <= 101);
    const result = checkLimits(stats, { maxNodes: 100 });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "too-many-nodes");
  });

  it("withLimits tracker bumps and fails closed", () => {
    const outcome = withLimits(
      (t) => {
        for (let i = 0; i < 20; i++) {
          const r = t.bump("nodes", 1);
          if (!r.ok) return r;
        }
        return { ok: true };
      },
      { maxNodes: 10 },
    );
    assert.equal(outcome.ok, false);
    assert.equal(outcome.error.code, "too-many-nodes");
  });

  it("withLimits throwOnLimit throws", () => {
    assert.throws(
      () =>
        withLimits(
          (t) => {
            t.bump("depth", 100);
            return { ok: true };
          },
          { maxDepth: 5, throwOnLimit: true },
        ),
      /maxDepth|max-depth/i,
    );
  });

  it("withLimits returns successful fn result when under budget", () => {
    const outcome = withLimits(
      (t) => {
        t.bump("nodes", 2);
        t.bump("images", 1);
        return { ok: true, value: 42 };
      },
      { maxNodes: 10, maxImages: 5 },
    );
    assert.deepEqual(outcome, { ok: true, value: 42 });
  });
});
