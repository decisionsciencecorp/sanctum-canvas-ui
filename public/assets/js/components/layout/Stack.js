/**
 * A5.1 — Dashboard root Stack (plain DOM flex layout).
 *
 * Lifecycle: create / update / destroy. Layout via CSS classes + data-* attrs
 * mapped to --canvas-space-* tokens. Children: props.children via
 * ctx.renderChildren, or vnode.children via the A4 reconciler.
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

/**
 * @param {Record<string, unknown>} props
 * @returns {boolean}
 */
function shouldShowPartialPlaceholder(props) {
  if (props?.partial === true || isPartial(props)) return true;
  // Incomplete stream: required children missing while host marks streaming.
  if (propsChildren(props) == null && props?.__awaitingChildren === true) {
    return true;
  }
  return false;
}

/**
 * @param {Element} el
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
function syncPartial(el, props, ctx) {
  const partial = shouldShowPartialPlaceholder(props);
  markPartial(el, partial);

  const doc = ctx.document ?? el.ownerDocument ?? globalThis.document;
  const existing = [...el.childNodes].find(
    (n) =>
      n.nodeType === 1 &&
      /** @type {Element} */ (n).getAttribute?.("data-openui-partial-of") ===
        "Stack",
  );

  if (partial && !propsChildren(props) && !existing) {
    // Placeholder only when this create/update owns children via props
    // and none are present yet — reconciler path may still append kids.
    if (doc?.createElement) {
      el.appendChild(createPartialSkeleton(doc, { typeName: "Stack" }));
    }
  } else if (!partial && existing && existing.parentNode === el) {
    el.removeChild(existing);
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
    throw new Error("Stack.create: ctx.document required");
  }
  const el = doc.createElement("div");
  el.setAttribute("data-canvas-component", "Stack");
  applyFlexDom(el, props, { baseClass: "canvas-stack" });
  syncPartial(el, props, ctx);
  renderPropsChildren(el, props, ctx);
  return el;
}

/**
 * @param {Element} el
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
function update(el, props = {}, ctx = {}) {
  applyFlexDom(el, props, { baseClass: "canvas-stack" });
  syncPartial(el, props, ctx);
  renderPropsChildren(el, props, ctx);
}

/**
 * @param {Element} _el
 * @param {Record<string, unknown>} _ctx
 */
function destroy(_el, _ctx = {}) {
  // No listeners / timers on Stack.
}

export const Stack = { create, update, destroy };
export default Stack;
