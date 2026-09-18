/**
 * A6.10 — VisualCardBlock (photo-first medium cards).
 */

import {
  applyClickableCard,
  asText,
  clearChildren,
  renderSlot,
  resolveBackgroundCssUrl,
  setClass,
  unwrapItem,
} from "./shared.js";
import { createCardBlock } from "./CardBlockLayout.js";

/**
 * @param {Record<string, unknown>} props
 * @returns {unknown[]}
 */
export function normalizeVisualItems(props = {}) {
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
export function renderVisualCard(card, item, ctx, meta) {
  const doc = ctx.document ?? card.ownerDocument;
  const bgCss = resolveBackgroundCssUrl(item.bgImageSrc, ctx);

  setClass(card, "canvas-visual-first-card canvas-card-item");
  if (bgCss) {
    card.setAttribute("style", `--canvas-visual-card-image: ${bgCss}`);
    const alt = asText(item.bgImageAlt);
    if (alt) card.setAttribute("aria-label", alt);
  } else {
    card.removeAttribute("style");
    card.removeAttribute("aria-label");
  }

  const dispose = applyClickableCard(card, {
    clickable: meta.clickable,
    onActivate: meta.onActivate ?? undefined,
  });

  clearChildren(card);

  const top = doc.createElement("div");
  top.setAttribute("class", "canvas-visual-first-card__top");
  const tagHost = doc.createElement("div");
  tagHost.setAttribute("class", "canvas-visual-first-card__tag");
  if (item.tag != null) renderSlot(tagHost, item.tag, ctx, doc);
  top.appendChild(tagHost);
  if (meta.clickable) {
    const action = doc.createElement("div");
    action.setAttribute("class", "canvas-visual-first-card__action");
    action.setAttribute("aria-hidden", "true");
    action.textContent = "›";
    top.appendChild(action);
  }
  card.appendChild(top);

  if (item.body != null) {
    const bottom = doc.createElement("div");
    bottom.setAttribute("class", "canvas-visual-first-card__bottom");
    renderSlot(bottom, item.body, ctx, doc);
    card.appendChild(bottom);
  }

  if (asText(item.id)) card.setAttribute("data-item-id", asText(item.id));
  return dispose;
}

export const VisualCardBlock = createCardBlock({
  componentName: "VisualCardBlock",
  size: "medium",
  cardType: "visual-first-card",
  maxPerRow: 3,
  slotKeys: ["body", "tag", "bgImageSrc"],
  minItems: 2,
  normalizeItems: normalizeVisualItems,
  renderItem(cell, item, _index, ctx, meta) {
    const doc = ctx.document ?? cell.ownerDocument;
    const card = doc.createElement("div");
    cell.appendChild(card);
    return renderVisualCard(card, item, ctx, meta);
  },
});

export const VisualCardItem = {
  create(props = {}, ctx = {}) {
    const doc = ctx.document ?? globalThis.document;
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "VisualCardItem");
    this.update(el, props, ctx);
    return el;
  },
  update(el, props = {}, ctx = {}) {
    const item = unwrapItem(props) || props;
    renderVisualCard(el, item, ctx, { clickable: false, onActivate: null });
  },
  destroy() {},
  ownsChildren: true,
};

export default VisualCardBlock;
