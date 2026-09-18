/**
 * A6.10 — CompositeCardBlock (header / body stack / footer). No charts.
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
export function normalizeCompositeItems(props = {}) {
  if (Array.isArray(props.items)) return props.items;
  if (Array.isArray(props.children)) return props.children;
  return [];
}

/**
 * @param {Element} card
 * @param {Record<string, unknown>} item
 * @param {Record<string, unknown>} ctx
 * @param {{ clickable: boolean, onActivate: (() => void) | null }} meta
 * @returns {() => void}
 */
export function renderCompositeCard(card, item, ctx, meta) {
  const doc = ctx.document ?? card.ownerDocument;
  setClass(card, "canvas-composite-card canvas-card-item");

  const dispose = applyClickableCard(card, {
    clickable: meta.clickable,
    onActivate: meta.onActivate ?? undefined,
  });

  clearChildren(card);

  if (item.header != null) {
    const header = doc.createElement("div");
    header.setAttribute("class", "canvas-composite-card__header");
    renderSlot(header, item.header, ctx, doc);
    card.appendChild(header);
  }

  const bodyItems = Array.isArray(item.body) ? item.body : [];
  if (bodyItems.length) {
    const body = doc.createElement("div");
    body.setAttribute("class", "canvas-composite-card__body");
    for (const node of bodyItems) {
      const slot = doc.createElement("div");
      slot.setAttribute("class", "canvas-composite-card__body-item");
      renderSlot(slot, node, ctx, doc);
      body.appendChild(slot);
    }
    card.appendChild(body);
  }

  const footer =
    item.footer && typeof item.footer === "object"
      ? /** @type {Record<string, unknown>} */ (item.footer)
      : null;
  if (footer && (footer.price != null || footer.button != null)) {
    const foot = doc.createElement("div");
    foot.setAttribute("class", "canvas-composite-card__footer");
    const content = doc.createElement("div");
    content.setAttribute("class", "canvas-composite-card__footer-content");
    if (footer.price != null) {
      const price = doc.createElement("div");
      price.setAttribute("class", "canvas-composite-card__price");
      renderSlot(price, footer.price, ctx, doc);
      content.appendChild(price);
    }
    if (footer.button != null) {
      const btn = doc.createElement("div");
      btn.setAttribute("class", "canvas-composite-card__button");
      // Presentation-only: no form/button action wiring in A6.10 (forms are A6.1–A6.4).
      renderSlot(btn, footer.button, ctx, doc);
      content.appendChild(btn);
    }
    foot.appendChild(content);
    card.appendChild(foot);
  }

  if (asText(item.id)) card.setAttribute("data-item-id", asText(item.id));
  return dispose;
}

export const CompositeCardBlock = createCardBlock({
  componentName: "CompositeCardBlock",
  size: "medium",
  cardType: "composite-card",
  maxPerRow: 2,
  slotKeys: ["header", "body", "footer"],
  minItems: 2,
  normalizeItems: normalizeCompositeItems,
  renderItem(cell, item, _index, ctx, meta) {
    const doc = ctx.document ?? cell.ownerDocument;
    const wrap = doc.createElement("div");
    wrap.setAttribute("class", "canvas-composite-card__wrapper");
    const card = doc.createElement("div");
    wrap.appendChild(card);
    cell.appendChild(wrap);
    return renderCompositeCard(card, item, ctx, meta);
  },
});

export const CompositeCardItem = {
  create(props = {}, ctx = {}) {
    const doc = ctx.document ?? globalThis.document;
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "CompositeCardItem");
    this.update(el, props, ctx);
    return el;
  },
  update(el, props = {}, ctx = {}) {
    const item = unwrapItem(props) || props;
    renderCompositeCard(el, item, ctx, { clickable: false, onActivate: null });
  },
  destroy() {},
  ownsChildren: true,
};

export default CompositeCardBlock;
