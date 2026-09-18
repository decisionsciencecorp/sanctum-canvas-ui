/**
 * CSP lab harness — same-origin module only (no inline script).
 * Imports renderer limits; demonstrates clean reject of hostile trees.
 */

import {
  checkLimits,
  collectTreeStats,
  DEFAULT_LIMITS,
  withLimits,
} from "../../assets/js/renderer/limits.js";

const statusEl = document.getElementById("status");
const outEl = document.getElementById("out");

/**
 * @param {string} text
 * @param {"ok"|"err"|""} [kind]
 */
function setStatus(text, kind = "") {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.classList.remove("lab-status--ok", "lab-status--err");
  if (kind === "ok") statusEl.classList.add("lab-status--ok");
  if (kind === "err") statusEl.classList.add("lab-status--err");
}

/**
 * @param {unknown} value
 */
function show(value) {
  if (outEl) outEl.textContent = JSON.stringify(value, null, 2);
}

function smallTree() {
  return {
    type: "Stack",
    children: [
      { type: "Title", props: { text: "Hello" } },
      { type: "TextContent", props: { text: "CSP lab" } },
    ],
  };
}

/** Deep recursive tree past maxDepth / maxNodes. */
function hostileTree(depth, breadth = 3) {
  if (depth <= 0) return { type: "Leaf" };
  return {
    type: "Stack",
    children: Array.from({ length: breadth }, () => hostileTree(depth - 1, breadth)),
  };
}

document.getElementById("run-ok")?.addEventListener("click", () => {
  const tree = smallTree();
  const stats = collectTreeStats(tree);
  const result = checkLimits(stats, DEFAULT_LIMITS);
  if (!result.ok) {
    setStatus("Unexpected limit failure on small tree.", "err");
    show(result);
    return;
  }
  setStatus("Small tree within limits.", "ok");
  show({ ok: true, stats, limits: DEFAULT_LIMITS });
});

document.getElementById("run-hostile")?.addEventListener("click", () => {
  const budget = { maxNodes: 100, maxDepth: 6 };
  const outcome = withLimits(
    (tracker) => {
      const tree = hostileTree(8, 4);
      const collected = collectTreeStats(tree, budget);
      Object.assign(tracker.stats, collected);
      const check = tracker.check();
      if (!check.ok) return check;
      return { ok: true, stats: collected };
    },
    budget,
  );

  if (outcome && outcome.ok === false) {
    setStatus("Hostile tree stopped by limits (expected).", "ok");
    show(outcome);
    return;
  }
  setStatus("Hostile tree was not stopped — investigate.", "err");
  show(outcome);
});

setStatus("Ready.");
