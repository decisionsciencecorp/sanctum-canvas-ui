/**
 * TagBlock — wrap of Tag items (props.tags array).
 */

import {
  applySurfaceStatus,
  asText,
  clearChildren,
  lifecycle,
  setClass,
} from "./shared.js";
import { Tag } from "./Tag.js";

function normalizeTags(props) {
  if (Array.isArray(props.tags)) return props.tags;
  if (Array.isArray(props.children)) return props.children;
  return [];
}

export const TagBlock = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "TagBlock");
    el.setAttribute("role", "list");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const size = asText(props.size) || "";
    setClass(el, "canvas-tag-block");
    if (size) el.setAttribute("data-size", size);

    clearChildren(el);
    const tags = normalizeTags(props);
    const { status } = applySurfaceStatus(el, doc, props, {
      emptyMessage: "No tags",
    });
    if (status === "loading" || status === "error") return;

    if (!tags.length || status === "empty") {
      applySurfaceStatus(el, doc, { ...props, status: "empty" }, {
        emptyMessage: asText(props.emptyMessage) || "No tags",
      });
      return;
    }

    for (const item of tags) {
      const tagProps =
        typeof item === "string"
          ? { text: item, size: size || "md" }
          : { size: size || undefined, ...item };
      const tagEl = Tag.create(tagProps, { document: doc });
      tagEl.setAttribute("role", "listitem");
      el.appendChild(tagEl);
    }
  },
  unmount(el, ctx) {
    for (const child of [...(el.childNodes ?? [])]) {
      if (child.nodeType === 1 && child.getAttribute?.("data-canvas-component") === "Tag") {
        Tag.destroy(child, ctx);
      }
    }
  },
});

export default TagBlock;
