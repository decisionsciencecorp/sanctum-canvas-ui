/**
 * A4 — Keyed DOM reconciler.
 *
 * `render(rootEl, nodeTree, ctx)` mounts/updates a vnode tree under rootEl.
 * Children match by `key` (or index when key is absent). Removed nodes are
 * disposed via `ctx.onDispose?.(el)` before removal.
 */

/** @typedef {{ type: string, props?: Record<string, unknown>, children?: Array<VNode|string|number|null|undefined>, key?: string|number }} VNode */

const META = new WeakMap();

/**
 * @param {Node} node
 * @returns {{ type?: string, key?: string|number, isText?: boolean } | undefined}
 */
function getMeta(node) {
  return META.get(node);
}

/**
 * @param {Node} node
 * @param {{ type?: string, key?: string|number, isText?: boolean }} meta
 */
function setMeta(node, meta) {
  META.set(node, meta);
}

/**
 * @param {unknown} child
 * @param {number} index
 * @returns {string|number}
 */
function childKey(child, index) {
  if (child != null && typeof child === "object" && "key" in child && child.key != null) {
    return child.key;
  }
  return index;
}

/**
 * @param {ParentNode} parent
 * @returns {Node[]}
 */
function liveChildren(parent) {
  return Array.from(parent.childNodes);
}

/**
 * Apply a flat prop bag onto an element (string/number/boolean attrs).
 * Skips `children` / `key`. Event handlers and `dangerouslySetInnerHTML` are ignored.
 * @param {Element} el
 * @param {Record<string, unknown>} [props]
 */
function applyProps(el, props = {}) {
  for (const [name, value] of Object.entries(props)) {
    if (name === "children" || name === "key") continue;
    if (/^on/i.test(name)) continue;
    if (name === "dangerouslySetInnerHTML") continue;
    if (value == null || value === false) {
      el.removeAttribute(name);
      continue;
    }
    if (name === "className") {
      el.setAttribute("class", String(value));
      continue;
    }
    if (name === "textContent") {
      el.textContent = String(value);
      continue;
    }
    if (typeof value === "boolean") {
      if (value) el.setAttribute(name, "");
      else el.removeAttribute(name);
      continue;
    }
    el.setAttribute(name, String(value));
  }
}

/**
 * @param {VNode} vnode
 * @param {Record<string, unknown>} ctx
 * @returns {Element}
 */
function createElementFromVNode(vnode, ctx) {
  const doc = ctx.document ?? globalThis.document;
  const registry = ctx.registry;
  if (!registry || typeof registry.get !== "function") {
    throw new Error("reconciler: ctx.registry required");
  }
  if (!doc?.createElement) {
    throw new Error("reconciler: ctx.document required");
  }

  const renderFn = registry.get(vnode.type);
  const el = renderFn(vnode.props ?? {}, { ...ctx, document: doc });
  if (!el || el.nodeType !== 1) {
    throw new Error(`reconciler: renderer for "${vnode.type}" must return an Element`);
  }
  applyProps(el, vnode.props ?? {});
  setMeta(el, { type: vnode.type, key: vnode.key });
  reconcileChildren(el, vnode.children ?? [], ctx);
  return el;
}

/**
 * @param {string|number} text
 * @param {Record<string, unknown>} ctx
 * @returns {Text}
 */
function createText(text, ctx) {
  const doc = ctx.document ?? globalThis.document;
  const node = doc.createTextNode(String(text));
  setMeta(node, { isText: true, key: undefined });
  return node;
}

/**
 * @param {Node} node
 * @param {Record<string, unknown>} ctx
 */
function disposeTree(node, ctx) {
  if (typeof ctx.onDispose === "function") {
    ctx.onDispose(node);
  }
  if (node.nodeType === 1) {
    for (const child of Array.from(node.childNodes)) {
      disposeTree(child, ctx);
    }
  }
}

/**
 * @param {ParentNode} parentEl
 * @param {Array<VNode|string|number|null|undefined>} nextChildren
 * @param {Record<string, unknown>} ctx
 */
export function reconcileChildren(parentEl, nextChildren, ctx = {}) {
  const normalized = (nextChildren ?? []).filter((c) => c != null && c !== false);
  const prev = liveChildren(parentEl);

  /** @type {Map<string|number, Node>} */
  const prevByKey = new Map();
  for (let i = 0; i < prev.length; i++) {
    const node = prev[i];
    const meta = getMeta(node);
    const key = meta?.key != null ? meta.key : i;
    prevByKey.set(key, node);
  }

  /** @type {Set<Node>} */
  const kept = new Set();
  /** @type {Node[]} */
  const nextNodes = [];

  for (let i = 0; i < normalized.length; i++) {
    const child = normalized[i];
    const key = childKey(child, i);

    if (typeof child === "string" || typeof child === "number") {
      const existing = prevByKey.get(key);
      if (existing && existing.nodeType === 3) {
        if (existing.textContent !== String(child)) {
          existing.textContent = String(child);
        }
        setMeta(existing, { isText: true, key });
        kept.add(existing);
        nextNodes.push(existing);
      } else {
        nextNodes.push(createText(child, ctx));
      }
      continue;
    }

    if (typeof child !== "object" || !child.type) {
      continue;
    }

    /** @type {VNode} */
    const vnode = child;
    const existing = prevByKey.get(key);
    const existingMeta = existing ? getMeta(existing) : undefined;

    if (
      existing &&
      existing.nodeType === 1 &&
      existingMeta &&
      existingMeta.type === vnode.type
    ) {
      applyProps(/** @type {Element} */ (existing), vnode.props ?? {});
      setMeta(existing, { type: vnode.type, key: vnode.key ?? key });
      reconcileChildren(/** @type {Element} */ (existing), vnode.children ?? [], ctx);
      kept.add(existing);
      nextNodes.push(existing);
    } else {
      if (existing) {
        // type mismatch or wrong node kind — will be disposed if not kept
      }
      nextNodes.push(createElementFromVNode({ ...vnode, key: vnode.key ?? key }, ctx));
    }
  }

  for (const node of prev) {
    if (!kept.has(node) && !nextNodes.includes(node)) {
      disposeTree(node, ctx);
      if (node.parentNode === parentEl) {
        parentEl.removeChild(node);
      }
    }
  }

  let anchor = parentEl.firstChild;
  for (const node of nextNodes) {
    if (anchor !== node) {
      parentEl.insertBefore(node, anchor);
    }
    anchor = node.nextSibling;
  }
}

/**
 * Mount or update `nodeTree` as the sole content of `rootEl`.
 *
 * @param {Element} rootEl
 * @param {VNode|VNode[]|string|number|null|undefined} nodeTree
 * @param {Record<string, unknown>} [ctx]
 * @returns {Element} rootEl
 */
export function render(rootEl, nodeTree, ctx = {}) {
  if (!rootEl) throw new Error("render: rootEl required");
  const children =
    nodeTree == null
      ? []
      : Array.isArray(nodeTree)
        ? nodeTree
        : [nodeTree];
  reconcileChildren(rootEl, children, ctx);
  return rootEl;
}

/**
 * Dispose every child of rootEl (calls onDispose) and clear.
 * @param {Element} rootEl
 * @param {Record<string, unknown>} [ctx]
 */
export function unmount(rootEl, ctx = {}) {
  for (const child of liveChildren(rootEl)) {
    disposeTree(child, ctx);
    rootEl.removeChild(child);
  }
}
