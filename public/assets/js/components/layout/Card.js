/**
 * A5.1 — Chat root Card (plain DOM).
 *
 * Regions (progressive-stream safe):
 *   - header  → leading CardHeader child (A5.2) or [data-canvas-region=header]
 *   - content → CardContent sub-root (registered here)
 *   - source  → CardSources sub-root / props.sources strip
 *
 * Card itself is a flex column shell (variant + Stack flex props). Children
 * land via props.children (renderChildren) or vnode.children (reconciler).
 */

import {
  isPartial,
  markPartial,
  createPartialSkeleton,
} from "../../renderer/partialGate.js";
import {
  applyFlexDom,
  propsChildren,
  renderPropsChildren,
} from "./flexProps.js";
import { sourcesToChildren } from "./CardSources.js";

/** @type {Set<string>} */
const VARIANTS = new Set(["card", "sunk", "clear"]);

/**
 * @param {Record<string, unknown>} [props]
 */
function normalizeVariant(props = {}) {
  const v = props.variant;
  if (typeof v === "string" && VARIANTS.has(v)) return v;
  return "card";
}

/**
 * Partition children into header / content / sources region vnodes when
 * props.children is an array. Pass-through when already region-typed.
 * @param {unknown[]} children
 * @param {Record<string, unknown>} props
 * @returns {unknown[]}
 */
export function partitionCardChildren(children, props = {}) {
  /** @type {unknown[]} */
  const headers = [];
  /** @type {unknown[]} */
  const sourcesNodes = [];
  /** @type {unknown[]} */
  const rest = [];

  for (const child of children) {
    if (child == null || child === false) continue;
    if (typeof child === "object" && child !== null && "type" in child) {
      const t = /** @type {{ type: string }} */ (child).type;
      if (t === "CardHeader" || t === "InlineHeader") {
        headers.push(child);
        continue;
      }
      if (t === "CardSources" || t === "Sources") {
        sourcesNodes.push(child);
        continue;
      }
      if (t === "CardContent") {
        rest.push(child);
        continue;
      }
    }
    rest.push(child);
  }

  /** @type {unknown[]} */
  const out = [];

  if (headers.length === 1) {
    out.push(headers[0]);
  } else if (headers.length > 1) {
    out.push({
      type: "CardContent",
      key: "__card-header-wrap",
      props: { "data-canvas-region": "header" },
      children: headers,
    });
  }

  const hasContentRoot = rest.some(
    (c) =>
      c &&
      typeof c === "object" &&
      /** @type {{ type?: string }} */ (c).type === "CardContent",
  );
  if (hasContentRoot || rest.length === 0) {
    out.push(...rest);
  } else {
    out.push({
      type: "CardContent",
      key: "__card-content",
      props: {},
      children: rest,
    });
  }

  const sourcesProp = Array.isArray(props.sources) ? props.sources : null;
  if (sourcesNodes.length) {
    out.push(...sourcesNodes);
  } else if (sourcesProp && sourcesProp.length) {
    const sourceChildren = sourcesToChildren({ sources: sourcesProp }) ?? [];
    out.push({
      type: "CardSources",
      key: "__card-sources",
      props: { sources: sourcesProp },
      children: sourceChildren,
    });
  }

  return out;
}

/**
 * @param {Record<string, unknown>} props
 */
function isCardPartial(props) {
  return props?.partial === true || isPartial(props);
}

/**
 * @param {Element} el
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
function syncPartial(el, props, ctx) {
  const partial = isCardPartial(props);
  markPartial(el, partial);
  const doc = ctx.document ?? el.ownerDocument ?? globalThis.document;
  const existing = [...el.childNodes].find(
    (n) =>
      n.nodeType === 1 &&
      /** @type {Element} */ (n).getAttribute?.("data-openui-partial-of") ===
        "Card",
  );
  if (partial && !propsChildren(props) && !existing && doc?.createElement) {
    el.appendChild(createPartialSkeleton(doc, { typeName: "Card" }));
  } else if (!partial && existing && existing.parentNode === el) {
    el.removeChild(existing);
  }
}

/**
 * @param {Element} el
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
function syncCard(el, props, ctx) {
  const variant = normalizeVariant(props);
  applyFlexDom(el, props, {
    baseClass: "canvas-card",
    extraClasses: [`canvas-card--${variant}`, "canvas-card--full"],
  });
  el.setAttribute("data-variant", variant);
  el.setAttribute("data-canvas-component", "Card");
  syncPartial(el, props, ctx);

  const kids = propsChildren(props);
  if (kids && typeof ctx.renderChildren === "function") {
    ctx.renderChildren(el, partitionCardChildren(kids, props));
  } else if (
    !kids &&
    Array.isArray(props.sources) &&
    props.sources.length &&
    typeof ctx.renderChildren === "function"
  ) {
    // Sources-only update while vnode.children owned by reconciler — skip.
  }
}

/**
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 * @returns {Element}
 */
function create(props = {}, ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("Card.create: ctx.document required");
  }
  const el = doc.createElement("article");
  el.setAttribute("role", "group");
  syncCard(el, props, ctx);
  return el;
}

/**
 * @param {Element} el
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
function update(el, props = {}, ctx = {}) {
  syncCard(el, props, ctx);
}

/**
 * @param {Element} _el
 * @param {Record<string, unknown>} _ctx
 */
function destroy(_el, _ctx = {}) {}

export const Card = { create, update, destroy };
export default Card;
