/**
 * A6.10 — ContextCardBlock (title/tag + body, optional bg via urlPolicy).
 */

import { markdownToSafeDom } from "../../security/markdown.js";
import { Tag } from "../content/Tag.js";
import {
  applyClickableCard,
  asText,
  clearChildren,
  nodeTypeName,
  renderSlot,
  resolveBackgroundCssUrl,
  setClass,
  unwrapItem,
} from "./shared.js";
import { createCardBlock } from "./CardBlockLayout.js";
import { setInlineStyle } from "../../renderer/inlineStyle.js";

const BG_COLORS = new Set(["gray", "info", "success", "warning", "danger"]);

/**
 * @param {Record<string, unknown>} props
 * @returns {unknown[]}
 */
export function normalizeContextItems(props = {}) {
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
export function renderContextCard(card, item, ctx, meta) {
  const doc = ctx.document ?? card.ownerDocument;
  const bgCss = resolveBackgroundCssUrl(item.bgImageSrc, ctx);
  const bgColor = BG_COLORS.has(asText(item.bgColor)) ? asText(item.bgColor) : "";
  const variant = bgCss ? "image" : bgColor || "plain";

  let cls = "canvas-context-card canvas-card-item";
  cls += ` canvas-context-card--variant-${variant}`;
  setClass(card, cls);

  if (bgCss) {
    setInlineStyle(card, { "background-image": bgCss });
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
  const vertical = doc.createElement("div");
  vertical.setAttribute("class", "canvas-context-card__vertical");

  const top = doc.createElement("div");
  top.setAttribute("class", "canvas-context-card__slot canvas-context-card__slot--top");

  const title = item.title;
  if (title != null && title !== "") {
    if (typeof title === "string" || typeof title === "number") {
      const span = doc.createElement("span");
      span.setAttribute("class", "canvas-context-card__title-text");
      span.textContent = String(title);
      top.appendChild(span);
    } else if (nodeTypeName(title) === "Tag" || (title && typeof title === "object" && (/** @type {any} */ (title).text != null || /** @type {any} */ (title).props))) {
      const wrap = doc.createElement("div");
      wrap.setAttribute("class", "canvas-context-card__tag-wrapper");
      const tagHost = doc.createElement("div");
      tagHost.setAttribute("class", "canvas-context-card__tag");
      const tagProps = unwrapItem(title) || /** @type {Record<string, unknown>} */ (title);
      tagHost.appendChild(Tag.create(tagProps, ctx));
      wrap.appendChild(tagHost);
      top.appendChild(wrap);
    } else {
      renderSlot(top, title, ctx, doc);
    }
  }

  if (meta.clickable) {
    const chevron = doc.createElement("div");
    chevron.setAttribute("class", "canvas-context-card__chevron");
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "›";
    top.appendChild(chevron);
  }
  vertical.appendChild(top);

  const body = asText(item.body);
  if (body) {
    const bottom = doc.createElement("div");
    bottom.setAttribute(
      "class",
      "canvas-context-card__slot canvas-context-card__slot--bottom",
    );
    const bodyEl = doc.createElement("div");
    bodyEl.setAttribute("class", "canvas-context-card__body-text");
    const md = markdownToSafeDom(body, doc);
    while (md.firstChild) bodyEl.appendChild(md.firstChild);
    bottom.appendChild(bodyEl);
    vertical.appendChild(bottom);
  }

  card.appendChild(vertical);
  if (asText(item.id)) card.setAttribute("data-item-id", asText(item.id));
  return dispose;
}

export const ContextCardBlock = createCardBlock({
  componentName: "ContextCardBlock",
  size: "small",
  cardType: "context-card",
  maxPerRow: 3,
  slotKeys: ["title", "body", "bgColor", "bgImageSrc"],
  minItems: 2,
  normalizeItems: normalizeContextItems,
  renderItem(cell, item, _index, ctx, meta) {
    const doc = ctx.document ?? cell.ownerDocument;
    const card = doc.createElement("div");
    cell.appendChild(card);
    return renderContextCard(card, item, ctx, meta);
  },
});

export const ContextCardItem = {
  create(props = {}, ctx = {}) {
    const doc = ctx.document ?? globalThis.document;
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "ContextCardItem");
    this.update(el, props, ctx);
    return el;
  },
  update(el, props = {}, ctx = {}) {
    const item = unwrapItem(props) || props;
    renderContextCard(el, item, ctx, { clickable: false, onActivate: null });
  },
  destroy() {},
  ownsChildren: true,
};

export default ContextCardBlock;
