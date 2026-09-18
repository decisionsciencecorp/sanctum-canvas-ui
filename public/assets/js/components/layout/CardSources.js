/**
 * A5.1 — Card sources region (sub-root).
 * Progressive-safe strip for Card `sources: [{ title, sourceName, url }]`.
 *
 * Visible text and links are expressed as vnode children so the A4 reconciler
 * owns them (create-time textContent / appendChild would be wiped by
 * reconcileChildren([])).
 */

import { markPartial, isPartial } from "../../renderer/partialGate.js";
import { propsChildren, renderPropsChildren } from "./flexProps.js";

/**
 * @param {unknown} raw
 * @returns {Array<{ title?: string, sourceName?: string, url?: string }>}
 */
export function normalizeSources(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s) => s && typeof s === "object");
}

/**
 * @param {{ title?: string, sourceName?: string, url?: string }} src
 * @param {number} index
 */
function sourceLabel(src, index) {
  return (
    (typeof src.title === "string" && src.title) ||
    (typeof src.sourceName === "string" && src.sourceName) ||
    `Source ${index + 1}`
  );
}

/**
 * Expand props.sources into heading + item vnodes for reconciler / renderChildren.
 * @param {Record<string, unknown>} [props]
 * @param {Record<string, unknown>} [ctx] — optional; when present, URLs are filtered
 * @returns {unknown[] | null}
 */
export function sourcesToChildren(props = {}, ctx = {}) {
  const existing = propsChildren(props);
  if (existing) return existing;

  const sources = normalizeSources(props.sources);
  if (!sources.length) return null;

  const urlPolicy = ctx.urlPolicy;

  return [
    {
      type: "CardSourcesHeading",
      key: "__sources-heading",
      props: {},
      children: ["Sources"],
    },
    ...sources.map((src, index) => {
      const label = sourceLabel(src, index);
      let href;
      if (typeof src.url === "string" && src.url && urlPolicy?.safeUrl) {
        href = urlPolicy.safeUrl(src.url);
      } else if (typeof src.url === "string" && src.url && !urlPolicy) {
        // Defer policy to CardSourceItem when ctx unavailable at partition time.
        href = src.url;
      }
      return {
        type: "CardSourceItem",
        key: `src-${index}`,
        props: {
          title: src.title,
          sourceName: src.sourceName,
          url: src.url,
          index,
          href: href || undefined,
        },
        children: [label],
      };
    }),
  ];
}

/**
 * @param {Element} el
 * @param {Record<string, unknown>} props
 */
function applyShell(el, props) {
  const sources = normalizeSources(props.sources);
  el.setAttribute("class", "canvas-card__sources");
  el.setAttribute("data-canvas-region", "source");
  el.setAttribute("data-canvas-component", "CardSources");
  el.setAttribute("data-source-count", String(sources.length));
  el.setAttribute("aria-label", "Sources");
  markPartial(el, props?.partial === true || isPartial(props));
  if (!sources.length && !propsChildren(props)) {
    el.setAttribute("hidden", "");
  } else {
    el.removeAttribute("hidden");
  }
}

/**
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 * @returns {Element}
 */
function create(props = {}, ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("CardSources.create: ctx.document required");
  }
  const el = doc.createElement("aside");
  applyShell(el, props);
  const kids = sourcesToChildren(props, ctx);
  if (kids && typeof ctx.renderChildren === "function") {
    ctx.renderChildren(el, kids);
  } else {
    renderPropsChildren(el, props, ctx);
  }
  return el;
}

/**
 * @param {Element} el
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
function update(el, props = {}, ctx = {}) {
  applyShell(el, props);
  const kids = sourcesToChildren(props, ctx);
  if (kids && typeof ctx.renderChildren === "function") {
    ctx.renderChildren(el, kids);
  } else {
    renderPropsChildren(el, props, ctx);
  }
}

function destroy() {}

export const CardSources = { create, update, destroy };

/** Heading row inside CardSources — text via vnode children. */
export const CardSourcesHeading = {
  create(_props = {}, ctx = {}) {
    const doc = ctx.document ?? globalThis.document;
    const el = doc.createElement("div");
    el.setAttribute("class", "canvas-card__sources-heading");
    el.setAttribute("data-canvas-sources-heading", "1");
    return el;
  },
  update(el) {
    el.setAttribute("class", "canvas-card__sources-heading");
  },
  destroy() {},
};

/**
 * Single source chip. Label text is vnode children; optional safe href on props.
 * Unsafe urls never become href (checked again at create/update).
 */
export const CardSourceItem = {
  /**
   * @param {Record<string, unknown>} props
   * @param {Record<string, unknown>} ctx
   */
  create(props = {}, ctx = {}) {
    const doc = ctx.document ?? globalThis.document;
    const el = doc.createElement("li");
    syncItemShell(el, props, ctx);
    return el;
  },
  update(el, props = {}, ctx = {}) {
    syncItemShell(el, props, ctx);
  },
  destroy() {},
};

/**
 * @param {Element} el
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
function syncItemShell(el, props, ctx) {
  const index = typeof props.index === "number" ? props.index : 0;
  el.setAttribute("class", "canvas-card__source-item");
  el.setAttribute("data-source-index", String(index));
  if (typeof props.title === "string") {
    el.setAttribute("data-source-title", props.title);
  } else {
    el.removeAttribute("data-source-title");
  }
  if (typeof props.sourceName === "string") {
    el.setAttribute("data-source-name", props.sourceName);
  } else {
    el.removeAttribute("data-source-name");
  }

  const urlPolicy = ctx.urlPolicy;
  const candidate =
    typeof props.href === "string"
      ? props.href
      : typeof props.url === "string"
        ? props.url
        : "";
  const safe =
    candidate && urlPolicy && typeof urlPolicy.safeUrl === "function"
      ? urlPolicy.safeUrl(candidate)
      : undefined;

  // Expose safe URL as data attr; visible label stays in reconciler children.
  // Nested <a> would fight text children — lab/CSS can style the li as a link cue.
  if (safe) {
    el.setAttribute("data-source-url", safe);
  } else {
    el.removeAttribute("data-source-url");
  }
}

export default CardSources;
