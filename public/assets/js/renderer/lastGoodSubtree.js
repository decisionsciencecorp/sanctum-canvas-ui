/**
 * A4.3 — Last-good subtree snapshots.
 *
 * Per-root-key retention of the last successfully rendered child tree.
 * On render failure or broken tail, callers restore this snapshot so the
 * visible UI stays intact and no tool side effects run from the failed pass.
 */

/** @typedef {{ text: string } | { tagName: string, attrs: [string, string][], children: SnapshotNode[] }} SnapshotNode */

/** @type {Map<string, SnapshotNode[]>} */
const SNAPSHOTS = new Map();

/**
 * Stable key for a render root. Prefer explicit `ctx.rootKey`.
 * @param {Element} rootEl
 * @param {Record<string, unknown>} [ctx]
 * @returns {string}
 */
export function getRootKey(rootEl, ctx = {}) {
  if (typeof ctx.rootKey === "string" && ctx.rootKey) return ctx.rootKey;
  if (rootEl && typeof rootEl.getAttribute === "function") {
    const attr = rootEl.getAttribute("data-openui-root");
    if (attr) return attr;
  }
  if (rootEl && rootEl.nodeId != null) return `node:${rootEl.nodeId}`;
  return "default";
}

/**
 * @param {Node} node
 * @returns {SnapshotNode}
 */
function serializeNode(node) {
  if (node.nodeType === 3) {
    return { text: String(node.textContent ?? "") };
  }

  /** @type {[string, string][]} */
  const attrs = [];
  if (Array.isArray(node.attributes)) {
    for (const a of node.attributes) {
      attrs.push([String(a.name), String(a.value)]);
    }
  } else if (node._attrs instanceof Map) {
    for (const [k, v] of node._attrs) {
      attrs.push([String(k), String(v)]);
    }
  } else if (typeof node.getAttributeNames === "function") {
    for (const name of node.getAttributeNames()) {
      attrs.push([name, String(node.getAttribute(name) ?? "")]);
    }
  }

  const tagName = String(node.tagName || "div").toLowerCase();
  const children = Array.from(node.childNodes ?? []).map(serializeNode);
  return { tagName, attrs, children };
}

/**
 * @param {Document} doc
 * @param {SnapshotNode} snap
 * @returns {Node}
 */
function hydrateNode(doc, snap) {
  if ("text" in snap) {
    return doc.createTextNode(snap.text);
  }
  const el = doc.createElement(snap.tagName || "div");
  for (const [name, value] of snap.attrs ?? []) {
    el.setAttribute(name, value);
  }
  for (const child of snap.children ?? []) {
    el.appendChild(hydrateNode(doc, child));
  }
  return el;
}

/**
 * @param {string} rootKey
 * @returns {boolean}
 */
export function hasLastGood(rootKey) {
  return SNAPSHOTS.has(rootKey);
}

/**
 * Capture current children of rootEl as the last-good snapshot for rootKey.
 * @param {string} rootKey
 * @param {Element} rootEl
 */
export function captureLastGood(rootKey, rootEl) {
  if (!rootKey) throw new Error("captureLastGood: rootKey required");
  if (!rootEl) throw new Error("captureLastGood: rootEl required");
  const children = Array.from(rootEl.childNodes ?? []).map(serializeNode);
  SNAPSHOTS.set(rootKey, children);
}

/**
 * Replace rootEl children with the last-good snapshot, if any.
 * @param {string} rootKey
 * @param {Element} rootEl
 * @param {Record<string, unknown>} [ctx]
 * @returns {boolean} true when a snapshot was restored
 */
export function restoreLastGood(rootKey, rootEl, ctx = {}) {
  const snap = SNAPSHOTS.get(rootKey);
  if (!snap) return false;
  const doc = ctx.document ?? rootEl.ownerDocument ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("restoreLastGood: document required");
  }

  while (rootEl.firstChild) {
    rootEl.removeChild(rootEl.firstChild);
  }
  for (const child of snap) {
    rootEl.appendChild(hydrateNode(doc, child));
  }
  return true;
}

/**
 * Drop a stored snapshot (does not mutate the live DOM).
 * @param {string} rootKey
 */
export function clearLastGood(rootKey) {
  SNAPSHOTS.delete(rootKey);
}

/**
 * Test / isolation helper — wipe all snapshots.
 */
export function clearAllLastGood() {
  SNAPSHOTS.clear();
}
