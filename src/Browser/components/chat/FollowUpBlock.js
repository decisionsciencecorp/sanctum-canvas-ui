/**
 * A5.3 — FollowUpBlock (chat-only related queries strip).
 */

import {
  asText,
  clearChildren,
  lifecycle,
  setClass,
} from "../content/shared.js";
import { FollowUpItem } from "./FollowUpItem.js";

/**
 * @param {Record<string, unknown>} props
 * @returns {Record<string, unknown>[]}
 */
export function normalizeFollowUpItems(props = {}) {
  if (!Array.isArray(props.items)) return [];
  return props.items
    .map((item) => {
      if (typeof item === "string") return { text: item };
      if (!item || typeof item !== "object") return null;
      if (item.props && typeof item.props === "object") {
        return /** @type {Record<string, unknown>} */ (item.props);
      }
      return /** @type {Record<string, unknown>} */ (item);
    })
    .filter(Boolean);
}

export const FollowUpBlock = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "FollowUpBlock");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const items = normalizeFollowUpItems(props);
    setClass(el, "canvas-follow-up-block");
    el.setAttribute("data-item-count", String(items.length));

    clearChildren(el);

    const header = doc.createElement("div");
    header.setAttribute("class", "canvas-follow-up-block__header");
    header.textContent = asText(props.heading) || "Related Queries";
    el.appendChild(header);

    if (typeof ctx.renderChildren === "function" && Array.isArray(props.children) && props.children.length) {
      ctx.renderChildren(el, props.children);
      return;
    }

    for (const item of items) {
      el.appendChild(FollowUpItem.create(item, ctx));
    }
  },
});

export default FollowUpBlock;
