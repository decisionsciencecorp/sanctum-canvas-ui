/**
 * A5.1 — Card content region (sub-root).
 * Wraps main body children inside a chat Card.
 */

import { markPartial, isPartial } from "../../renderer/partialGate.js";
import { renderPropsChildren } from "./flexProps.js";

/**
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 * @returns {Element}
 */
function create(props = {}, ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("CardContent.create: ctx.document required");
  }
  const el = doc.createElement("div");
  el.setAttribute("class", "canvas-card__content");
  el.setAttribute("data-canvas-region", "content");
  el.setAttribute("data-canvas-component", "CardContent");
  markPartial(el, props?.partial === true || isPartial(props));
  renderPropsChildren(el, props, ctx);
  return el;
}

/**
 * @param {Element} el
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
function update(el, props = {}, ctx = {}) {
  el.setAttribute("class", "canvas-card__content");
  el.setAttribute("data-canvas-region", "content");
  markPartial(el, props?.partial === true || isPartial(props));
  renderPropsChildren(el, props, ctx);
}

function destroy() {}

export const CardContent = { create, update, destroy };
export default CardContent;
