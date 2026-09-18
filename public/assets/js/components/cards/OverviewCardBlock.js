/**
 * A6.10 — OverviewCardBlock (top slot + MetricIndicatorInline bottom).
 */

import { MetricIndicatorInline } from "../content/MetricIndicator.js";
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
export function normalizeOverviewItems(props = {}) {
  if (Array.isArray(props.items)) return props.items;
  if (Array.isArray(props.children)) return props.children;
  return [];
}

/**
 * @param {unknown} bottom
 * @returns {Record<string, unknown> | null}
 */
function unwrapMetric(bottom) {
  if (bottom == null) return null;
  if (typeof bottom !== "object") return { value: String(bottom) };
  const o = /** @type {Record<string, unknown>} */ (bottom);
  if (o.props && typeof o.props === "object") {
    return /** @type {Record<string, unknown>} */ (o.props);
  }
  return o;
}

export const OverviewCardBlock = createCardBlock({
  componentName: "OverviewCardBlock",
  size: "small",
  cardType: "overview-card",
  maxPerRow: 3,
  slotKeys: ["top", "bottom"],
  minItems: 2,
  normalizeItems: normalizeOverviewItems,
  renderItem(cell, item, _index, ctx, meta) {
    const doc = ctx.document ?? cell.ownerDocument;
    const card = doc.createElement("div");
    setClass(card, "canvas-overview-card canvas-card-item");
    cell.appendChild(card);

    const dispose = applyClickableCard(card, {
      clickable: meta.clickable,
      onActivate: meta.onActivate ?? undefined,
    });

    const vertical = doc.createElement("div");
    vertical.setAttribute("class", "canvas-overview-card__vertical");

    const topRow = doc.createElement("div");
    topRow.setAttribute("class", "canvas-overview-card__top-row");

    if (item.top != null) {
      const top = doc.createElement("div");
      top.setAttribute("class", "canvas-overview-card__slot canvas-overview-card__slot--top");
      renderSlot(top, item.top, ctx, doc);
      topRow.appendChild(top);
    }
    if (meta.clickable) {
      const chevron = doc.createElement("div");
      chevron.setAttribute("class", "canvas-overview-card__chevron");
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "›";
      topRow.appendChild(chevron);
    }
    vertical.appendChild(topRow);

    const metricProps = unwrapMetric(item.bottom);
    if (metricProps) {
      const bottom = doc.createElement("div");
      bottom.setAttribute(
        "class",
        "canvas-overview-card__slot canvas-overview-card__slot--bottom",
      );
      const metricEl = MetricIndicatorInline.create(
        { ...metricProps, variant: "inline" },
        ctx,
      );
      bottom.appendChild(metricEl);
      vertical.appendChild(bottom);
    }

    card.appendChild(vertical);
    if (asText(item.id)) card.setAttribute("data-item-id", asText(item.id));
    return dispose;
  },
});

export const OverviewCardItem = {
  create(props = {}, ctx = {}) {
    const doc = ctx.document ?? globalThis.document;
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "OverviewCardItem");
    this.update(el, props, ctx);
    return el;
  },
  update(el, props = {}, ctx = {}) {
    const item = unwrapItem(props) || props;
    clearChildren(el);
    setClass(el, "canvas-overview-card-item");
    const doc = ctx.document ?? el.ownerDocument;
    if (item.top != null) {
      const top = doc.createElement("div");
      top.setAttribute("data-slot", "top");
      renderSlot(top, item.top, ctx, doc);
      el.appendChild(top);
    }
  },
  destroy() {},
  ownsChildren: true,
};

export default OverviewCardBlock;
