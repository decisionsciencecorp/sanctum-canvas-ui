/**
 * A5.3 — SourceContext: one-based citation lookup against Card sources.
 * Plain-DOM stand-in for React CardSourceContext (Doc #1380).
 */

import {
  asText,
  clearChildren,
  lifecycle,
  setClass,
} from "../content/shared.js";

/**
 * @typedef {{ title?: string, sourceName?: string, url?: string, faviconUrl?: string, key?: string }} CardSource
 * @typedef {CardSource & { faviconUrl: string }} SourceWithFavicon
 */

/**
 * @param {string | undefined} url
 * @param {{ safeUrl?: (u: string) => string | undefined }} [urlPolicy]
 * @returns {string}
 */
export function getFaviconUrl(url, urlPolicy) {
  if (!url || typeof url !== "string") return "";
  const safe =
    urlPolicy && typeof urlPolicy.safeUrl === "function"
      ? urlPolicy.safeUrl(url)
      : url;
  if (!safe) return "";
  try {
    const parsed = new URL(safe, "https://example.invalid");
    if (!parsed.hostname || parsed.hostname === "example.invalid") return "";
    const fav = `https://www.google.com/s2/favicons?sz=128&domain=${parsed.hostname}`;
    return urlPolicy?.safeUrl ? urlPolicy.safeUrl(fav) || "" : fav;
  } catch {
    return "";
  }
}

/**
 * @param {unknown} raw
 * @param {{ urlPolicy?: { safeUrl?: (u: string) => string | undefined } }} [opts]
 * @returns {SourceWithFavicon[]}
 */
export function enrichSources(raw, opts = {}) {
  if (!Array.isArray(raw)) return [];
  const urlPolicy = opts.urlPolicy;
  /** @type {SourceWithFavicon[]} */
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const src = raw[i];
    if (!src || typeof src !== "object") continue;
    const s = /** @type {CardSource} */ (src);
    const url =
      typeof s.url === "string" && urlPolicy?.safeUrl
        ? urlPolicy.safeUrl(s.url)
        : typeof s.url === "string"
          ? s.url
          : undefined;
    out.push({
      title: typeof s.title === "string" ? s.title : undefined,
      sourceName: typeof s.sourceName === "string" ? s.sourceName : undefined,
      url: url || undefined,
      faviconUrl: getFaviconUrl(url, urlPolicy),
      key: s.key != null ? String(s.key) : `src-${i}`,
    });
  }
  return out;
}

/**
 * Create a source context bag (attachable to render ctx or Card host).
 * @param {unknown} sources
 * @param {{ urlPolicy?: object }} [opts]
 */
export function createSourceContext(sources, opts = {}) {
  const enriched = enrichSources(sources, opts);

  return {
    sources: enriched,
    /**
     * 1-based citation index → source (or undefined).
     * @param {number} oneBased
     */
    getByIndex(oneBased) {
      const n = Number(oneBased);
      if (!Number.isFinite(n) || n < 1) return undefined;
      return enriched[n - 1];
    },
    /**
     * @param {Array<number|string>} indices 1-based
     * @returns {SourceWithFavicon[]}
     */
    lookupCitations(indices) {
      if (!Array.isArray(indices)) return [];
      return indices
        .map((idx) => this.getByIndex(Number(idx)))
        .filter(
          (s) =>
            s &&
            asText(s.sourceName).trim() !== "" &&
            asText(s.title).trim() !== "",
        );
    },
  };
}

/**
 * Read SourceContext from render ctx (Card / host wiring).
 * @param {Record<string, unknown>} [ctx]
 */
export function getSourceContext(ctx = {}) {
  if (ctx.sourceContext && typeof ctx.sourceContext.getByIndex === "function") {
    return ctx.sourceContext;
  }
  if (Array.isArray(ctx.sources)) {
    return createSourceContext(ctx.sources, { urlPolicy: ctx.urlPolicy });
  }
  return createSourceContext([], { urlPolicy: ctx.urlPolicy });
}

/**
 * @param {Record<string, unknown>} props
 * @returns {number[]}
 */
function parseIndices(props) {
  if (Array.isArray(props.indices)) {
    return props.indices.map(Number).filter((n) => Number.isFinite(n) && n >= 1);
  }
  if (typeof props.indices === "string") {
    return props.indices
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n >= 1);
  }
  const raw = props.index ?? props.citation ?? props["data-citation"];
  if (typeof raw === "number" && raw >= 1) return [raw];
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) return [Number(raw)];
  if (typeof raw === "string" && raw.includes(",")) {
    return raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n >= 1);
  }
  return [];
}

/**
 * CitationRef — inline cite chip resolving [n] against SourceContext.
 */
export const CitationRef = lifecycle({
  mount(doc) {
    const el = doc.createElement("cite");
    el.setAttribute("data-canvas-component", "CitationRef");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const indices = parseIndices(props);
    setClass(el, "canvas-citation-ref");
    el.setAttribute("data-citation", indices.join(",") || "");
    clearChildren(el);

    const sourceCtx = getSourceContext(ctx);
    const found = sourceCtx.lookupCitations(indices);

    if (!indices.length) {
      el.setAttribute("data-status", "empty");
      el.textContent = asText(props.label) || "";
      return;
    }

    if (!found.length) {
      el.setAttribute("data-status", "unresolved");
      el.textContent = indices.join(",");
      return;
    }

    el.setAttribute("data-status", "ready");
    el.setAttribute("data-source-count", String(found.length));

    for (let i = 0; i < found.length; i++) {
      const src = found[i];
      const chip = doc.createElement("button");
      chip.setAttribute("type", "button");
      chip.setAttribute("class", "canvas-citation-ref__chip");
      chip.setAttribute("data-citation-index", String(indices[i] ?? i + 1));
      const label = asText(src.title) || asText(src.sourceName) || String(indices[i]);
      chip.textContent = String(indices[i] ?? i + 1);
      chip.setAttribute("aria-label", `Source ${indices[i]}: ${label}`);

      const safeUrl =
        src.url && ctx.urlPolicy?.safeUrl
          ? ctx.urlPolicy.safeUrl(src.url)
          : src.url;
      if (safeUrl) {
        chip.setAttribute("data-source-url", safeUrl);
        chip.onclick = (ev) => {
          ev?.preventDefault?.();
          let opened = null;
          if (ctx.urlPolicy && typeof ctx.urlPolicy.safeOpenUrl === "function") {
            opened = ctx.urlPolicy.safeOpenUrl(safeUrl);
          }
          if (!opened && typeof ctx.openUrl === "function") {
            ctx.openUrl(safeUrl);
          }
        };
      } else {
        chip.setAttribute("disabled", "true");
      }
      el.appendChild(chip);
    }
  },
});

export default {
  getFaviconUrl,
  enrichSources,
  createSourceContext,
  getSourceContext,
  CitationRef,
};
