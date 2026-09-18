/**
 * A4.1 / A4.2 — Keyed DOM reconciler with component lifecycle + stream-safe keys.
 *
 * `render(rootEl, nodeTree, ctx)` mounts/updates a vnode tree under rootEl.
 * Keys prefer explicit `key`, then OpenUI statement `id`+`type`, else index.
 * Same-key in-place updates preserve focus / input value / scroll / open.
 * Updates never wipe the root via `innerHTML`.
 */

/** @typedef {{ type: string, props?: Record<string, unknown>, children?: Array<VNode|string|number|null|undefined>, key?: string|number, id?: string|number }} VNode */

const META = new WeakMap();

/**
 * @param {Node} node
 * @returns {{ type?: string, key?: string|number, id?: string|number, isText?: boolean } | undefined}
 */
function getMeta(node) {
  return META.get(node);
}

/**
 * @param {Node} node
 * @param {{ type?: string, key?: string|number, id?: string|number, isText?: boolean }} meta
 */
function setMeta(node, meta) {
  META.set(node, meta);
}

/**
 * Stable child key: explicit key → statement id+type → index.
 * @param {unknown} child
 * @param {number} index
 * @returns {string|number}
 */
export function childKey(child, index) {
  if (child != null && typeof child === "object") {
    if ("key" in child && /** @type {VNode} */ (child).key != null) {
      return /** @type {VNode} */ (child).key;
    }
    const vnode = /** @type {VNode} */ (child);
    if (vnode.id != null && vnode.type != null) {
      return `${vnode.type}::${vnode.id}`;
    }
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
 * Skips `children` / `key` / `id`. Event handlers and `dangerouslySetInnerHTML` are ignored.
 * Does not set `innerHTML`.
 * @param {Element} el
 * @param {Record<string, unknown>} [props]
 */
function applyProps(el, props = {}) {
  for (const [name, value] of Object.entries(props)) {
    if (name === "children" || name === "key" || name === "id") continue;
    if (/^on/i.test(name)) continue;
    if (name === "dangerouslySetInnerHTML" || name === "innerHTML") continue;
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
    if (name === "value" && "value" in el) {
      // Live input value is restored via captureInteractiveState — avoid fighting typing.
      el.setAttribute("value", String(value));
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
 * @param {Element} root
 * @returns {{
 *   focused: Element | null,
 *   entries: Array<{
 *     el: Element,
 *     value?: string,
 *     selectionStart?: number | null,
 *     selectionEnd?: number | null,
 *     scrollTop?: number,
 *     scrollLeft?: number,
 *     open?: boolean,
 *   }>
 * }}
 */
export function captureInteractiveState(root) {
  /** @type {ReturnType<typeof captureInteractiveState>['entries']} */
  const entries = [];
  const doc = root.ownerDocument;
  const active =
    doc && "activeElement" in doc ? /** @type {Element | null} */ (doc.activeElement) : null;

  /** @param {Element} el */
  function visit(el) {
    /** @type {(typeof entries)[number]} */
    const entry = { el };
    let keep = false;

    const tag = String(el.tagName || "").toUpperCase();
    if (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      "value" in el
    ) {
      entry.value = /** @type {{ value?: string }} */ (el).value;
      if ("selectionStart" in el) {
        entry.selectionStart = /** @type {{ selectionStart?: number|null }} */ (el).selectionStart;
        entry.selectionEnd = /** @type {{ selectionEnd?: number|null }} */ (el).selectionEnd;
      }
      keep = true;
    }
    if ("scrollTop" in el) {
      entry.scrollTop = /** @type {{ scrollTop: number }} */ (el).scrollTop;
      entry.scrollLeft = /** @type {{ scrollLeft?: number }} */ (el).scrollLeft ?? 0;
      keep = true;
    }
    if (tag === "DETAILS" || "open" in el) {
      entry.open = Boolean(/** @type {{ open?: boolean }} */ (el).open);
      keep = true;
    }
    if (keep) entries.push(entry);

    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === 1) visit(/** @type {Element} */ (child));
    }
  }

  visit(root);

  let focused = null;
  if (active && active.nodeType === 1) {
    let n = /** @type {Node | null} */ (active);
    while (n) {
      if (n === root) {
        focused = /** @type {Element} */ (active);
        break;
      }
      n = n.parentNode;
    }
  }

  return { focused, entries };
}

/**
 * @param {{ focused: Element | null, entries: ReturnType<typeof captureInteractiveState>['entries'] }} snap
 */
export function restoreInteractiveState(snap) {
  for (const entry of snap.entries) {
    const el = entry.el;
    if (entry.value !== undefined && "value" in el) {
      /** @type {{ value: string }} */ (el).value = entry.value;
    }
    if (
      entry.selectionStart != null &&
      entry.selectionEnd != null &&
      "setSelectionRange" in el &&
      typeof /** @type {{ setSelectionRange?: Function }} */ (el).setSelectionRange === "function"
    ) {
      try {
        /** @type {{ setSelectionRange: Function }} */ (el).setSelectionRange(
          entry.selectionStart,
          entry.selectionEnd,
        );
      } catch {
        /* some input types reject selection */
      }
    } else {
      if (entry.selectionStart !== undefined && "selectionStart" in el) {
        /** @type {{ selectionStart: number|null }} */ (el).selectionStart = entry.selectionStart;
      }
      if (entry.selectionEnd !== undefined && "selectionEnd" in el) {
        /** @type {{ selectionEnd: number|null }} */ (el).selectionEnd = entry.selectionEnd;
      }
    }
    if (entry.scrollTop !== undefined && "scrollTop" in el) {
      /** @type {{ scrollTop: number }} */ (el).scrollTop = entry.scrollTop;
    }
    if (entry.scrollLeft !== undefined && "scrollLeft" in el) {
      /** @type {{ scrollLeft: number }} */ (el).scrollLeft = entry.scrollLeft;
    }
    if (entry.open !== undefined && ("open" in el || String(el.tagName).toUpperCase() === "DETAILS")) {
      /** @type {{ open: boolean }} */ (el).open = entry.open;
    }
  }
  if (snap.focused && typeof snap.focused.focus === "function") {
    snap.focused.focus();
  }
}

/**
 * @param {object} registry
 * @param {string} type
 * @returns {{ create: Function, update: Function, destroy: Function }}
 */
function resolveLifecycle(registry, type) {
  if (typeof registry.resolve === "function") {
    return registry.resolve(type);
  }
  if (typeof registry.get === "function") {
    const got = registry.get(type);
    if (typeof got === "function") {
      return { create: got, update() {}, destroy() {} };
    }
    if (got && typeof got.create === "function") {
      return {
        create: got.create,
        update: typeof got.update === "function" ? got.update : () => {},
        destroy: typeof got.destroy === "function" ? got.destroy : () => {},
      };
    }
  }
  throw new Error(`reconciler: cannot resolve component "${type}"`);
}

/**
 * @param {VNode} vnode
 * @param {Record<string, unknown>} ctx
 * @returns {Element}
 */
function createElementFromVNode(vnode, ctx) {
  const doc = ctx.document ?? globalThis.document;
  const registry = ctx.registry;
  if (!registry) {
    throw new Error("reconciler: ctx.registry required");
  }
  if (!doc?.createElement) {
    throw new Error("reconciler: ctx.document required");
  }

  const life = resolveLifecycle(registry, vnode.type);
  const el = life.create(vnode.props ?? {}, { ...ctx, document: doc });
  if (!el || el.nodeType !== 1) {
    throw new Error(`reconciler: create() for "${vnode.type}" must return an Element`);
  }
  applyProps(el, vnode.props ?? {});
  const key = vnode.key ?? (vnode.id != null ? `${vnode.type}::${vnode.id}` : undefined);
  setMeta(el, { type: vnode.type, key, id: vnode.id });
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
 * Depth-first: destroy children, then component.destroy, then onDispose.
 * @param {Node} node
 * @param {Record<string, unknown>} ctx
 */
function disposeTree(node, ctx) {
  if (node.nodeType === 1) {
    for (const child of Array.from(node.childNodes)) {
      disposeTree(child, ctx);
    }
    const meta = getMeta(node);
    const registry = ctx.registry;
    if (registry && meta?.type) {
      try {
        const life = resolveLifecycle(registry, meta.type);
        if (typeof life.destroy === "function") {
          life.destroy(/** @type {Element} */ (node), ctx);
        }
      } catch (err) {
        if (typeof ctx.reportError === "function") {
          ctx.reportError(err);
        }
      }
    }
  }
  if (typeof ctx.onDispose === "function") {
    ctx.onDispose(node);
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
      const el = /** @type {Element} */ (existing);
      const snap = captureInteractiveState(el);
      const registry = ctx.registry;
      if (registry) {
        const life = resolveLifecycle(registry, vnode.type);
        if (typeof life.update === "function") {
          life.update(el, vnode.props ?? {}, ctx);
        }
      }
      applyProps(el, vnode.props ?? {});
      setMeta(el, {
        type: vnode.type,
        key: vnode.key ?? key,
        id: vnode.id,
      });
      reconcileChildren(el, vnode.children ?? [], ctx);
      restoreInteractiveState(snap);
      kept.add(el);
      nextNodes.push(el);
    } else {
      nextNodes.push(
        createElementFromVNode(
          { ...vnode, key: vnode.key ?? key },
          ctx,
        ),
      );
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
 * Never clears via `innerHTML`.
 *
 * @param {Element} rootEl
 * @param {VNode|VNode[]|string|number|null|undefined} nodeTree
 * @param {Record<string, unknown>} [ctx]
 * @returns {Element} rootEl
 */
export function render(rootEl, nodeTree, ctx = {}) {
  if (!rootEl) throw new Error("render: rootEl required");
  if (typeof rootEl.innerHTML === "string") {
    // Guard: do not assign innerHTML for updates (property may exist on stubs).
  }
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
 * Dispose every child of rootEl (calls destroy + onDispose) and clear.
 * @param {Element} rootEl
 * @param {Record<string, unknown>} [ctx]
 */
export function unmount(rootEl, ctx = {}) {
  for (const child of liveChildren(rootEl)) {
    disposeTree(child, ctx);
    rootEl.removeChild(child);
  }
}
