import {
  CodeBlock,
  Image,
  ImageBlock,
  ListBlock,
  ListItem,
  dispatchContinueConversation
} from "./chunk-CLKPEL75.js";
import {
  asText,
  clearChildren,
  lifecycle,
  setClass,
  setOrRemoveAttr
} from "./chunk-SL6LI3PJ.js";
import "./chunk-LQVUHYG2.js";
import "./chunk-MLKGABMK.js";

// src/Browser/components/chat/FollowUpItem.js
var FollowUpItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("button");
    el.setAttribute("type", "button");
    el.setAttribute("data-canvas-component", "FollowUpItem");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const text = asText(props.text);
    const streaming = ctx.stream?.isStreaming === true;
    setClass(el, "canvas-follow-up-item");
    el.setAttribute("data-streaming-blocked", streaming ? "true" : "false");
    setOrRemoveAttr(el, "disabled", streaming ? "true" : null);
    setOrRemoveAttr(el, "aria-disabled", streaming ? "true" : null);
    clearChildren(el);
    if (text) {
      const span = doc.createElement("span");
      span.setAttribute("class", "canvas-follow-up-item__text");
      span.textContent = text;
      el.appendChild(span);
    }
    if (asText(props.icon)) {
      const icon = doc.createElement("span");
      icon.setAttribute("class", "canvas-follow-up-item__icon");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = asText(props.icon);
      el.appendChild(icon);
    } else {
      const chevron = doc.createElement("span");
      chevron.setAttribute("class", "canvas-follow-up-item__icon");
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "\u203A";
      el.appendChild(chevron);
    }
    el.onclick = () => {
      dispatchContinueConversation(
        ctx,
        {
          ...props,
          action: props.action ?? {
            type: "continue_conversation",
            context: text,
            message: text
          }
        },
        { fallbackMessage: text, userGesture: true }
      );
    };
  }
});

// src/Browser/components/chat/FollowUpBlock.js
function normalizeFollowUpItems(props = {}) {
  if (!Array.isArray(props.items)) return [];
  return props.items.map((item) => {
    if (typeof item === "string") return { text: item };
    if (!item || typeof item !== "object") return null;
    if (item.props && typeof item.props === "object") {
      return (
        /** @type {Record<string, unknown>} */
        item.props
      );
    }
    return (
      /** @type {Record<string, unknown>} */
      item
    );
  }).filter(Boolean);
}
var FollowUpBlock = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "FollowUpBlock");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const items = normalizeFollowUpItems(props);
    setClass(el, "canvas-follow-up-block");
    el.setAttribute("data-item-count", String(items.length));
    clearChildren(el);
    const header = doc.createElement("div");
    header.setAttribute("class", "canvas-follow-up-block__header");
    header.textContent = asText(props.heading) || "Related Queries";
    el.appendChild(header);
    if (typeof ctx.renderChildren === "function" && Array.isArray(props.children) && props.children.length) {
      ctx.renderChildren(el, props.children);
      return;
    }
    for (const item of items) {
      el.appendChild(FollowUpItem.create(item, ctx));
    }
  }
});

// src/Browser/components/chat/SourceContext.js
function getFaviconUrl(url, urlPolicy) {
  if (!url || typeof url !== "string") return "";
  const safe = urlPolicy && typeof urlPolicy.safeUrl === "function" ? urlPolicy.safeUrl(url) : url;
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
function enrichSources(raw, opts = {}) {
  if (!Array.isArray(raw)) return [];
  const urlPolicy = opts.urlPolicy;
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const src = raw[i];
    if (!src || typeof src !== "object") continue;
    const s = (
      /** @type {CardSource} */
      src
    );
    const url = typeof s.url === "string" && urlPolicy?.safeUrl ? urlPolicy.safeUrl(s.url) : typeof s.url === "string" ? s.url : void 0;
    out.push({
      title: typeof s.title === "string" ? s.title : void 0,
      sourceName: typeof s.sourceName === "string" ? s.sourceName : void 0,
      url: url || void 0,
      faviconUrl: getFaviconUrl(url, urlPolicy),
      key: s.key != null ? String(s.key) : `src-${i}`
    });
  }
  return out;
}
function createSourceContext(sources, opts = {}) {
  const enriched = enrichSources(sources, opts);
  return {
    sources: enriched,
    /**
     * 1-based citation index → source (or undefined).
     * @param {number} oneBased
     */
    getByIndex(oneBased) {
      const n = Number(oneBased);
      if (!Number.isFinite(n) || n < 1) return void 0;
      return enriched[n - 1];
    },
    /**
     * @param {Array<number|string>} indices 1-based
     * @returns {SourceWithFavicon[]}
     */
    lookupCitations(indices) {
      if (!Array.isArray(indices)) return [];
      return indices.map((idx) => this.getByIndex(Number(idx))).filter(
        (s) => s && asText(s.sourceName).trim() !== "" && asText(s.title).trim() !== ""
      );
    }
  };
}
function getSourceContext(ctx = {}) {
  if (ctx.sourceContext && typeof ctx.sourceContext.getByIndex === "function") {
    return ctx.sourceContext;
  }
  if (Array.isArray(ctx.sources)) {
    return createSourceContext(ctx.sources, { urlPolicy: ctx.urlPolicy });
  }
  return createSourceContext([], { urlPolicy: ctx.urlPolicy });
}
function parseIndices(props) {
  if (Array.isArray(props.indices)) {
    return props.indices.map(Number).filter((n) => Number.isFinite(n) && n >= 1);
  }
  if (typeof props.indices === "string") {
    return props.indices.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n >= 1);
  }
  const raw = props.index ?? props.citation ?? props["data-citation"];
  if (typeof raw === "number" && raw >= 1) return [raw];
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) return [Number(raw)];
  if (typeof raw === "string" && raw.includes(",")) {
    return raw.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n >= 1);
  }
  return [];
}
var CitationRef = lifecycle({
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
      const safeUrl = src.url && ctx.urlPolicy?.safeUrl ? ctx.urlPolicy.safeUrl(src.url) : src.url;
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
  }
});

// src/Browser/components/chat/registerChatContent.js
var CHAT_CONTENT_COMPONENTS = {
  ListBlock,
  ListItem,
  CodeBlock,
  Image,
  ImageBlock,
  FollowUpBlock,
  FollowUpItem,
  CitationRef,
  // Alias for markdown / cite wiring
  Citation: CitationRef
};
function registerChatContent(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerChatContent: registry with register() required");
  }
  for (const [type, entry] of Object.entries(CHAT_CONTENT_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}
var registerChatContent_default = registerChatContent;
export {
  CHAT_CONTENT_COMPONENTS,
  CitationRef,
  CodeBlock,
  FollowUpBlock,
  FollowUpItem,
  Image,
  ImageBlock,
  ListBlock,
  ListItem,
  registerChatContent_default as default,
  registerChatContent
};
