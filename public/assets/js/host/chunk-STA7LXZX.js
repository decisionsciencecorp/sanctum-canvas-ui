import {
  asText,
  clearChildren,
  lifecycle,
  setClass,
  setInlineStyle,
  setOrRemoveAttr
} from "./chunk-SL6LI3PJ.js";
import {
  safeUrl,
  toCssUrl
} from "./chunk-LQVUHYG2.js";

// src/Browser/lang/builtins.js
function resolveField(obj, path) {
  if (!path || obj == null) return void 0;
  if (!path.includes(".")) return obj[path];
  let cur = obj;
  for (const p of path.split(".")) {
    if (cur == null) return void 0;
    cur = cur[p];
  }
  return cur;
}
function toNumber(val) {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }
  if (typeof val === "boolean") return val ? 1 : 0;
  return 0;
}
var BUILTINS = {
  Count: {
    name: "Count",
    signature: "Count(array) \u2192 number",
    description: "Returns array length",
    fn: (arr) => Array.isArray(arr) ? arr.length : 0
  },
  First: {
    name: "First",
    signature: "First(array) \u2192 element",
    description: "Returns first element of array",
    fn: (arr) => Array.isArray(arr) ? arr[0] ?? null : null
  },
  Last: {
    name: "Last",
    signature: "Last(array) \u2192 element",
    description: "Returns last element of array",
    fn: (arr) => Array.isArray(arr) ? arr[arr.length - 1] ?? null : null
  },
  Sum: {
    name: "Sum",
    signature: "Sum(numbers[]) \u2192 number",
    description: "Sum of numeric array",
    fn: (arr) => Array.isArray(arr) ? arr.reduce((a, b) => a + toNumber(b), 0) : 0
  },
  Avg: {
    name: "Avg",
    signature: "Avg(numbers[]) \u2192 number",
    description: "Average of numeric array",
    fn: (arr) => Array.isArray(arr) && arr.length ? arr.reduce((a, b) => a + toNumber(b), 0) / arr.length : 0
  },
  Min: {
    name: "Min",
    signature: "Min(numbers[]) \u2192 number",
    description: "Minimum value in array",
    fn: (arr) => Array.isArray(arr) && arr.length ? arr.reduce((acc, b) => Math.min(acc, toNumber(b)), toNumber(arr[0])) : 0
  },
  Max: {
    name: "Max",
    signature: "Max(numbers[]) \u2192 number",
    description: "Maximum value in array",
    fn: (arr) => Array.isArray(arr) && arr.length ? arr.reduce((acc, b) => Math.max(acc, toNumber(b)), toNumber(arr[0])) : 0
  },
  Sort: {
    name: "Sort",
    signature: "Sort(array, field, direction?) \u2192 sorted array",
    description: 'Sort array by field. Direction: "asc" (default) or "desc"',
    fn: (arr, field, dir) => {
      if (!Array.isArray(arr)) return arr;
      const f = String(field ?? "");
      const desc = String(dir ?? "asc") === "desc";
      return [...arr].sort((a, b) => {
        const av = f ? resolveField(a, f) : a;
        const bv = f ? resolveField(b, f) : b;
        const aIsNumeric = typeof av === "number" || typeof av === "string" && !isNaN(Number(av)) && av !== "";
        const bIsNumeric = typeof bv === "number" || typeof bv === "string" && !isNaN(Number(bv)) && bv !== "";
        if (aIsNumeric && bIsNumeric) {
          const diff = toNumber(av) - toNumber(bv);
          return desc ? -diff : diff;
        }
        const cmp = String(av ?? "").localeCompare(String(bv ?? ""));
        return desc ? -cmp : cmp;
      });
    }
  },
  Filter: {
    name: "Filter",
    signature: 'Filter(array, field, operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "contains", value) \u2192 filtered array',
    description: "Filter array by field value",
    fn: (arr, field, op, value) => {
      if (!Array.isArray(arr)) return [];
      const f = String(field ?? "");
      const o = String(op ?? "==");
      return arr.filter((item) => {
        const v = f ? resolveField(item, f) : item;
        switch (o) {
          case "==":
            return v == value;
          case "!=":
            return v != value;
          case ">":
            return toNumber(v) > toNumber(value);
          case "<":
            return toNumber(v) < toNumber(value);
          case ">=":
            return toNumber(v) >= toNumber(value);
          case "<=":
            return toNumber(v) <= toNumber(value);
          case "contains":
            return String(v ?? "").includes(String(value ?? ""));
          default:
            return false;
        }
      });
    }
  },
  Round: {
    name: "Round",
    signature: "Round(number, decimals?) \u2192 number",
    description: "Round to N decimal places (default 0)",
    fn: (n, decimals) => {
      const num = toNumber(n);
      const d = decimals != null ? toNumber(decimals) : 0;
      const factor = Math.pow(10, d);
      return Math.round(num * factor) / factor;
    }
  },
  Abs: {
    name: "Abs",
    signature: "Abs(number) \u2192 number",
    description: "Absolute value",
    fn: (n) => Math.abs(toNumber(n))
  },
  Floor: {
    name: "Floor",
    signature: "Floor(number) \u2192 number",
    description: "Round down to nearest integer",
    fn: (n) => Math.floor(toNumber(n))
  },
  Ceil: {
    name: "Ceil",
    signature: "Ceil(number) \u2192 number",
    description: "Round up to nearest integer",
    fn: (n) => Math.ceil(toNumber(n))
  }
};
var LAZY_BUILTINS = /* @__PURE__ */ new Set(["Each"]);
var ACTION_STEPS = {
  Run: "run",
  ToAssistant: "continue_conversation",
  OpenUrl: "open_url",
  Set: "set",
  Reset: "reset"
};
var ACTION_NAMES = /* @__PURE__ */ new Set(["Action", ...Object.keys(ACTION_STEPS)]);
var BUILTIN_NAMES = /* @__PURE__ */ new Set([
  ...Object.keys(BUILTINS),
  ...LAZY_BUILTINS,
  ...ACTION_NAMES
]);
function isBuiltin(name) {
  return BUILTIN_NAMES.has(name);
}
var RESERVED_CALLS = { Query: "Query", Mutation: "Mutation" };
function isReservedCall(name) {
  return name in RESERVED_CALLS;
}

// src/Browser/components/chat/continueConversation.js
var MAX_CONTINUE_CHARS = 4e3;
function boundContinueText(value, max = MAX_CONTINUE_CHARS) {
  const s = value == null ? "" : String(value);
  if (s.length <= max) return s;
  return s.slice(0, max);
}
function isStreaming(ctx = {}) {
  return ctx.stream?.isStreaming === true;
}
function resolveContinuePayload(props = {}, opts = {}) {
  const action = props.action;
  let message = "";
  let context;
  if (action && typeof action === "object") {
    const type = String(action.type || "").toLowerCase();
    if (type && type !== "continue_conversation" && type !== ACTION_STEPS.ToAssistant && type !== "toassistant") {
      return null;
    }
    if (typeof action.message === "string") message = action.message;
    else if (typeof action.context === "string" && !action.message) {
      message = action.context;
    }
    if (typeof action.context === "string") context = action.context;
    if (action.params && typeof action.params === "object") {
      const p = (
        /** @type {Record<string, unknown>} */
        action.params
      );
      if (!message && typeof p.context === "string") message = p.context;
      if (!context && typeof p.context === "string") context = p.context;
      if (typeof p.message === "string") message = p.message;
    }
    if (Array.isArray(action.steps)) {
      const step = action.steps.find(
        (s) => s && typeof s === "object" && (s.type === ACTION_STEPS.ToAssistant || s.type === "continue_conversation")
      );
      if (step) {
        if (typeof step.message === "string") message = step.message;
        if (typeof step.context === "string") context = step.context;
      }
    }
  }
  if (!message) {
    message = opts.fallbackMessage || (typeof props.text === "string" ? props.text : "") || (typeof props.title === "string" ? props.title : "") || "";
  }
  message = boundContinueText(message);
  if (context != null) context = boundContinueText(context, MAX_CONTINUE_CHARS);
  if (!message && !context) return null;
  if (!message && context) message = context;
  return { message, context };
}
function dispatchContinueConversation(ctx = {}, props = {}, opts = {}) {
  if (opts.userGesture === false) {
    return { ok: false, reason: "gesture-required" };
  }
  if (isStreaming(ctx)) {
    return { ok: false, reason: "streaming" };
  }
  const payload = resolveContinuePayload(props, opts);
  if (!payload || !payload.message) {
    return { ok: false, reason: "empty" };
  }
  const actions = ctx.actions;
  if (actions && typeof actions.run === "function") {
    const plan = {
      steps: [
        {
          type: ACTION_STEPS.ToAssistant,
          message: payload.message,
          context: payload.context
        }
      ]
    };
    void actions.run(plan, { userGesture: true });
    return { ok: true };
  }
  if (actions && typeof actions.continueConversation === "function") {
    actions.continueConversation(payload.message, payload.context);
    return { ok: true };
  }
  if (typeof ctx.continueConversation === "function") {
    ctx.continueConversation(payload.message, payload.context);
    return { ok: true };
  }
  if (ctx.host && typeof ctx.host.continueConversation === "function") {
    ctx.host.continueConversation(payload.message, payload.context);
    return { ok: true };
  }
  return { ok: false, reason: "no-handler" };
}

// src/Browser/components/content/ListItem.js
var VARIANTS = /* @__PURE__ */ new Set(["number", "image", "icon"]);
var SIZES = /* @__PURE__ */ new Set(["default", "small"]);
function hasAction(props) {
  return props.action != null && props.action !== false;
}
function renderIndicator(el, doc, props, ctx) {
  const variant = VARIANTS.has(asText(props.variant)) ? asText(props.variant) : "number";
  const listHasSubtitle = props.listHasSubtitle === true || !!asText(props.subtitle);
  const index = typeof props.index === "number" ? props.index : 0;
  const indicator = doc.createElement("div");
  let indCls = "canvas-list-item__indicator";
  if (!listHasSubtitle) indCls += " canvas-list-item__indicator--no-subtitle";
  if (hasAction(props)) indCls += " canvas-list-item__indicator--clickable";
  indicator.setAttribute("class", indCls);
  indicator.setAttribute("data-variant", variant);
  if (variant === "number") {
    const num = doc.createElement("div");
    num.setAttribute("class", "canvas-list-item__indicator-number");
    num.textContent = String(index + 1);
    indicator.appendChild(num);
  } else if (variant === "image") {
    const image = props.image && typeof props.image === "object" ? props.image : null;
    const srcRaw = image && typeof image.src === "string" ? image.src : "";
    const alt = image && typeof image.alt === "string" ? image.alt : "";
    const safe = srcRaw && (ctx.urlPolicy?.safeUrl ? ctx.urlPolicy.safeUrl(srcRaw) : safeUrl(srcRaw));
    if (safe || alt) {
      const wrap = doc.createElement("div");
      wrap.setAttribute("class", "canvas-list-item__indicator-image");
      if (safe) {
        const img = doc.createElement("img");
        img.setAttribute("src", safe);
        img.setAttribute("alt", alt);
        img.setAttribute("width", "40");
        img.setAttribute("height", "40");
        wrap.appendChild(img);
      } else {
        wrap.textContent = alt;
      }
      indicator.appendChild(wrap);
    }
  } else if (variant === "icon" && asText(props.icon)) {
    const icon = doc.createElement("span");
    icon.setAttribute("class", "canvas-list-item__indicator-icon");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = asText(props.icon);
    indicator.appendChild(icon);
  }
  el.appendChild(indicator);
}
var ListItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "ListItem");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const size = SIZES.has(asText(props.size)) ? asText(props.size) : "default";
    const actionable = hasAction(props);
    const streaming = ctx.stream?.isStreaming === true;
    let wrapCls = "canvas-list-item-wrapper";
    if (size === "small") wrapCls += " canvas-list-item-wrapper--small";
    if (actionable) wrapCls += " canvas-list-item-wrapper--with-action";
    setClass(el, wrapCls);
    el.setAttribute("data-size", size);
    el.setAttribute("data-actionable", actionable ? "true" : "false");
    setOrRemoveAttr(el, "data-streaming-blocked", streaming && actionable ? "true" : null);
    clearChildren(el);
    const row = doc.createElement("div");
    let rowCls = "canvas-list-item";
    if (actionable) rowCls += " canvas-list-item--clickable";
    if (streaming && actionable) rowCls += " canvas-list-item--disabled";
    row.setAttribute("class", rowCls);
    if (actionable) {
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", streaming ? "-1" : "0");
      setOrRemoveAttr(row, "aria-disabled", streaming ? "true" : null);
      const activate = () => {
        dispatchContinueConversation(ctx, props, {
          fallbackMessage: asText(props.title),
          userGesture: true
        });
      };
      row.onclick = () => activate();
      row.onkeydown = (ev) => {
        const key = ev?.key;
        if (key === "Enter" || key === " ") {
          ev?.preventDefault?.();
          activate();
        }
      };
    } else {
      row.removeAttribute("role");
      row.removeAttribute("tabindex");
      row.onclick = null;
      row.onkeydown = null;
    }
    renderIndicator(row, doc, props, ctx);
    const contentWrap = doc.createElement("div");
    contentWrap.setAttribute("class", "canvas-list-item__content-wrapper");
    const content = doc.createElement("div");
    content.setAttribute("class", "canvas-list-item__content");
    const title = asText(props.title);
    if (title) {
      const t = doc.createElement("div");
      t.setAttribute("class", "canvas-list-item__title");
      t.textContent = title;
      content.appendChild(t);
    }
    const subtitle = asText(props.subtitle);
    if (subtitle) {
      const s = doc.createElement("div");
      s.setAttribute("class", "canvas-list-item__subtitle");
      s.textContent = subtitle;
      content.appendChild(s);
    }
    contentWrap.appendChild(content);
    if (actionable) {
      const actionLabel = asText(props.actionLabel);
      if (actionLabel) {
        const act = doc.createElement("div");
        act.setAttribute("class", "canvas-list-item__action");
        const lab = doc.createElement("div");
        lab.setAttribute("class", "canvas-list-item__action-label");
        lab.textContent = actionLabel;
        act.appendChild(lab);
        const chevron = doc.createElement("span");
        chevron.setAttribute("class", "canvas-list-item__action-icon");
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = "\u203A";
        act.appendChild(chevron);
        contentWrap.appendChild(act);
      }
    }
    row.appendChild(contentWrap);
    el.appendChild(row);
  }
});

// src/Browser/components/content/ListBlock.js
var VARIANTS2 = /* @__PURE__ */ new Set(["number", "image", "icon"]);
var SIZES2 = /* @__PURE__ */ new Set(["default", "small"]);
function normalizeListItems(props = {}) {
  if (Array.isArray(props.items)) {
    return props.items.map((item) => {
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
  return [];
}
var ListBlock = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "ListBlock");
    el.setAttribute("role", "list");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const variant = VARIANTS2.has(asText(props.variant)) ? asText(props.variant) : "number";
    const size = SIZES2.has(asText(props.size)) ? asText(props.size) : "default";
    const items = normalizeListItems(props);
    const listHasSubtitle = items.some((it) => !!asText(it.subtitle));
    let cls = "canvas-list-block";
    if (size === "small") cls += " canvas-list-block--small";
    setClass(el, cls);
    el.setAttribute("data-variant", variant);
    el.setAttribute("data-size", size);
    el.setAttribute("data-item-count", String(items.length));
    clearChildren(el);
    if (typeof ctx.renderChildren === "function" && Array.isArray(props.children) && props.children.length) {
      const enhanced = props.children.map((child, index) => {
        if (!child || typeof child !== "object") return child;
        const c = (
          /** @type {Record<string, unknown>} */
          child
        );
        const childProps = c.props && typeof c.props === "object" ? (
          /** @type {Record<string, unknown>} */
          c.props
        ) : {};
        return {
          ...c,
          props: {
            ...childProps,
            variant,
            size,
            listHasSubtitle,
            index: typeof childProps.index === "number" ? childProps.index : index
          }
        };
      });
      ctx.renderChildren(el, enhanced);
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const itemProps = {
        ...items[i],
        variant,
        size,
        listHasSubtitle,
        index: i
      };
      const child = ListItem.create(itemProps, ctx);
      child.setAttribute("role", "listitem");
      el.appendChild(child);
    }
  }
});

// src/Browser/components/content/CodeBlock.js
var copiedTimers = /* @__PURE__ */ new WeakMap();
async function copyTextNoFocusSteal(text) {
  const value = String(text ?? "");
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
    }
  }
  if (typeof document === "undefined") return false;
  const prev = document.activeElement;
  const ta = document.createElement("textarea");
  ta.value = value;
  ta.setAttribute("readonly", "true");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body?.appendChild(ta);
  if (typeof ta.select === "function") {
    ta.select();
  } else if (typeof ta.setSelectionRange === "function") {
    ta.setSelectionRange(0, value.length);
  }
  let ok = false;
  try {
    ok = typeof document.execCommand === "function" && document.execCommand("copy") === true;
  } catch {
    ok = false;
  }
  if (typeof ta.remove === "function") {
    ta.remove();
  } else if (ta.parentNode) {
    ta.parentNode.removeChild(ta);
  }
  if (prev && typeof prev.focus === "function") {
    try {
      prev.focus();
    } catch {
    }
  }
  return ok;
}
function clearCopiedTimer(el) {
  const t = copiedTimers.get(el);
  if (t != null) {
    clearTimeout(t);
    copiedTimers.delete(el);
  }
}
var CodeBlock = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "CodeBlock");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const language = asText(props.language) || "text";
    const codeString = asText(props.codeString ?? props.code ?? props.children);
    setClass(el, "canvas-code-block");
    el.setAttribute("data-language", language);
    clearChildren(el);
    clearCopiedTimer(el);
    const live = doc.createElement("span");
    live.setAttribute("class", "canvas-code-block__live");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    live.setAttribute("data-canvas-copy-live", "");
    setInlineStyle(live, { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0,0,0,0)" });
    const btn = doc.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("class", "canvas-code-block__copy");
    btn.setAttribute("aria-label", "Copy code");
    btn.setAttribute("data-copied", "false");
    btn.textContent = "Copy";
    const setCopied = (copied) => {
      btn.setAttribute("data-copied", copied ? "true" : "false");
      btn.setAttribute("aria-label", copied ? "Copied to clipboard" : "Copy code");
      btn.textContent = copied ? "Copied" : "Copy";
      setOrRemoveAttr(btn, "class", null);
      btn.setAttribute(
        "class",
        copied ? "canvas-code-block__copy canvas-code-block__copy--copied" : "canvas-code-block__copy"
      );
      live.textContent = copied ? "Copied to clipboard" : "";
    };
    btn.onclick = async (ev) => {
      ev?.preventDefault?.();
      const ok = await copyTextNoFocusSteal(codeString);
      if (!ok) {
        live.textContent = "Copy failed";
        return;
      }
      setCopied(true);
      clearCopiedTimer(el);
      const timer = setTimeout(() => {
        setCopied(false);
        copiedTimers.delete(el);
      }, 1e3);
      copiedTimers.set(el, timer);
    };
    const pre = doc.createElement("pre");
    pre.setAttribute("class", "canvas-code-block__pre");
    const code = doc.createElement("code");
    code.setAttribute("class", `canvas-code-block__code language-${language}`);
    code.textContent = codeString;
    pre.appendChild(code);
    el.appendChild(btn);
    el.appendChild(pre);
    el.appendChild(live);
  },
  unmount(el) {
    clearCopiedTimer(el);
  }
});

// src/Browser/components/content/Image.js
var ASPECT = /* @__PURE__ */ new Set(["1:1", "3:2", "3:4", "4:3", "16:9"]);
var SCALE = /* @__PURE__ */ new Set(["fit", "fill"]);
var ASPECT_RATIO = {
  "1:1": "1 / 1",
  "3:2": "3 / 2",
  "3:4": "3 / 4",
  "4:3": "4 / 3",
  "16:9": "16 / 9"
};
function resolveImageAccessibility(props = {}) {
  const decorative = props.decorative === true || props.decorative === "true" || props.role === "presentation" || props.role === "none";
  const alt = asText(props.alt);
  if (decorative) {
    return { ok: true, alt: "", decorative: true };
  }
  if (alt) {
    return { ok: true, alt, decorative: false };
  }
  return { ok: false, reason: "alt-or-decorative-required" };
}
function resolveSafeSrc(props, ctx) {
  const raw = asText(props.src);
  if (!raw) return void 0;
  const policy = ctx.urlPolicy && typeof ctx.urlPolicy.safeUrl === "function" ? ctx.urlPolicy.safeUrl : safeUrl;
  return policy(raw);
}
function showFallback(el, doc, message) {
  el.setAttribute("data-status", "error");
  el.setAttribute("data-broken", "true");
  const fb = doc.createElement("div");
  fb.setAttribute("class", "canvas-image__fallback");
  fb.setAttribute("role", "img");
  fb.setAttribute("aria-label", message);
  fb.textContent = message;
  el.appendChild(fb);
}
var Image = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Image");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const aspect = ASPECT.has(asText(props.aspectRatio)) ? asText(props.aspectRatio) : "3:2";
    const scale = SCALE.has(asText(props.scale)) ? asText(props.scale) : "fill";
    setClass(el, `canvas-image canvas-image--scale-${scale}`);
    el.setAttribute("data-aspect", aspect);
    setInlineStyle(el, { "aspect-ratio": ASPECT_RATIO[aspect] });
    clearChildren(el);
    const a11y = resolveImageAccessibility(props);
    if (!a11y.ok) {
      showFallback(el, doc, "Image missing alt text");
      el.setAttribute("data-a11y", "missing-alt");
      return;
    }
    const safe = resolveSafeSrc(props, ctx);
    if (!safe) {
      showFallback(el, doc, props.src ? "Unsafe image URL blocked" : "Image unavailable");
      el.setAttribute("data-a11y", a11y.decorative ? "decorative" : "labelled");
      return;
    }
    el.setAttribute("data-status", "ready");
    el.setAttribute("data-a11y", a11y.decorative ? "decorative" : "labelled");
    el.removeAttribute("data-broken");
    const img = doc.createElement("img");
    img.setAttribute("class", `canvas-image__img canvas-image__img--${scale}`);
    img.setAttribute("src", safe);
    if (a11y.decorative) {
      img.setAttribute("alt", "");
      img.setAttribute("role", "presentation");
    } else {
      img.setAttribute("alt", a11y.alt);
    }
    img.onload = () => {
      el.setAttribute("data-status", "ready");
      el.removeAttribute("data-broken");
      setOrRemoveAttr(img, "data-broken", null);
    };
    img.onerror = () => {
      el.setAttribute("data-broken", "true");
      el.setAttribute("data-status", "error");
      img.setAttribute("data-broken", "true");
      clearChildren(el);
      showFallback(el, doc, "Image failed to load");
    };
    el.appendChild(img);
  }
});

// src/Browser/components/content/ImageBlock.js
var ImageBlock = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "ImageBlock");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    setClass(el, "canvas-image-block");
    clearChildren(el);
    const a11y = resolveImageAccessibility(props);
    if (!a11y.ok) {
      el.setAttribute("data-status", "error");
      el.setAttribute("data-a11y", "missing-alt");
      const fb = doc.createElement("div");
      fb.setAttribute("class", "canvas-image-block__fallback");
      fb.setAttribute("role", "img");
      fb.setAttribute("aria-label", "Image missing alt text");
      fb.textContent = "Image missing alt text";
      el.appendChild(fb);
      return;
    }
    const safe = resolveSafeSrc(props, ctx);
    if (!safe) {
      el.setAttribute("data-status", "error");
      el.setAttribute("data-a11y", a11y.decorative ? "decorative" : "labelled");
      const fb = doc.createElement("div");
      fb.setAttribute("class", "canvas-image-block__fallback");
      fb.setAttribute("role", "img");
      fb.setAttribute(
        "aria-label",
        props.src ? "Unsafe image URL blocked" : "Image unavailable"
      );
      fb.textContent = props.src ? "Unsafe image URL blocked" : "Image unavailable";
      el.appendChild(fb);
      return;
    }
    el.setAttribute("data-status", "loading");
    el.setAttribute("data-a11y", a11y.decorative ? "decorative" : "labelled");
    el.removeAttribute("data-broken");
    const cssUrl = ctx.urlPolicy && typeof ctx.urlPolicy.toCssUrl === "function" ? ctx.urlPolicy.toCssUrl(safe) : toCssUrl(safe);
    if (cssUrl) {
      setInlineStyle(el, { "--canvas-image-block-bg": cssUrl });
      el.setAttribute("class", "canvas-image-block canvas-image-block--has-bg");
    }
    const img = doc.createElement("img");
    img.setAttribute("class", "canvas-image-block__image");
    img.setAttribute("src", safe);
    if (a11y.decorative) {
      img.setAttribute("alt", "");
      img.setAttribute("role", "presentation");
    } else {
      img.setAttribute("alt", a11y.alt);
    }
    const loader = doc.createElement("div");
    loader.setAttribute("class", "canvas-image-block__loader");
    loader.setAttribute("aria-hidden", "true");
    if (props.imageLoading === false) {
      loader.setAttribute("hidden", "true");
      el.setAttribute("data-status", "ready");
    }
    img.onload = () => {
      el.setAttribute("data-status", "ready");
      el.removeAttribute("data-broken");
      loader.setAttribute("hidden", "true");
      img.removeAttribute("data-broken");
    };
    img.onerror = () => {
      el.setAttribute("data-broken", "true");
      el.setAttribute("data-status", "error");
      el.removeAttribute("style");
      setClass(el, "canvas-image-block canvas-image-block--error");
      clearChildren(el);
      const fb = doc.createElement("div");
      fb.setAttribute("class", "canvas-image-block__fallback");
      fb.setAttribute("role", "img");
      fb.setAttribute("aria-label", "Image failed to load");
      fb.textContent = "Image failed to load";
      el.appendChild(fb);
    };
    el.appendChild(img);
    el.appendChild(loader);
  }
});

export {
  toNumber,
  BUILTINS,
  LAZY_BUILTINS,
  ACTION_STEPS,
  ACTION_NAMES,
  isBuiltin,
  RESERVED_CALLS,
  isReservedCall,
  dispatchContinueConversation,
  ListItem,
  ListBlock,
  CodeBlock,
  Image,
  ImageBlock
};
