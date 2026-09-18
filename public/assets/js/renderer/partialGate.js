/**
 * A4.3 — Partial-node gates.
 *
 * Provisional / streaming-incomplete nodes are marked non-interactive so
 * actions, forms, and tool invokes cannot fire until the node is complete.
 */

export const PARTIAL_ATTR = "data-openui-partial";
export const PARTIAL_SKELETON_TYPE = "OpenUIPartialSkeleton";

/**
 * @param {unknown} nodeOrCtx
 * @returns {boolean}
 */
export function isPartial(nodeOrCtx) {
  if (nodeOrCtx == null) return false;

  if (typeof nodeOrCtx === "object") {
    if (nodeOrCtx.partial === true) return true;
    if (nodeOrCtx.node?.partial === true) return true;

    if (typeof nodeOrCtx.getAttribute === "function") {
      const v = nodeOrCtx.getAttribute(PARTIAL_ATTR);
      if (v === "1" || v === "" || v === "true") return true;
    }

    if (
      typeof nodeOrCtx.nodeType === "number" &&
      nodeOrCtx.nodeType === 1 &&
      typeof nodeOrCtx.hasAttribute === "function" &&
      nodeOrCtx.hasAttribute(PARTIAL_ATTR)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Mark a DOM element as partial / incomplete.
 * @param {Element} el
 * @param {boolean} [partial=true]
 * @returns {Element}
 */
export function markPartial(el, partial = true) {
  if (!el || typeof el.setAttribute !== "function") {
    throw new Error("markPartial: element required");
  }
  if (partial) {
    el.setAttribute(PARTIAL_ATTR, "1");
    el.setAttribute("aria-busy", "true");
  } else {
    el.removeAttribute(PARTIAL_ATTR);
    el.removeAttribute("aria-busy");
  }
  return el;
}

/**
 * Non-interactive skeleton for a provisional node.
 * @param {Document} doc
 * @param {{ typeName?: string }} [opts]
 * @returns {Element}
 */
export function createPartialSkeleton(doc, opts = {}) {
  if (!doc?.createElement) {
    throw new Error("createPartialSkeleton: document required");
  }
  const el = doc.createElement("div");
  markPartial(el, true);
  if (opts.typeName) {
    el.setAttribute("data-openui-partial-of", String(opts.typeName));
  }
  return el;
}

/**
 * Registry render fn for {@link PARTIAL_SKELETON_TYPE}.
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 * @returns {Element}
 */
export function renderPartialSkeleton(props = {}, ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  return createPartialSkeleton(doc, {
    typeName: typeof props.typeName === "string" ? props.typeName : undefined,
  });
}

/**
 * True when actions / forms / tool invokes may proceed.
 * Returns false when partial; throws when `opts.throw` is true.
 *
 * @param {unknown} nodeOrCtx — vnode, DOM node, or render/action ctx
 * @param {{ throw?: boolean }} [opts]
 * @returns {boolean}
 */
export function assertInteractive(nodeOrCtx, opts = {}) {
  if (!isPartial(nodeOrCtx)) return true;
  if (opts.throw) {
    throw new Error("partial-gate: node is incomplete; interactions blocked");
  }
  return false;
}

/**
 * Replace partial vnodes with a non-interactive skeleton vnode.
 * Complete nodes are returned unchanged (children walked recursively).
 *
 * @param {unknown} nodeTree
 * @returns {unknown}
 */
export function mapPartialToSkeleton(nodeTree) {
  if (nodeTree == null || nodeTree === false) return nodeTree;
  if (Array.isArray(nodeTree)) {
    return nodeTree.map((c) => mapPartialToSkeleton(c));
  }
  if (typeof nodeTree === "string" || typeof nodeTree === "number") {
    return nodeTree;
  }
  if (typeof nodeTree !== "object" || !("type" in nodeTree)) {
    return nodeTree;
  }

  /** @type {{ type: string, props?: Record<string, unknown>, children?: unknown[], key?: string|number, partial?: boolean }} */
  const vnode = nodeTree;
  if (vnode.partial === true) {
    return {
      type: PARTIAL_SKELETON_TYPE,
      key: vnode.key,
      props: {
        typeName: vnode.type,
        ...(vnode.props && typeof vnode.props === "object" ? {} : {}),
      },
      children: [],
      partial: true,
    };
  }

  const children = vnode.children;
  if (!Array.isArray(children) || children.length === 0) {
    return vnode;
  }
  return {
    ...vnode,
    children: children.map((c) => mapPartialToSkeleton(c)),
  };
}
