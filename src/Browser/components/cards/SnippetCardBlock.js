/**
 * A6.10 — SnippetCardBlock (lhs/rhs value cards, 2-per-row grid).
 */

import {
  applyClickableCard,
  asText,
  clearChildren,
  renderSlot,
  setClass,
  unwrapItem,
} from "./shared.js";
import { createCardBlock } from "./CardBlockLayout.js";

/**
 * @param {Record<string, unknown>} props
 * @returns {unknown[]}
 */
export function normalizeSnippetItems(props = {}) {
  if (Array.isArray(props.items)) return props.items;
  if (Array.isArray(props.children)) return props.children;
  return [];
}

function appendChevron(doc, host) {
  const chevron = doc.createElement("div");
  chevron.setAttribute("class", "canvas-value-card__chevron");
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "›";
  host.appendChild(chevron);
}

export const SnippetCardBlock = createCardBlock({
  componentName: "SnippetCardBlock",
  size: "small",
  cardType: "value-card",
  maxPerRow: 2,
  slotKeys: ["lhs", "rhs"],
  minItems: 2,
  normalizeItems: normalizeSnippetItems,
  renderItem(cell, item, _index, ctx, meta) {
    const doc = ctx.document ?? cell.ownerDocument;
    const card = doc.createElement("div");
    let cls = "canvas-value-card canvas-card-item";
    setClass(card, cls);
    cell.appendChild(card);

    const dispose = applyClickableCard(card, {
      clickable: meta.clickable,
      onActivate: meta.onActivate ?? undefined,
    });

    if (item.lhs != null) {
      const lhs = doc.createElement("div");
      lhs.setAttribute("class", "canvas-value-card__lhs");
      renderSlot(lhs, item.lhs, ctx, doc);
      card.appendChild(lhs);
    }

    const rhs = doc.createElement("div");
    rhs.setAttribute("class", "canvas-value-card__rhs");
    if (item.rhs != null) {
      const inner = doc.createElement("div");
      inner.setAttribute("class", "canvas-value-card__rhs-content");
      renderSlot(inner, item.rhs, ctx, doc);
      rhs.appendChild(inner);
    } else if (meta.clickable) {
      appendChevron(doc, rhs);
    }
    card.appendChild(rhs);

    if (asText(item.id)) card.setAttribute("data-item-id", asText(item.id));
    return dispose;
  },
});

/** Item-only lifecycle for registry completeness. */
export const SnippetCardItem = {
  create(props = {}, ctx = {}) {
    const doc = ctx.document ?? globalThis.document;
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "SnippetCardItem");
    this.update(el, props, ctx);
    return el;
  },
  update(el, props = {}, ctx = {}) {
    const item = unwrapItem(props) || props;
    clearChildren(el);
    setClass(el, "canvas-snippet-card-item");
    const doc = ctx.document ?? el.ownerDocument;
    if (item.lhs != null) {
      const lhs = doc.createElement("div");
      lhs.setAttribute("data-slot", "lhs");
      renderSlot(lhs, item.lhs, ctx, doc);
      el.appendChild(lhs);
    }
    if (item.rhs != null) {
      const rhs = doc.createElement("div");
      rhs.setAttribute("data-slot", "rhs");
      renderSlot(rhs, item.rhs, ctx, doc);
      el.appendChild(rhs);
    }
  },
  destroy() {},
  ownsChildren: true,
};

export default SnippetCardBlock;
