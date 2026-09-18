/**
 * A6.10 — Shared grid / carousel scaffolding for small & medium card blocks.
 */

import {
  asText,
  clearChildren,
  enforceHomogeneousItems,
  getRowConfiguration,
  lifecycle,
  resolveIsStreaming,
  setClass,
} from "./shared.js";

/**
 * @param {Record<string, unknown>} props
 * @param {2 | 3} maxPerRow
 * @returns {{ layout: "grid" | "carousel", responsive: boolean, gap: string | null, maxPerRow: 2 | 3 }}
 */
export function normalizeLayoutProps(props = {}, maxPerRow = 3) {
  const layout = asText(props.layout) === "carousel" ? "carousel" : "grid";
  const responsive = props.responsive !== false;
  let gap = null;
  if (props.gap != null && props.gap !== "") {
    gap = typeof props.gap === "number" ? `${props.gap}px` : asText(props.gap);
  }
  return { layout, responsive, gap, maxPerRow };
}

/**
 * Mount the layout chrome and return hosts for items.
 * @param {Document} doc
 * @param {Element} el
 * @param {{
 *   size: "small" | "medium",
 *   cardType: string,
 *   layout: "grid" | "carousel",
 *   responsive: boolean,
 *   gap: string | null,
 *   count: number,
 *   maxPerRow: 2 | 3,
 * }} opts
 * @returns {{ itemHosts: Element[], track: Element | null }}
 */
export function buildCardBlockChrome(doc, el, opts) {
  const base = `canvas-${opts.size}-card-block`;
  let cls = `${base} ${base}--${opts.cardType} ${base}--${opts.layout}`;
  setClass(el, cls);
  el.setAttribute("data-card-type", opts.cardType);
  el.setAttribute("data-layout", opts.layout);
  el.setAttribute("data-count", String(opts.count));
  el.setAttribute("data-size", opts.size);

  if (opts.gap) {
    const varName =
      opts.size === "small" ? "--canvas-small-card-gap" : "--canvas-medium-card-gap";
    el.setAttribute("style", `${varName}: ${opts.gap}`);
  } else {
    el.removeAttribute("style");
  }

  clearChildren(el);

  /** @type {Element[]} */
  const itemHosts = [];

  if (opts.layout === "carousel") {
    const carousel = doc.createElement("div");
    let cCls = `${base}__carousel`;
    if (opts.responsive) cCls += ` ${base}__carousel--responsive`;
    setClass(carousel, cCls);
    carousel.setAttribute("data-role", "carousel");
    carousel.setAttribute("tabindex", "0");
    carousel.setAttribute("role", "region");
    carousel.setAttribute("aria-label", `${opts.cardType} carousel`);

    const track = doc.createElement("div");
    setClass(track, `${base}__carousel-track`);

    for (let i = 0; i < opts.count; i++) {
      const cell = doc.createElement("div");
      setClass(cell, `${base}__carousel-item`);
      cell.setAttribute("data-item-index", String(i));
      track.appendChild(cell);
      itemHosts.push(cell);
    }
    carousel.appendChild(track);
    el.appendChild(carousel);
    return { itemHosts, track };
  }

  const grid = doc.createElement("div");
  let gCls = `${base}__grid`;
  if (opts.responsive) gCls += ` ${base}__grid--responsive`;
  if (opts.responsive && opts.count % 2 === 1) gCls += ` ${base}__grid--odd-count`;
  setClass(grid, gCls);

  const rows = getRowConfiguration(opts.count, opts.maxPerRow);
  let start = 0;
  for (let r = 0; r < rows.length; r++) {
    const itemsInRow = rows[r];
    const row = doc.createElement("div");
    setClass(row, `${base}__row ${base}__row--${itemsInRow}`);
    for (let c = 0; c < itemsInRow; c++) {
      const cell = doc.createElement("div");
      setClass(cell, `${base}__item`);
      cell.setAttribute("data-item-index", String(start + c));
      row.appendChild(cell);
      itemHosts.push(cell);
    }
    start += itemsInRow;
    grid.appendChild(row);
  }
  el.appendChild(grid);
  return { itemHosts, track: null };
}

/**
 * Render an invalid / empty state on a card block host.
 * @param {Element} el
 * @param {Document} doc
 * @param {string} message
 * @param {string} reason
 */
export function renderInvalidBlock(el, doc, message, reason) {
  clearChildren(el);
  setClass(el, "canvas-card-block canvas-card-block--invalid");
  el.setAttribute("data-status", "invalid");
  el.setAttribute("data-invalid-reason", reason);
  el.setAttribute("role", "status");
  const msg = doc.createElement("span");
  msg.setAttribute("class", "canvas-status-text");
  msg.textContent = message;
  el.appendChild(msg);
}

/**
 * Resolve clickable handler for a card block.
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 * @returns {{ clickable: boolean, onItemClick: ((item: Record<string, unknown>, index: number) => void) | null }}
 */
export function resolveClickable(props = {}, ctx = {}) {
  const handler =
    typeof props.onItemClick === "function"
      ? props.onItemClick
      : typeof ctx.onCardItemClick === "function"
        ? ctx.onCardItemClick
        : null;
  const wantsClick =
    props.clickable === true ||
    (props.action != null && props.action !== false && props.clickable !== false);
  return {
    clickable: Boolean(wantsClick && handler),
    onItemClick: handler,
  };
}

/**
 * Factory for a card-block host that owns its chrome + item shells.
 *
 * @param {{
 *   componentName: string,
 *   size: "small" | "medium",
 *   cardType: string,
 *   maxPerRow: 2 | 3,
 *   slotKeys: string[],
 *   minItems?: number,
 *   normalizeItems: (props: Record<string, unknown>) => unknown[],
 *   renderItem: (
 *     cell: Element,
 *     item: Record<string, unknown>,
 *     index: number,
 *     ctx: Record<string, unknown>,
 *     meta: { clickable: boolean, onActivate: (() => void) | null, streaming: boolean },
 *   ) => void | (() => void),
 * }} config
 */
export function createCardBlock(config) {
  return lifecycle({
    ownsChildren: true,
    mount(doc) {
      const el = doc.createElement("div");
      el.setAttribute("data-canvas-component", config.componentName);
      return el;
    },
    patch(el, props = {}, ctx = {}) {
      const doc = ctx.document ?? el.ownerDocument;
      const prev = /** @type {any} */ (el).__canvasCardDisposers;
      if (Array.isArray(prev)) {
        for (const d of prev) {
          try {
            d?.();
          } catch {
            /* ignore */
          }
        }
      }
      /** @type {any} */ (el).__canvasCardDisposers = [];

      const layoutOpts = normalizeLayoutProps(props, config.maxPerRow);
      const rawItems = config.normalizeItems(props);
      const homo = enforceHomogeneousItems(rawItems, {
        slotKeys: config.slotKeys,
        minItems: config.minItems ?? 2,
      });

      if (!homo.items.length) {
        renderInvalidBlock(
          el,
          doc,
          "Not enough matching cards to display",
          homo.reason || "empty",
        );
        return;
      }

      el.setAttribute("data-status", "ready");
      el.removeAttribute("data-invalid-reason");
      if (homo.dropped > 0) {
        el.setAttribute("data-dropped-items", String(homo.dropped));
        el.setAttribute("data-homogeneous", "partial");
      } else {
        el.removeAttribute("data-dropped-items");
        el.setAttribute("data-homogeneous", "ok");
      }
      el.setAttribute("data-structure", homo.signature);

      const { itemHosts } = buildCardBlockChrome(doc, el, {
        size: config.size,
        cardType: config.cardType,
        layout: layoutOpts.layout,
        responsive: layoutOpts.responsive,
        gap: layoutOpts.gap,
        count: homo.items.length,
        maxPerRow: layoutOpts.maxPerRow,
      });

      const streaming = resolveIsStreaming(props, ctx);
      const { clickable, onItemClick } = resolveClickable(props, ctx);
      /** @type {Array<() => void>} */
      const disposers = [];

      for (let i = 0; i < itemHosts.length; i++) {
        const host = itemHosts[i];
        clearChildren(host);
        const item = homo.items[i];
        const onActivate =
          clickable && onItemClick
            ? () => {
                onItemClick(item, i);
              }
            : null;
        const dispose = config.renderItem(host, item, i, ctx, {
          clickable: Boolean(onActivate),
          onActivate,
          streaming,
        });
        if (typeof dispose === "function") disposers.push(dispose);
      }

      /** @type {any} */ (el).__canvasCardDisposers = disposers;
    },
    unmount(el) {
      const prev = /** @type {any} */ (el).__canvasCardDisposers;
      if (Array.isArray(prev)) {
        for (const d of prev) {
          try {
            d?.();
          } catch {
            /* ignore */
          }
        }
      }
      /** @type {any} */ (el).__canvasCardDisposers = null;
    },
  });
}

export { lifecycle, getRowConfiguration };
