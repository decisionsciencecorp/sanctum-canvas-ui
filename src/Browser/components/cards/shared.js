/**
 * Shared helpers for A6.10 card blocks (plain DOM + --canvas-* tokens).
 */

import { toCssUrl as defaultToCssUrl, safeUrl as defaultSafeUrl } from "../../security/urlPolicy.js";

/** @typedef {"ready" | "loading" | "empty" | "error" | "invalid"} SurfaceStatus */

/**
 * @param {Record<string, unknown>} [ctx]
 * @returns {Document}
 */
export function requireDocument(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("cards component: ctx.document required");
  }
  return doc;
}

/**
 * @param {Element} el
 * @param {string} className
 */
export function setClass(el, className) {
  el.setAttribute("class", String(className).trim());
}

/**
 * @param {Element} el
 * @param {string} name
 * @param {string | boolean | null | undefined} value
 */
export function setOrRemoveAttr(el, name, value) {
  if (value == null || value === false || value === "") {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, value === true ? "true" : String(value));
  }
}

/**
 * @param {Element} el
 */
export function clearChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/**
 * Whether the render context (or props) says the model is still streaming.
 * @param {Record<string, unknown>} [props]
 * @param {Record<string, unknown>} [ctx]
 * @returns {boolean}
 */
export function resolveIsStreaming(props = {}, ctx = {}) {
  if (props.isStreaming === true || props.streaming === true || props.partial === true) {
    return true;
  }
  if (props.isStreaming === false || props.streaming === false) return false;
  const stream = ctx.stream;
  if (stream && typeof stream === "object" && stream.isStreaming === true) {
    return true;
  }
  return false;
}

/**
 * Unwrap `{ type, props }` / `{ typeName, props }` item wrappers from the lang layer.
 * @param {unknown} raw
 * @returns {Record<string, unknown> | null}
 */
export function unwrapItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const obj = /** @type {Record<string, unknown>} */ (raw);
  if (obj.props && typeof obj.props === "object") {
    return /** @type {Record<string, unknown>} */ (obj.props);
  }
  return obj;
}

/**
 * Resolve a child node's component type name for homogeneous checks.
 * @param {unknown} node
 * @returns {string}
 */
export function nodeTypeName(node) {
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return "#text";
  if (typeof node !== "object") return "?";
  const o = /** @type {Record<string, unknown>} */ (node);
  if (typeof o.type === "string" && o.type !== "element") return o.type;
  if (typeof o.typeName === "string") return o.typeName;
  if (o.type === "element" && typeof o.typeName === "string") return o.typeName;
  return "?";
}

/**
 * Slot signature for one card item — used for homogeneous child validation.
 * @param {Record<string, unknown>} item
 * @param {string[]} slotKeys
 * @returns {string}
 */
export function itemStructureSignature(item, slotKeys) {
  return slotKeys
    .map((key) => {
      const val = item[key];
      if (val == null || val === false || val === "") return `${key}:∅`;
      if (Array.isArray(val)) {
        const types = val.map((n) => nodeTypeName(n) || "scalar").join(",");
        return `${key}:[${types}]`;
      }
      if (typeof val === "object") {
        return `${key}:${nodeTypeName(val) || "obj"}`;
      }
      return `${key}:scalar`;
    })
    .join("|");
}

/**
 * Keep only items matching the first non-empty structure signature.
 * Mixed invalid children are dropped (fail safely) — never rendered.
 *
 * @param {unknown[]} items
 * @param {{
 *   slotKeys: string[],
 *   minItems?: number,
 *   unwrap?: (raw: unknown) => Record<string, unknown> | null,
 * }} opts
 * @returns {{
 *   ok: boolean,
 *   items: Record<string, unknown>[],
 *   signature: string,
 *   dropped: number,
 *   reason: string | null,
 * }}
 */
export function enforceHomogeneousItems(items, opts) {
  const unwrap = opts.unwrap ?? unwrapItem;
  const slotKeys = opts.slotKeys;
  const minItems = opts.minItems ?? 2;

  /** @type {Record<string, unknown>[]} */
  const normalized = [];
  for (const raw of Array.isArray(items) ? items : []) {
    const item = unwrap(raw);
    if (item) normalized.push(item);
  }

  if (normalized.length === 0) {
    return {
      ok: false,
      items: [],
      signature: "",
      dropped: 0,
      reason: "empty",
    };
  }

  let signature = "";
  for (const item of normalized) {
    const sig = itemStructureSignature(item, slotKeys);
    if (sig && !sig.split("|").every((p) => p.endsWith(":∅"))) {
      signature = sig;
      break;
    }
  }
  if (!signature) {
    signature = itemStructureSignature(normalized[0], slotKeys);
  }

  /** @type {Record<string, unknown>[]} */
  const kept = [];
  let dropped = 0;
  for (const item of normalized) {
    if (itemStructureSignature(item, slotKeys) === signature) kept.push(item);
    else dropped += 1;
  }

  if (kept.length < minItems) {
    return {
      ok: false,
      items: [],
      signature,
      dropped: dropped + kept.length,
      reason: "below-min",
    };
  }

  return {
    ok: dropped === 0,
    items: kept,
    signature,
    dropped,
    reason: dropped > 0 ? "heterogeneous" : null,
  };
}

/**
 * Split n items into rows of at most maxPerRow (2 or 3).
 * @param {number} n
 * @param {2 | 3} maxPerRow
 * @returns {number[]}
 */
export function getRowConfiguration(n, maxPerRow) {
  if (n <= 0) return [];
  if (n === 1) return [1];

  if (maxPerRow === 2) {
    const fullRows = Math.floor(n / 2);
    const remainder = n % 2;
    /** @type {number[]} */
    const result = Array(fullRows).fill(2);
    if (remainder) result.push(1);
    return result;
  }

  if (n % 3 === 0) return Array(n / 3).fill(3);
  if (n % 3 === 2) {
    const threes = Math.floor(n / 3);
    /** @type {number[]} */
    const result = Array(threes).fill(3);
    result.splice(Math.ceil(result.length / 2), 0, 2);
    return result;
  }
  const threes = Math.floor((n - 4) / 3);
  /** @type {number[]} */
  const result = Array(Math.max(0, threes)).fill(3);
  return [...result, 2, 2];
}

/**
 * Enter/Space keyboard activation for role="button" card shells.
 * @param {() => void} onActivate
 * @returns {(event: KeyboardEvent) => void}
 */
export function cardKeyDownHandler(onActivate) {
  return (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault?.();
    onActivate();
  };
}

/**
 * Apply safe clickable-card semantics (button role + keyboard).
 * @param {Element} el
 * @param {{
 *   clickable: boolean,
 *   onActivate?: () => void,
 *   disabled?: boolean,
 * }} opts
 * @returns {() => void} disposer
 */
export function applyClickableCard(el, opts) {
  const prevKey = /** @type {any} */ (el).__canvasCardKey;
  const prevClick = /** @type {any} */ (el).__canvasCardClick;
  if (prevKey) el.removeEventListener("keydown", prevKey);
  if (prevClick) el.removeEventListener("click", prevClick);
  /** @type {any} */ (el).__canvasCardKey = null;
  /** @type {any} */ (el).__canvasCardClick = null;

  const enabled = opts.clickable && typeof opts.onActivate === "function" && !opts.disabled;
  if (!enabled) {
    el.removeAttribute("role");
    el.removeAttribute("tabindex");
    setOrRemoveAttr(el, "aria-disabled", null);
    el.classList?.remove?.("canvas-card-item--clickable");
    el.classList?.add?.("canvas-card-item--static");
    return () => {};
  }

  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  setOrRemoveAttr(el, "aria-disabled", null);
  el.classList?.add?.("canvas-card-item--clickable");
  el.classList?.remove?.("canvas-card-item--static");

  const onClick = () => opts.onActivate?.();
  const onKey = cardKeyDownHandler(onClick);
  el.addEventListener("click", onClick);
  el.addEventListener("keydown", onKey);
  /** @type {any} */ (el).__canvasCardClick = onClick;
  /** @type {any} */ (el).__canvasCardKey = onKey;

  return () => {
    el.removeEventListener("click", onClick);
    el.removeEventListener("keydown", onKey);
  };
}

/**
 * Resolve background image CSS via central URL policy.
 * @param {string | null | undefined} src
 * @param {Record<string, unknown>} [ctx]
 * @returns {string | undefined}
 */
export function resolveBackgroundCssUrl(src, ctx = {}) {
  const raw = asText(src);
  if (!raw) return undefined;
  const policy =
    ctx.urlPolicy && typeof ctx.urlPolicy.toCssUrl === "function"
      ? ctx.urlPolicy.toCssUrl
      : defaultToCssUrl;
  return policy(raw);
}

/**
 * Resolve link/image URL via central URL policy.
 * @param {string | null | undefined} url
 * @param {Record<string, unknown>} [ctx]
 * @returns {string | undefined}
 */
export function resolveSafeUrl(url, ctx = {}) {
  const raw = asText(url);
  if (!raw) return undefined;
  const policy =
    ctx.urlPolicy && typeof ctx.urlPolicy.safeUrl === "function"
      ? ctx.urlPolicy.safeUrl
      : defaultSafeUrl;
  return policy(raw);
}

/**
 * Build create/update/destroy lifecycle.
 * @param {{
 *   mount: (doc: Document, props: Record<string, unknown>, ctx: Record<string, unknown>) => Element,
 *   patch: (el: Element, props: Record<string, unknown>, ctx: Record<string, unknown>) => void,
 *   unmount?: (el: Element, ctx: Record<string, unknown>) => void,
 *   ownsChildren?: boolean,
 * }} impl
 */
export function lifecycle(impl) {
  return {
    create(props = {}, ctx = {}) {
      const doc = requireDocument(ctx);
      const el = impl.mount(doc, props, ctx);
      impl.patch(el, props, ctx);
      return el;
    },
    update(el, props = {}, ctx = {}) {
      impl.patch(el, props, ctx);
    },
    destroy(el, ctx = {}) {
      impl.unmount?.(el, ctx);
    },
    ownsChildren: impl.ownsChildren !== false,
  };
}

/**
 * Render a nested vnode via ctx.renderChildren, or a simple text fallback.
 * @param {Element} host
 * @param {unknown} node
 * @param {Record<string, unknown>} ctx
 * @param {Document} doc
 */
export function renderSlot(host, node, ctx, doc) {
  clearChildren(host);
  if (node == null || node === false) return;
  if (typeof node === "string" || typeof node === "number") {
    host.textContent = String(node);
    return;
  }
  if (typeof ctx.renderChildren === "function") {
    ctx.renderChildren(host, [node]);
    return;
  }
  // Fallback: flatten known prop shapes without a registry.
  const type = nodeTypeName(node);
  const props =
    node && typeof node === "object" && /** @type {any} */ (node).props
      ? /** @type {Record<string, unknown>} */ (/** @type {any} */ (node).props)
      : /** @type {Record<string, unknown>} */ (node);
  const span = doc.createElement("span");
  span.setAttribute("data-slot-type", type || "unknown");
  span.textContent =
    asText(props.title) ||
    asText(props.value) ||
    asText(props.body) ||
    asText(props.label) ||
    "";
  host.appendChild(span);
}

export { defaultToCssUrl, defaultSafeUrl };
