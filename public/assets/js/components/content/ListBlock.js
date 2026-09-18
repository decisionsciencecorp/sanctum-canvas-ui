/**
 * A5.3 — ListBlock container (number / image / icon variants).
 */

import {
  asText,
  clearChildren,
  lifecycle,
  setClass,
} from "./shared.js";
import { ListItem } from "./ListItem.js";

const VARIANTS = new Set(["number", "image", "icon"]);
const SIZES = new Set(["default", "small"]);

/**
 * Normalize items from props.items or vnode-like children.
 * @param {Record<string, unknown>} props
 * @returns {Record<string, unknown>[]}
 */
export function normalizeListItems(props = {}) {
  if (Array.isArray(props.items)) {
    return props.items
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        // Lang materializer may wrap as { type, props }
        if (item.props && typeof item.props === "object") {
          return /** @type {Record<string, unknown>} */ (item.props);
        }
        return /** @type {Record<string, unknown>} */ (item);
      })
      .filter(Boolean);
  }
  return [];
}

export const ListBlock = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "ListBlock");
    el.setAttribute("role", "list");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const variant = VARIANTS.has(asText(props.variant))
      ? asText(props.variant)
      : "number";
    const size = SIZES.has(asText(props.size)) ? asText(props.size) : "default";
    const items = normalizeListItems(props);
    const listHasSubtitle = items.some((it) => !!asText(it.subtitle));

    let cls = "canvas-list-block";
    if (size === "small") cls += " canvas-list-block--small";
    setClass(el, cls);
    el.setAttribute("data-variant", variant);
    el.setAttribute("data-size", size);
    el.setAttribute("data-item-count", String(items.length));

    clearChildren(el);

    if (typeof ctx.renderChildren === "function" && Array.isArray(props.children) && props.children.length) {
      // Reconciler-owned children path (typed ListItem vnodes).
      const enhanced = props.children.map((child, index) => {
        if (!child || typeof child !== "object") return child;
        const c = /** @type {Record<string, unknown>} */ (child);
        const childProps =
          c.props && typeof c.props === "object"
            ? /** @type {Record<string, unknown>} */ (c.props)
            : {};
        return {
          ...c,
          props: {
            ...childProps,
            variant,
            size,
            listHasSubtitle,
            index: typeof childProps.index === "number" ? childProps.index : index,
          },
        };
      });
      ctx.renderChildren(el, enhanced);
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const itemProps = {
        ...items[i],
        variant,
        size,
        listHasSubtitle,
        index: i,
      };
      const child = ListItem.create(itemProps, ctx);
      child.setAttribute("role", "listitem");
      el.appendChild(child);
    }
  },
});

export default ListBlock;
