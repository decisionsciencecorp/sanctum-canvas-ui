var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/Browser/security/urlPolicy.js
var urlPolicy_exports = {};
__export(urlPolicy_exports, {
  isHostAllowed: () => isHostAllowed,
  mergeNoopenerFeatures: () => mergeNoopenerFeatures,
  relForTarget: () => relForTarget,
  safeOpenUrl: () => safeOpenUrl,
  safeUrl: () => safeUrl,
  sanitizeUrl: () => sanitizeUrl,
  toCssUrl: () => toCssUrl
});
function stripControlCharsForSchemeCheck(url) {
  return url.replace(SCHEME_OBFUSCATION_RE, "");
}
function hasAbsoluteScheme(normalized) {
  return ABSOLUTE_SCHEME_RE.test(normalized);
}
function isAllowedRelative(trimmed) {
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("/")) return true;
  if (trimmed.startsWith("./") || trimmed.startsWith("../")) return true;
  if (trimmed.startsWith("#")) return true;
  const normalized = stripControlCharsForSchemeCheck(trimmed);
  return !hasAbsoluteScheme(normalized);
}
function isHostAllowed(hostname, allowedHosts) {
  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0) return true;
  const host = String(hostname || "").toLowerCase();
  if (!host) return false;
  for (const entry of allowedHosts) {
    if (typeof entry !== "string" || !entry) continue;
    let pattern = entry.toLowerCase().trim();
    if (pattern.startsWith("*.")) pattern = pattern.slice(1);
    if (pattern.startsWith(".")) {
      const apex = pattern.slice(1);
      if (host === apex || host.endsWith(pattern)) return true;
    } else if (host === pattern) {
      return true;
    }
  }
  return false;
}
function passesHostAllowlist(trimmed, opts = {}) {
  const allowedHosts = opts.allowedHosts;
  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0) return true;
  const normalized = stripControlCharsForSchemeCheck(trimmed);
  if (!hasAbsoluteScheme(normalized)) {
    return isAllowedRelative(trimmed);
  }
  if (/^mailto:/i.test(normalized)) return true;
  try {
    const parsed = new URL(normalized);
    return isHostAllowed(parsed.hostname, allowedHosts);
  } catch {
    return false;
  }
}
function safeUrl(url, opts = {}) {
  if (typeof url !== "string") return void 0;
  const trimmed = url.trim();
  if (!trimmed) return void 0;
  const normalized = stripControlCharsForSchemeCheck(trimmed);
  if (DANGEROUS_URI_RE.test(normalized)) return void 0;
  if (hasAbsoluteScheme(normalized)) {
    if (!ALLOWED_ABSOLUTE_SCHEME_RE.test(normalized)) return void 0;
  } else if (!isAllowedRelative(trimmed)) {
    return void 0;
  }
  if (!passesHostAllowlist(trimmed, opts)) return void 0;
  return trimmed;
}
function mergeNoopenerFeatures(features = "") {
  const parts = new Set(
    String(features).split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
  );
  parts.add("noopener");
  parts.add("noreferrer");
  return [...parts].join(",");
}
function relForTarget(target = "_self") {
  if (target === "_blank") return "noopener noreferrer";
  return "";
}
function safeOpenUrl(url, target = "_blank", features = "noopener,noreferrer", opts = {}) {
  if (typeof globalThis.window === "undefined") return null;
  const safe = safeUrl(url, opts);
  if (!safe) return null;
  const merged = mergeNoopenerFeatures(features);
  return globalThis.window.open(safe, target, merged);
}
function toCssUrl(url, opts = {}) {
  const safe = safeUrl(url, opts);
  if (!safe) return void 0;
  const resolved = resolveAgainstDocument(safe, opts);
  const escaped = resolved.replace(/[\\"\n\r]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `);
  return `url("${escaped}")`;
}
function resolveAgainstDocument(url, opts = {}) {
  if (hasAbsoluteScheme(url)) return url;
  const base = typeof opts.baseUrl === "string" && opts.baseUrl ? opts.baseUrl : globalThis.document?.baseURI ?? globalThis.location?.href;
  if (!base) return url;
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}
var DANGEROUS_URI_RE, SCHEME_OBFUSCATION_RE, ABSOLUTE_SCHEME_RE, ALLOWED_ABSOLUTE_SCHEME_RE, sanitizeUrl;
var init_urlPolicy = __esm({
  "src/Browser/security/urlPolicy.js"() {
    DANGEROUS_URI_RE = /^\s*(?:javascript|data|vbscript|file)\s*:/i;
    SCHEME_OBFUSCATION_RE = /[\u0000-\u001F\u007F]/g;
    ABSOLUTE_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
    ALLOWED_ABSOLUTE_SCHEME_RE = /^(?:https?|mailto):/i;
    sanitizeUrl = safeUrl;
  }
});

// src/Browser/components/content/shared.js
function requireDocument(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("content component: ctx.document required");
  }
  return doc;
}
function setClass(el2, className) {
  el2.setAttribute("class", String(className).trim());
}
function setOrRemoveAttr(el2, name, value) {
  if (value == null || value === false || value === "") {
    el2.removeAttribute(name);
  } else {
    el2.setAttribute(name, value === true ? "true" : String(value));
  }
}
function clearChildren(el2) {
  while (el2.firstChild) {
    el2.removeChild(el2.firstChild);
  }
}
function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function resolveStatus(props = {}) {
  const raw = props.status ?? props.state;
  if (raw === "loading" || raw === "empty" || raw === "error" || raw === "ready") {
    return raw;
  }
  if (props.loading === true) return "loading";
  if (props.error != null && props.error !== false) return "error";
  if (props.empty === true) return "empty";
  return "ready";
}
function findStatusTextChild(el2) {
  const cached = statusTextByHost.get(el2);
  if (cached && cached.parentNode === el2) return cached;
  for (const child of el2.childNodes ?? []) {
    if (child.nodeType === 1 && child.getAttribute?.("data-canvas-status-text") != null) {
      statusTextByHost.set(el2, child);
      return child;
    }
  }
  return null;
}
function applySurfaceStatus(el2, doc, props = {}, opts = {}) {
  const status = resolveStatus(props);
  el2.setAttribute("data-status", status);
  setOrRemoveAttr(el2, "aria-busy", status === "loading" ? "true" : null);
  let statusEl = findStatusTextChild(el2);
  const show = opts.showStatusText !== false && (status === "loading" || status === "empty" || status === "error");
  if (show) {
    if (!statusEl) {
      statusEl = doc.createElement("span");
      statusEl.setAttribute("data-canvas-status-text", "");
      statusEl.setAttribute("class", "canvas-status-text");
      el2.appendChild(statusEl);
      statusTextByHost.set(el2, statusEl);
    }
    const msg = status === "loading" ? asText(props.loadingMessage) || opts.loadingMessage || STATUS_LABELS.loading : status === "empty" ? asText(props.emptyMessage) || opts.emptyMessage || STATUS_LABELS.empty : asText(props.errorMessage ?? props.error) || opts.errorMessage || STATUS_LABELS.error;
    statusEl.textContent = msg;
    statusEl.setAttribute("role", "status");
    setOrRemoveAttr(statusEl, "aria-live", status === "error" ? "assertive" : "polite");
  } else if (statusEl && statusEl.parentNode) {
    statusEl.parentNode.removeChild(statusEl);
    statusTextByHost.delete(el2);
    statusEl = null;
  }
  return { status, statusEl };
}
function applyVariantCue(el2, variant, labelMap = {}) {
  const v = String(variant || "neutral");
  el2.setAttribute("data-variant", v);
  const label = labelMap[v] || v;
  const existing = el2.getAttribute("aria-label");
  if (!existing) {
    el2.setAttribute("aria-label", label);
  }
  return v;
}
function lifecycle(impl) {
  return {
    create(props = {}, ctx = {}) {
      const doc = requireDocument(ctx);
      const el2 = impl.mount(doc, props, ctx);
      impl.patch(el2, props, ctx);
      return el2;
    },
    update(el2, props = {}, ctx = {}) {
      impl.patch(el2, props, ctx);
    },
    destroy(el2, ctx = {}) {
      impl.unmount?.(el2, ctx);
    },
    // Content primitives render from props; keyed reconciler must not wipe chrome.
    ownsChildren: impl.ownsChildren !== false
  };
}
var SURFACE_STATUS, STATUS_LABELS, statusTextByHost;
var init_shared = __esm({
  "src/Browser/components/content/shared.js"() {
    SURFACE_STATUS = Object.freeze({
      READY: "ready",
      LOADING: "loading",
      EMPTY: "empty",
      ERROR: "error"
    });
    STATUS_LABELS = Object.freeze({
      ready: "",
      loading: "Loading",
      empty: "No content",
      error: "Error"
    });
    statusTextByHost = /* @__PURE__ */ new WeakMap();
  }
});

// src/Browser/renderer/inlineStyle.js
function setInlineStyle(el2, declarations) {
  if (!el2 || !declarations) return;
  const style = (
    /** @type {any} */
    el2.style
  );
  if (style && typeof style.setProperty === "function") {
    for (const [prop, value] of Object.entries(declarations)) {
      if (value == null || value === "") style.removeProperty(prop);
      else style.setProperty(prop, String(value));
    }
    return;
  }
  const existing = parseStyleAttr(el2.getAttribute?.("style") || "");
  for (const [prop, value] of Object.entries(declarations)) {
    if (value == null || value === "") delete existing[prop];
    else existing[prop] = String(value);
  }
  const text2 = Object.entries(existing).map(([k, v]) => `${k}: ${v}`).join("; ");
  if (text2) el2.setAttribute("style", text2);
  else el2.removeAttribute("style");
}
function clearInlineStyle(el2) {
  if (!el2) return;
  const style = (
    /** @type {any} */
    el2.style
  );
  if (style && typeof style.setProperty === "function" && typeof style.cssText === "string") {
    style.cssText = "";
  }
  if (typeof el2.removeAttribute === "function") el2.removeAttribute("style");
}
function parseStyleAttr(text2) {
  const out = {};
  for (const part of text2.split(";")) {
    const i = part.indexOf(":");
    if (i <= 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}
var init_inlineStyle = __esm({
  "src/Browser/renderer/inlineStyle.js"() {
  }
});

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
function isBuiltin(name) {
  return BUILTIN_NAMES.has(name);
}
function isReservedCall(name) {
  return name in RESERVED_CALLS;
}
var BUILTINS, LAZY_BUILTINS, ACTION_STEPS, ACTION_NAMES, BUILTIN_NAMES, RESERVED_CALLS;
var init_builtins = __esm({
  "src/Browser/lang/builtins.js"() {
    BUILTINS = {
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
          const num2 = toNumber(n);
          const d = decimals != null ? toNumber(decimals) : 0;
          const factor = Math.pow(10, d);
          return Math.round(num2 * factor) / factor;
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
    LAZY_BUILTINS = /* @__PURE__ */ new Set(["Each"]);
    ACTION_STEPS = {
      Run: "run",
      ToAssistant: "continue_conversation",
      OpenUrl: "open_url",
      Set: "set",
      Reset: "reset"
    };
    ACTION_NAMES = /* @__PURE__ */ new Set(["Action", ...Object.keys(ACTION_STEPS)]);
    BUILTIN_NAMES = /* @__PURE__ */ new Set([
      ...Object.keys(BUILTINS),
      ...LAZY_BUILTINS,
      ...ACTION_NAMES
    ]);
    RESERVED_CALLS = { Query: "Query", Mutation: "Mutation" };
  }
});

// src/Browser/components/chat/continueConversation.js
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
var MAX_CONTINUE_CHARS;
var init_continueConversation = __esm({
  "src/Browser/components/chat/continueConversation.js"() {
    init_builtins();
    MAX_CONTINUE_CHARS = 4e3;
  }
});

// src/Browser/components/content/ListItem.js
function hasAction(props) {
  return props.action != null && props.action !== false;
}
function renderIndicator(el2, doc, props, ctx) {
  const variant = VARIANTS7.has(asText(props.variant)) ? asText(props.variant) : "number";
  const listHasSubtitle = props.listHasSubtitle === true || !!asText(props.subtitle);
  const index = typeof props.index === "number" ? props.index : 0;
  const indicator = doc.createElement("div");
  let indCls = "canvas-list-item__indicator";
  if (!listHasSubtitle) indCls += " canvas-list-item__indicator--no-subtitle";
  if (hasAction(props)) indCls += " canvas-list-item__indicator--clickable";
  indicator.setAttribute("class", indCls);
  indicator.setAttribute("data-variant", variant);
  if (variant === "number") {
    const num2 = doc.createElement("div");
    num2.setAttribute("class", "canvas-list-item__indicator-number");
    num2.textContent = String(index + 1);
    indicator.appendChild(num2);
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
  el2.appendChild(indicator);
}
var VARIANTS7, SIZES3, ListItem;
var init_ListItem = __esm({
  "src/Browser/components/content/ListItem.js"() {
    init_shared();
    init_continueConversation();
    init_urlPolicy();
    VARIANTS7 = /* @__PURE__ */ new Set(["number", "image", "icon"]);
    SIZES3 = /* @__PURE__ */ new Set(["default", "small"]);
    ListItem = lifecycle({
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "ListItem");
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const size = SIZES3.has(asText(props.size)) ? asText(props.size) : "default";
        const actionable = hasAction(props);
        const streaming = ctx.stream?.isStreaming === true;
        let wrapCls = "canvas-list-item-wrapper";
        if (size === "small") wrapCls += " canvas-list-item-wrapper--small";
        if (actionable) wrapCls += " canvas-list-item-wrapper--with-action";
        setClass(el2, wrapCls);
        el2.setAttribute("data-size", size);
        el2.setAttribute("data-actionable", actionable ? "true" : "false");
        setOrRemoveAttr(el2, "data-streaming-blocked", streaming && actionable ? "true" : null);
        clearChildren(el2);
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
        el2.appendChild(row);
      }
    });
  }
});

// src/Browser/components/content/ListBlock.js
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
var VARIANTS8, SIZES4, ListBlock;
var init_ListBlock = __esm({
  "src/Browser/components/content/ListBlock.js"() {
    init_shared();
    init_ListItem();
    VARIANTS8 = /* @__PURE__ */ new Set(["number", "image", "icon"]);
    SIZES4 = /* @__PURE__ */ new Set(["default", "small"]);
    ListBlock = lifecycle({
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "ListBlock");
        el2.setAttribute("role", "list");
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const variant = VARIANTS8.has(asText(props.variant)) ? asText(props.variant) : "number";
        const size = SIZES4.has(asText(props.size)) ? asText(props.size) : "default";
        const items = normalizeListItems(props);
        const listHasSubtitle = items.some((it) => !!asText(it.subtitle));
        let cls = "canvas-list-block";
        if (size === "small") cls += " canvas-list-block--small";
        setClass(el2, cls);
        el2.setAttribute("data-variant", variant);
        el2.setAttribute("data-size", size);
        el2.setAttribute("data-item-count", String(items.length));
        clearChildren(el2);
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
          ctx.renderChildren(el2, enhanced);
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
          el2.appendChild(child);
        }
      }
    });
  }
});

// src/Browser/components/content/CodeBlock.js
async function copyTextNoFocusSteal(text2) {
  const value = String(text2 ?? "");
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
function clearCopiedTimer(el2) {
  const t = copiedTimers.get(el2);
  if (t != null) {
    clearTimeout(t);
    copiedTimers.delete(el2);
  }
}
var copiedTimers, CodeBlock;
var init_CodeBlock = __esm({
  "src/Browser/components/content/CodeBlock.js"() {
    init_shared();
    init_inlineStyle();
    copiedTimers = /* @__PURE__ */ new WeakMap();
    CodeBlock = lifecycle({
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "CodeBlock");
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const language = asText(props.language) || "text";
        const codeString = asText(props.codeString ?? props.code ?? props.children);
        setClass(el2, "canvas-code-block");
        el2.setAttribute("data-language", language);
        clearChildren(el2);
        clearCopiedTimer(el2);
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
          clearCopiedTimer(el2);
          const timer = setTimeout(() => {
            setCopied(false);
            copiedTimers.delete(el2);
          }, 1e3);
          copiedTimers.set(el2, timer);
        };
        const pre = doc.createElement("pre");
        pre.setAttribute("class", "canvas-code-block__pre");
        const code = doc.createElement("code");
        code.setAttribute("class", `canvas-code-block__code language-${language}`);
        code.textContent = codeString;
        pre.appendChild(code);
        el2.appendChild(btn);
        el2.appendChild(pre);
        el2.appendChild(live);
      },
      unmount(el2) {
        clearCopiedTimer(el2);
      }
    });
  }
});

// src/Browser/components/content/Image.js
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
function showFallback(el2, doc, message) {
  el2.setAttribute("data-status", "error");
  el2.setAttribute("data-broken", "true");
  const fb = doc.createElement("div");
  fb.setAttribute("class", "canvas-image__fallback");
  fb.setAttribute("role", "img");
  fb.setAttribute("aria-label", message);
  fb.textContent = message;
  el2.appendChild(fb);
}
var ASPECT, SCALE, ASPECT_RATIO, Image;
var init_Image = __esm({
  "src/Browser/components/content/Image.js"() {
    init_shared();
    init_urlPolicy();
    init_inlineStyle();
    ASPECT = /* @__PURE__ */ new Set(["1:1", "3:2", "3:4", "4:3", "16:9"]);
    SCALE = /* @__PURE__ */ new Set(["fit", "fill"]);
    ASPECT_RATIO = {
      "1:1": "1 / 1",
      "3:2": "3 / 2",
      "3:4": "3 / 4",
      "4:3": "4 / 3",
      "16:9": "16 / 9"
    };
    Image = lifecycle({
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "Image");
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const aspect = ASPECT.has(asText(props.aspectRatio)) ? asText(props.aspectRatio) : "3:2";
        const scale = SCALE.has(asText(props.scale)) ? asText(props.scale) : "fill";
        setClass(el2, `canvas-image canvas-image--scale-${scale}`);
        el2.setAttribute("data-aspect", aspect);
        setInlineStyle(el2, { "aspect-ratio": ASPECT_RATIO[aspect] });
        clearChildren(el2);
        const a11y = resolveImageAccessibility(props);
        if (!a11y.ok) {
          showFallback(el2, doc, "Image missing alt text");
          el2.setAttribute("data-a11y", "missing-alt");
          return;
        }
        const safe = resolveSafeSrc(props, ctx);
        if (!safe) {
          showFallback(el2, doc, props.src ? "Unsafe image URL blocked" : "Image unavailable");
          el2.setAttribute("data-a11y", a11y.decorative ? "decorative" : "labelled");
          return;
        }
        el2.setAttribute("data-status", "ready");
        el2.setAttribute("data-a11y", a11y.decorative ? "decorative" : "labelled");
        el2.removeAttribute("data-broken");
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
          el2.setAttribute("data-status", "ready");
          el2.removeAttribute("data-broken");
          setOrRemoveAttr(img, "data-broken", null);
        };
        img.onerror = () => {
          el2.setAttribute("data-broken", "true");
          el2.setAttribute("data-status", "error");
          img.setAttribute("data-broken", "true");
          clearChildren(el2);
          showFallback(el2, doc, "Image failed to load");
        };
        el2.appendChild(img);
      }
    });
  }
});

// src/Browser/components/content/ImageBlock.js
var ImageBlock;
var init_ImageBlock = __esm({
  "src/Browser/components/content/ImageBlock.js"() {
    init_shared();
    init_Image();
    init_urlPolicy();
    init_inlineStyle();
    ImageBlock = lifecycle({
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "ImageBlock");
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        setClass(el2, "canvas-image-block");
        clearChildren(el2);
        const a11y = resolveImageAccessibility(props);
        if (!a11y.ok) {
          el2.setAttribute("data-status", "error");
          el2.setAttribute("data-a11y", "missing-alt");
          const fb = doc.createElement("div");
          fb.setAttribute("class", "canvas-image-block__fallback");
          fb.setAttribute("role", "img");
          fb.setAttribute("aria-label", "Image missing alt text");
          fb.textContent = "Image missing alt text";
          el2.appendChild(fb);
          return;
        }
        const safe = resolveSafeSrc(props, ctx);
        if (!safe) {
          el2.setAttribute("data-status", "error");
          el2.setAttribute("data-a11y", a11y.decorative ? "decorative" : "labelled");
          const fb = doc.createElement("div");
          fb.setAttribute("class", "canvas-image-block__fallback");
          fb.setAttribute("role", "img");
          fb.setAttribute(
            "aria-label",
            props.src ? "Unsafe image URL blocked" : "Image unavailable"
          );
          fb.textContent = props.src ? "Unsafe image URL blocked" : "Image unavailable";
          el2.appendChild(fb);
          return;
        }
        el2.setAttribute("data-status", "loading");
        el2.setAttribute("data-a11y", a11y.decorative ? "decorative" : "labelled");
        el2.removeAttribute("data-broken");
        const cssUrl = ctx.urlPolicy && typeof ctx.urlPolicy.toCssUrl === "function" ? ctx.urlPolicy.toCssUrl(safe) : toCssUrl(safe);
        if (cssUrl) {
          setInlineStyle(el2, { "--canvas-image-block-bg": cssUrl });
          el2.setAttribute("class", "canvas-image-block canvas-image-block--has-bg");
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
          el2.setAttribute("data-status", "ready");
        }
        img.onload = () => {
          el2.setAttribute("data-status", "ready");
          el2.removeAttribute("data-broken");
          loader.setAttribute("hidden", "true");
          img.removeAttribute("data-broken");
        };
        img.onerror = () => {
          el2.setAttribute("data-broken", "true");
          el2.setAttribute("data-status", "error");
          el2.removeAttribute("style");
          setClass(el2, "canvas-image-block canvas-image-block--error");
          clearChildren(el2);
          const fb = doc.createElement("div");
          fb.setAttribute("class", "canvas-image-block__fallback");
          fb.setAttribute("role", "img");
          fb.setAttribute("aria-label", "Image failed to load");
          fb.textContent = "Image failed to load";
          el2.appendChild(fb);
        };
        el2.appendChild(img);
        el2.appendChild(loader);
      }
    });
  }
});

// src/Browser/components/containers/shared.js
function requireDocument2(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("container component: ctx.document required");
  }
  return doc;
}
function setClass2(el2, className) {
  el2.setAttribute("class", String(className).trim());
}
function clearChildren2(el2) {
  while (el2.firstChild) {
    el2.removeChild(el2.firstChild);
  }
}
function resolveIsStreaming(props = {}, ctx = {}) {
  if (props.isStreaming === true || props.streaming === true) return true;
  if (props.isStreaming === false || props.streaming === false) return false;
  const stream = ctx.stream;
  if (stream && typeof stream === "object" && stream.isStreaming === true) {
    return true;
  }
  return false;
}
function normalizeSectionEntry(raw, index) {
  if (raw == null) {
    return { value: String(index), trigger: "", content: null };
  }
  if (typeof raw === "string") {
    return { value: String(index), trigger: raw, content: null };
  }
  let obj = (
    /** @type {Record<string, unknown>} */
    raw
  );
  if (obj.props && typeof obj.props === "object") {
    obj = /** @type {Record<string, unknown>} */
    obj.props;
  }
  const value = asText2(obj.value) || String(index);
  const trigger = asText2(obj.trigger ?? obj.title ?? obj.label);
  const content = obj.content !== void 0 ? obj.content : obj.children !== void 0 ? obj.children : null;
  return { value, trigger, content };
}
function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections.map((s, i) => normalizeSectionEntry(s, i));
}
function normalizeStepEntry(raw, index) {
  if (raw == null) {
    return { title: "", details: null, number: index + 1 };
  }
  let obj = (
    /** @type {Record<string, unknown>} */
    raw
  );
  if (obj.props && typeof obj.props === "object") {
    obj = /** @type {Record<string, unknown>} */
    obj.props;
  }
  const num2 = Number.isInteger(obj.number) && /** @type {number} */
  obj.number > 0 ? (
    /** @type {number} */
    obj.number
  ) : index + 1;
  return {
    title: asText2(obj.title),
    details: obj.details !== void 0 ? obj.details : obj.content ?? null,
    number: num2
  };
}
function normalizeSteps(items) {
  if (!Array.isArray(items)) return [];
  return items.map((s, i) => normalizeStepEntry(s, i));
}
function renderPanelContent(panel, content, ctx) {
  clearChildren2(panel);
  const doc = requireDocument2(ctx);
  if (content == null) return;
  if (typeof content === "string" || typeof content === "number") {
    panel.appendChild(doc.createTextNode(String(content)));
    return;
  }
  if (Array.isArray(content)) {
    if (typeof ctx.renderChildren === "function") {
      ctx.renderChildren(panel, content);
    } else {
      for (const part of content) {
        if (typeof part === "string" || typeof part === "number") {
          panel.appendChild(doc.createTextNode(String(part)));
        }
      }
    }
    return;
  }
  if (typeof content === "object" && content !== null && "type" in /** @type {object} */
  content) {
    if (typeof ctx.renderChildren === "function") {
      ctx.renderChildren(panel, [content]);
    }
  }
}
function setOrRemoveAttr2(el2, name, value) {
  if (value == null || value === false || value === "") {
    el2.removeAttribute(name);
  } else {
    el2.setAttribute(name, value === true ? "true" : String(value));
  }
}
function asText2(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function normalizeItem(raw) {
  if (raw == null) return null;
  if (typeof raw !== "object") return null;
  const obj = (
    /** @type {Record<string, unknown>} */
    raw
  );
  const props = obj.props && typeof obj.props === "object" ? (
    /** @type {Record<string, unknown>} */
    obj.props
  ) : obj;
  const value = asText2(props.value);
  if (!value) return null;
  const trigger = asText2(props.trigger ?? props.label ?? props.title);
  let content = props.content;
  if (content == null && Array.isArray(obj.children)) {
    content = obj.children;
  }
  if (content == null && Array.isArray(props.children)) {
    content = props.children;
  }
  if (!Array.isArray(content)) {
    content = content == null ? [] : [content];
  }
  const out = { value, trigger, content };
  if (obj.id != null) out.id = /** @type {string|number} */
  obj.id;
  else if (props.id != null) out.id = /** @type {string|number} */
  props.id;
  if (obj.key != null) out.key = /** @type {string|number} */
  obj.key;
  else if (props.key != null) out.key = /** @type {string|number} */
  props.key;
  return out;
}
function normalizeItems(props = {}, itemType) {
  const rawList = Array.isArray(props.items) ? props.items : Array.isArray(props.children) ? props.children : [];
  const out = [];
  for (const raw of rawList) {
    if (itemType && raw && typeof raw === "object" && /** @type {Record<string, unknown>} */
    raw.type != null && /** @type {Record<string, unknown>} */
    raw.type !== itemType) {
      continue;
    }
    const item = normalizeItem(raw);
    if (item) out.push(item);
  }
  return out;
}
function itemKey(item, index) {
  if (item.key != null) return String(item.key);
  if (item.id != null) return String(item.id);
  return item.value || String(index);
}
function contentSize(content) {
  try {
    return JSON.stringify(content ?? null).length;
  } catch {
    return Array.isArray(content) ? content.length : content == null ? 0 : 1;
  }
}
function findDirectByAttr(parent, attr, value) {
  const out = [];
  for (const child of parent.childNodes ?? []) {
    if (child.nodeType !== 1) continue;
    const el2 = (
      /** @type {Element} */
      child
    );
    if (value == null) {
      if (el2.getAttribute?.(attr) != null) out.push(el2);
    } else if (el2.getAttribute?.(attr) === value) {
      out.push(el2);
    }
  }
  return out;
}
function renderItemContent(host, content, ctx) {
  if (typeof ctx.renderChildren === "function") {
    ctx.renderChildren(host, content ?? []);
    return;
  }
  while (host.firstChild) host.removeChild(host.firstChild);
  const doc = ctx.document ?? host.ownerDocument ?? globalThis.document;
  for (const child of content ?? []) {
    if (child == null) continue;
    if (typeof child === "string" || typeof child === "number") {
      host.appendChild(doc.createTextNode(String(child)));
    } else if (typeof child === "object" && /** @type {Record<string, unknown>} */
    child.nodeType === 1) {
      host.appendChild(
        /** @type {Node} */
        child
      );
    } else if (typeof child === "object" && typeof /** @type {Record<string, unknown>} */
    child.type === "string") {
      const span = doc.createElement("span");
      span.setAttribute("data-canvas-stub", String(
        /** @type {Record<string, unknown>} */
        child.type
      ));
      const text2 = (
        /** @type {Record<string, unknown>} */
        child.props && typeof /** @type {Record<string, unknown>} */
        child.props === "object" ? asText2(
          /** @type {Record<string, unknown>} */
          /** @type {Record<string, unknown>} */
          child.props.text ?? /** @type {Record<string, unknown>} */
          /** @type {Record<string, unknown>} */
          child.props.content
        ) : ""
      );
      if (text2) span.textContent = text2;
      host.appendChild(span);
    }
  }
}
function nextUid() {
  _uid += 1;
  return `c${_uid}`;
}
function lifecycle2(impl) {
  return {
    create(props = {}, ctx = {}) {
      const doc = requireDocument2(ctx);
      const el2 = impl.mount(doc, props, ctx);
      impl.patch(el2, props, ctx);
      return el2;
    },
    update(el2, props = {}, ctx = {}) {
      impl.patch(el2, props, ctx);
    },
    destroy(el2, ctx = {}) {
      impl.unmount?.(el2, ctx);
    },
    // When true, keyed reconciler will not wipe this element's children.
    ownsChildren: impl.ownsChildren === true
  };
}
var _uid;
var init_shared2 = __esm({
  "src/Browser/components/containers/shared.js"() {
    _uid = 0;
  }
});

// src/Browser/runtime/formValidation.js
function compileSafePattern(pattern) {
  if (typeof pattern !== "string" || pattern.length === 0 || pattern.length > 200) {
    return null;
  }
  if (!SAFE_PATTERN_RE.test(pattern)) return null;
  if (/\(\?/.test(pattern) || /\*\*/.test(pattern)) return null;
  if (/\([^)]*[+*][^)]*\)[+*]/.test(pattern)) return null;
  try {
    return new RegExp(`^(?:${pattern})$`);
  } catch {
    return null;
  }
}
function validateField(value, rules = {}) {
  const str = value == null ? "" : String(value);
  if (rules.required && (value == null || str.trim() === "")) {
    return { ok: false, code: "required", message: "required" };
  }
  if (!rules.required && (value == null || str === "")) {
    return { ok: true };
  }
  if (rules.email && !EMAIL_RE.test(str)) {
    return { ok: false, code: "email", message: "invalid email" };
  }
  if (rules.url && !URL_RE.test(str)) {
    return { ok: false, code: "url", message: "invalid url" };
  }
  if (rules.number || rules.numeric) {
    if (Number.isNaN(Number(str)) || str.trim() === "") {
      return { ok: false, code: "number", message: "not a number" };
    }
  }
  const num2 = Number(str);
  if (rules.min != null && num2 < rules.min) {
    return { ok: false, code: "min", message: `min ${rules.min}` };
  }
  if (rules.max != null && num2 > rules.max) {
    return { ok: false, code: "max", message: `max ${rules.max}` };
  }
  if (rules.minLength != null && str.length < rules.minLength) {
    return { ok: false, code: "minLength", message: `minLength ${rules.minLength}` };
  }
  if (rules.maxLength != null && str.length > rules.maxLength) {
    return { ok: false, code: "maxLength", message: `maxLength ${rules.maxLength}` };
  }
  if (rules.pattern) {
    const re = compileSafePattern(rules.pattern);
    if (!re) {
      return { ok: false, code: "unsafe-pattern", message: "pattern rejected" };
    }
    if (!re.test(str)) {
      return { ok: false, code: "pattern", message: "pattern mismatch" };
    }
  }
  return { ok: true };
}
var EMAIL_RE, URL_RE, SAFE_PATTERN_RE;
var init_formValidation = __esm({
  "src/Browser/runtime/formValidation.js"() {
    EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
    SAFE_PATTERN_RE = /^[\^]?[\[\]a-zA-Z0-9\s\\\.\+\*\?\-\|_(){,}]+[$]?$/;
  }
});

// src/Browser/components/containers/sectionOpenState.js
function createSectionOpenState() {
  return {
    openItems: [],
    userSelected: false,
    prevLength: 0,
    prevIsStreaming: false
  };
}
function ensureIncludes(open, value) {
  if (!value) return open.slice();
  return open.includes(value) ? open.slice() : [...open, value];
}
function applySectionStreamTick(state, input) {
  const values = Array.isArray(input.sectionValues) ? input.sectionValues : [];
  const isStreaming2 = input.isStreaming === true;
  const first = values[0];
  const len = values.length;
  if (state.prevIsStreaming && !isStreaming2 && !state.userSelected && len > 0) {
    state.openItems = first ? [first] : [];
  } else if (isStreaming2 && len > state.prevLength && !state.userSelected) {
    const last = values[len - 1];
    if (last) {
      state.openItems = ensureIncludes(state.openItems, last);
    }
  } else if (!state.userSelected) {
    if (state.openItems.length === 0 && first) {
      state.openItems = [first];
    }
  }
  if (values.length > 0) {
    const allowed = new Set(values);
    state.openItems = state.openItems.filter((v) => allowed.has(v));
    if (!state.userSelected && state.openItems.length === 0 && first) {
      state.openItems = [first];
    }
  } else if (!state.userSelected) {
    state.openItems = [];
  }
  state.prevLength = len;
  state.prevIsStreaming = isStreaming2;
  return state.openItems.slice();
}
function applySectionUserChange(state, next) {
  state.userSelected = true;
  if (Array.isArray(next)) {
    state.openItems = next.map(String);
  } else if (next == null || next === "") {
    state.openItems = [];
  } else {
    state.openItems = [String(next)];
  }
  return state.openItems.slice();
}
function toggleSectionValue(state, value) {
  const v = String(value);
  const cur = state.openItems.slice();
  const idx = cur.indexOf(v);
  if (idx >= 0) cur.splice(idx, 1);
  else cur.push(v);
  return applySectionUserChange(state, cur);
}
function createStepsProgressState() {
  return {
    currentIndex: -1,
    userSelected: false,
    prevLength: 0,
    prevIsStreaming: false
  };
}
function applyStepsStreamTick(state, input) {
  const count = Math.max(0, Number(input.itemCount) || 0);
  const isStreaming2 = input.isStreaming === true;
  if (count === 0) {
    if (!state.userSelected) state.currentIndex = -1;
    state.prevLength = 0;
    state.prevIsStreaming = isStreaming2;
    return state.currentIndex;
  }
  if (!state.userSelected) {
    if (isStreaming2 && count > state.prevLength) {
      state.currentIndex = count - 1;
    } else if (state.currentIndex < 0 || state.currentIndex >= count) {
      state.currentIndex = 0;
    }
  } else if (state.currentIndex >= count) {
    state.currentIndex = count - 1;
  }
  state.prevLength = count;
  state.prevIsStreaming = isStreaming2;
  return state.currentIndex;
}
function applyStepsUserSelect(state, index) {
  state.userSelected = true;
  state.currentIndex = Math.max(0, Number(index) || 0);
  return state.currentIndex;
}
var init_sectionOpenState = __esm({
  "src/Browser/components/containers/sectionOpenState.js"() {
  }
});

// src/Browser/components/containers/SectionBlock.js
function getOpenState(host) {
  let s = openStateByHost.get(host);
  if (!s) {
    s = createSectionOpenState();
    openStateByHost.set(host, s);
  }
  return s;
}
function getItemMap(host) {
  let m = itemElsByHost.get(host);
  if (!m) {
    m = /* @__PURE__ */ new Map();
    itemElsByHost.set(host, m);
  }
  return m;
}
function syncOpenDom(host, openItems) {
  const open = new Set(openItems);
  host.setAttribute("data-open-values", openItems.join(","));
  const map = getItemMap(host);
  for (const [value, itemEl] of map) {
    const isOpen = open.has(value);
    itemEl.setAttribute("data-state", isOpen ? "open" : "closed");
    const trigger = itemEl._canvasTrigger;
    const panel = itemEl._canvasPanel;
    if (trigger) {
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      trigger.setAttribute("data-state", isOpen ? "open" : "closed");
    }
    if (panel) {
      panel.setAttribute("data-state", isOpen ? "open" : "closed");
      if (isOpen) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "true");
    }
  }
}
function buildItem(doc, section, host, ctx, foldable) {
  const item = doc.createElement("div");
  item.setAttribute("data-canvas-component", "SectionItem");
  item.setAttribute("data-section-value", section.value);
  setClass2(
    item,
    foldable ? "canvas-section-block__item" : "canvas-section-v2"
  );
  if (foldable) {
    const header = doc.createElement("h3");
    setClass2(header, "canvas-section-block__header");
    const trigger = doc.createElement("button");
    trigger.setAttribute("type", "button");
    setClass2(trigger, "canvas-section-block__trigger");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("data-state", "closed");
    trigger.setAttribute("id", `canvas-section-trigger-${section.value}`);
    const icon = doc.createElement("span");
    setClass2(icon, "canvas-section-block__icon");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "\u203A";
    const label = doc.createElement("span");
    setClass2(label, "canvas-section-block__trigger-text");
    label.textContent = section.trigger;
    trigger.appendChild(icon);
    trigger.appendChild(label);
    const panel = doc.createElement("div");
    setClass2(panel, "canvas-section-block__content");
    panel.setAttribute("role", "region");
    panel.setAttribute("data-state", "closed");
    panel.setAttribute("hidden", "true");
    panel.setAttribute(
      "aria-labelledby",
      `canvas-section-trigger-${section.value}`
    );
    trigger.setAttribute(
      "aria-controls",
      `canvas-section-panel-${section.value}`
    );
    panel.setAttribute("id", `canvas-section-panel-${section.value}`);
    trigger.onclick = () => {
      const state = getOpenState(host);
      const next = toggleSectionValue(state, section.value);
      syncOpenDom(host, next);
    };
    header.appendChild(trigger);
    item.appendChild(header);
    item.appendChild(panel);
    item._canvasTrigger = trigger;
    item._canvasPanel = panel;
    renderPanelContent(panel, section.content, ctx);
  } else {
    const head = doc.createElement("div");
    setClass2(head, "canvas-section-v2__header");
    const t = doc.createElement("div");
    setClass2(t, "canvas-section-v2__trigger");
    t.textContent = section.trigger;
    head.appendChild(t);
    const panel = doc.createElement("div");
    setClass2(panel, "canvas-section-v2__content");
    item.appendChild(head);
    item.appendChild(panel);
    item._canvasPanel = panel;
    item.setAttribute("data-state", "open");
    renderPanelContent(panel, section.content, ctx);
  }
  return item;
}
var openStateByHost, itemElsByHost, SectionBlock;
var init_SectionBlock = __esm({
  "src/Browser/components/containers/SectionBlock.js"() {
    init_shared2();
    init_sectionOpenState();
    openStateByHost = /* @__PURE__ */ new WeakMap();
    itemElsByHost = /* @__PURE__ */ new WeakMap();
    SectionBlock = lifecycle2({
      ownsChildren: true,
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "SectionBlock");
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = requireDocument2(ctx);
        const foldable = props.isFoldable !== false;
        const sections = normalizeSections(
          props.sections ?? props.items ?? props.children
        );
        const isStreaming2 = resolveIsStreaming(props, ctx);
        setClass2(
          el2,
          foldable ? "canvas-section-block" : "canvas-section-block canvas-section-block--static"
        );
        el2.setAttribute("data-foldable", foldable ? "true" : "false");
        el2.setAttribute("data-streaming", isStreaming2 ? "true" : "false");
        el2.setAttribute("data-section-count", String(sections.length));
        if (foldable) {
          el2.setAttribute("role", "region");
          el2.setAttribute("aria-label", asText2(props["aria-label"]) || "Sections");
        } else {
          el2.removeAttribute("role");
        }
        const state = getOpenState(el2);
        const values = sections.map((s) => s.value);
        if (foldable) {
          applySectionStreamTick(state, {
            sectionValues: values,
            isStreaming: isStreaming2
          });
        } else {
          state.openItems = values.slice();
          state.prevLength = values.length;
          state.prevIsStreaming = isStreaming2;
        }
        clearChildren2(el2);
        const map = /* @__PURE__ */ new Map();
        itemElsByHost.set(el2, map);
        for (const section of sections) {
          const item = buildItem(doc, section, el2, ctx, foldable);
          el2.appendChild(item);
          map.set(section.value, item);
        }
        if (foldable) {
          syncOpenDom(el2, state.openItems);
          el2.setAttribute(
            "data-user-intervened",
            state.userSelected ? "true" : "false"
          );
        } else {
          el2.setAttribute("data-open-values", values.join(","));
          el2.setAttribute("data-user-intervened", "false");
        }
      },
      unmount(el2) {
        openStateByHost.delete(el2);
        itemElsByHost.delete(el2);
      }
    });
  }
});

// src/Browser/components/containers/SectionItem.js
var SectionItem;
var init_SectionItem = __esm({
  "src/Browser/components/containers/SectionItem.js"() {
    init_shared2();
    SectionItem = lifecycle2({
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "SectionItem");
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = requireDocument2(ctx);
        const section = normalizeSectionEntry(props, 0);
        setClass2(el2, "canvas-section-item canvas-section-v2");
        el2.setAttribute("data-section-value", section.value);
        el2.setAttribute("data-state", "open");
        clearChildren2(el2);
        const head = doc.createElement("div");
        setClass2(head, "canvas-section-v2__header");
        const trigger = doc.createElement("div");
        setClass2(trigger, "canvas-section-v2__trigger");
        trigger.textContent = section.trigger || asText2(props.trigger);
        head.appendChild(trigger);
        const panel = doc.createElement("div");
        setClass2(panel, "canvas-section-v2__content");
        renderPanelContent(panel, section.content, ctx);
        el2.appendChild(head);
        el2.appendChild(panel);
      }
    });
  }
});

// src/Browser/components/containers/Steps.js
function getProgress(host) {
  let s = progressByHost.get(host);
  if (!s) {
    s = createStepsProgressState();
    progressByHost.set(host, s);
  }
  return s;
}
function syncProgressDom(host, currentIndex, count) {
  const now = currentIndex < 0 ? 0 : currentIndex + 1;
  const max = Math.max(count, 0);
  host.setAttribute("data-current-index", String(currentIndex));
  host.setAttribute("aria-valuenow", String(now));
  host.setAttribute("aria-valuemin", "0");
  host.setAttribute("aria-valuemax", String(max));
  const label = max === 0 ? "No steps" : `Step ${now} of ${max}`;
  host.setAttribute("aria-valuetext", label);
  const status = host._canvasProgressStatus;
  if (status) {
    status.textContent = label;
  }
  const list = host._canvasList;
  if (!list) return;
  for (const child of list.childNodes ?? []) {
    if (child.nodeType !== 1) continue;
    const idx = Number(child.getAttribute("data-step-index"));
    const isCurrent = idx === currentIndex;
    child.setAttribute("data-current", isCurrent ? "true" : "false");
    if (isCurrent) child.setAttribute("aria-current", "step");
    else child.removeAttribute("aria-current");
  }
}
function stepsUserSelect(host, index) {
  const state = getProgress(host);
  const next = applyStepsUserSelect(state, index);
  const count = Number(host.getAttribute("data-step-count") || 0);
  syncProgressDom(host, next, count);
  host.setAttribute("data-user-intervened", "true");
  return next;
}
var progressByHost, Steps;
var init_Steps = __esm({
  "src/Browser/components/containers/Steps.js"() {
    init_shared2();
    init_sectionOpenState();
    progressByHost = /* @__PURE__ */ new WeakMap();
    Steps = lifecycle2({
      ownsChildren: true,
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "Steps");
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = requireDocument2(ctx);
        const items = normalizeSteps(props.items ?? props.steps ?? props.children);
        const isStreaming2 = resolveIsStreaming(props, ctx);
        const state = getProgress(el2);
        setClass2(el2, "canvas-steps");
        el2.setAttribute("role", "group");
        el2.setAttribute("aria-label", asText2(props["aria-label"]) || "Steps");
        el2.setAttribute("aria-roledescription", "progress");
        el2.setAttribute("data-streaming", isStreaming2 ? "true" : "false");
        el2.setAttribute("data-step-count", String(items.length));
        applyStepsStreamTick(state, {
          itemCount: items.length,
          isStreaming: isStreaming2
        });
        clearChildren2(el2);
        const status = doc.createElement("span");
        setClass2(status, "canvas-steps__progress-status");
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        status.setAttribute("data-canvas-steps-status", "");
        el2._canvasProgressStatus = status;
        el2.appendChild(status);
        const list = doc.createElement("ol");
        setClass2(list, "canvas-steps__list");
        list.setAttribute("role", "list");
        el2._canvasList = list;
        items.forEach((step, index) => {
          const li = doc.createElement("li");
          setClass2(li, "canvas-steps__item");
          li.setAttribute("data-canvas-component", "StepsItem");
          li.setAttribute("data-step-index", String(index));
          li.setAttribute("data-step-number", String(step.number));
          li.setAttribute("role", "listitem");
          const connector = doc.createElement("div");
          setClass2(connector, "canvas-steps__connector");
          const num2 = doc.createElement("div");
          setClass2(num2, "canvas-steps__number");
          const numInner = doc.createElement("span");
          setClass2(numInner, "canvas-steps__number-inner");
          numInner.textContent = String(step.number);
          num2.appendChild(numInner);
          const line = doc.createElement("div");
          setClass2(line, "canvas-steps__line");
          line.setAttribute("aria-hidden", "true");
          connector.appendChild(num2);
          connector.appendChild(line);
          const body = doc.createElement("div");
          setClass2(body, "canvas-steps__content");
          const titleBtn = doc.createElement("button");
          titleBtn.setAttribute("type", "button");
          setClass2(titleBtn, "canvas-steps__title");
          titleBtn.textContent = step.title;
          titleBtn.onclick = () => {
            stepsUserSelect(el2, index);
          };
          const details = doc.createElement("div");
          setClass2(details, "canvas-steps__details");
          renderPanelContent(details, step.details, ctx);
          body.appendChild(titleBtn);
          body.appendChild(details);
          li.appendChild(connector);
          li.appendChild(body);
          list.appendChild(li);
        });
        el2.appendChild(list);
        syncProgressDom(el2, state.currentIndex, items.length);
        el2.setAttribute(
          "data-user-intervened",
          state.userSelected ? "true" : "false"
        );
      },
      unmount(el2) {
        progressByHost.delete(el2);
        el2._canvasList = null;
        el2._canvasProgressStatus = null;
      }
    });
  }
});

// src/Browser/components/containers/StepsItem.js
var StepsItem;
var init_StepsItem = __esm({
  "src/Browser/components/containers/StepsItem.js"() {
    init_shared2();
    StepsItem = lifecycle2({
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "StepsItem");
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = requireDocument2(ctx);
        const step = normalizeStepEntry(props, Number(props.index) || 0);
        setClass2(el2, "canvas-steps__item canvas-steps-item--standalone");
        el2.setAttribute("data-step-number", String(step.number));
        clearChildren2(el2);
        const num2 = doc.createElement("span");
        setClass2(num2, "canvas-steps__number-inner");
        num2.textContent = String(step.number);
        const title = doc.createElement("span");
        setClass2(title, "canvas-steps__title");
        title.textContent = step.title || asText2(props.title);
        const details = doc.createElement("div");
        setClass2(details, "canvas-steps__details");
        renderPanelContent(details, step.details, ctx);
        el2.appendChild(num2);
        el2.appendChild(title);
        el2.appendChild(details);
      }
    });
  }
});

// src/Browser/components/containers/registerSectionSteps.js
var registerSectionSteps_exports = {};
__export(registerSectionSteps_exports, {
  SECTION_STEPS_COMPONENTS: () => SECTION_STEPS_COMPONENTS,
  SectionBlock: () => SectionBlock,
  SectionItem: () => SectionItem,
  Steps: () => Steps,
  StepsItem: () => StepsItem,
  default: () => registerSectionSteps_default,
  registerSectionSteps: () => registerSectionSteps
});
function registerSectionSteps(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerSectionSteps: registry with register() required");
  }
  for (const [type, entry] of Object.entries(SECTION_STEPS_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}
var SECTION_STEPS_COMPONENTS, registerSectionSteps_default;
var init_registerSectionSteps = __esm({
  "src/Browser/components/containers/registerSectionSteps.js"() {
    init_SectionBlock();
    init_SectionItem();
    init_Steps();
    init_StepsItem();
    SECTION_STEPS_COMPONENTS = {
      SectionBlock,
      SectionItem,
      Steps,
      StepsItem
    };
    registerSectionSteps_default = registerSectionSteps;
  }
});

// src/Browser/components/containers/Carousel.js
function slideStructureSignature(slide) {
  if (!Array.isArray(slide)) return "";
  return slide.map((n) => {
    if (n == null || n === false) return "";
    if (typeof n === "string" || typeof n === "number") return "#text";
    if (typeof n === "object" && n !== null && "type" in n) {
      return String(
        /** @type {{ type: unknown }} */
        n.type
      );
    }
    return "?";
  }).join("|");
}
function enforceSlideStructure(slides) {
  if (!Array.isArray(slides) || slides.length === 0) {
    return { ok: true, slides: [], signature: "", dropped: 0 };
  }
  let signature = "";
  for (const slide of slides) {
    const sig = slideStructureSignature(Array.isArray(slide) ? slide : [slide]);
    if (sig) {
      signature = sig;
      break;
    }
  }
  if (!signature) {
    return { ok: true, slides: (
      /** @type {unknown[][]} */
      slides
    ), signature: "", dropped: 0 };
  }
  const kept = [];
  let dropped = 0;
  for (const raw of slides) {
    const slide = Array.isArray(raw) ? raw : [raw];
    if (slideStructureSignature(slide) === signature) kept.push(slide);
    else dropped += 1;
  }
  return { ok: dropped === 0, slides: kept, signature, dropped };
}
function normalizeSlides(props = {}) {
  const kids = props.children;
  if (!Array.isArray(kids)) return [];
  if (kids.length === 0) return [];
  if (Array.isArray(kids[0])) {
    return (
      /** @type {unknown[][]} */
      kids.map((s) => Array.isArray(s) ? s : [s])
    );
  }
  return kids.map((k) => Array.isArray(k) ? k : [k]);
}
function normalizeVariant2(props = {}) {
  const v = asText2(props.variant) || "card";
  return VARIANTS12.has(v) ? v : "card";
}
function prefersReducedMotion(doc) {
  try {
    const view = (
      /** @type {{ matchMedia?: (q: string) => { matches: boolean } }} */
      doc.defaultView ?? globalThis
    );
    if (typeof view.matchMedia === "function") {
      return !!view.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  } catch {
  }
  return false;
}
function slideEls(track) {
  return [...track.childNodes ?? []].filter(
    (n) => n.nodeType === 1 && /** @type {Element} */
    n.getAttribute?.("data-canvas-carousel-slide") != null
  );
}
function indexFromScroll(track) {
  const slides = slideEls(track);
  if (slides.length === 0) return 0;
  const left = Number(track.scrollLeft) || 0;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < slides.length; i++) {
    const el2 = (
      /** @type {Element & { offsetLeft?: number }} */
      slides[i]
    );
    const offset = typeof el2.offsetLeft === "number" ? el2.offsetLeft : i * 280;
    const dist = Math.abs(offset - left);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}
function goTo(state, index, opts = {}) {
  const slides = slideEls(state.track);
  if (slides.length === 0) return;
  const i = Math.max(0, Math.min(slides.length - 1, index));
  state.index = i;
  const target = (
    /** @type {Element & { offsetLeft?: number }} */
    slides[i]
  );
  const left = typeof target.offsetLeft === "number" ? target.offsetLeft : i * 280;
  const behavior = opts.instant || state.reducedMotion ? "auto" : "smooth";
  if (typeof /** @type {{ scrollTo?: Function }} */
  state.track.scrollTo === "function") {
    state.track.scrollTo({ left, behavior });
  } else {
    state.track.scrollLeft = left;
  }
  state.scrollLeft = left;
  syncChrome(state);
}
function syncChrome(state) {
  const slides = slideEls(state.track);
  const n = slides.length;
  const i = n === 0 ? 0 : Math.min(state.index, n - 1);
  state.index = i;
  const label = n === 0 ? "No slides" : `Slide ${i + 1} of ${n}`;
  state.status.textContent = label;
  state.track.setAttribute("aria-label", label);
  if (i <= 0) state.prevBtn.setAttribute("disabled", "");
  else state.prevBtn.removeAttribute("disabled");
  if (i >= n - 1 || n === 0) state.nextBtn.setAttribute("disabled", "");
  else state.nextBtn.removeAttribute("disabled");
  for (let s = 0; s < slides.length; s++) {
    const el2 = slides[s];
    el2.setAttribute("aria-hidden", s === i ? "false" : "true");
    el2.setAttribute("data-active", s === i ? "true" : "false");
  }
}
function renderSlides(root, slides, ctx, state) {
  const track = state.track;
  const prevLeft = Number(track.scrollLeft) || state.scrollLeft || 0;
  const prevIndex = state.index;
  clearChildren2(track);
  const doc = requireDocument2(ctx);
  slides.forEach((slide, i) => {
    const wrap = doc.createElement("div");
    wrap.setAttribute("class", "canvas-carousel__slide");
    wrap.setAttribute("data-canvas-carousel-slide", String(i));
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-roledescription", "slide");
    wrap.setAttribute("aria-label", `Slide ${i + 1} of ${slides.length}`);
    try {
      const desc = Object.getOwnPropertyDescriptor(wrap, "offsetLeft");
      const proto = Object.getPrototypeOf(wrap);
      const protoDesc = proto ? Object.getOwnPropertyDescriptor(proto, "offsetLeft") : void 0;
      const hasLayoutGetter = !!(protoDesc && protoDesc.get && !protoDesc.set);
      if (!hasLayoutGetter && (!desc || desc.writable)) {
        wrap.offsetLeft = i * 280;
      }
    } catch {
    }
    if (typeof ctx.renderChildren === "function") {
      ctx.renderChildren(wrap, slide);
    } else {
      for (const part of slide) {
        if (typeof part === "string" || typeof part === "number") {
          wrap.appendChild(doc.createTextNode(String(part)));
        }
      }
    }
    track.appendChild(wrap);
  });
  if (slides.length === 0) {
    state.index = 0;
    state.scrollLeft = 0;
  } else if (prevIndex < slides.length) {
    goTo(state, prevIndex, { instant: true });
  } else {
    track.scrollLeft = Math.min(prevLeft, (slides.length - 1) * 280);
    state.scrollLeft = track.scrollLeft;
    state.index = indexFromScroll(track);
    syncChrome(state);
  }
}
var VARIANTS12, STATE18, Carousel;
var init_Carousel = __esm({
  "src/Browser/components/containers/Carousel.js"() {
    init_shared2();
    VARIANTS12 = /* @__PURE__ */ new Set(["card", "sunk"]);
    STATE18 = /* @__PURE__ */ new WeakMap();
    Carousel = lifecycle2({
      ownsChildren: true,
      mount(doc) {
        const root = doc.createElement("div");
        root.setAttribute("data-canvas-component", "Carousel");
        root.setAttribute("role", "region");
        root.setAttribute("aria-roledescription", "carousel");
        const track = doc.createElement("div");
        track.setAttribute("class", "canvas-carousel__track");
        track.setAttribute("data-canvas-carousel-track", "");
        track.setAttribute("tabindex", "0");
        track.setAttribute("role", "group");
        const prevBtn = doc.createElement("button");
        prevBtn.setAttribute("type", "button");
        prevBtn.setAttribute("class", "canvas-carousel__btn canvas-carousel__btn--prev");
        prevBtn.setAttribute("aria-label", "Previous slide");
        prevBtn.textContent = "\u2039";
        const nextBtn = doc.createElement("button");
        nextBtn.setAttribute("type", "button");
        nextBtn.setAttribute("class", "canvas-carousel__btn canvas-carousel__btn--next");
        nextBtn.setAttribute("aria-label", "Next slide");
        nextBtn.textContent = "\u203A";
        const status = doc.createElement("div");
        status.setAttribute("class", "canvas-carousel__status");
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        status.setAttribute("aria-atomic", "true");
        root.appendChild(prevBtn);
        root.appendChild(track);
        root.appendChild(nextBtn);
        root.appendChild(status);
        const state = {
          index: 0,
          scrollLeft: 0,
          track,
          status,
          prevBtn,
          nextBtn,
          reducedMotion: prefersReducedMotion(doc),
          signature: "",
          onKey: () => {
          },
          onScroll: () => {
          },
          onPrev: () => {
          },
          onNext: () => {
          }
        };
        state.onPrev = () => goTo(state, state.index - 1);
        state.onNext = () => goTo(state, state.index + 1);
        state.onScroll = () => {
          state.scrollLeft = Number(track.scrollLeft) || 0;
          state.index = indexFromScroll(track);
          syncChrome(state);
        };
        state.onKey = (e) => {
          const key = e?.key;
          if (key === "ArrowLeft" || key === "Left") {
            e.preventDefault?.();
            state.onPrev();
          } else if (key === "ArrowRight" || key === "Right") {
            e.preventDefault?.();
            state.onNext();
          } else if (key === "Home") {
            e.preventDefault?.();
            goTo(state, 0);
          } else if (key === "End") {
            e.preventDefault?.();
            goTo(state, slideEls(track).length - 1);
          }
        };
        if (typeof prevBtn.addEventListener === "function") {
          prevBtn.addEventListener("click", state.onPrev);
          nextBtn.addEventListener("click", state.onNext);
          track.addEventListener("keydown", state.onKey);
          track.addEventListener("scroll", state.onScroll, { passive: true });
        }
        STATE18.set(root, state);
        return root;
      },
      patch(el2, props = {}, ctx = {}) {
        const state = STATE18.get(el2);
        if (!state) return;
        const doc = requireDocument2(ctx);
        const variant = normalizeVariant2(props);
        state.reducedMotion = prefersReducedMotion(doc);
        setClass2(
          el2,
          `canvas-carousel canvas-carousel--${variant}${state.reducedMotion ? " canvas-carousel--reduced-motion" : ""}`
        );
        el2.setAttribute("data-variant", variant);
        el2.setAttribute("data-reduced-motion", state.reducedMotion ? "true" : "false");
        const raw = normalizeSlides(props);
        const enforced = enforceSlideStructure(raw);
        state.signature = enforced.signature;
        if (!enforced.ok) {
          el2.setAttribute("data-structure-error", "true");
          el2.setAttribute(
            "data-structure-dropped",
            String(enforced.dropped)
          );
        } else {
          el2.removeAttribute("data-structure-error");
          el2.removeAttribute("data-structure-dropped");
        }
        if (enforced.signature) {
          el2.setAttribute("data-slide-signature", enforced.signature);
        } else {
          el2.removeAttribute("data-slide-signature");
        }
        renderSlides(el2, enforced.slides, ctx, state);
      },
      unmount(el2) {
        const state = STATE18.get(el2);
        if (!state) return;
        if (typeof state.prevBtn.removeEventListener === "function") {
          state.prevBtn.removeEventListener("click", state.onPrev);
          state.nextBtn.removeEventListener("click", state.onNext);
          state.track.removeEventListener("keydown", state.onKey);
          state.track.removeEventListener("scroll", state.onScroll);
        }
        STATE18.delete(el2);
      }
    });
  }
});

// src/Browser/components/containers/Modal.js
function normalizeSize(props = {}) {
  const s = asText2(props.size) || "md";
  return SIZES6.has(s) ? s : "md";
}
function resolveOpen(props = {}) {
  const o = props.open;
  if (o === true || o === false) return o;
  if (o && typeof o === "object") {
    if (typeof /** @type {{ get?: unknown }} */
    o.get === "function") {
      return !!/** @type {{ get: () => unknown }} */
      o.get();
    }
    if ("value" in /** @type {object} */
    o) {
      return !!/** @type {{ value: unknown }} */
      o.value;
    }
  }
  return false;
}
function writeOpen(props, value, ctx = {}) {
  const o = props.open;
  if (o && typeof o === "object" && typeof /** @type {{ set?: unknown }} */
  o.set === "function") {
    o.set(value);
  }
  if (typeof props.onOpenChange === "function") {
    props.onOpenChange(value);
  }
  if (typeof ctx.onOpenChange === "function") {
    ctx.onOpenChange(value);
  }
}
function focusableElements(root) {
  const out = [];
  const walk = (n) => {
    if (!n || n.nodeType !== 1) return;
    const el2 = (
      /** @type {Element} */
      n
    );
    if (el2.getAttribute?.("disabled") != null) {
    } else {
      const tag = (el2.tagName || "").toLowerCase();
      const tabindex = el2.getAttribute?.("tabindex");
      const focusableTag = tag === "button" || tag === "a" || tag === "input" || tag === "select" || tag === "textarea" || tag === "summary";
      const tabIdx = tabindex == null ? null : Number(tabindex);
      if (focusableTag || tabIdx != null && !Number.isNaN(tabIdx) && tabIdx >= 0) {
        if (el2.getAttribute?.("hidden") == null) out.push(el2);
      }
    }
    for (const c of el2.childNodes ?? []) walk(c);
  };
  walk(root);
  return out;
}
function setScrollLock(doc, lock) {
  const body = doc.body;
  if (!body) return;
  let count = SCROLL_LOCK.get(doc) ?? 0;
  if (lock) {
    count += 1;
    SCROLL_LOCK.set(doc, count);
    if (count === 1) {
      body.setAttribute("data-canvas-scroll-lock", "1");
      if (body.style) body.style.overflow = "hidden";
      else body.setAttribute("style", "overflow: hidden");
    }
  } else {
    count = Math.max(0, count - 1);
    SCROLL_LOCK.set(doc, count);
    if (count === 0) {
      body.removeAttribute("data-canvas-scroll-lock");
      if (body.style) body.style.overflow = "";
      else body.removeAttribute("style");
    }
  }
}
function applyOpen2(dialog, state, open, props, ctx) {
  const doc = requireDocument2(ctx);
  const wasOpen = state.open;
  if (open && !wasOpen) {
    state.restoreFocus = (props.trigger && typeof props.trigger.focus === "function" ? (
      /** @type {Element} */
      props.trigger
    ) : null) || (doc.activeElement && doc.activeElement !== dialog ? (
      /** @type {Element} */
      doc.activeElement
    ) : state.restoreFocus);
    state.propsRef = props;
    state.ctxRef = ctx;
    const finishOpen = () => {
      setScrollLock(doc, true);
      state.open = true;
      dialog.setAttribute("data-open", "true");
      queueMicrotaskOrNow(() => {
        if (!state.open) return;
        const focusables = focusableElements(dialog);
        const preferred = focusables.find((el2) => el2 !== state.closeBtn) || state.closeBtn || dialog;
        preferred.focus?.();
      });
    };
    let shown = false;
    try {
      if (typeof /** @type {{ showModal?: Function }} */
      dialog.showModal === "function") {
        dialog.showModal();
        shown = true;
      } else {
        dialog.setAttribute("open", "");
        dialog.open = true;
        shown = true;
      }
    } catch {
      shown = false;
    }
    if (!shown) {
      queueMicrotaskOrNow(() => {
        if (!resolveOpen(state.propsRef) || state.open) return;
        try {
          if (typeof /** @type {{ showModal?: Function }} */
          dialog.showModal === "function") {
            dialog.showModal();
          } else {
            dialog.setAttribute("open", "");
            dialog.open = true;
          }
          finishOpen();
        } catch {
        }
      });
      return;
    }
    finishOpen();
  } else if (!open && wasOpen) {
    if (typeof /** @type {{ close?: Function }} */
    dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
      dialog.open = false;
    }
    setScrollLock(doc, false);
    state.open = false;
    dialog.setAttribute("data-open", "false");
    const restore = state.restoreFocus;
    state.restoreFocus = null;
    queueMicrotaskOrNow(() => {
      restore?.focus?.();
    });
  }
}
function queueMicrotaskOrNow(fn) {
  if (typeof queueMicrotask === "function") queueMicrotask(fn);
  else fn();
}
function requestClose(dialog, state) {
  writeOpen(state.propsRef, false, state.ctxRef);
  applyOpen2(dialog, state, false, state.propsRef, state.ctxRef);
}
var SIZES6, STATE19, SCROLL_LOCK, Modal;
var init_Modal = __esm({
  "src/Browser/components/containers/Modal.js"() {
    init_shared2();
    SIZES6 = /* @__PURE__ */ new Set(["sm", "md", "lg"]);
    STATE19 = /* @__PURE__ */ new WeakMap();
    SCROLL_LOCK = /* @__PURE__ */ new WeakMap();
    Modal = lifecycle2({
      ownsChildren: true,
      mount(doc) {
        const dialog = doc.createElement("dialog");
        dialog.setAttribute("data-canvas-component", "Modal");
        dialog.setAttribute("class", "canvas-modal");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("role", "dialog");
        const header = doc.createElement("div");
        header.setAttribute("class", "canvas-modal__header");
        const titleEl = doc.createElement("h2");
        titleEl.setAttribute("class", "canvas-modal__title");
        const titleId = `canvas-modal-title-${Math.random().toString(36).slice(2, 9)}`;
        titleEl.setAttribute("id", titleId);
        dialog.setAttribute("aria-labelledby", titleId);
        const closeBtn = doc.createElement("button");
        closeBtn.setAttribute("type", "button");
        closeBtn.setAttribute("class", "canvas-modal__close");
        closeBtn.setAttribute("aria-label", "Close");
        closeBtn.textContent = "\xD7";
        header.appendChild(titleEl);
        header.appendChild(closeBtn);
        const bodyEl = doc.createElement("div");
        bodyEl.setAttribute("class", "canvas-modal__body");
        bodyEl.setAttribute("data-canvas-modal-body", "");
        dialog.appendChild(header);
        dialog.appendChild(bodyEl);
        const state = {
          open: false,
          titleEl,
          bodyEl,
          closeBtn,
          restoreFocus: null,
          propsRef: {},
          ctxRef: {},
          onKeyDown: () => {
          },
          onCancel: () => {
          },
          onClick: () => {
          },
          onCloseClick: () => {
          }
        };
        state.onCloseClick = () => requestClose(dialog, state);
        state.onCancel = (e) => {
          e?.preventDefault?.();
          requestClose(dialog, state);
        };
        state.onClick = (e) => {
          if (e?.target === dialog) {
            requestClose(dialog, state);
          }
        };
        state.onKeyDown = (e) => {
          if (!state.open) return;
          if (e?.key === "Escape") {
            e.preventDefault?.();
            requestClose(dialog, state);
            return;
          }
          if (e?.key !== "Tab") return;
          const focusables = focusableElements(dialog);
          if (focusables.length === 0) {
            e.preventDefault?.();
            dialog.focus?.();
            return;
          }
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          const active = dialog.ownerDocument?.activeElement;
          if (e.shiftKey) {
            if (active === first || active === dialog) {
              e.preventDefault?.();
              last.focus?.();
            }
          } else if (active === last) {
            e.preventDefault?.();
            first.focus?.();
          }
        };
        if (typeof dialog.addEventListener === "function") {
          dialog.addEventListener("cancel", state.onCancel);
          dialog.addEventListener("click", state.onClick);
          dialog.addEventListener("keydown", state.onKeyDown);
          closeBtn.addEventListener("click", state.onCloseClick);
        }
        dialog.setAttribute("tabindex", "-1");
        STATE19.set(dialog, state);
        dialog.setAttribute("data-open", "false");
        return dialog;
      },
      patch(el2, props = {}, ctx = {}) {
        const state = STATE19.get(el2);
        if (!state) return;
        state.propsRef = props;
        state.ctxRef = ctx;
        const size = normalizeSize(props);
        setClass2(el2, `canvas-modal canvas-modal--${size}`);
        el2.setAttribute("data-size", size);
        const title = asText2(props.title) || "Dialog";
        state.titleEl.textContent = title;
        const kids = Array.isArray(props.children) ? props.children : null;
        if (kids && typeof ctx.renderChildren === "function") {
          ctx.renderChildren(state.bodyEl, kids);
        } else if (kids) {
          clearChildren2(state.bodyEl);
          const doc = requireDocument2(ctx);
          for (const part of kids) {
            if (typeof part === "string" || typeof part === "number") {
              state.bodyEl.appendChild(doc.createTextNode(String(part)));
            }
          }
        }
        const wantOpen = resolveOpen(props);
        applyOpen2(el2, state, wantOpen, props, ctx);
      },
      unmount(el2, ctx = {}) {
        const state = STATE19.get(el2);
        if (!state) return;
        if (state.open) {
          const doc = requireDocument2(ctx);
          setScrollLock(doc, false);
          state.open = false;
        }
        if (typeof el2.removeEventListener === "function") {
          el2.removeEventListener("cancel", state.onCancel);
          el2.removeEventListener("click", state.onClick);
          el2.removeEventListener("keydown", state.onKeyDown);
          state.closeBtn.removeEventListener("click", state.onCloseClick);
        }
        STATE19.delete(el2);
      }
    });
  }
});

// src/Browser/components/containers/registerCarouselModal.js
var registerCarouselModal_exports = {};
__export(registerCarouselModal_exports, {
  CAROUSEL_MODAL_COMPONENTS: () => CAROUSEL_MODAL_COMPONENTS,
  Carousel: () => Carousel,
  Modal: () => Modal,
  default: () => registerCarouselModal_default,
  registerCarouselModal: () => registerCarouselModal
});
function registerCarouselModal(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerCarouselModal: registry with register() required");
  }
  registry.register("Carousel", Carousel);
  registry.register("Modal", Modal);
  return registry;
}
var CAROUSEL_MODAL_COMPONENTS, registerCarouselModal_default;
var init_registerCarouselModal = __esm({
  "src/Browser/components/containers/registerCarouselModal.js"() {
    init_Carousel();
    init_Modal();
    CAROUSEL_MODAL_COMPONENTS = Object.freeze({
      Carousel,
      Modal
    });
    registerCarouselModal_default = registerCarouselModal;
  }
});

// src/Browser/components/table/shared.js
function requireDocument5(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("table component: ctx.document required");
  }
  return doc;
}
function setClass5(el2, className) {
  el2.setAttribute("class", String(className).trim());
}
function setOrRemoveAttr5(el2, name, value) {
  if (value == null || value === false || value === "") {
    el2.removeAttribute(name);
  } else {
    el2.setAttribute(name, value === true ? "true" : String(value));
  }
}
function clearChildren5(el2) {
  while (el2.firstChild) {
    el2.removeChild(el2.firstChild);
  }
}
function asText5(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}
function normalizeCol(raw, index) {
  if (raw == null) {
    return { label: "", data: [], type: "string", key: String(index) };
  }
  let obj = (
    /** @type {Record<string, unknown>} */
    raw
  );
  if (obj.props && typeof obj.props === "object" && (obj.type === "Col" || obj.label == null)) {
    obj = /** @type {Record<string, unknown>} */
    obj.props;
  }
  const label = asText5(obj.label ?? obj.header);
  const type = asText5(obj.type) || "string";
  const key = asText5(obj.key) || String(index);
  const align = asText5(obj.align);
  return {
    label,
    data: asArray(obj.data),
    type,
    key,
    sortable: obj.sortable === true,
    align: align === "center" || align === "right" ? align : "left"
  };
}
function normalizeColumns(columns) {
  if (!Array.isArray(columns)) return [];
  return columns.filter((c) => c != null).map((c, i) => normalizeCol(c, i));
}
function columnsToRows(cols) {
  const labels = cols.map((c) => c.label);
  const rowCount = cols.length ? Math.max(...cols.map((c) => c.data.length), 0) : 0;
  const rows = [];
  for (let r = 0; r < rowCount; r++) {
    rows.push(cols.map((c) => r < c.data.length ? c.data[r] : ""));
  }
  return { labels, rows, rowCount };
}
function formatCellDisplay(value, type = "string") {
  if (value == null) return "";
  if (typeof value === "object") {
    if (value && typeof value === "object" && "label" in /** @type {object} */
    value) {
      return asText5(
        /** @type {{ label?: unknown }} */
        value.label
      );
    }
    return "";
  }
  if (type === "number" || type === "action") {
    if (typeof value === "number" && Number.isFinite(value)) {
      try {
        return value.toLocaleString();
      } catch {
        return String(value);
      }
    }
  }
  return asText5(value);
}
function sortRowIndices(rows, colIndex, dir = "asc", type = "string") {
  const indices = rows.map((_, i) => i);
  const mult = dir === "desc" ? -1 : 1;
  indices.sort((a, b) => {
    const va = rows[a]?.[colIndex];
    const vb = rows[b]?.[colIndex];
    if (type === "number") {
      const na = Number(va);
      const nb = Number(vb);
      const aOk = Number.isFinite(na);
      const bOk = Number.isFinite(nb);
      if (aOk && bOk) return (na - nb) * mult;
      if (aOk) return -1 * mult;
      if (bOk) return 1 * mult;
      return 0;
    }
    const sa = asText5(va).toLowerCase();
    const sb = asText5(vb).toLowerCase();
    if (sa < sb) return -1 * mult;
    if (sa > sb) return 1 * mult;
    return 0;
  });
  return indices;
}
function resolveTableStatus(props = {}, ctx = {}) {
  const raw = props.status ?? props.state;
  if (raw === "loading" || raw === "empty" || raw === "error" || raw === "ready" || raw === "refetching") {
    return raw;
  }
  if (props.loading === true) return "loading";
  if (props.refetching === true || props.isRefetching === true) return "refetching";
  if (props.error != null && props.error !== false) return "error";
  if (props.empty === true) return "empty";
  const query = ctx.query;
  if (query && typeof query === "object") {
    const loading = (
      /** @type {{ __openui_loading?: unknown[] }} */
      query.__openui_loading
    );
    const refetching = (
      /** @type {{ __openui_refetching?: unknown[] }} */
      query.__openui_refetching
    );
    const errors = (
      /** @type {{ __openui_errors?: unknown[] }} */
      query.__openui_errors
    );
    if (Array.isArray(errors) && errors.length > 0) return "error";
    if (Array.isArray(loading) && loading.length > 0) return "loading";
    if (Array.isArray(refetching) && refetching.length > 0) return "refetching";
  }
  return "ready";
}
function findStatusTextChild2(el2) {
  const cached = statusTextByHost2.get(el2);
  if (cached && cached.parentNode === el2) return cached;
  for (const child of el2.childNodes ?? []) {
    if (child.nodeType === 1 && child.getAttribute?.("data-canvas-status-text") != null) {
      statusTextByHost2.set(el2, child);
      return child;
    }
  }
  return null;
}
function applyTableStatus(el2, doc, props = {}, ctx = {}, opts = {}) {
  const status = resolveTableStatus(props, ctx);
  el2.setAttribute("data-status", status);
  setOrRemoveAttr5(
    el2,
    "aria-busy",
    status === "loading" || status === "refetching" ? "true" : null
  );
  let statusEl = findStatusTextChild2(el2);
  const show = opts.showStatusText !== false && (status === "loading" || status === "empty" || status === "error" || status === "refetching");
  if (show) {
    if (!statusEl) {
      statusEl = doc.createElement("span");
      statusEl.setAttribute("data-canvas-status-text", "");
      statusEl.setAttribute("class", "canvas-status-text");
      el2.appendChild(statusEl);
      statusTextByHost2.set(el2, statusEl);
    }
    const msg = status === "loading" ? asText5(props.loadingMessage) || opts.loadingMessage || STATUS_LABELS2.loading : status === "refetching" ? asText5(props.refetchingMessage) || opts.refetchingMessage || STATUS_LABELS2.refetching : status === "empty" ? asText5(props.emptyMessage) || opts.emptyMessage || STATUS_LABELS2.empty : asText5(props.errorMessage ?? props.error) || opts.errorMessage || STATUS_LABELS2.error;
    statusEl.textContent = msg;
    statusEl.setAttribute("role", "status");
    setOrRemoveAttr5(statusEl, "aria-live", status === "error" ? "assertive" : "polite");
  } else if (statusEl && statusEl.parentNode) {
    statusEl.parentNode.removeChild(statusEl);
    statusTextByHost2.delete(el2);
    statusEl = null;
  }
  return { status, statusEl };
}
function lifecycle5(impl) {
  return {
    create(props = {}, ctx = {}) {
      const doc = requireDocument5(ctx);
      const el2 = impl.mount(doc, props, ctx);
      impl.patch(el2, props, ctx);
      return el2;
    },
    update(el2, props = {}, ctx = {}) {
      impl.patch(el2, props, ctx);
    },
    destroy(el2, ctx = {}) {
      impl.unmount?.(el2, ctx);
    },
    ownsChildren: impl.ownsChildren !== false
  };
}
function normalizeEditableCellType(type) {
  const t = asText5(type);
  if (t === "number" || t === "date-single" || t === "select" || t === "url" || t === "text") {
    return t;
  }
  if (t === "date") return "date-single";
  return "text";
}
function normalizeEditableColumn(raw, index) {
  let obj = raw && typeof raw === "object" ? (
    /** @type {Record<string, unknown>} */
    raw
  ) : {};
  if (obj.props && typeof obj.props === "object") {
    obj = /** @type {Record<string, unknown>} */
    obj.props;
  }
  const optionsRaw = Array.isArray(obj.options) ? obj.options : [];
  const options = optionsRaw.filter((o) => o && typeof o === "object").map((o) => {
    const opt = (
      /** @type {Record<string, unknown>} */
      o
    );
    return {
      value: asText5(opt.value),
      label: asText5(opt.label ?? opt.value)
    };
  });
  const width = typeof obj.width === "number" ? obj.width : void 0;
  return {
    type: normalizeEditableCellType(asText5(obj.type)),
    key: asText5(obj.key) || `col-${index}`,
    header: asText5(obj.header ?? obj.label),
    width,
    options
  };
}
function toKeyedRows(data, columnKeys) {
  if (!Array.isArray(data)) return [];
  return data.map((row, i) => {
    let obj = row && typeof row === "object" ? (
      /** @type {Record<string, unknown>} */
      row
    ) : {};
    if (obj.props && typeof obj.props === "object" && obj.id == null) {
      obj = /** @type {Record<string, unknown>} */
      obj.props;
    }
    const id = asText5(obj.id) || `row-${i}`;
    const values = {};
    if (Array.isArray(obj.values)) {
      columnKeys.forEach((key, idx) => {
        const v = obj.values[idx];
        values[key] = typeof v === "number" ? v : asText5(v);
      });
    } else {
      for (const key of columnKeys) {
        const v = obj[key];
        values[key] = typeof v === "number" ? v : asText5(v);
      }
    }
    return { id, values };
  });
}
function fromKeyedRows(rows, columnKeys) {
  return rows.map((row) => ({
    id: row.id,
    values: columnKeys.map((key) => {
      const v = row.values[key];
      return typeof v === "number" ? v : asText5(v);
    })
  }));
}
function countChangedCells(rows, baseline, columnKeys) {
  if (!baseline) return 0;
  let count = 0;
  const current = new Map(rows.map((r) => [r.id, r.values]));
  for (const [id, baseValues] of baseline) {
    const cur = current.get(id);
    if (!cur) continue;
    for (const key of columnKeys) {
      if (cur[key] !== baseValues[key]) count++;
    }
  }
  return count;
}
var DEFAULT_PAGE_SIZE, SURFACE_STATUS2, STATUS_LABELS2, statusTextByHost2;
var init_shared3 = __esm({
  "src/Browser/components/table/shared.js"() {
    DEFAULT_PAGE_SIZE = 10;
    SURFACE_STATUS2 = Object.freeze({
      READY: "ready",
      LOADING: "loading",
      EMPTY: "empty",
      ERROR: "error",
      REFETCHING: "refetching"
    });
    STATUS_LABELS2 = Object.freeze({
      ready: "",
      loading: "Loading",
      empty: "No rows",
      error: "Error",
      refetching: "Refreshing"
    });
    statusTextByHost2 = /* @__PURE__ */ new WeakMap();
  }
});

// src/Browser/components/table/Col.js
var Col;
var init_Col = __esm({
  "src/Browser/components/table/Col.js"() {
    init_shared3();
    Col = lifecycle5({
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "Col");
        el2.setAttribute("hidden", "");
        return el2;
      },
      patch(el2, props = {}) {
        setClass5(el2, "canvas-table-col");
        el2.setAttribute("data-label", String(props.label ?? ""));
        el2.setAttribute("data-col-type", String(props.type ?? "string"));
      }
    });
  }
});

// src/Browser/components/table/Table.js
function resolveTableColumns(props = {}) {
  if (Array.isArray(props.columns) && props.columns.length) {
    return normalizeColumns(props.columns);
  }
  if (Array.isArray(props.children) && props.children.length) {
    const cols = props.children.filter(
      (c) => c && typeof c === "object" && /** @type {{ type?: string }} */
      (c.type === "Col" || /** @type {{ props?: object }} */
      c.props && "label" in /** @type {object} */
      (c.props ?? {}) && "data" in /** @type {object} */
      (c.props ?? {}))
    );
    if (cols.length) return normalizeColumns(cols);
  }
  return [];
}
function getState4(host) {
  let s = STATE20.get(host);
  if (!s) {
    s = { page: 0, sortCol: null, sortDir: "asc", wired: false };
    STATE20.set(host, s);
  }
  return s;
}
function makePageBtn(doc, label) {
  const btn = doc.createElement("button");
  btn.type = "button";
  btn.setAttribute("class", "canvas-table__page-btn");
  btn.setAttribute("aria-label", label);
  btn.textContent = label === "Previous page" ? "\u2039" : "\u203A";
  return (
    /** @type {HTMLButtonElement} */
    btn
  );
}
function fillCell(doc, td, value, type, ctx) {
  clearChildren5(td);
  if (value && typeof value === "object" && typeof ctx.renderChildren === "function" && ("type" in /** @type {object} */
  value || Array.isArray(value))) {
    const kids = Array.isArray(value) ? value : [value];
    ctx.renderChildren(td, kids);
    return;
  }
  if (type === "action" && value && typeof value === "object") {
    const obj = (
      /** @type {Record<string, unknown>} */
      value
    );
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.setAttribute("class", "canvas-table__action");
    btn.textContent = asText5(obj.label) || "Action";
    if (typeof obj.onClick === "function") {
      btn.addEventListener(
        "click",
        /** @type {EventListener} */
        obj.onClick
      );
    }
    td.appendChild(btn);
    return;
  }
  td.textContent = formatCellDisplay(value, type);
}
function ensureScrollKeyboard(host, scrollEl, state) {
  if (state.wired) return;
  state.wired = true;
  setOrRemoveAttr5(scrollEl, "tabindex", "0");
  state.onKey = (e) => {
    const ev = (
      /** @type {KeyboardEvent} */
      e
    );
    const target = (
      /** @type {Element & { scrollLeft?: number, clientWidth?: number, scrollWidth?: number, scrollTo?: Function }} */
      scrollEl
    );
    if (ev.key === "ArrowRight") {
      ev.preventDefault?.();
      const next = (target.scrollLeft || 0) + Math.max(40, (target.clientWidth || 200) * 0.4);
      if (typeof target.scrollTo === "function") {
        target.scrollTo({ left: next });
      } else {
        target.scrollLeft = next;
      }
    } else if (ev.key === "ArrowLeft") {
      ev.preventDefault?.();
      const next = Math.max(
        0,
        (target.scrollLeft || 0) - Math.max(40, (target.clientWidth || 200) * 0.4)
      );
      if (typeof target.scrollTo === "function") {
        target.scrollTo({ left: next });
      } else {
        target.scrollLeft = next;
      }
    } else if (ev.key === "Home") {
      ev.preventDefault?.();
      if (typeof target.scrollTo === "function") target.scrollTo({ left: 0 });
      else target.scrollLeft = 0;
    } else if (ev.key === "End") {
      ev.preventDefault?.();
      const max = Math.max(0, (target.scrollWidth || 0) - (target.clientWidth || 0));
      if (typeof target.scrollTo === "function") target.scrollTo({ left: max });
      else target.scrollLeft = max;
    }
  };
  scrollEl.addEventListener("keydown", state.onKey);
}
var STATE20, Table;
var init_Table = __esm({
  "src/Browser/components/table/Table.js"() {
    init_shared3();
    STATE20 = /* @__PURE__ */ new WeakMap();
    Table = lifecycle5({
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "Table");
        el2.setAttribute("class", "canvas-table");
        const statusSlot = doc.createElement("div");
        statusSlot.setAttribute("data-canvas-table-status", "");
        statusSlot.setAttribute("class", "canvas-table__status");
        el2.appendChild(statusSlot);
        const scroll = doc.createElement("div");
        scroll.setAttribute("class", "canvas-table__scroll");
        scroll.setAttribute("data-canvas-table-scroll", "");
        el2.appendChild(scroll);
        const table = doc.createElement("table");
        table.setAttribute("class", "canvas-table__grid");
        scroll.appendChild(table);
        const thead = doc.createElement("thead");
        thead.setAttribute("class", "canvas-table__head");
        table.appendChild(thead);
        const tbody = doc.createElement("tbody");
        tbody.setAttribute("class", "canvas-table__body");
        table.appendChild(tbody);
        const pager = doc.createElement("div");
        pager.setAttribute("class", "canvas-table__pager");
        pager.setAttribute("data-canvas-table-pager", "");
        pager.hidden = true;
        el2.appendChild(pager);
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const state = getState4(el2);
        const cols = resolveTableColumns(props);
        const pageSize = typeof props.pageSize === "number" && props.pageSize > 0 ? Math.floor(props.pageSize) : DEFAULT_PAGE_SIZE;
        setClass5(el2, "canvas-table");
        const statusHost = [...el2.childNodes ?? []].find(
          (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-status") != null
        ) ?? el2;
        const { status } = applyTableStatus(
          /** @type {Element} */
          statusHost,
          doc,
          props,
          ctx,
          { emptyMessage: asText5(props.emptyMessage) || "No rows" }
        );
        el2.setAttribute("data-status", status);
        setOrRemoveAttr5(
          el2,
          "aria-busy",
          status === "loading" || status === "refetching" ? "true" : null
        );
        const scroll = [...el2.childNodes ?? []].find(
          (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-scroll") != null
        );
        const pager = [...el2.childNodes ?? []].find(
          (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-pager") != null
        );
        const table = scroll?.firstChild;
        const thead = table?.firstChild;
        const tbody = table?.childNodes?.[1];
        if (!scroll || !table || !thead || !tbody) return;
        ensureScrollKeyboard(
          el2,
          /** @type {Element} */
          scroll,
          state
        );
        if (status === "loading" || status === "error") {
          clearChildren5(
            /** @type {Element} */
            thead
          );
          clearChildren5(
            /** @type {Element} */
            tbody
          );
          if (pager) pager.hidden = true;
          return;
        }
        if (!cols.length) {
          applyTableStatus(
            /** @type {Element} */
            statusHost,
            doc,
            { ...props, status: "empty" },
            ctx,
            {
              emptyMessage: asText5(props.emptyMessage) || "No rows"
            }
          );
          el2.setAttribute("data-status", "empty");
          clearChildren5(
            /** @type {Element} */
            thead
          );
          clearChildren5(
            /** @type {Element} */
            tbody
          );
          if (pager) pager.hidden = true;
          return;
        }
        const { rows, rowCount } = columnsToRows(cols);
        if (rowCount === 0 && status !== "refetching") {
          applyTableStatus(
            /** @type {Element} */
            statusHost,
            doc,
            { ...props, status: "empty" },
            ctx,
            {
              emptyMessage: asText5(props.emptyMessage) || "No rows"
            }
          );
          el2.setAttribute("data-status", "empty");
        } else if (status === "refetching") {
        } else if (statusHost.getAttribute?.("data-status") === "empty" && rowCount > 0) {
          applyTableStatus(
            /** @type {Element} */
            statusHost,
            doc,
            { ...props, status: "ready" },
            ctx
          );
          el2.setAttribute("data-status", "ready");
        }
        let sortCol = state.sortCol;
        let sortDir = state.sortDir;
        if (props.sortBy != null) {
          if (typeof props.sortBy === "number") sortCol = props.sortBy;
          else {
            const label = asText5(props.sortBy);
            const idx = cols.findIndex((c) => c.label === label || c.key === label);
            sortCol = idx >= 0 ? idx : null;
          }
        }
        if (props.sortDir === "asc" || props.sortDir === "desc") {
          sortDir = props.sortDir;
        }
        let order = rows.map((_, i) => i);
        if (sortCol != null && sortCol >= 0 && sortCol < cols.length) {
          order = sortRowIndices(rows, sortCol, sortDir, cols[sortCol].type);
        }
        const totalPages = Math.max(1, Math.ceil(order.length / pageSize));
        if (state.page >= totalPages) state.page = Math.max(0, totalPages - 1);
        if (typeof props.page === "number" && props.page >= 0) {
          state.page = Math.min(Math.floor(props.page), totalPages - 1);
        }
        const start = state.page * pageSize;
        const end = Math.min(start + pageSize, order.length);
        const pageOrder = order.slice(start, end);
        clearChildren5(
          /** @type {Element} */
          thead
        );
        const hr = doc.createElement("tr");
        hr.setAttribute("class", "canvas-table__row canvas-table__row--head");
        cols.forEach((col, ci) => {
          const th = doc.createElement("th");
          th.setAttribute("class", `canvas-table__th canvas-table__align-${col.align || "left"}`);
          th.setAttribute("scope", "col");
          th.setAttribute("data-col-type", col.type);
          th.setAttribute("data-col-key", col.key);
          const labelEl = doc.createElement("span");
          labelEl.setAttribute("class", "canvas-table__th-label");
          labelEl.textContent = col.label;
          th.appendChild(labelEl);
          if (col.sortable || props.sortable === true) {
            th.setAttribute("tabindex", "0");
            th.setAttribute("role", "button");
            const active = sortCol === ci;
            setOrRemoveAttr5(th, "aria-sort", active ? sortDir === "asc" ? "ascending" : "descending" : "none");
            const activate = () => {
              if (state.sortCol === ci) {
                state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
              } else {
                state.sortCol = ci;
                state.sortDir = "asc";
              }
              Table.update(el2, props, ctx);
            };
            th.addEventListener("click", activate);
            th.addEventListener("keydown", (e) => {
              const ev = (
                /** @type {KeyboardEvent} */
                e
              );
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault?.();
                activate();
              }
            });
          }
          hr.appendChild(th);
        });
        thead.appendChild(hr);
        clearChildren5(
          /** @type {Element} */
          tbody
        );
        for (const ri of pageOrder) {
          const tr = doc.createElement("tr");
          tr.setAttribute("class", "canvas-table__row");
          tr.setAttribute("data-row-index", String(ri));
          cols.forEach((col, ci) => {
            const td = doc.createElement("td");
            td.setAttribute("class", `canvas-table__td canvas-table__align-${col.align || "left"}`);
            td.setAttribute("data-col-type", col.type);
            fillCell(
              doc,
              /** @type {HTMLTableCellElement} */
              td,
              rows[ri][ci],
              col.type,
              ctx
            );
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        }
        el2.setAttribute("data-row-count", String(rowCount));
        el2.setAttribute("data-page", String(state.page));
        el2.setAttribute("data-page-size", String(pageSize));
        el2.setAttribute("data-visible-rows", String(pageOrder.length));
        if (pager) {
          const p = (
            /** @type {HTMLElement} */
            pager
          );
          if (totalPages > 1) {
            p.hidden = false;
            clearChildren5(p);
            const prev = makePageBtn(doc, "Previous page");
            prev.disabled = state.page <= 0;
            prev.addEventListener("click", () => {
              if (state.page > 0) {
                state.page -= 1;
                Table.update(el2, props, ctx);
              }
            });
            const info = doc.createElement("span");
            info.setAttribute("class", "canvas-table__page-info");
            info.setAttribute("aria-live", "polite");
            info.textContent = `${state.page + 1} / ${totalPages}`;
            const next = makePageBtn(doc, "Next page");
            next.disabled = state.page >= totalPages - 1;
            next.addEventListener("click", () => {
              if (state.page < totalPages - 1) {
                state.page += 1;
                Table.update(el2, props, ctx);
              }
            });
            p.appendChild(prev);
            p.appendChild(info);
            p.appendChild(next);
          } else {
            p.hidden = true;
            clearChildren5(p);
          }
        }
      },
      unmount(el2) {
        const state = STATE20.get(el2);
        if (state?.onKey) {
          const scroll = [...el2.childNodes ?? []].find(
            (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-scroll") != null
          );
          scroll?.removeEventListener?.("keydown", state.onKey);
        }
        STATE20.delete(el2);
      }
    });
  }
});

// src/Browser/components/table/EditableTable.js
function normalizeEditableColumns(columns) {
  if (!Array.isArray(columns)) return [];
  return columns.filter((c) => c != null).map((c, i) => normalizeEditableColumn(c, i));
}
function getState5(host) {
  let s = STATE21.get(host);
  if (!s) {
    s = {
      rows: [],
      baseline: null,
      selected: null,
      editing: null,
      editBuffer: "",
      justCancelled: false,
      columnKeys: [],
      mutationStatus: "idle",
      mutationError: "",
      cellErrors: /* @__PURE__ */ new Map(),
      wired: false,
      initializedFrom: ""
    };
    STATE21.set(host, s);
  }
  return s;
}
function rulesForCellType(type) {
  const t = normalizeEditableCellType(type);
  if (t === "number") return { number: true };
  if (t === "url") return { url: true };
  if (t === "date-single") {
    return { pattern: "\\d{4}-\\d{2}-\\d{2}" };
  }
  return {};
}
function validateEditableCell(value, type, options = []) {
  const t = normalizeEditableCellType(type);
  if (t === "select") {
    const str = asText5(value);
    if (options.length && !options.some((o) => o.value === str)) {
      return { ok: false, code: "select", message: "invalid option" };
    }
    return { ok: true, value: str };
  }
  if (t === "number") {
    const raw = value == null ? "" : String(value);
    if (raw.trim() === "") return { ok: true, value: 0 };
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) {
      return { ok: false, code: "number", message: "not a number" };
    }
    return { ok: true, value: parsed };
  }
  const result = validateField(value, rulesForCellType(t));
  if (!result.ok) return result;
  return { ok: true, value: typeof value === "number" ? value : asText5(value) };
}
function validateEditableTable(rows, columns) {
  const errors = [];
  for (const row of rows) {
    for (const col of columns) {
      const v = row.values[col.key];
      const r = validateEditableCell(v, col.type, col.options);
      if (!r.ok) {
        errors.push({ rowId: row.id, key: col.key, message: r.message });
      }
    }
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    data: fromKeyedRows(rows, columns.map((c) => c.key))
  };
}
function navigateCell(row, col, direction, rowCount, columnKeys) {
  const ci = columnKeys.indexOf(col);
  let newRow = row;
  let newCi = ci < 0 ? 0 : ci;
  switch (direction) {
    case "up":
      newRow = Math.max(0, row - 1);
      break;
    case "down":
      newRow = Math.min(Math.max(0, rowCount - 1), row + 1);
      break;
    case "left":
      newCi = Math.max(0, newCi - 1);
      break;
    case "right":
      newCi = Math.min(columnKeys.length - 1, newCi + 1);
      break;
    default:
      break;
  }
  return { row: newRow, col: columnKeys[newCi] || col };
}
function dataSignature(data, keys) {
  try {
    return JSON.stringify({ keys, data });
  } catch {
    return String(keys.join(","));
  }
}
function renderChangesBar(doc, host, state, columns, props, ctx) {
  let bar = [...host.childNodes ?? []].find(
    (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-editable-changes") != null
  );
  const count = countChangedCells(state.rows, state.baseline, state.columnKeys);
  if (count <= 0) {
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    return;
  }
  if (!bar) {
    bar = doc.createElement("div");
    bar.setAttribute("data-canvas-editable-changes", "");
    bar.setAttribute("class", "canvas-editable-table__changes");
    host.appendChild(bar);
  }
  clearChildren5(
    /** @type {Element} */
    bar
  );
  const countEl = doc.createElement("div");
  countEl.setAttribute("class", "canvas-editable-table__changes-count");
  countEl.textContent = `${count} changes made`;
  bar.appendChild(countEl);
  const btns = doc.createElement("div");
  btns.setAttribute("class", "canvas-editable-table__changes-buttons");
  const reset = doc.createElement("button");
  reset.type = "button";
  reset.setAttribute("class", "canvas-editable-table__btn canvas-editable-table__btn--secondary");
  reset.textContent = asText5(props.resetLabel) || "Reset";
  reset.addEventListener("click", () => {
    if (state.baseline) {
      state.rows = [...state.baseline.entries()].map(([id, values]) => ({
        id,
        values: { ...values }
      }));
    }
    state.selected = null;
    state.editing = null;
    state.cellErrors.clear();
    state.mutationStatus = "idle";
    state.mutationError = "";
    EditableTable.update(host, props, ctx);
  });
  btns.appendChild(reset);
  const save = doc.createElement("button");
  save.type = "button";
  save.setAttribute("class", "canvas-editable-table__btn canvas-editable-table__btn--primary");
  save.textContent = asText5(props.saveLabel) || "Save Changes";
  setOrRemoveAttr5(save, "disabled", state.mutationStatus === "loading" ? "true" : null);
  save.addEventListener("click", () => {
    void commitMutation(host, state, columns, props, ctx);
  });
  btns.appendChild(save);
  bar.appendChild(btns);
  if (state.mutationStatus === "error" && state.mutationError) {
    const err = doc.createElement("div");
    err.setAttribute("class", "canvas-editable-table__mutation-error");
    err.setAttribute("role", "alert");
    err.textContent = state.mutationError;
    bar.appendChild(err);
  }
  if (state.mutationStatus === "loading") {
    const busy = doc.createElement("div");
    busy.setAttribute("class", "canvas-editable-table__mutation-busy");
    busy.setAttribute("role", "status");
    busy.textContent = "Saving\u2026";
    bar.appendChild(busy);
  }
}
async function commitMutation(host, state, columns, props, ctx) {
  const validated = validateEditableTable(state.rows, columns);
  state.cellErrors.clear();
  if (!validated.ok) {
    for (const e of validated.errors) {
      state.cellErrors.set(`${e.rowId}:${e.key}`, e.message);
    }
    state.mutationStatus = "error";
    state.mutationError = "Validation failed";
    EditableTable.update(host, props, ctx);
    return;
  }
  const mutationId = asText5(props.mutationId) || asText5(props.name) || "EditableTable";
  const mutations = ctx.mutations;
  state.mutationStatus = "loading";
  state.mutationError = "";
  EditableTable.update(host, props, ctx);
  try {
    if (mutations && typeof mutations.runMutation === "function") {
      if (typeof mutations.register === "function") {
        mutations.register({
          statementId: mutationId,
          toolName: asText5(props.toolName) || "saveEditableTable",
          args: {},
          refreshQueries: Array.isArray(props.refreshQueries) ? props.refreshQueries : []
        });
      }
      const result = await mutations.runMutation(mutationId, {
        name: asText5(props.name),
        data: validated.data
      });
      if (result?.status === "error") {
        state.mutationStatus = "error";
        state.mutationError = asText5(result.error) || "Save failed";
      } else {
        state.mutationStatus = "success";
        state.baseline = new Map(state.rows.map((r) => [r.id, { ...r.values }]));
      }
    } else if (typeof props.onSave === "function") {
      await /** @type {Function} */
      props.onSave(validated.data);
      state.mutationStatus = "success";
      state.baseline = new Map(state.rows.map((r) => [r.id, { ...r.values }]));
    } else {
      state.mutationStatus = "success";
      state.baseline = new Map(state.rows.map((r) => [r.id, { ...r.values }]));
      if (typeof ctx.reportError === "function" && props.requireMutation === true) {
        ctx.reportError(new Error("editable-table-missing-mutations"));
      }
    }
  } catch (err) {
    state.mutationStatus = "error";
    state.mutationError = err instanceof Error ? err.message : String(err);
  }
  EditableTable.update(host, props, ctx);
}
function renderDisplayValue(doc, cell, value, col, ctx, invalid) {
  clearChildren5(cell);
  const type = col.type;
  if (type === "url") {
    const raw = asText5(value);
    const policy = ctx.urlPolicy && typeof ctx.urlPolicy.safeUrl === "function" ? ctx.urlPolicy.safeUrl : safeUrl;
    const href = policy(raw);
    const wrap = doc.createElement("span");
    wrap.setAttribute("class", "canvas-editable-table__url");
    if (href) {
      const a = doc.createElement("a");
      a.setAttribute("href", href);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      a.setAttribute("class", "canvas-editable-table__url-link");
      a.textContent = raw;
      a.addEventListener("click", (e) => e.stopPropagation?.());
      wrap.appendChild(a);
    } else {
      const span = doc.createElement("span");
      span.setAttribute("class", "canvas-editable-table__url-text");
      span.textContent = raw;
      wrap.appendChild(span);
    }
    if (invalid || raw && !href) {
      const warn = doc.createElement("span");
      warn.setAttribute("class", "canvas-editable-table__url-warn");
      warn.setAttribute("title", "This might not be a valid URL");
      warn.setAttribute("aria-label", "Invalid URL");
      warn.textContent = "!";
      wrap.appendChild(warn);
    }
    cell.appendChild(wrap);
    return;
  }
  if (type === "select") {
    const match = col.options.find((o) => o.value === asText5(value));
    cell.textContent = match ? match.label : asText5(value);
    return;
  }
  cell.textContent = value == null ? "" : String(value);
}
function renderCell(doc, host, state, columns, props, ctx, rowIndex, col, td) {
  const row = state.rows[rowIndex];
  if (!row) return;
  const value = row.values[col.key];
  const isSelected = state.selected?.row === rowIndex && state.selected?.col === col.key;
  const isEditing = state.editing?.row === rowIndex && state.editing?.col === col.key;
  const errKey = `${row.id}:${col.key}`;
  const errMsg = state.cellErrors.get(errKey);
  setClass5(
    td,
    [
      "canvas-editable-table__td",
      isSelected ? "canvas-editable-table__td--selected" : "",
      isEditing ? "canvas-editable-table__td--editing" : "",
      errMsg ? "canvas-editable-table__td--invalid" : ""
    ].filter(Boolean).join(" ")
  );
  td.setAttribute("data-row-id", row.id);
  td.setAttribute("data-col-key", col.key);
  td.setAttribute("data-cell-type", col.type);
  setOrRemoveAttr5(td, "aria-selected", isSelected ? "true" : null);
  setOrRemoveAttr5(td, "aria-invalid", errMsg ? "true" : null);
  const inner = doc.createElement("div");
  inner.setAttribute("class", "canvas-editable-table__cell");
  inner.setAttribute("tabindex", "0");
  setOrRemoveAttr5(inner, "data-selected", isSelected ? "true" : null);
  setOrRemoveAttr5(inner, "data-editing", isEditing ? "true" : null);
  const startEdit = (seed) => {
    state.selected = { row: rowIndex, col: col.key };
    state.editing = { row: rowIndex, col: col.key };
    state.editBuffer = seed != null ? String(seed) : value == null ? "" : String(value);
    EditableTable.update(host, props, ctx);
  };
  const finishEdit = (save) => {
    if (save && state.editing) {
      const parsed = validateEditableCell(state.editBuffer, col.type, col.options);
      if (!parsed.ok) {
        state.cellErrors.set(errKey, parsed.message);
      } else {
        state.cellErrors.delete(errKey);
        row.values[col.key] = /** @type {string|number} */
        parsed.value;
      }
    }
    state.editing = null;
    EditableTable.update(host, props, ctx);
  };
  const cancelEdit = () => {
    state.justCancelled = true;
    state.editBuffer = value == null ? "" : String(value);
    state.editing = null;
    EditableTable.update(host, props, ctx);
  };
  const move = (dir) => {
    const next = navigateCell(
      rowIndex,
      col.key,
      dir,
      state.rows.length,
      state.columnKeys
    );
    state.selected = next;
    state.editing = null;
    EditableTable.update(host, props, ctx);
  };
  inner.addEventListener("click", (e) => {
    e.stopPropagation?.();
    if (!isSelected && !isEditing) {
      state.selected = { row: rowIndex, col: col.key };
      state.editing = null;
      EditableTable.update(host, props, ctx);
    } else if (!isEditing) {
      startEdit();
    }
  });
  inner.addEventListener("keydown", (e) => {
    const ev = (
      /** @type {KeyboardEvent} */
      e
    );
    if (isEditing) {
      if (ev.key === "Enter") {
        ev.preventDefault?.();
        finishEdit(true);
        move("down");
      } else if (ev.key === "Tab") {
        ev.preventDefault?.();
        finishEdit(true);
        move(ev.shiftKey ? "left" : "right");
      } else if (ev.key === "Escape") {
        ev.preventDefault?.();
        cancelEdit();
      }
      return;
    }
    if (!isSelected) return;
    if (ev.key === "Enter" || ev.key === "F2") {
      ev.preventDefault?.();
      startEdit();
    } else if (ev.key === "Tab") {
      ev.preventDefault?.();
      move(ev.shiftKey ? "left" : "right");
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault?.();
      move("up");
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault?.();
      move("down");
    } else if (ev.key === "ArrowLeft") {
      ev.preventDefault?.();
      move("left");
    } else if (ev.key === "ArrowRight") {
      ev.preventDefault?.();
      move("right");
    } else if (ev.key && ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      ev.preventDefault?.();
      startEdit(ev.key);
    }
  });
  inner.addEventListener("blur", (e) => {
    if (state.justCancelled) {
      state.justCancelled = false;
      return;
    }
    if (!state.editing || state.editing.row !== rowIndex || state.editing.col !== col.key) {
      return;
    }
    const related = (
      /** @type {FocusEvent} */
      e.relatedTarget
    );
    if (related && inner.contains?.(
      /** @type {Node} */
      related
    )) return;
    finishEdit(true);
  });
  if (isEditing) {
    let input;
    if (col.type === "select") {
      input = doc.createElement("select");
      input.setAttribute("class", "canvas-editable-table__input");
      for (const opt of col.options) {
        const o = doc.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        if (opt.value === state.editBuffer) o.selected = true;
        input.appendChild(o);
      }
      input.addEventListener("change", () => {
        state.editBuffer = /** @type {HTMLSelectElement} */
        input.value;
      });
    } else {
      input = doc.createElement("input");
      const inputType = col.type === "number" ? "number" : col.type === "date-single" ? "date" : col.type === "url" ? "url" : "text";
      input.setAttribute("type", inputType);
      input.setAttribute("class", "canvas-editable-table__input");
      input.value = state.editBuffer;
      input.addEventListener("input", () => {
        state.editBuffer = /** @type {HTMLInputElement} */
        input.value;
      });
    }
    input.addEventListener("keydown", (e) => {
      const ev = (
        /** @type {KeyboardEvent} */
        e
      );
      if (ev.key === "Enter") {
        ev.preventDefault?.();
        finishEdit(true);
        move("down");
      } else if (ev.key === "Tab") {
        ev.preventDefault?.();
        finishEdit(true);
        move(ev.shiftKey ? "left" : "right");
      } else if (ev.key === "Escape") {
        ev.preventDefault?.();
        cancelEdit();
      }
    });
    inner.appendChild(input);
    Promise.resolve().then(() => {
      if (typeof input.focus === "function") input.focus();
      if (typeof input.setSelectionRange === "function" && "value" in input) {
        try {
          input.setSelectionRange(0, String(input.value ?? "").length);
        } catch {
        }
      }
    });
  } else {
    renderDisplayValue(doc, inner, value, col, ctx, !!errMsg);
  }
  if (errMsg) {
    const tip = doc.createElement("span");
    tip.setAttribute("class", "canvas-editable-table__cell-error");
    tip.textContent = errMsg;
    inner.appendChild(tip);
  }
  clearChildren5(td);
  td.appendChild(inner);
  if (isSelected && !isEditing) {
    void Promise.resolve().then(() => {
      if (typeof inner.focus === "function") inner.focus();
    });
  }
}
var STATE21, EditableTable;
var init_EditableTable = __esm({
  "src/Browser/components/table/EditableTable.js"() {
    init_formValidation();
    init_urlPolicy();
    init_shared3();
    STATE21 = /* @__PURE__ */ new WeakMap();
    EditableTable = lifecycle5({
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "EditableTable");
        el2.setAttribute("class", "canvas-editable-table");
        el2.setAttribute("tabindex", "0");
        const statusSlot = doc.createElement("div");
        statusSlot.setAttribute("data-canvas-table-status", "");
        statusSlot.setAttribute("class", "canvas-table__status");
        el2.appendChild(statusSlot);
        const scroll = doc.createElement("div");
        scroll.setAttribute("class", "canvas-table__scroll canvas-editable-table__scroll");
        scroll.setAttribute("data-canvas-table-scroll", "");
        scroll.setAttribute("tabindex", "0");
        el2.appendChild(scroll);
        const table = doc.createElement("table");
        table.setAttribute("class", "canvas-table__grid canvas-editable-table__grid");
        scroll.appendChild(table);
        const thead = doc.createElement("thead");
        thead.setAttribute("class", "canvas-table__head");
        table.appendChild(thead);
        const tbody = doc.createElement("tbody");
        tbody.setAttribute("class", "canvas-table__body");
        table.appendChild(tbody);
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const state = getState5(el2);
        const columns = normalizeEditableColumns(props.columns);
        const columnKeys = columns.map((c) => c.key);
        state.columnKeys = columnKeys;
        const name = asText5(props.name);
        if (name) el2.setAttribute("data-table-name", name);
        setClass5(el2, "canvas-editable-table");
        setOrRemoveAttr5(el2, "data-mutation-status", state.mutationStatus);
        const statusHost = [...el2.childNodes ?? []].find(
          (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-status") != null
        ) ?? el2;
        const { status } = applyTableStatus(
          /** @type {Element} */
          statusHost,
          doc,
          props,
          ctx,
          { emptyMessage: "No rows" }
        );
        el2.setAttribute("data-status", status);
        const scroll = [...el2.childNodes ?? []].find(
          (n) => n.nodeType === 1 && n.getAttribute?.("data-canvas-table-scroll") != null
        );
        const table = scroll?.firstChild;
        const thead = table?.firstChild;
        const tbody = table?.childNodes?.[1];
        if (!scroll || !table || !thead || !tbody) return;
        if (status === "loading" || status === "error") {
          clearChildren5(
            /** @type {Element} */
            thead
          );
          clearChildren5(
            /** @type {Element} */
            tbody
          );
          return;
        }
        const sig = dataSignature(props.data, columnKeys);
        const streaming = props.isStreaming === true || ctx.stream && typeof ctx.stream === "object" && ctx.stream.isStreaming === true;
        if (!state.editing) {
          if (state.initializedFrom !== sig) {
            state.rows = toKeyedRows(props.data, columnKeys);
            state.initializedFrom = sig;
            if (!streaming) {
              state.baseline = new Map(state.rows.map((r) => [r.id, { ...r.values }]));
            }
          }
        }
        if (!streaming && state.baseline == null && state.rows.length) {
          state.baseline = new Map(state.rows.map((r) => [r.id, { ...r.values }]));
        }
        if (!columns.length || !state.rows.length) {
          if (!state.rows.length) {
            applyTableStatus(
              /** @type {Element} */
              statusHost,
              doc,
              { ...props, status: "empty" },
              ctx
            );
            el2.setAttribute("data-status", "empty");
          }
          clearChildren5(
            /** @type {Element} */
            thead
          );
          clearChildren5(
            /** @type {Element} */
            tbody
          );
          renderChangesBar(doc, el2, state, columns, props, ctx);
          return;
        }
        clearChildren5(
          /** @type {Element} */
          thead
        );
        const hr = doc.createElement("tr");
        columns.forEach((col) => {
          const th = doc.createElement("th");
          th.setAttribute("class", "canvas-table__th");
          th.setAttribute("scope", "col");
          th.setAttribute("data-col-key", col.key);
          th.setAttribute("data-cell-type", col.type);
          if (col.width) th.setAttribute("data-min-width", String(col.width));
          th.textContent = col.header;
          hr.appendChild(th);
        });
        thead.appendChild(hr);
        clearChildren5(
          /** @type {Element} */
          tbody
        );
        state.rows.forEach((row, ri) => {
          const tr = doc.createElement("tr");
          tr.setAttribute("class", "canvas-table__row");
          tr.setAttribute("data-row-id", row.id);
          columns.forEach((col) => {
            const td = doc.createElement("td");
            renderCell(
              doc,
              el2,
              state,
              columns,
              props,
              ctx,
              ri,
              col,
              /** @type {HTMLTableCellElement} */
              td
            );
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        el2.setAttribute(
          "data-changed-cells",
          String(countChangedCells(state.rows, state.baseline, columnKeys))
        );
        el2.setAttribute("data-row-count", String(state.rows.length));
        renderChangesBar(doc, el2, state, columns, props, ctx);
        if (!state.wired) {
          state.wired = true;
          state.onKey = (e) => {
            const ev = (
              /** @type {KeyboardEvent} */
              e
            );
            if (!state.editing && ev.key === "Tab" && (ctx.document?.activeElement === el2 || /** @type {Document} */
            el2.ownerDocument?.activeElement === el2)) {
              if (!state.selected && state.rows.length && columnKeys.length) {
                ev.preventDefault?.();
                state.selected = { row: 0, col: columnKeys[0] };
                EditableTable.update(el2, props, ctx);
              }
            }
          };
          el2.addEventListener("keydown", state.onKey);
        }
      },
      unmount(el2) {
        const state = STATE21.get(el2);
        if (state?.onKey) el2.removeEventListener("keydown", state.onKey);
        STATE21.delete(el2);
      }
    });
  }
});

// src/Browser/components/table/registerTable.js
var registerTable_exports = {};
__export(registerTable_exports, {
  Col: () => Col,
  EditableTable: () => EditableTable,
  TABLE_COMPONENTS: () => TABLE_COMPONENTS,
  Table: () => Table,
  default: () => registerTable_default,
  registerTable: () => registerTable
});
function registerTable(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerTable: registry with register() required");
  }
  registry.register("Col", Col);
  registry.register("Table", Table);
  registry.register("EditableTable", EditableTable);
  return registry;
}
var TABLE_COMPONENTS, registerTable_default;
var init_registerTable = __esm({
  "src/Browser/components/table/registerTable.js"() {
    init_Col();
    init_Table();
    init_EditableTable();
    TABLE_COMPONENTS = Object.freeze({
      Col,
      Table,
      EditableTable
    });
    registerTable_default = registerTable;
  }
});

// src/Browser/components/charts/kernel/scales.js
function linearScale(domainMin, domainMax, range) {
  const [r0, r1] = range;
  const d0 = Number(domainMin);
  const d1 = Number(domainMax);
  const span = d1 - d0;
  if (!Number.isFinite(d0) || !Number.isFinite(d1) || span === 0) {
    const mid = (r0 + r1) / 2;
    return () => mid;
  }
  return (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return r0;
    return r0 + (n - d0) / span * (r1 - r0);
  };
}
function bandScale(domain, range, opts = {}) {
  const labels = Array.isArray(domain) ? domain : [];
  const [r0, r1] = range;
  const n = Math.max(labels.length, 1);
  const padInner = opts.paddingInner ?? opts.padding ?? 0.2;
  const padOuter = opts.paddingOuter ?? opts.padding ?? 0.1;
  const span = r1 - r0;
  const step = span / (n - padInner + 2 * padOuter);
  const bandwidth = Math.max(0, step * (1 - padInner));
  const start = r0 + padOuter * step;
  function scale(i) {
    const idx = Number(i);
    if (!Number.isFinite(idx) || idx < 0) return start;
    return start + idx * step;
  }
  scale.bandwidth = bandwidth;
  scale.step = step;
  return scale;
}
function niceDomain(values, opts = {}) {
  const nums = (Array.isArray(values) ? values : []).map(Number).filter((n) => Number.isFinite(n));
  if (!nums.length) return [0, 1];
  let min = Math.min(...nums);
  let max = Math.max(...nums);
  if (opts.includeZero !== false) {
    if (min > 0) min = 0;
    if (max < 0) max = 0;
  }
  if (min === max) {
    if (min === 0) return [0, 1];
    const pad2 = Math.abs(min) * 0.1 || 1;
    return [min - pad2, max + pad2];
  }
  const pad = (opts.pad ?? 0.05) * (max - min);
  return [min - (opts.includeZero === false ? pad : 0), max + pad];
}
function niceTicks(min, max, count = 5) {
  const d0 = Number(min);
  const d1 = Number(max);
  const n = Math.max(2, Math.floor(count) || 5);
  if (!Number.isFinite(d0) || !Number.isFinite(d1)) return [0, 1];
  if (d0 === d1) return [d0];
  const span = d1 - d0;
  const step0 = span / (n - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(step0) || 1)));
  const err = step0 / mag;
  let niceStep;
  if (err <= 1.5) niceStep = 1 * mag;
  else if (err <= 3) niceStep = 2 * mag;
  else if (err <= 7) niceStep = 5 * mag;
  else niceStep = 10 * mag;
  const start = Math.ceil(d0 / niceStep) * niceStep;
  const ticks = [];
  for (let v = start; v <= d1 + niceStep * 1e-9; v += niceStep) {
    const rounded = Math.abs(v) < 1e-12 ? 0 : Number(v.toPrecision(12));
    ticks.push(rounded);
    if (ticks.length > 20) break;
  }
  if (!ticks.length) ticks.push(d0, d1);
  return ticks;
}
function formatTick(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toPrecision(4)));
}
var init_scales = __esm({
  "src/Browser/components/charts/kernel/scales.js"() {
  }
});

// src/Browser/components/charts/kernel/geometry.js
function polarToCartesian(cx, cy, r, angleRad) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad)
  };
}
function donutArcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const large = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  const sweep = endAngle >= startAngle ? 1 : 0;
  const o0 = polarToCartesian(cx, cy, rOuter, startAngle);
  const o1 = polarToCartesian(cx, cy, rOuter, endAngle);
  if (rInner <= 0) {
    return [
      `M ${cx} ${cy}`,
      `L ${o0.x} ${o0.y}`,
      `A ${rOuter} ${rOuter} 0 ${large} ${sweep} ${o1.x} ${o1.y}`,
      "Z"
    ].join(" ");
  }
  const i0 = polarToCartesian(cx, cy, rInner, endAngle);
  const i1 = polarToCartesian(cx, cy, rInner, startAngle);
  return [
    `M ${o0.x} ${o0.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} ${sweep} ${o1.x} ${o1.y}`,
    `L ${i0.x} ${i0.y}`,
    `A ${rInner} ${rInner} 0 ${large} ${sweep ? 0 : 1} ${i1.x} ${i1.y}`,
    "Z"
  ].join(" ");
}
function pieSlices(slices, opts) {
  const items = (Array.isArray(slices) ? slices : []).map((s) => ({
    label: String(s.label ?? ""),
    value: Math.max(0, Number(s.value) || 0)
  }));
  const total = items.reduce((a, s) => a + s.value, 0);
  const start0 = opts.startAngle ?? -Math.PI / 2;
  const end0 = opts.endAngle ?? start0 + Math.PI * 2;
  const span = end0 - start0;
  const pad = opts.padAngle ?? 0;
  const rInner = opts.rInner ?? 0;
  const out = [];
  if (!items.length || total <= 0 || !Number.isFinite(span) || span === 0) {
    return out;
  }
  let angle = start0;
  const usable = span - pad * items.length;
  for (const item of items) {
    const portion = item.value / total;
    const sliceSpan = Math.max(0, usable * portion);
    const a0 = angle + pad / 2;
    const a1 = a0 + sliceSpan;
    out.push({
      ...item,
      percent: portion * 100,
      startAngle: a0,
      endAngle: a1,
      midAngle: (a0 + a1) / 2,
      path: donutArcPath(opts.cx, opts.cy, opts.rOuter, rInner, a0, a1)
    });
    angle = a1 + pad / 2;
  }
  return out;
}
function barRects(data, plot) {
  const labels = data.labels || [];
  const series = data.series || [];
  const variant = data.variant === "stacked" ? "stacked" : "grouped";
  const xScale = bandScale(labels, [plot.x0, plot.x1]);
  const yScale = linearScale(plot.yDomain[0], plot.yDomain[1], [plot.y1, plot.y0]);
  const out = [];
  if (variant === "stacked") {
    for (let i = 0; i < labels.length; i++) {
      let accPos = 0;
      let accNeg = 0;
      const bw = xScale.bandwidth;
      const x = xScale(i);
      for (let si = 0; si < series.length; si++) {
        const s = series[si];
        const v = Number(s.values?.[i]) || 0;
        const yBase = v >= 0 ? accPos : accNeg;
        const y1 = yScale(yBase);
        const y0 = yScale(yBase + v);
        const top = Math.min(y0, y1);
        const h = Math.abs(y1 - y0);
        out.push({
          series: s.name,
          label: labels[i],
          value: v,
          x,
          y: top,
          width: bw,
          height: h,
          i,
          si
        });
        if (v >= 0) accPos += v;
        else accNeg += v;
      }
    }
    return out;
  }
  const group = xScale.bandwidth;
  const n = Math.max(series.length, 1);
  const gap = group * 0.08;
  const barW = Math.max(1, (group - gap * (n - 1)) / n);
  const y0line = yScale(0);
  for (let i = 0; i < labels.length; i++) {
    const baseX = xScale(i);
    for (let si = 0; si < series.length; si++) {
      const s = series[si];
      const v = Number(s.values?.[i]) || 0;
      const yv = yScale(v);
      const top = Math.min(yv, y0line);
      const h = Math.abs(yv - y0line);
      out.push({
        series: s.name,
        label: labels[i],
        value: v,
        x: baseX + si * (barW + gap),
        y: top,
        width: barW,
        height: h,
        i,
        si
      });
    }
  }
  return out;
}
function horizontalBarRects(data, plot) {
  const labels = data.labels || [];
  const series = data.series || [];
  const variant = data.variant === "stacked" ? "stacked" : "grouped";
  const yScale = bandScale(labels, [plot.y0, plot.y1]);
  const xScale = linearScale(plot.xDomain[0], plot.xDomain[1], [plot.x0, plot.x1]);
  const out = [];
  const x0line = xScale(0);
  if (variant === "stacked") {
    for (let i = 0; i < labels.length; i++) {
      let accPos = 0;
      let accNeg = 0;
      const bh = yScale.bandwidth;
      const y = yScale(i);
      for (let si = 0; si < series.length; si++) {
        const s = series[si];
        const v = Number(s.values?.[i]) || 0;
        const xBase = v >= 0 ? accPos : accNeg;
        const x1 = xScale(xBase);
        const x2 = xScale(xBase + v);
        out.push({
          series: s.name,
          label: labels[i],
          value: v,
          x: Math.min(x1, x2),
          y,
          width: Math.abs(x2 - x1),
          height: bh,
          i,
          si
        });
        if (v >= 0) accPos += v;
        else accNeg += v;
      }
    }
    return out;
  }
  const group = yScale.bandwidth;
  const n = Math.max(series.length, 1);
  const gap = group * 0.08;
  const barH = Math.max(1, (group - gap * (n - 1)) / n);
  for (let i = 0; i < labels.length; i++) {
    const baseY = yScale(i);
    for (let si = 0; si < series.length; si++) {
      const s = series[si];
      const v = Number(s.values?.[i]) || 0;
      const xv = xScale(v);
      out.push({
        series: s.name,
        label: labels[i],
        value: v,
        x: Math.min(xv, x0line),
        y: baseY + si * (barH + gap),
        width: Math.abs(xv - x0line),
        height: barH,
        i,
        si
      });
    }
  }
  return out;
}
function seriesPath(values, plot) {
  const labels = plot.labels || [];
  const n = labels.length;
  const xScale = bandScale(labels, [plot.x0, plot.x1], { paddingInner: 0.1, paddingOuter: 0.05 });
  const yScale = linearScale(plot.yDomain[0], plot.yDomain[1], [plot.y1, plot.y0]);
  const bw = xScale.bandwidth;
  const points = [];
  for (let i = 0; i < n; i++) {
    const v = Number(values?.[i]) || 0;
    points.push({
      x: xScale(i) + bw / 2,
      y: yScale(v),
      value: v,
      i
    });
  }
  const variant = plot.variant || "linear";
  let line = "";
  if (variant === "step") {
    line = points.map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const mid = (prev.x + p.x) / 2;
      return `L ${mid} ${prev.y} L ${mid} ${p.y} L ${p.x} ${p.y}`;
    }).join(" ");
  } else if (variant === "natural" && points.length >= 2) {
    line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
  } else {
    line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }
  const yBase = yScale(Math.min(Math.max(0, plot.yDomain[0]), plot.yDomain[1]));
  let area = "";
  if (points.length) {
    area = `${line} L ${points[points.length - 1].x} ${yBase} L ${points[0].x} ${yBase} Z`;
  }
  return { line, area, points };
}
function radarGeometry(values, opts) {
  const vals = Array.isArray(values) ? values.map((v) => Number(v) || 0) : [];
  const n = Math.max(vals.length, 3);
  const max = opts.max && opts.max > 0 ? opts.max : Math.max(...vals, 1);
  const start = -Math.PI / 2;
  const points = [];
  const axes = [];
  for (let i = 0; i < n; i++) {
    const angle = start + i * 2 * Math.PI / n;
    const tip = polarToCartesian(opts.cx, opts.cy, opts.r, angle);
    axes.push({ x1: opts.cx, y1: opts.cy, x2: tip.x, y2: tip.y, i });
    const v = vals[i] ?? 0;
    const rr = Math.max(0, v) / max * opts.r;
    const p = polarToCartesian(opts.cx, opts.cy, rr, angle);
    points.push({ ...p, value: v, i });
  }
  const polygon = points.length ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z" : "";
  const levels = opts.levels ?? 4;
  const rings = [];
  for (let L = 1; L <= levels; L++) {
    const rr = opts.r * L / levels;
    const ringPts = [];
    for (let i = 0; i < n; i++) {
      const angle = start + i * 2 * Math.PI / n;
      const p = polarToCartesian(opts.cx, opts.cy, rr, angle);
      ringPts.push(`${i === 0 ? "M" : "L"} ${p.x} ${p.y}`);
    }
    rings.push(ringPts.join(" ") + " Z");
  }
  return { points, polygon, axes, rings };
}
function radialBars(items, opts) {
  const rows = (Array.isArray(items) ? items : []).map((s) => ({
    label: String(s.label ?? ""),
    value: Math.max(0, Number(s.value) || 0)
  }));
  const max = Math.max(...rows.map((r) => r.value), 1);
  const start0 = opts.startAngle ?? -Math.PI / 2;
  const end0 = opts.endAngle ?? start0 + Math.PI * 2;
  const span = end0 - start0;
  const n = Math.max(rows.length, 1);
  const track = (opts.rOuter - opts.rInner) / n;
  return rows.map((row, i) => {
    const r1 = opts.rInner + i * track + track * 0.15;
    const r0 = opts.rInner + (i + 1) * track - track * 0.15;
    const a1 = start0 + span * (row.value / max);
    return {
      ...row,
      percent: row.value / max * 100,
      i,
      rInner: r1,
      rOuter: r0,
      startAngle: start0,
      endAngle: a1,
      path: donutArcPath(opts.cx, opts.cy, r0, r1, start0, a1)
    };
  });
}
function scatterPositions(datasets, plot) {
  const xScale = linearScale(plot.xDomain[0], plot.xDomain[1], [plot.x0, plot.x1]);
  const yScale = linearScale(plot.yDomain[0], plot.yDomain[1], [plot.y1, plot.y0]);
  const out = [];
  (datasets || []).forEach((ds, si) => {
    (ds.points || []).forEach((pt, i) => {
      const vx = Number(pt.x);
      const vy = Number(pt.y);
      if (!Number.isFinite(vx) || !Number.isFinite(vy)) return;
      out.push({
        series: ds.name,
        x: xScale(vx),
        y: yScale(vy),
        vx,
        vy,
        z: pt.z != null ? Number(pt.z) : void 0,
        i,
        si
      });
    });
  });
  return out;
}
function stackedBarSegments(items, plot) {
  const rows = (Array.isArray(items) ? items : []).map((s) => ({
    label: String(s.label ?? ""),
    value: Math.max(0, Number(s.value) || 0)
  }));
  const total = rows.reduce((a, r) => a + r.value, 0) || 1;
  const width = plot.x1 - plot.x0;
  let x = plot.x0;
  return rows.map((row, i) => {
    const w = row.value / total * width;
    const seg = {
      ...row,
      percent: row.value / total * 100,
      x,
      y: plot.y,
      width: w,
      height: plot.height,
      i
    };
    x += w;
    return seg;
  });
}
var init_geometry = __esm({
  "src/Browser/components/charts/kernel/geometry.js"() {
    init_scales();
  }
});

// src/Browser/components/charts/kernel/palette.js
function resolvePalette(count, custom) {
  const n = Math.max(0, Math.floor(count) || 0);
  if (Array.isArray(custom) && custom.length) {
    return Array.from({ length: n }, (_, i) => String(custom[i % custom.length]));
  }
  return Array.from({ length: n }, (_, i) => {
    const idx = i % 8 + 1;
    return `var(--canvas-chart-${idx}, ${CHART_PALETTE_FALLBACKS[i % CHART_PALETTE_FALLBACKS.length]})`;
  });
}
function seriesMark(seriesIndex) {
  return SERIES_MARKS[seriesIndex % SERIES_MARKS.length];
}
function dashForMark(mark) {
  switch (mark) {
    case "dashed":
      return "6 4";
    case "dotted":
      return "2 3";
    case "dashdot":
      return "8 3 2 3";
    default:
      return null;
  }
}
var CHART_PALETTE_FALLBACKS, SERIES_MARKS;
var init_palette = __esm({
  "src/Browser/components/charts/kernel/palette.js"() {
    CHART_PALETTE_FALLBACKS = Object.freeze([
      "#0D47A1",
      "#208B3A",
      "#B12A90",
      "#E16462",
      "#FCA636",
      "#1976D2",
      "#7014CC",
      "#CB253E"
    ]);
    SERIES_MARKS = Object.freeze(["solid", "dashed", "dotted", "dashdot"]);
  }
});

// src/Browser/components/charts/kernel/measure.js
function observeSize(el2, onSize, defaults = {}) {
  const fallbackW = Number(defaults.width) || 320;
  const fallbackH = Number(defaults.height) || 240;
  const read = () => {
    const w = Number(el2.clientWidth) || Number(
      /** @type {any} */
      el2.offsetWidth
    ) || fallbackW;
    const h = Number(el2.clientHeight) || Number(
      /** @type {any} */
      el2.offsetHeight
    ) || fallbackH;
    return {
      width: Math.max(40, w),
      height: Math.max(40, h)
    };
  };
  let current = read();
  onSize(current);
  let observer = null;
  const RO = globalThis.ResizeObserver;
  if (typeof RO === "function") {
    const ro = new RO(() => {
      current = read();
      onSize(current);
    });
    try {
      ro.observe(el2);
      observer = ro;
    } catch {
      observer = null;
    }
  }
  return {
    disconnect() {
      observer?.disconnect?.();
      observer = null;
    },
    getSize() {
      return current;
    }
  };
}
function resolveChartSize(props, measured) {
  const height = Number(props.height);
  const width = Number(props.width);
  return {
    width: Number.isFinite(width) && width > 0 ? width : measured.width,
    height: Number.isFinite(height) && height > 0 ? height : measured.height || 240
  };
}
var init_measure = __esm({
  "src/Browser/components/charts/kernel/measure.js"() {
  }
});

// src/Browser/components/charts/kernel/normalize.js
function unwrap(node) {
  if (node == null) return null;
  if (typeof node !== "object") return null;
  const o = (
    /** @type {Record<string, unknown>} */
    node
  );
  if (o.type === "element" && o.props && typeof o.props === "object") {
    return (
      /** @type {Record<string, unknown>} */
      o.props
    );
  }
  if (typeof o.type === "string" && o.type !== "element" && o.props && typeof o.props === "object") {
    return (
      /** @type {Record<string, unknown>} */
      o.props
    );
  }
  return o;
}
function asArray2(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}
function normalizeLabels(labels) {
  return asArray2(labels).map((l) => String(l ?? ""));
}
function normalizeSeries(series) {
  return asArray2(series).map((item) => {
    const p = unwrap(item) || {};
    const name = String(p.category ?? p.name ?? "");
    const values = asArray2(p.values).map((v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    });
    return { name, values };
  }).filter((s) => s.name !== "" || s.values.length);
}
function normalizeCartesian(props) {
  const labels = normalizeLabels(props.labels);
  let series = normalizeSeries(props.series);
  const rows = asArray2(props.series);
  if (rows.length && Array.isArray(rows[0])) {
    const seriesNames = labels.slice(1);
    const cats = rows.map((row) => String(
      /** @type {unknown[]} */
      row[0] ?? ""
    ));
    series = seriesNames.map((name, si) => ({
      name,
      values: rows.map((row) => {
        const n = Number(
          /** @type {unknown[]} */
          row[si + 1]
        );
        return Number.isFinite(n) ? n : 0;
      })
    }));
    return {
      labels: cats,
      series,
      empty: !cats.length || !series.length
    };
  }
  return {
    labels,
    series,
    empty: !labels.length || !series.length
  };
}
function normalizeSlices(props) {
  const labels = normalizeLabels(props.labels);
  const values = asArray2(props.values).map((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  });
  if (labels.length && values.length) {
    const n = Math.min(labels.length, values.length);
    const items2 = Array.from({ length: n }, (_, i) => ({
      label: labels[i],
      value: values[i]
    }));
    return { items: items2, empty: !items2.length || items2.every((x) => x.value === 0) };
  }
  const items = asArray2(props.labels).map((node) => {
    const p = unwrap(node);
    if (!p || p.category == null) return null;
    const value = Number(p.value);
    return {
      label: String(p.category),
      value: Number.isFinite(value) ? value : 0
    };
  }).filter(Boolean);
  return {
    items: (
      /** @type {{ label: string, value: number }[]} */
      items
    ),
    empty: !items.length
  };
}
function normalizeScatter(props) {
  const datasets = asArray2(props.datasets).map((ds) => {
    const p = unwrap(ds) || {};
    const name = String(p.name ?? "");
    const points = asArray2(p.points).map((pt) => {
      const q = unwrap(pt) || {};
      const x = Number(q.x);
      const y = Number(q.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const z = q.z != null ? Number(q.z) : void 0;
      return Number.isFinite(z) ? { x, y, z } : { x, y };
    }).filter(Boolean);
    return {
      name,
      points: (
        /** @type {{ x: number, y: number, z?: number }[]} */
        points
      )
    };
  }).filter((d) => d.points.length);
  return { datasets, empty: !datasets.length };
}
function collectValues(series, variant = "grouped") {
  if (variant === "stacked") {
    const len = Math.max(0, ...series.map((s) => s.values.length));
    const sums = [];
    for (let i = 0; i < len; i++) {
      let pos = 0;
      let neg = 0;
      for (const s of series) {
        const v = Number(s.values[i]) || 0;
        if (v >= 0) pos += v;
        else neg += v;
      }
      sums.push(pos, neg);
    }
    return sums;
  }
  return series.flatMap((s) => s.values);
}
var init_normalize = __esm({
  "src/Browser/components/charts/kernel/normalize.js"() {
  }
});

// src/Browser/components/charts/kernel/svg.js
function svgEl(doc, tag, attrs = {}) {
  const el2 = typeof doc.createElementNS === "function" ? doc.createElementNS(SVG_NS2, tag) : doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    el2.setAttribute(k, String(v));
  }
  return el2;
}
function setAttr(el2, name, value) {
  if (value == null || value === false || value === "") el2.removeAttribute(name);
  else el2.setAttribute(name, String(value));
}
var SVG_NS2;
var init_svg = __esm({
  "src/Browser/components/charts/kernel/svg.js"() {
    SVG_NS2 = "http://www.w3.org/2000/svg";
  }
});

// src/Browser/components/charts/kernel/axes.js
function renderAxes(doc, opts) {
  const g = svgEl(doc, "g", { class: "canvas-chart__axes" });
  g.appendChild(
    svgEl(doc, "line", {
      class: "canvas-chart__axis-line canvas-chart__axis-line--x",
      x1: opts.x0,
      y1: opts.y1,
      x2: opts.x1,
      y2: opts.y1
    })
  );
  g.appendChild(
    svgEl(doc, "line", {
      class: "canvas-chart__axis-line canvas-chart__axis-line--y",
      x1: opts.x0,
      y1: opts.y0,
      x2: opts.x0,
      y2: opts.y1
    })
  );
  for (const t of opts.yTicks || []) {
    if (opts.grid !== false) {
      g.appendChild(
        svgEl(doc, "line", {
          class: "canvas-chart__grid-line",
          x1: opts.x0,
          y1: t.y,
          x2: opts.x1,
          y2: t.y
        })
      );
    }
    g.appendChild(
      svgEl(doc, "text", {
        class: "canvas-chart__tick-label canvas-chart__tick-label--y",
        x: opts.x0 - 6,
        y: t.y,
        "text-anchor": "end",
        "dominant-baseline": "middle"
      })
    ).textContent = t.label;
  }
  for (const t of opts.xTicks || []) {
    g.appendChild(
      svgEl(doc, "text", {
        class: "canvas-chart__tick-label canvas-chart__tick-label--x",
        x: t.x,
        y: opts.y1 + 14,
        "text-anchor": "middle",
        "dominant-baseline": "hanging"
      })
    ).textContent = t.label;
  }
  if (opts.xLabel) {
    g.appendChild(
      svgEl(doc, "text", {
        class: "canvas-chart__axis-title canvas-chart__axis-title--x",
        x: (opts.x0 + opts.x1) / 2,
        y: opts.y1 + 32,
        "text-anchor": "middle"
      })
    ).textContent = opts.xLabel;
  }
  if (opts.yLabel) {
    const ty = svgEl(doc, "text", {
      class: "canvas-chart__axis-title canvas-chart__axis-title--y",
      x: 12,
      y: (opts.y0 + opts.y1) / 2,
      "text-anchor": "middle",
      transform: `rotate(-90 12 ${(opts.y0 + opts.y1) / 2})`
    });
    ty.textContent = opts.yLabel;
    g.appendChild(ty);
  }
  return (
    /** @type {SVGGElement} */
    g
  );
}
function buildYTicks(domain, yScale, count = 5) {
  return niceTicks(domain[0], domain[1], count).map((v) => ({
    label: formatTick(v),
    y: yScale(v),
    value: v
  }));
}
function buildXCategoryTicks(labels, xScale, maxLabels = 12) {
  const n = labels.length;
  const step = n > maxLabels ? Math.ceil(n / maxLabels) : 1;
  const ticks = [];
  for (let i = 0; i < n; i += step) {
    ticks.push({
      label: labels[i],
      x: xScale(i) + xScale.bandwidth / 2
    });
  }
  return ticks;
}
var init_axes = __esm({
  "src/Browser/components/charts/kernel/axes.js"() {
    init_svg();
    init_scales();
  }
});

// src/Browser/components/charts/kernel/legend.js
function renderLegend(doc, items) {
  const list = doc.createElement("ul");
  list.setAttribute("class", "canvas-chart__legend");
  list.setAttribute("role", "list");
  list.setAttribute("aria-label", "Chart legend");
  (items || []).forEach((item, i) => {
    const li = doc.createElement("li");
    li.setAttribute("class", "canvas-chart__legend-item");
    li.setAttribute("role", "listitem");
    const mark = item.mark || seriesMark(i);
    li.setAttribute("data-mark", mark);
    const swatch = doc.createElement("span");
    swatch.setAttribute("class", "canvas-chart__legend-swatch");
    swatch.setAttribute("data-mark", mark);
    setInlineStyle(swatch, { background: item.color });
    swatch.setAttribute("aria-hidden", "true");
    const label = doc.createElement("span");
    label.setAttribute("class", "canvas-chart__legend-label");
    label.textContent = item.name;
    li.appendChild(swatch);
    li.appendChild(label);
    list.appendChild(li);
  });
  return list;
}
var init_legend = __esm({
  "src/Browser/components/charts/kernel/legend.js"() {
    init_palette();
    init_inlineStyle();
  }
});

// src/Browser/components/charts/kernel/dataTable.js
function renderDataTable(doc, data) {
  const wrap = doc.createElement("div");
  wrap.setAttribute("class", "canvas-chart__data-table");
  wrap.setAttribute("data-canvas-chart-table", "");
  const table = doc.createElement("table");
  table.setAttribute("class", "canvas-chart__table");
  if (data.caption) {
    const cap = doc.createElement("caption");
    cap.setAttribute("class", "canvas-chart__table-caption");
    cap.textContent = data.caption;
    table.appendChild(cap);
  }
  const thead = doc.createElement("thead");
  const hr = doc.createElement("tr");
  for (const col of data.columns || []) {
    const th = doc.createElement("th");
    th.setAttribute("scope", "col");
    th.textContent = String(col);
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = doc.createElement("tbody");
  for (const row of data.rows || []) {
    const tr = doc.createElement("tr");
    row.forEach((cell, i) => {
      const td = doc.createElement(i === 0 ? "th" : "td");
      if (i === 0) td.setAttribute("scope", "row");
      td.textContent = String(cell);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}
function cartesianTableModel(labels, series, caption) {
  return {
    caption: caption || "Chart data",
    columns: ["Category", ...series.map((s) => s.name)],
    rows: labels.map((label, i) => [
      label,
      ...series.map((s) => Number.isFinite(Number(s.values[i])) ? Number(s.values[i]) : "")
    ])
  };
}
function slicesTableModel(items, caption) {
  return {
    caption: caption || "Chart data",
    columns: ["Category", "Value"],
    rows: items.map((it) => [it.label, it.value])
  };
}
function scatterTableModel(datasets, caption) {
  const rows = [];
  for (const ds of datasets) {
    for (const p of ds.points) {
      rows.push([ds.name, p.x, p.y, p.z != null ? p.z : ""]);
    }
  }
  return {
    caption: caption || "Scatter data",
    columns: ["Series", "X", "Y", "Z"],
    rows
  };
}
var init_dataTable = __esm({
  "src/Browser/components/charts/kernel/dataTable.js"() {
  }
});

// src/Browser/components/charts/kernel/datapoints.js
function markDatapoint(shape, meta) {
  setAttr(shape, "tabindex", "0");
  setAttr(shape, "role", "img");
  setAttr(shape, "aria-label", meta.label);
  setAttr(shape, "data-canvas-datapoint", meta.id);
  setAttr(shape, "focusable", "true");
}
function attachDatapointKeyboard(host, tooltipEl) {
  let activeId = null;
  const setActive = (id, text2) => {
    activeId = id;
    if (id == null) {
      tooltipEl.setAttribute("hidden", "");
      tooltipEl.textContent = "";
      tooltipEl.removeAttribute("data-active-id");
      return;
    }
    tooltipEl.removeAttribute("hidden");
    tooltipEl.setAttribute("data-active-id", id);
    if (text2 != null) tooltipEl.textContent = text2;
  };
  const onFocusIn = (ev) => {
    const t = (
      /** @type {Element} */
      ev.target
    );
    const id = t?.getAttribute?.("data-canvas-datapoint");
    if (!id) return;
    setActive(id, t.getAttribute("aria-label") || "");
  };
  const onFocusOut = (ev) => {
    const t = (
      /** @type {Element} */
      ev.target
    );
    const id = t?.getAttribute?.("data-canvas-datapoint");
    if (id && activeId === id) setActive(null);
  };
  const onKeyDown = (ev) => {
    const t = (
      /** @type {Element} */
      ev.target
    );
    if (!t?.getAttribute?.("data-canvas-datapoint")) return;
    const points = collectDatapoints(host);
    if (!points.length) return;
    const idx = points.findIndex((p) => p === t);
    if (idx < 0) return;
    let next = idx;
    if (ev.key === "ArrowRight" || ev.key === "ArrowDown") next = (idx + 1) % points.length;
    else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp")
      next = (idx - 1 + points.length) % points.length;
    else if (ev.key === "Home") next = 0;
    else if (ev.key === "End") next = points.length - 1;
    else if (ev.key === "Escape") {
      setActive(null);
      t.blur?.();
      return;
    } else return;
    ev.preventDefault?.();
    const el2 = points[next];
    el2.focus?.();
    setActive(
      el2.getAttribute("data-canvas-datapoint"),
      el2.getAttribute("aria-label") || ""
    );
  };
  host.addEventListener("focusin", onFocusIn);
  host.addEventListener("focusout", onFocusOut);
  host.addEventListener("keydown", onKeyDown);
  return {
    setActive,
    destroy() {
      host.removeEventListener("focusin", onFocusIn);
      host.removeEventListener("focusout", onFocusOut);
      host.removeEventListener("keydown", onKeyDown);
      setActive(null);
    }
  };
}
function collectDatapoints(host) {
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 1) {
      if (n.getAttribute?.("data-canvas-datapoint") != null) out.push(n);
      for (const c of n.childNodes ?? []) walk(c);
    }
  };
  walk(host);
  return out;
}
function createTooltip(doc) {
  const el2 = doc.createElement("div");
  el2.setAttribute("class", "canvas-chart__tooltip");
  el2.setAttribute("role", "status");
  el2.setAttribute("aria-live", "polite");
  el2.setAttribute("hidden", "");
  return el2;
}
function focusDot(doc, cx, cy, r = 4) {
  return svgEl(doc, "circle", {
    class: "canvas-chart__point",
    cx,
    cy,
    r
  });
}
var init_datapoints = __esm({
  "src/Browser/components/charts/kernel/datapoints.js"() {
    init_svg();
  }
});

// src/Browser/components/charts/kernel/shared.js
function requireDocument6(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("chart component: ctx.document required");
  }
  return doc;
}
function setClass6(el2, className) {
  el2.setAttribute("class", String(className).trim());
}
function clearChildren6(el2) {
  while (el2.firstChild) el2.removeChild(el2.firstChild);
}
function asText6(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function resolveStatus2(props = {}) {
  const raw = props.status ?? props.state;
  if (raw === "loading" || raw === "empty" || raw === "error" || raw === "ready") {
    return raw;
  }
  if (props.loading === true) return "loading";
  if (props.error != null && props.error !== false) return "error";
  if (props.empty === true) return "empty";
  return "ready";
}
function applySurfaceStatus2(el2, doc, props = {}, opts = {}) {
  const status = resolveStatus2(props);
  el2.setAttribute("data-status", status);
  if (status === "loading") el2.setAttribute("aria-busy", "true");
  else el2.removeAttribute("aria-busy");
  for (const child of [...el2.childNodes ?? []]) {
    if (child.nodeType === 1 && child.getAttribute?.("data-canvas-status-text") != null) {
      el2.removeChild(child);
    }
  }
  if (status === "loading" || status === "empty" || status === "error") {
    const statusEl = doc.createElement("span");
    statusEl.setAttribute("data-canvas-status-text", "");
    statusEl.setAttribute("class", "canvas-status-text canvas-chart__status");
    statusEl.setAttribute("role", "status");
    statusEl.setAttribute("aria-live", status === "error" ? "assertive" : "polite");
    statusEl.textContent = status === "loading" ? asText6(props.loadingMessage) || opts.loadingMessage || "Loading" : status === "empty" ? asText6(props.emptyMessage) || opts.emptyMessage || "No data" : asText6(props.errorMessage ?? props.error) || opts.errorMessage || "Error";
    el2.appendChild(statusEl);
  }
  return { status };
}
function lifecycle6(impl) {
  return {
    create(props = {}, ctx = {}) {
      const doc = requireDocument6(ctx);
      const el2 = impl.mount(doc, props, ctx);
      impl.patch(el2, props, ctx);
      return el2;
    },
    update(el2, props = {}, ctx = {}) {
      impl.patch(el2, props, ctx);
    },
    destroy(el2, ctx = {}) {
      impl.unmount?.(el2, ctx);
    },
    ownsChildren: true
  };
}
function prefersReducedMotion2(doc) {
  try {
    const mq = doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)");
    return !!mq?.matches;
  } catch {
    return false;
  }
}
var SURFACE_STATUS3, chartRuntime;
var init_shared4 = __esm({
  "src/Browser/components/charts/kernel/shared.js"() {
    SURFACE_STATUS3 = Object.freeze({
      READY: "ready",
      LOADING: "loading",
      EMPTY: "empty",
      ERROR: "error"
    });
    chartRuntime = /* @__PURE__ */ new WeakMap();
  }
});

// src/Browser/components/charts/kernel/chartFrame.js
function mountChartHost(doc, typeName) {
  const el2 = doc.createElement("div");
  el2.setAttribute("data-canvas-component", typeName);
  el2.setAttribute("class", `canvas-chart canvas-chart--${typeName}`);
  el2.setAttribute("role", "group");
  el2.setAttribute("aria-label", typeName);
  return el2;
}
function patchChartHost(el2, doc, props, spec) {
  const prev = chartRuntime.get(el2);
  prev?.disconnect?.();
  prev?.destroyKeyboard?.();
  const statusProps = { ...props };
  if (spec.empty && resolveReady(props)) {
    statusProps.status = "empty";
  }
  setClass6(
    el2,
    `canvas-chart canvas-chart--${el2.getAttribute("data-canvas-component")} ${prefersReducedMotion2(doc) ? "canvas-chart--reduced-motion" : ""}`.trim()
  );
  clearChildren6(el2);
  const { status } = applySurfaceStatus2(el2, doc, statusProps, {
    emptyMessage: spec.emptyMessage || "No chart data"
  });
  if (status !== "ready") {
    chartRuntime.set(el2, {});
    return;
  }
  const body = doc.createElement("div");
  body.setAttribute("class", "canvas-chart__body");
  const plotHost = doc.createElement("div");
  plotHost.setAttribute("class", "canvas-chart__plot");
  const tooltip = createTooltip(doc);
  const svg = svgEl(doc, "svg", {
    class: "canvas-chart__svg",
    role: "img",
    "aria-hidden": "true"
  });
  plotHost.appendChild(svg);
  plotHost.appendChild(tooltip);
  body.appendChild(plotHost);
  if (spec.legendItems?.length && props.legend !== false) {
    body.appendChild(renderLegend(doc, spec.legendItems));
  }
  el2.appendChild(body);
  if (spec.tableModel && props.showDataTable !== false) {
    el2.appendChild(renderDataTable(doc, spec.tableModel));
  }
  const keyboard = attachDatapointKeyboard(el2, tooltip);
  const paint = (size) => {
    const resolved = resolveChartSize(props, size);
    if (!Number(props.height) && size.height <= 40) {
      resolved.height = 240;
    }
    svg.setAttribute("width", String(resolved.width));
    svg.setAttribute("height", String(resolved.height));
    svg.setAttribute("viewBox", `0 0 ${resolved.width} ${resolved.height}`);
    clearChildren6(svg);
    const margin = {
      top: 16,
      right: 16,
      bottom: props.xLabel ? 48 : 36,
      left: props.yLabel ? 48 : 40
    };
    const plot = {
      x0: margin.left,
      x1: Math.max(margin.left + 10, resolved.width - margin.right),
      y0: margin.top,
      y1: Math.max(margin.top + 10, resolved.height - margin.bottom),
      width: resolved.width,
      height: resolved.height
    };
    spec.paint(svg, resolved, plot);
  };
  const obs = observeSize(plotHost, paint, {
    width: Number(props.width) || 320,
    height: Number(props.height) || 240
  });
  chartRuntime.set(el2, {
    disconnect: () => obs.disconnect(),
    destroyKeyboard: () => keyboard.destroy()
  });
}
function resolveReady(props) {
  const raw = props.status ?? props.state;
  if (raw === "loading" || raw === "error") return false;
  if (props.loading === true) return false;
  if (props.error != null && props.error !== false) return false;
  return true;
}
function unmountChartHost(el2) {
  const rt = chartRuntime.get(el2);
  rt?.disconnect?.();
  rt?.destroyKeyboard?.();
  chartRuntime.delete(el2);
}
var init_chartFrame = __esm({
  "src/Browser/components/charts/kernel/chartFrame.js"() {
    init_shared4();
    init_measure();
    init_datapoints();
    init_legend();
    init_dataTable();
    init_svg();
  }
});

// src/Browser/components/charts/kernel/index.js
var init_kernel = __esm({
  "src/Browser/components/charts/kernel/index.js"() {
    init_scales();
    init_geometry();
    init_palette();
    init_measure();
    init_normalize();
    init_axes();
    init_legend();
    init_dataTable();
    init_datapoints();
    init_svg();
    init_shared4();
    init_chartFrame();
  }
});

// src/Browser/components/charts/BarChart.js
function paintBar(doc, svg, plot, props, data, colors) {
  const variant = props.variant === "stacked" ? "stacked" : "grouped";
  const values = collectValues(data.series, variant);
  const yDomain = niceDomain(values);
  const xScale = bandScale(data.labels, [plot.x0, plot.x1]);
  const yScale = linearScale(yDomain[0], yDomain[1], [plot.y1, plot.y0]);
  svg.appendChild(
    renderAxes(doc, {
      x0: plot.x0,
      x1: plot.x1,
      y0: plot.y0,
      y1: plot.y1,
      xTicks: buildXCategoryTicks(data.labels, xScale),
      yTicks: buildYTicks(yDomain, yScale),
      xLabel: props.xLabel ? String(props.xLabel) : void 0,
      yLabel: props.yLabel ? String(props.yLabel) : void 0,
      grid: props.grid !== false
    })
  );
  const rects = barRects(
    { labels: data.labels, series: data.series, variant },
    { x0: plot.x0, x1: plot.x1, y0: plot.y0, y1: plot.y1, yDomain }
  );
  const g = svgEl(doc, "g", { class: "canvas-chart__series" });
  for (const r of rects) {
    const mark = seriesMark(r.si);
    const rect = svgEl(doc, "rect", {
      class: "canvas-chart__bar",
      x: r.x,
      y: r.y,
      width: Math.max(0, r.width),
      height: Math.max(0, r.height),
      fill: colors[r.si % colors.length],
      "data-mark": mark,
      "stroke-dasharray": dashForMark(mark)
    });
    markDatapoint(rect, {
      id: `bar-${r.si}-${r.i}`,
      label: `${r.series}, ${r.label}: ${r.value}`
    });
    g.appendChild(rect);
  }
  svg.appendChild(g);
}
var BarChart;
var init_BarChart = __esm({
  "src/Browser/components/charts/BarChart.js"() {
    init_kernel();
    BarChart = lifecycle6({
      mount(doc) {
        return mountChartHost(doc, "BarChart");
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const data = normalizeCartesian(props);
        const colors = resolvePalette(
          data.series.length,
          /** @type {string[]} */
          props.palette
        );
        patchChartHost(el2, doc, props, {
          empty: data.empty,
          legendItems: data.series.map((s, i) => ({
            name: s.name,
            color: colors[i],
            mark: seriesMark(i)
          })),
          tableModel: cartesianTableModel(data.labels, data.series, "Bar chart data"),
          paint(svg, _size, plot) {
            paintBar(doc, svg, plot, props, data, colors);
          }
        });
      },
      unmount(el2) {
        unmountChartHost(el2);
      }
    });
  }
});

// src/Browser/components/charts/LineChart.js
function paintLine(doc, svg, plot, props, data, colors, filled) {
  const variant = props.variant === "natural" || props.variant === "step" ? props.variant : "linear";
  const values = collectValues(data.series, "grouped");
  const yDomain = niceDomain(values);
  const xScale = bandScale(data.labels, [plot.x0, plot.x1], {
    paddingInner: 0.1,
    paddingOuter: 0.05
  });
  const yScale = linearScale(yDomain[0], yDomain[1], [plot.y1, plot.y0]);
  svg.appendChild(
    renderAxes(doc, {
      x0: plot.x0,
      x1: plot.x1,
      y0: plot.y0,
      y1: plot.y1,
      xTicks: buildXCategoryTicks(data.labels, xScale),
      yTicks: buildYTicks(yDomain, yScale),
      xLabel: props.xLabel ? String(props.xLabel) : void 0,
      yLabel: props.yLabel ? String(props.yLabel) : void 0,
      grid: props.grid !== false
    })
  );
  data.series.forEach((s, si) => {
    const mark = seriesMark(si);
    const pathData = seriesPath(s.values, {
      x0: plot.x0,
      x1: plot.x1,
      y0: plot.y0,
      y1: plot.y1,
      yDomain,
      labels: data.labels,
      variant
    });
    const g = svgEl(doc, "g", { class: "canvas-chart__series", "data-series": s.name });
    if (filled) {
      g.appendChild(
        svgEl(doc, "path", {
          class: "canvas-chart__area",
          d: pathData.area,
          fill: colors[si],
          opacity: "0.25",
          "data-mark": mark
        })
      );
    }
    g.appendChild(
      svgEl(doc, "path", {
        class: "canvas-chart__line",
        d: pathData.line,
        fill: "none",
        stroke: colors[si],
        "stroke-width": "2",
        "stroke-dasharray": dashForMark(mark),
        "data-mark": mark
      })
    );
    for (const p of pathData.points) {
      const dot = focusDot(doc, p.x, p.y, 4);
      dot.setAttribute("fill", colors[si]);
      markDatapoint(dot, {
        id: `line-${si}-${p.i}`,
        label: `${s.name}, ${data.labels[p.i]}: ${p.value}`
      });
      g.appendChild(dot);
    }
    svg.appendChild(g);
  });
}
function makeLineLike(typeName, filled) {
  return lifecycle6({
    mount(doc) {
      return mountChartHost(doc, typeName);
    },
    patch(el2, props = {}, ctx = {}) {
      const doc = ctx.document ?? el2.ownerDocument;
      const data = normalizeCartesian(props);
      const colors = resolvePalette(
        data.series.length,
        /** @type {string[]} */
        props.palette
      );
      patchChartHost(el2, doc, props, {
        empty: data.empty,
        legendItems: data.series.map((s, i) => ({
          name: s.name,
          color: colors[i],
          mark: seriesMark(i)
        })),
        tableModel: cartesianTableModel(
          data.labels,
          data.series,
          filled ? "Area chart data" : "Line chart data"
        ),
        paint(svg, _size, plot) {
          paintLine(doc, svg, plot, props, data, colors, filled);
        }
      });
    },
    unmount(el2) {
      unmountChartHost(el2);
    }
  });
}
var LineChart, AreaChart;
var init_LineChart = __esm({
  "src/Browser/components/charts/LineChart.js"() {
    init_kernel();
    LineChart = makeLineLike("LineChart", false);
    AreaChart = makeLineLike("AreaChart", true);
  }
});

// src/Browser/components/charts/AreaChart.js
var init_AreaChart = __esm({
  "src/Browser/components/charts/AreaChart.js"() {
    init_LineChart();
  }
});

// src/Browser/components/charts/HorizontalBarChart.js
function paintHBar(doc, svg, plot, props, data, colors) {
  const variant = props.variant === "stacked" ? "stacked" : "grouped";
  const values = collectValues(data.series, variant);
  const xDomain = niceDomain(values);
  const yScale = bandScale(data.labels, [plot.y0, plot.y1]);
  const xScale = linearScale(xDomain[0], xDomain[1], [plot.x0, plot.x1]);
  const xTicks = niceTicks(xDomain[0], xDomain[1], 5).map((v) => ({
    label: formatTick(v),
    x: xScale(v)
  }));
  const yTicks = data.labels.map((label, i) => ({
    label,
    y: yScale(i) + yScale.bandwidth / 2
  }));
  svg.appendChild(
    renderAxes(doc, {
      x0: plot.x0,
      x1: plot.x1,
      y0: plot.y0,
      y1: plot.y1,
      xTicks,
      yTicks: yTicks.map((t) => ({ label: t.label, y: t.y })),
      xLabel: props.xLabel ? String(props.xLabel) : void 0,
      yLabel: props.yLabel ? String(props.yLabel) : void 0,
      grid: props.grid !== false
    })
  );
  const rects = horizontalBarRects(
    { labels: data.labels, series: data.series, variant },
    { x0: plot.x0, x1: plot.x1, y0: plot.y0, y1: plot.y1, xDomain }
  );
  const g = svgEl(doc, "g", { class: "canvas-chart__series" });
  for (const r of rects) {
    const mark = seriesMark(r.si);
    const rect = svgEl(doc, "rect", {
      class: "canvas-chart__bar canvas-chart__bar--horizontal",
      x: r.x,
      y: r.y,
      width: Math.max(0, r.width),
      height: Math.max(0, r.height),
      fill: colors[r.si % colors.length],
      "data-mark": mark
    });
    markDatapoint(rect, {
      id: `hbar-${r.si}-${r.i}`,
      label: `${r.series}, ${r.label}: ${r.value}`
    });
    g.appendChild(rect);
  }
  svg.appendChild(g);
}
var HorizontalBarChart;
var init_HorizontalBarChart = __esm({
  "src/Browser/components/charts/HorizontalBarChart.js"() {
    init_kernel();
    HorizontalBarChart = lifecycle6({
      mount(doc) {
        return mountChartHost(doc, "HorizontalBarChart");
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const data = normalizeCartesian(props);
        const colors = resolvePalette(
          data.series.length,
          /** @type {string[]} */
          props.palette
        );
        patchChartHost(el2, doc, props, {
          empty: data.empty,
          legendItems: data.series.map((s, i) => ({
            name: s.name,
            color: colors[i],
            mark: seriesMark(i)
          })),
          tableModel: cartesianTableModel(data.labels, data.series, "Horizontal bar chart data"),
          paint(svg, _size, plot) {
            paintHBar(doc, svg, plot, props, data, colors);
          }
        });
      },
      unmount(el2) {
        unmountChartHost(el2);
      }
    });
  }
});

// src/Browser/components/charts/PieChart.js
var PieChart;
var init_PieChart = __esm({
  "src/Browser/components/charts/PieChart.js"() {
    init_kernel();
    PieChart = lifecycle6({
      mount(doc) {
        return mountChartHost(doc, "PieChart");
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const { items, empty } = normalizeSlices(props);
        const colors = resolvePalette(
          items.length,
          /** @type {string[]} */
          props.palette
        );
        const variant = props.variant === "donut" ? "donut" : "pie";
        const appearance = props.appearance === "semiCircular" ? "semiCircular" : "circular";
        patchChartHost(el2, doc, props, {
          empty,
          legendItems: items.map((it, i) => ({
            name: it.label,
            color: colors[i],
            mark: seriesMark(i)
          })),
          tableModel: slicesTableModel(items, "Pie chart data"),
          paint(svg, size, plot) {
            const cx = (plot.x0 + plot.x1) / 2;
            const cy = appearance === "semiCircular" ? plot.y0 + (plot.y1 - plot.y0) * 0.75 : (plot.y0 + plot.y1) / 2;
            const rOuter = Math.max(
              10,
              Math.min(plot.x1 - plot.x0, plot.y1 - plot.y0) / 2 - 8
            );
            const rInner = variant === "donut" ? rOuter * 0.55 : 0;
            const startAngle = appearance === "semiCircular" ? Math.PI : -Math.PI / 2;
            const endAngle = appearance === "semiCircular" ? 2 * Math.PI : startAngle + Math.PI * 2;
            const slices = pieSlices(items, {
              cx,
              cy,
              rOuter,
              rInner,
              startAngle,
              endAngle,
              padAngle: 0.02
            });
            const g = svgEl(doc, "g", { class: "canvas-chart__series" });
            slices.forEach((s, i) => {
              const path = svgEl(doc, "path", {
                class: "canvas-chart__slice",
                d: s.path,
                fill: colors[i],
                "data-mark": seriesMark(i)
              });
              markDatapoint(path, {
                id: `pie-${i}`,
                label: `${s.label}: ${s.value} (${s.percent.toFixed(1)}%)`
              });
              g.appendChild(path);
            });
            svg.appendChild(g);
          }
        });
      },
      unmount(el2) {
        unmountChartHost(el2);
      }
    });
  }
});

// src/Browser/components/charts/SingleStackedBarChart.js
var SingleStackedBarChart;
var init_SingleStackedBarChart = __esm({
  "src/Browser/components/charts/SingleStackedBarChart.js"() {
    init_kernel();
    SingleStackedBarChart = lifecycle6({
      mount(doc) {
        return mountChartHost(doc, "SingleStackedBarChart");
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const { items, empty } = normalizeSlices(props);
        const colors = resolvePalette(
          items.length,
          /** @type {string[]} */
          props.palette
        );
        patchChartHost(el2, doc, props, {
          empty,
          legendItems: items.map((it, i) => ({
            name: it.label,
            color: colors[i],
            mark: seriesMark(i)
          })),
          tableModel: slicesTableModel(items, "Stacked bar data"),
          paint(svg, _size, plot) {
            const barY = (plot.y0 + plot.y1) / 2 - 14;
            const segs = stackedBarSegments(items, {
              x0: plot.x0,
              x1: plot.x1,
              y: barY,
              height: 28
            });
            const g = svgEl(doc, "g", { class: "canvas-chart__series" });
            g.appendChild(
              svgEl(doc, "rect", {
                class: "canvas-chart__stack-track",
                x: plot.x0,
                y: barY,
                width: Math.max(0, plot.x1 - plot.x0),
                height: 28,
                rx: 4
              })
            );
            for (const s of segs) {
              const rect = svgEl(doc, "rect", {
                class: "canvas-chart__stack-seg",
                x: s.x,
                y: s.y,
                width: Math.max(0, s.width),
                height: s.height,
                fill: colors[s.i % colors.length],
                "data-mark": seriesMark(s.i)
              });
              markDatapoint(rect, {
                id: `stack-${s.i}`,
                label: `${s.label}: ${s.value} (${s.percent.toFixed(1)}%)`
              });
              g.appendChild(rect);
            }
            svg.appendChild(g);
          }
        });
      },
      unmount(el2) {
        unmountChartHost(el2);
      }
    });
  }
});

// src/Browser/components/charts/RadarChart.js
var RadarChart;
var init_RadarChart = __esm({
  "src/Browser/components/charts/RadarChart.js"() {
    init_kernel();
    RadarChart = lifecycle6({
      mount(doc) {
        return mountChartHost(doc, "RadarChart");
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const data = normalizeCartesian(props);
        const colors = resolvePalette(
          data.series.length,
          /** @type {string[]} */
          props.palette
        );
        const max = Math.max(...collectValues(data.series), 1);
        patchChartHost(el2, doc, props, {
          empty: data.empty || data.labels.length < 3,
          emptyMessage: data.labels.length < 3 ? "Radar needs at least 3 categories" : "No chart data",
          legendItems: data.series.map((s, i) => ({
            name: s.name,
            color: colors[i],
            mark: seriesMark(i)
          })),
          tableModel: cartesianTableModel(data.labels, data.series, "Radar chart data"),
          paint(svg, _size, plot) {
            const cx = (plot.x0 + plot.x1) / 2;
            const cy = (plot.y0 + plot.y1) / 2;
            const r = Math.max(12, Math.min(plot.x1 - plot.x0, plot.y1 - plot.y0) / 2 - 20);
            const axisVals = data.labels.map(() => max);
            const base = radarGeometry(axisVals, { cx, cy, r, max, levels: 4 });
            const grid = svgEl(doc, "g", { class: "canvas-chart__radar-grid" });
            for (const ring of base.rings) {
              grid.appendChild(
                svgEl(doc, "path", {
                  class: "canvas-chart__radar-ring",
                  d: ring,
                  fill: "none"
                })
              );
            }
            for (const ax of base.axes) {
              grid.appendChild(
                svgEl(doc, "line", {
                  class: "canvas-chart__radar-axis",
                  x1: ax.x1,
                  y1: ax.y1,
                  x2: ax.x2,
                  y2: ax.y2
                })
              );
              const label = data.labels[ax.i] || "";
              if (r >= 48 && label) {
                const lx = ax.x2 + (ax.x2 - cx) * 0.08;
                const ly = ax.y2 + (ax.y2 - cy) * 0.08;
                const t = svgEl(doc, "text", {
                  class: "canvas-chart__tick-label",
                  x: lx,
                  y: ly,
                  "text-anchor": "middle",
                  "dominant-baseline": "middle"
                });
                t.textContent = label;
                grid.appendChild(t);
              }
            }
            svg.appendChild(grid);
            data.series.forEach((s, si) => {
              const mark = seriesMark(si);
              const geo = radarGeometry(s.values.slice(0, data.labels.length), {
                cx,
                cy,
                r,
                max
              });
              const g = svgEl(doc, "g", { class: "canvas-chart__series" });
              g.appendChild(
                svgEl(doc, "path", {
                  class: "canvas-chart__radar-area",
                  d: geo.polygon,
                  fill: colors[si],
                  opacity: "0.2",
                  stroke: colors[si],
                  "stroke-width": "2",
                  "stroke-dasharray": dashForMark(mark),
                  "data-mark": mark
                })
              );
              for (const p of geo.points) {
                const c = svgEl(doc, "circle", {
                  class: "canvas-chart__point",
                  cx: p.x,
                  cy: p.y,
                  r: 3.5,
                  fill: colors[si]
                });
                markDatapoint(c, {
                  id: `radar-${si}-${p.i}`,
                  label: `${s.name}, ${data.labels[p.i]}: ${p.value}`
                });
                g.appendChild(c);
              }
              svg.appendChild(g);
            });
          }
        });
      },
      unmount(el2) {
        unmountChartHost(el2);
      }
    });
  }
});

// src/Browser/components/charts/RadialChart.js
var RadialChart;
var init_RadialChart = __esm({
  "src/Browser/components/charts/RadialChart.js"() {
    init_kernel();
    RadialChart = lifecycle6({
      mount(doc) {
        return mountChartHost(doc, "RadialChart");
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const { items, empty } = normalizeSlices(props);
        const colors = resolvePalette(
          items.length,
          /** @type {string[]} */
          props.palette
        );
        patchChartHost(el2, doc, props, {
          empty,
          legendItems: items.map((it, i) => ({
            name: it.label,
            color: colors[i],
            mark: seriesMark(i)
          })),
          tableModel: slicesTableModel(items, "Radial chart data"),
          paint(svg, _size, plot) {
            const cx = (plot.x0 + plot.x1) / 2;
            const cy = (plot.y0 + plot.y1) / 2;
            const rOuter = Math.max(12, Math.min(plot.x1 - plot.x0, plot.y1 - plot.y0) / 2 - 8);
            const rInner = rOuter * 0.35;
            const start = -Math.PI / 2;
            const end = start + Math.PI * 2;
            const bars = radialBars(items, { cx, cy, rOuter, rInner, startAngle: start, endAngle: end });
            const g = svgEl(doc, "g", { class: "canvas-chart__series" });
            bars.forEach((b, i) => {
              g.appendChild(
                svgEl(doc, "path", {
                  class: "canvas-chart__radial-track",
                  d: donutArcPath(cx, cy, b.rOuter, b.rInner, start, end),
                  fill: "var(--canvas-surface-sunk, #eee)"
                })
              );
              const path = svgEl(doc, "path", {
                class: "canvas-chart__radial-bar",
                d: b.path,
                fill: colors[i],
                "data-mark": seriesMark(i)
              });
              markDatapoint(path, {
                id: `radial-${i}`,
                label: `${b.label}: ${b.value}`
              });
              g.appendChild(path);
            });
            svg.appendChild(g);
          }
        });
      },
      unmount(el2) {
        unmountChartHost(el2);
      }
    });
  }
});

// src/Browser/components/charts/ScatterChart.js
var ScatterChart;
var init_ScatterChart = __esm({
  "src/Browser/components/charts/ScatterChart.js"() {
    init_kernel();
    ScatterChart = lifecycle6({
      mount(doc) {
        return mountChartHost(doc, "ScatterChart");
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const { datasets, empty } = normalizeScatter(props);
        const colors = resolvePalette(
          datasets.length,
          /** @type {string[]} */
          props.palette
        );
        patchChartHost(el2, doc, props, {
          empty,
          legendItems: datasets.map((d, i) => ({
            name: d.name || `Series ${i + 1}`,
            color: colors[i],
            mark: seriesMark(i)
          })),
          tableModel: scatterTableModel(datasets, "Scatter chart data"),
          paint(svg, _size, plot) {
            const xs = datasets.flatMap((d) => d.points.map((p) => p.x));
            const ys = datasets.flatMap((d) => d.points.map((p) => p.y));
            const xDomain = niceDomain(xs.length ? xs : [0, 1], { includeZero: false, pad: 0.08 });
            const yDomain = niceDomain(ys.length ? ys : [0, 1], { includeZero: false, pad: 0.08 });
            const xScale = linearScale(xDomain[0], xDomain[1], [plot.x0, plot.x1]);
            const yScale = linearScale(yDomain[0], yDomain[1], [plot.y1, plot.y0]);
            svg.appendChild(
              renderAxes(doc, {
                x0: plot.x0,
                x1: plot.x1,
                y0: plot.y0,
                y1: plot.y1,
                xTicks: niceTicks(xDomain[0], xDomain[1], 5).map((v) => ({
                  label: formatTick(v),
                  x: xScale(v)
                })),
                yTicks: buildYTicks(yDomain, yScale),
                xLabel: props.xLabel ? String(props.xLabel) : void 0,
                yLabel: props.yLabel ? String(props.yLabel) : void 0,
                grid: props.grid !== false
              })
            );
            const pts = scatterPositions(datasets, {
              x0: plot.x0,
              x1: plot.x1,
              y0: plot.y0,
              y1: plot.y1,
              xDomain,
              yDomain
            });
            const g = svgEl(doc, "g", { class: "canvas-chart__series" });
            const shape = props.shape === "square" ? "square" : "circle";
            for (const p of pts) {
              let node;
              if (shape === "square") {
                const s = 7;
                node = svgEl(doc, "rect", {
                  class: "canvas-chart__point",
                  x: p.x - s / 2,
                  y: p.y - s / 2,
                  width: s,
                  height: s,
                  fill: colors[p.si % colors.length],
                  "data-mark": seriesMark(p.si)
                });
              } else {
                node = svgEl(doc, "circle", {
                  class: "canvas-chart__point",
                  cx: p.x,
                  cy: p.y,
                  r: 4,
                  fill: colors[p.si % colors.length],
                  "data-mark": seriesMark(p.si)
                });
              }
              markDatapoint(node, {
                id: `scatter-${p.si}-${p.i}`,
                label: `${p.series || "Point"}: (${p.vx}, ${p.vy})`
              });
              g.appendChild(node);
            }
            svg.appendChild(g);
          }
        });
      },
      unmount(el2) {
        unmountChartHost(el2);
      }
    });
  }
});

// src/Browser/components/charts/dataLeaf.js
function dataLeaf(typeName) {
  return lifecycle({
    mount(doc) {
      const el2 = doc.createElement("span");
      el2.setAttribute("data-canvas-component", typeName);
      el2.setAttribute("hidden", "");
      return el2;
    },
    patch(el2, props = {}) {
      el2.setAttribute("data-leaf", typeName);
      const label = props.category ?? props.label ?? props.name ?? "";
      if (label !== "") el2.setAttribute("data-label", String(label));
    }
  });
}
var Series, Slice, ScatterSeries, Point;
var init_dataLeaf = __esm({
  "src/Browser/components/charts/dataLeaf.js"() {
    init_shared();
    Series = dataLeaf("Series");
    Slice = dataLeaf("Slice");
    ScatterSeries = dataLeaf("ScatterSeries");
    Point = dataLeaf("Point");
  }
});

// src/Browser/components/charts/registerCharts.js
var registerCharts_exports = {};
__export(registerCharts_exports, {
  AreaChart: () => AreaChart,
  BarChart: () => BarChart,
  CHART_COMPONENTS: () => CHART_COMPONENTS,
  HorizontalBarChart: () => HorizontalBarChart,
  LineChart: () => LineChart,
  PieChart: () => PieChart,
  RadarChart: () => RadarChart,
  RadialChart: () => RadialChart,
  ScatterChart: () => ScatterChart,
  SingleStackedBarChart: () => SingleStackedBarChart,
  default: () => registerCharts_default,
  registerCharts: () => registerCharts
});
function registerCharts(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerCharts: registry with register() required");
  }
  for (const [type, entry] of Object.entries(CHART_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}
var CHART_COMPONENTS, registerCharts_default;
var init_registerCharts = __esm({
  "src/Browser/components/charts/registerCharts.js"() {
    init_BarChart();
    init_LineChart();
    init_AreaChart();
    init_HorizontalBarChart();
    init_PieChart();
    init_SingleStackedBarChart();
    init_RadarChart();
    init_RadialChart();
    init_ScatterChart();
    init_dataLeaf();
    CHART_COMPONENTS = {
      BarChart,
      LineChart,
      AreaChart,
      HorizontalBarChart,
      PieChart,
      SingleStackedBarChart,
      RadarChart,
      RadialChart,
      ScatterChart,
      Series,
      Slice,
      ScatterSeries,
      Point
    };
    registerCharts_default = registerCharts;
  }
});

// src/Browser/components/tools/shared.js
function requireDocument7(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("tools component: ctx.document required");
  }
  return doc;
}
function setClass7(el2, className) {
  el2.setAttribute("class", String(className).trim());
}
function clearChildren7(el2) {
  while (el2.firstChild) {
    el2.removeChild(el2.firstChild);
  }
}
function asText7(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function prefersReducedMotion3(props = {}, ctx = {}) {
  if (props.reducedMotion === true || props.reduceMotion === true) return true;
  if (ctx.reducedMotion === true) return true;
  try {
    const mq = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) return true;
  } catch {
  }
  return false;
}
function lifecycle7(impl) {
  return {
    create(props = {}, ctx = {}) {
      const doc = requireDocument7(ctx);
      const el2 = impl.mount(doc, props, ctx);
      impl.patch(el2, props, ctx);
      return el2;
    },
    update(el2, props = {}, ctx = {}) {
      impl.patch(el2, props, ctx);
    },
    destroy(el2, ctx = {}) {
      impl.unmount?.(el2, ctx);
    },
    ownsChildren: impl.ownsChildren !== false
  };
}
function defaultToolLabel(status, name) {
  const key = (
    /** @type {ToolStatus} */
    status
  );
  if (!TOOL_STATUS_LABELS[key]) return name ? `${name}: ${status}` : String(status);
  if (!name || !String(name).trim()) return TOOL_NAMELESS_LABELS[key];
  return TOOL_STATUS_LABELS[key](name);
}
function defaultRunLabel(phase) {
  switch (phase) {
    case "start":
      return "Run started";
    case "finish":
      return "Run finished";
    case "error":
      return "Run failed";
    default:
      return `Run ${phase}`;
  }
}
var TOOL_STATUS_LABELS, TOOL_NAMELESS_LABELS;
var init_shared5 = __esm({
  "src/Browser/components/tools/shared.js"() {
    TOOL_STATUS_LABELS = {
      streaming: (n) => `Calling the ${n} tool`,
      executing: (n) => `Running the ${n} tool`,
      complete: (n) => `Called the ${n} tool`,
      result: (n) => `${n} result`,
      error: (n) => `${n} failed`
    };
    TOOL_NAMELESS_LABELS = {
      streaming: "Calling the tool",
      executing: "Running the tool",
      complete: "Called the tool",
      result: "Tool result",
      error: "Tool failed"
    };
  }
});

// src/Browser/components/tools/partialJson.js
function balanceOpenJSON(raw) {
  const closers = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") closers.push("}");
    else if (ch === "[") closers.push("]");
    else if (ch === "}" || ch === "]") closers.pop();
  }
  let out = raw;
  if (inString) {
    if (escaped) out = out.slice(0, -1);
    out += '"';
  }
  out = out.replace(/(?:,\s*)?"(?:[^"\\]|\\.)*"\s*:\s*$/, "");
  out = out.replace(/,\s*$/, "");
  for (let i = closers.length - 1; i >= 0; i--) out += closers[i];
  return out;
}
function partialJSONParse(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
  }
  try {
    return JSON.parse(balanceOpenJSON(raw));
  } catch {
    return {};
  }
}
function isPartialJsonString(raw) {
  if (!raw || !String(raw).trim()) return true;
  try {
    JSON.parse(raw);
    return false;
  } catch {
    return true;
  }
}
var init_partialJson = __esm({
  "src/Browser/components/tools/partialJson.js"() {
  }
});

// src/Browser/components/tools/redact.js
function isSensitiveKey(key) {
  return SENSITIVE_KEY_RE.test(String(key || ""));
}
function redactValue(value, opts = {}) {
  const depth = opts.depth ?? 0;
  if (depth > 12) return REDACTED;
  if (value == null) return value;
  if (typeof value === "string") {
    if (/^(?:sk-|Bearer\s+)/i.test(value) || value.length > 40 && /^[A-Za-z0-9_\-.=]+$/.test(value)) {
      return REDACTED;
    }
    return value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v, { depth: depth + 1 }));
  }
  const out = {};
  for (const [k, v] of Object.entries(
    /** @type {Record<string, unknown>} */
    value
  )) {
    out[k] = isSensitiveKey(k) ? REDACTED : redactValue(v, { depth: depth + 1 });
  }
  return out;
}
function redactForDisplay(value) {
  try {
    const redacted = redactValue(value);
    if (typeof redacted === "string") return redacted;
    return JSON.stringify(redacted, null, 2);
  } catch {
    return String(value ?? "");
  }
}
var SENSITIVE_KEY_RE, REDACTED;
var init_redact = __esm({
  "src/Browser/components/tools/redact.js"() {
    SENSITIVE_KEY_RE = /^(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|authorization|auth|credential|cookie|session)$/i;
    REDACTED = "[REDACTED]";
  }
});

// src/Browser/components/tools/ToolActivity.js
function normalizeToolActivity(props = {}) {
  const activity = props.activity && typeof props.activity === "object" ? (
    /** @type {Record<string, unknown>} */
    props.activity
  ) : props;
  let status = asText7(activity.status || props.status) || "executing";
  if (status === "success") status = "complete";
  if (!STATUSES.has(status)) status = "executing";
  const toolCall = activity.toolCall && typeof activity.toolCall === "object" ? (
    /** @type {Record<string, unknown>} */
    activity.toolCall
  ) : null;
  const fn = toolCall?.function && typeof toolCall.function === "object" ? (
    /** @type {Record<string, unknown>} */
    toolCall.function
  ) : null;
  const toolName = asText7(activity.toolName) || asText7(props.toolName) || asText7(fn?.name) || asText7(activity.name) || "";
  const rawArgs = asText7(props.rawArgs) || asText7(activity.rawArgs) || asText7(fn?.arguments) || (typeof activity.arguments === "string" ? activity.arguments : "") || "";
  let input = activity.input !== void 0 ? activity.input : props.input;
  if (input === void 0) {
    input = rawArgs ? partialJSONParse(rawArgs) : {};
  }
  const isPartial2 = activity.isPartial === true || props.isPartial === true || status === "streaming" || (rawArgs ? isPartialJsonString(rawArgs) : false);
  const result = asText7(activity.result) || asText7(props.result) || asText7(activity.content) || "";
  const errorText = asText7(activity.errorText) || asText7(props.errorText) || asText7(activity.error) || asText7(props.error) || "";
  const isError = activity.isError === true || status === "error" || Boolean(errorText);
  return {
    status: isError && status !== "error" ? "error" : status,
    id: asText7(activity.id) || asText7(props.id) || asText7(toolCall?.id) || "",
    toolName,
    rawArgs,
    input,
    result,
    errorText,
    statusMessage: asText7(activity.statusMessage) || asText7(props.statusMessage),
    isError,
    isPartial: isPartial2
  };
}
function resolveRequestDisplay(activity) {
  const input = activity.input;
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const obj = (
      /** @type {Record<string, unknown>} */
      input
    );
    if (obj._request != null) return redactForDisplay(obj._request);
    if (Object.keys(obj).length === 0 && activity.rawArgs.trim()) {
      return activity.rawArgs;
    }
  }
  if (activity.isPartial && activity.rawArgs.trim()) {
    const parsed = partialJSONParse(activity.rawArgs);
    if (parsed && typeof parsed === "object" && Object.keys(
      /** @type {object} */
      parsed
    ).length) {
      return redactForDisplay(parsed);
    }
    return activity.rawArgs;
  }
  return redactForDisplay(input);
}
var STATUSES, ToolActivity;
var init_ToolActivity = __esm({
  "src/Browser/components/tools/ToolActivity.js"() {
    init_shared5();
    init_partialJson();
    init_redact();
    STATUSES = /* @__PURE__ */ new Set(["streaming", "executing", "complete", "result", "error"]);
    ToolActivity = lifecycle7({
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "ToolActivity");
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const activity = normalizeToolActivity(props);
        const reduced = prefersReducedMotion3(props, ctx);
        const running = props.running !== false && ctx.running !== false;
        const isBusy = (activity.status === "streaming" || activity.status === "executing") && running;
        let cls = `canvas-tool-activity canvas-tool-activity--${activity.status}`;
        if (isBusy) cls += " canvas-tool-activity--busy";
        if (reduced) cls += " canvas-tool-activity--reduced-motion";
        if (activity.isPartial) cls += " canvas-tool-activity--partial";
        setClass7(el2, cls);
        el2.setAttribute("data-status", activity.status);
        el2.setAttribute("data-partial", activity.isPartial ? "1" : "0");
        el2.setAttribute("data-tool-name", activity.toolName || "");
        if (activity.id) el2.setAttribute("data-tool-id", activity.id);
        else el2.removeAttribute("data-tool-id");
        clearChildren7(el2);
        const live = doc.createElement("div");
        live.setAttribute("class", "canvas-tool-activity__live");
        live.setAttribute("aria-live", "polite");
        live.setAttribute("aria-atomic", "true");
        const label = activity.statusMessage || defaultToolLabel(activity.status, activity.toolName);
        live.textContent = label;
        el2.appendChild(live);
        const header = doc.createElement("div");
        header.setAttribute("class", "canvas-tool-activity__header");
        const icon = doc.createElement("span");
        icon.setAttribute("class", "canvas-tool-activity__icon");
        icon.setAttribute("aria-hidden", "true");
        icon.setAttribute("data-spin", isBusy && !reduced ? "1" : "0");
        icon.textContent = activity.status === "error" ? "!" : activity.status === "complete" || activity.status === "result" ? "\u2713" : "\u25C9";
        header.appendChild(icon);
        const title = doc.createElement("span");
        title.setAttribute("class", "canvas-tool-activity__title");
        title.textContent = label;
        header.appendChild(title);
        el2.appendChild(header);
        const request = resolveRequestDisplay(activity);
        if (request) {
          const req = doc.createElement("pre");
          req.setAttribute("class", "canvas-tool-activity__request");
          req.setAttribute("data-role", "args");
          if (activity.isPartial) req.setAttribute("data-partial", "1");
          req.textContent = request;
          el2.appendChild(req);
        }
        if (activity.status === "result" || activity.status === "complete" || activity.status === "error") {
          if (activity.result) {
            const res = doc.createElement("pre");
            res.setAttribute("class", "canvas-tool-activity__result");
            res.setAttribute("data-role", "result");
            let display = activity.result;
            try {
              display = redactForDisplay(JSON.parse(activity.result));
            } catch {
              display = redactForDisplay(activity.result);
            }
            res.textContent = display;
            el2.appendChild(res);
          }
          if (activity.errorText) {
            const err = doc.createElement("div");
            err.setAttribute("class", "canvas-tool-activity__error");
            err.setAttribute("data-role", "error");
            err.setAttribute("role", "alert");
            err.textContent = activity.errorText;
            el2.appendChild(err);
          }
        }
        el2.setAttribute("data-input-redacted", JSON.stringify(redactValue(activity.input)));
      }
    });
  }
});

// src/Browser/components/tools/RunStatus.js
function normalizeRunStatus(props = {}) {
  let phase = asText7(props.phase) || asText7(props.status) || asText7(props.event) || "start";
  if (phase === "started" || phase === "run_started" || phase === "RUN_STARTED") phase = "start";
  if (phase === "finished" || phase === "run_finished" || phase === "RUN_FINISHED" || phase === "complete") {
    phase = "finish";
  }
  if (phase === "run_error" || phase === "RUN_ERROR" || phase === "failed") phase = "error";
  if (!PHASES.has(phase)) phase = "start";
  const message = asText7(props.message) || asText7(props.statusMessage) || asText7(props.error) || defaultRunLabel(phase);
  return {
    phase,
    message,
    runId: asText7(props.runId) || asText7(props.id) || ""
  };
}
var PHASES, RunStatus;
var init_RunStatus = __esm({
  "src/Browser/components/tools/RunStatus.js"() {
    init_shared5();
    PHASES = /* @__PURE__ */ new Set(["start", "finish", "error"]);
    RunStatus = lifecycle7({
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "RunStatus");
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const run = normalizeRunStatus(props);
        const reduced = prefersReducedMotion3(props, ctx);
        let cls = `canvas-run-status canvas-run-status--${run.phase}`;
        if (reduced) cls += " canvas-run-status--reduced-motion";
        setClass7(el2, cls);
        el2.setAttribute("data-phase", run.phase);
        if (run.runId) el2.setAttribute("data-run-id", run.runId);
        else el2.removeAttribute("data-run-id");
        clearChildren7(el2);
        const live = doc.createElement("div");
        live.setAttribute("class", "canvas-run-status__live");
        live.setAttribute("aria-live", "polite");
        live.setAttribute("aria-atomic", "true");
        live.textContent = run.message;
        el2.appendChild(live);
        const row = doc.createElement("div");
        row.setAttribute("class", "canvas-run-status__row");
        const icon = doc.createElement("span");
        icon.setAttribute("class", "canvas-run-status__icon");
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = run.phase === "error" ? "!" : run.phase === "finish" ? "\u2713" : "\u25B6";
        row.appendChild(icon);
        const label = doc.createElement("span");
        label.setAttribute("class", "canvas-run-status__label");
        label.textContent = run.message;
        row.appendChild(label);
        el2.appendChild(row);
        if (run.phase === "error" && asText7(props.detail)) {
          const detail = doc.createElement("pre");
          detail.setAttribute("class", "canvas-run-status__detail");
          detail.textContent = asText7(props.detail);
          el2.appendChild(detail);
        }
      }
    });
  }
});

// src/Browser/components/tools/registerTools.js
var registerTools_exports = {};
__export(registerTools_exports, {
  RunStatus: () => RunStatus,
  TOOL_COMPONENTS: () => TOOL_COMPONENTS,
  ToolActivity: () => ToolActivity,
  balanceOpenJSON: () => balanceOpenJSON,
  default: () => registerTools_default,
  isPartialJsonString: () => isPartialJsonString,
  isSensitiveKey: () => isSensitiveKey,
  partialJSONParse: () => partialJSONParse,
  redactForDisplay: () => redactForDisplay,
  redactValue: () => redactValue,
  registerTools: () => registerTools
});
function registerTools(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerTools: registry with register() required");
  }
  for (const [type, entry] of Object.entries(TOOL_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}
var TOOL_COMPONENTS, registerTools_default;
var init_registerTools = __esm({
  "src/Browser/components/tools/registerTools.js"() {
    init_ToolActivity();
    init_RunStatus();
    init_partialJson();
    init_redact();
    TOOL_COMPONENTS = {
      ToolActivity,
      RunStatus,
      // Aliases matching stream event vocabulary
      ToolCall: ToolActivity,
      ToolResult: {
        create(props = {}, ctx = {}) {
          return ToolActivity.create({ ...props, status: props.status || "result" }, ctx);
        },
        update(el2, props = {}, ctx = {}) {
          return ToolActivity.update(el2, { ...props, status: props.status || "result" }, ctx);
        },
        destroy(el2, ctx = {}) {
          return ToolActivity.destroy(el2, ctx);
        },
        ownsChildren: true
      }
    };
    registerTools_default = registerTools;
  }
});

// src/Browser/components/chat/FollowUpItem.js
var FollowUpItem;
var init_FollowUpItem = __esm({
  "src/Browser/components/chat/FollowUpItem.js"() {
    init_shared();
    init_continueConversation();
    FollowUpItem = lifecycle({
      mount(doc) {
        const el2 = doc.createElement("button");
        el2.setAttribute("type", "button");
        el2.setAttribute("data-canvas-component", "FollowUpItem");
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const text2 = asText(props.text);
        const streaming = ctx.stream?.isStreaming === true;
        setClass(el2, "canvas-follow-up-item");
        el2.setAttribute("data-streaming-blocked", streaming ? "true" : "false");
        setOrRemoveAttr(el2, "disabled", streaming ? "true" : null);
        setOrRemoveAttr(el2, "aria-disabled", streaming ? "true" : null);
        clearChildren(el2);
        if (text2) {
          const span = doc.createElement("span");
          span.setAttribute("class", "canvas-follow-up-item__text");
          span.textContent = text2;
          el2.appendChild(span);
        }
        if (asText(props.icon)) {
          const icon = doc.createElement("span");
          icon.setAttribute("class", "canvas-follow-up-item__icon");
          icon.setAttribute("aria-hidden", "true");
          icon.textContent = asText(props.icon);
          el2.appendChild(icon);
        } else {
          const chevron = doc.createElement("span");
          chevron.setAttribute("class", "canvas-follow-up-item__icon");
          chevron.setAttribute("aria-hidden", "true");
          chevron.textContent = "\u203A";
          el2.appendChild(chevron);
        }
        el2.onclick = () => {
          dispatchContinueConversation(
            ctx,
            {
              ...props,
              action: props.action ?? {
                type: "continue_conversation",
                context: text2,
                message: text2
              }
            },
            { fallbackMessage: text2, userGesture: true }
          );
        };
      }
    });
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
var FollowUpBlock;
var init_FollowUpBlock = __esm({
  "src/Browser/components/chat/FollowUpBlock.js"() {
    init_shared();
    init_FollowUpItem();
    FollowUpBlock = lifecycle({
      mount(doc) {
        const el2 = doc.createElement("div");
        el2.setAttribute("data-canvas-component", "FollowUpBlock");
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const items = normalizeFollowUpItems(props);
        setClass(el2, "canvas-follow-up-block");
        el2.setAttribute("data-item-count", String(items.length));
        clearChildren(el2);
        const header = doc.createElement("div");
        header.setAttribute("class", "canvas-follow-up-block__header");
        header.textContent = asText(props.heading) || "Related Queries";
        el2.appendChild(header);
        if (typeof ctx.renderChildren === "function" && Array.isArray(props.children) && props.children.length) {
          ctx.renderChildren(el2, props.children);
          return;
        }
        for (const item of items) {
          el2.appendChild(FollowUpItem.create(item, ctx));
        }
      }
    });
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
var CitationRef;
var init_SourceContext = __esm({
  "src/Browser/components/chat/SourceContext.js"() {
    init_shared();
    CitationRef = lifecycle({
      mount(doc) {
        const el2 = doc.createElement("cite");
        el2.setAttribute("data-canvas-component", "CitationRef");
        return el2;
      },
      patch(el2, props = {}, ctx = {}) {
        const doc = ctx.document ?? el2.ownerDocument;
        const indices = parseIndices(props);
        setClass(el2, "canvas-citation-ref");
        el2.setAttribute("data-citation", indices.join(",") || "");
        clearChildren(el2);
        const sourceCtx = getSourceContext(ctx);
        const found = sourceCtx.lookupCitations(indices);
        if (!indices.length) {
          el2.setAttribute("data-status", "empty");
          el2.textContent = asText(props.label) || "";
          return;
        }
        if (!found.length) {
          el2.setAttribute("data-status", "unresolved");
          el2.textContent = indices.join(",");
          return;
        }
        el2.setAttribute("data-status", "ready");
        el2.setAttribute("data-source-count", String(found.length));
        for (let i = 0; i < found.length; i++) {
          const src = found[i];
          const chip = doc.createElement("button");
          chip.setAttribute("type", "button");
          chip.setAttribute("class", "canvas-citation-ref__chip");
          chip.setAttribute("data-citation-index", String(indices[i] ?? i + 1));
          const label = asText(src.title) || asText(src.sourceName) || String(indices[i]);
          chip.textContent = String(indices[i] ?? i + 1);
          chip.setAttribute("aria-label", `Source ${indices[i]}: ${label}`);
          const safeUrl2 = src.url && ctx.urlPolicy?.safeUrl ? ctx.urlPolicy.safeUrl(src.url) : src.url;
          if (safeUrl2) {
            chip.setAttribute("data-source-url", safeUrl2);
            chip.onclick = (ev) => {
              ev?.preventDefault?.();
              let opened = null;
              if (ctx.urlPolicy && typeof ctx.urlPolicy.safeOpenUrl === "function") {
                opened = ctx.urlPolicy.safeOpenUrl(safeUrl2);
              }
              if (!opened && typeof ctx.openUrl === "function") {
                ctx.openUrl(safeUrl2);
              }
            };
          } else {
            chip.setAttribute("disabled", "true");
          }
          el2.appendChild(chip);
        }
      }
    });
  }
});

// src/Browser/components/chat/registerChatContent.js
var registerChatContent_exports = {};
__export(registerChatContent_exports, {
  CHAT_CONTENT_COMPONENTS: () => CHAT_CONTENT_COMPONENTS,
  CitationRef: () => CitationRef,
  CodeBlock: () => CodeBlock,
  FollowUpBlock: () => FollowUpBlock,
  FollowUpItem: () => FollowUpItem,
  Image: () => Image,
  ImageBlock: () => ImageBlock,
  ListBlock: () => ListBlock,
  ListItem: () => ListItem,
  default: () => registerChatContent_default,
  registerChatContent: () => registerChatContent
});
function registerChatContent(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerChatContent: registry with register() required");
  }
  for (const [type, entry] of Object.entries(CHAT_CONTENT_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}
var CHAT_CONTENT_COMPONENTS, registerChatContent_default;
var init_registerChatContent = __esm({
  "src/Browser/components/chat/registerChatContent.js"() {
    init_ListBlock();
    init_ListItem();
    init_CodeBlock();
    init_Image();
    init_ImageBlock();
    init_FollowUpBlock();
    init_FollowUpItem();
    init_SourceContext();
    CHAT_CONTENT_COMPONENTS = {
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
    registerChatContent_default = registerChatContent;
  }
});

// src/Browser/renderer/partialGate.js
var PARTIAL_ATTR = "data-openui-partial";
var PARTIAL_SKELETON_TYPE = "OpenUIPartialSkeleton";
function isPartial(nodeOrCtx) {
  if (nodeOrCtx == null) return false;
  if (typeof nodeOrCtx === "object") {
    if (nodeOrCtx.partial === true) return true;
    if (nodeOrCtx.node?.partial === true) return true;
    if (typeof nodeOrCtx.getAttribute === "function") {
      const v = nodeOrCtx.getAttribute(PARTIAL_ATTR);
      if (v === "1" || v === "" || v === "true") return true;
    }
    if (typeof nodeOrCtx.nodeType === "number" && nodeOrCtx.nodeType === 1 && typeof nodeOrCtx.hasAttribute === "function" && nodeOrCtx.hasAttribute(PARTIAL_ATTR)) {
      return true;
    }
  }
  return false;
}
function markPartial(el2, partial = true) {
  if (!el2 || typeof el2.setAttribute !== "function") {
    throw new Error("markPartial: element required");
  }
  if (partial) {
    el2.setAttribute(PARTIAL_ATTR, "1");
    el2.setAttribute("aria-busy", "true");
  } else {
    el2.removeAttribute(PARTIAL_ATTR);
    el2.removeAttribute("aria-busy");
  }
  return el2;
}
function createPartialSkeleton(doc, opts = {}) {
  if (!doc?.createElement) {
    throw new Error("createPartialSkeleton: document required");
  }
  const el2 = doc.createElement("div");
  markPartial(el2, true);
  if (opts.typeName) {
    el2.setAttribute("data-openui-partial-of", String(opts.typeName));
  }
  return el2;
}
function renderPartialSkeleton(props = {}, ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  return createPartialSkeleton(doc, {
    typeName: typeof props.typeName === "string" ? props.typeName : void 0
  });
}
function assertInteractive(nodeOrCtx, opts = {}) {
  if (!isPartial(nodeOrCtx)) return true;
  if (opts.throw) {
    throw new Error("partial-gate: node is incomplete; interactions blocked");
  }
  return false;
}
function mapPartialToSkeleton(nodeTree) {
  if (nodeTree == null || nodeTree === false) return nodeTree;
  if (Array.isArray(nodeTree)) {
    return nodeTree.map((c) => mapPartialToSkeleton(c));
  }
  if (typeof nodeTree === "string" || typeof nodeTree === "number") {
    return nodeTree;
  }
  if (typeof nodeTree !== "object" || !("type" in nodeTree)) {
    return nodeTree;
  }
  const vnode = nodeTree;
  if (vnode.partial === true) {
    return {
      type: PARTIAL_SKELETON_TYPE,
      key: vnode.key,
      props: {
        typeName: vnode.type,
        ...vnode.props && typeof vnode.props === "object" ? {} : {}
      },
      children: [],
      partial: true
    };
  }
  const children = vnode.children;
  if (!Array.isArray(children) || children.length === 0) {
    return vnode;
  }
  return {
    ...vnode,
    children: children.map((c) => mapPartialToSkeleton(c))
  };
}

// src/Browser/components/layout/flexProps.js
var GAP_TOKENS = {
  none: "none",
  xs: "xs",
  s: "s",
  m: "m",
  md: "m",
  // library.v1 default alias
  l: "l",
  xl: "xl",
  "2xl": "2xl"
};
var DIRECTIONS = /* @__PURE__ */ new Set(["row", "column"]);
var ALIGNS = /* @__PURE__ */ new Set(["start", "center", "end", "stretch", "baseline"]);
var JUSTIFIES = /* @__PURE__ */ new Set([
  "start",
  "center",
  "end",
  "between",
  "around",
  "evenly"
]);
function pick(value, fallback, allowed) {
  if (typeof value === "string" && allowed.has(value)) return value;
  return fallback;
}
function normalizeFlexProps(props = {}) {
  const direction = pick(props.direction, "column", DIRECTIONS);
  const gapKey = typeof props.gap === "string" && props.gap in GAP_TOKENS ? GAP_TOKENS[props.gap] : "m";
  const align = pick(props.align, "stretch", ALIGNS);
  let justify = pick(props.justify, "start", JUSTIFIES);
  const wrap = props.wrap === true;
  if (wrap && justify === "between") justify = "start";
  return { direction, gap: gapKey, align, justify, wrap };
}
function applyFlexDom(el2, props, opts) {
  const flex = normalizeFlexProps(props);
  const classes = [
    opts.baseClass,
    `${opts.baseClass}--dir-${flex.direction}`,
    `${opts.baseClass}--gap-${flex.gap}`,
    `${opts.baseClass}--align-${flex.align}`,
    `${opts.baseClass}--justify-${flex.justify}`,
    flex.wrap ? `${opts.baseClass}--wrap` : null,
    ...opts.extraClasses ?? []
  ].filter(Boolean);
  el2.setAttribute("class", classes.join(" "));
  el2.setAttribute("data-direction", flex.direction);
  el2.setAttribute("data-gap", flex.gap);
  el2.setAttribute("data-align", flex.align);
  el2.setAttribute("data-justify", flex.justify);
  if (flex.wrap) el2.setAttribute("data-wrap", "1");
  else el2.removeAttribute("data-wrap");
  return flex;
}
function propsChildren(props = {}) {
  return Array.isArray(props.children) ? props.children : null;
}
function renderPropsChildren(el2, props, ctx) {
  const kids = propsChildren(props);
  if (!kids) return;
  if (typeof ctx.renderChildren === "function") {
    ctx.renderChildren(el2, kids);
  }
}

// src/Browser/components/layout/Stack.js
function shouldShowPartialPlaceholder(props) {
  if (props?.partial === true || isPartial(props)) return true;
  if (propsChildren(props) == null && props?.__awaitingChildren === true) {
    return true;
  }
  return false;
}
function syncPartial(el2, props, ctx) {
  const partial = shouldShowPartialPlaceholder(props);
  markPartial(el2, partial);
  const doc = ctx.document ?? el2.ownerDocument ?? globalThis.document;
  const existing = [...el2.childNodes].find(
    (n) => n.nodeType === 1 && /** @type {Element} */
    n.getAttribute?.("data-openui-partial-of") === "Stack"
  );
  if (partial && !propsChildren(props) && !existing) {
    if (doc?.createElement) {
      el2.appendChild(createPartialSkeleton(doc, { typeName: "Stack" }));
    }
  } else if (!partial && existing && existing.parentNode === el2) {
    el2.removeChild(existing);
  }
}
function create(props = {}, ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("Stack.create: ctx.document required");
  }
  const el2 = doc.createElement("div");
  el2.setAttribute("data-canvas-component", "Stack");
  applyFlexDom(el2, props, { baseClass: "canvas-stack" });
  syncPartial(el2, props, ctx);
  renderPropsChildren(el2, props, ctx);
  return el2;
}
function update(el2, props = {}, ctx = {}) {
  applyFlexDom(el2, props, { baseClass: "canvas-stack" });
  syncPartial(el2, props, ctx);
  renderPropsChildren(el2, props, ctx);
}
function destroy(_el, _ctx = {}) {
}
var Stack = { create, update, destroy };

// src/Browser/components/layout/CardSources.js
function normalizeSources(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s) => s && typeof s === "object");
}
function sourceLabel(src, index) {
  return typeof src.title === "string" && src.title || typeof src.sourceName === "string" && src.sourceName || `Source ${index + 1}`;
}
function sourcesToChildren(props = {}, ctx = {}) {
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
      children: ["Sources"]
    },
    ...sources.map((src, index) => {
      const label = sourceLabel(src, index);
      let href;
      if (typeof src.url === "string" && src.url && urlPolicy?.safeUrl) {
        href = urlPolicy.safeUrl(src.url);
      } else if (typeof src.url === "string" && src.url && !urlPolicy) {
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
          href: href || void 0
        },
        children: [label]
      };
    })
  ];
}
function applyShell(el2, props) {
  const sources = normalizeSources(props.sources);
  el2.setAttribute("class", "canvas-card__sources");
  el2.setAttribute("data-canvas-region", "source");
  el2.setAttribute("data-canvas-component", "CardSources");
  el2.setAttribute("data-source-count", String(sources.length));
  el2.setAttribute("aria-label", "Sources");
  markPartial(el2, props?.partial === true || isPartial(props));
  if (!sources.length && !propsChildren(props)) {
    el2.setAttribute("hidden", "");
  } else {
    el2.removeAttribute("hidden");
  }
}
function create2(props = {}, ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("CardSources.create: ctx.document required");
  }
  const el2 = doc.createElement("aside");
  applyShell(el2, props);
  const kids = sourcesToChildren(props, ctx);
  if (kids && typeof ctx.renderChildren === "function") {
    ctx.renderChildren(el2, kids);
  } else {
    renderPropsChildren(el2, props, ctx);
  }
  return el2;
}
function update2(el2, props = {}, ctx = {}) {
  applyShell(el2, props);
  const kids = sourcesToChildren(props, ctx);
  if (kids && typeof ctx.renderChildren === "function") {
    ctx.renderChildren(el2, kids);
  } else {
    renderPropsChildren(el2, props, ctx);
  }
}
function destroy2() {
}
var CardSources = { create: create2, update: update2, destroy: destroy2, ownsChildren: true };
var CardSourcesHeading = {
  create(_props = {}, ctx = {}) {
    const doc = ctx.document ?? globalThis.document;
    const el2 = doc.createElement("div");
    el2.setAttribute("class", "canvas-card__sources-heading");
    el2.setAttribute("data-canvas-sources-heading", "1");
    return el2;
  },
  update(el2) {
    el2.setAttribute("class", "canvas-card__sources-heading");
  },
  destroy() {
  }
};
var CardSourceItem = {
  /**
   * @param {Record<string, unknown>} props
   * @param {Record<string, unknown>} ctx
   */
  create(props = {}, ctx = {}) {
    const doc = ctx.document ?? globalThis.document;
    const el2 = doc.createElement("li");
    syncItemShell(el2, props, ctx);
    return el2;
  },
  update(el2, props = {}, ctx = {}) {
    syncItemShell(el2, props, ctx);
  },
  destroy() {
  }
};
function syncItemShell(el2, props, ctx) {
  const index = typeof props.index === "number" ? props.index : 0;
  el2.setAttribute("class", "canvas-card__source-item");
  el2.setAttribute("data-source-index", String(index));
  if (typeof props.title === "string") {
    el2.setAttribute("data-source-title", props.title);
  } else {
    el2.removeAttribute("data-source-title");
  }
  if (typeof props.sourceName === "string") {
    el2.setAttribute("data-source-name", props.sourceName);
  } else {
    el2.removeAttribute("data-source-name");
  }
  const urlPolicy = ctx.urlPolicy;
  const candidate = typeof props.href === "string" ? props.href : typeof props.url === "string" ? props.url : "";
  const safe = candidate && urlPolicy && typeof urlPolicy.safeUrl === "function" ? urlPolicy.safeUrl(candidate) : void 0;
  el2._canvasUrlPolicy = urlPolicy || null;
  if (safe) {
    el2.setAttribute("class", "canvas-card__source-item canvas-card__source-item--link");
    el2.setAttribute("data-source-url", safe);
    el2.setAttribute("role", "link");
    el2.setAttribute("tabindex", "0");
    if (!el2._canvasSourceBound) {
      el2._canvasSourceBound = true;
      const open = (event) => {
        if (event && typeof event.preventDefault === "function") event.preventDefault();
        const url = el2.getAttribute("data-source-url");
        const policy = el2._canvasUrlPolicy;
        if (!url || !policy || typeof policy.safeOpenUrl !== "function") return;
        policy.safeOpenUrl(url);
      };
      el2.addEventListener("click", open);
      el2.addEventListener("keydown", (event) => {
        if (event?.key !== "Enter" && event?.key !== " ") return;
        open(event);
      });
    }
  } else {
    el2.setAttribute("class", "canvas-card__source-item");
    el2.removeAttribute("data-source-url");
    el2.removeAttribute("role");
    el2.removeAttribute("tabindex");
  }
}

// src/Browser/components/layout/Card.js
var VARIANTS = /* @__PURE__ */ new Set(["card", "sunk", "clear"]);
function normalizeVariant(props = {}) {
  const v = props.variant;
  if (typeof v === "string" && VARIANTS.has(v)) return v;
  return "card";
}
function partitionCardChildren(children, props = {}) {
  const headers = [];
  const sourcesNodes = [];
  const rest = [];
  for (const child of children) {
    if (child == null || child === false) continue;
    if (typeof child === "object" && child !== null && "type" in child) {
      const t = (
        /** @type {{ type: string }} */
        child.type
      );
      if (t === "CardHeader" || t === "InlineHeader") {
        headers.push(child);
        continue;
      }
      if (t === "CardSources" || t === "Sources") {
        sourcesNodes.push(child);
        continue;
      }
      if (t === "CardContent") {
        rest.push(child);
        continue;
      }
    }
    rest.push(child);
  }
  const out = [];
  if (headers.length === 1) {
    out.push(headers[0]);
  } else if (headers.length > 1) {
    out.push({
      type: "CardContent",
      key: "__card-header-wrap",
      props: { "data-canvas-region": "header" },
      children: headers
    });
  }
  const hasContentRoot = rest.some(
    (c) => c && typeof c === "object" && /** @type {{ type?: string }} */
    c.type === "CardContent"
  );
  if (hasContentRoot || rest.length === 0) {
    out.push(...rest);
  } else {
    out.push({
      type: "CardContent",
      key: "__card-content",
      props: {},
      children: rest
    });
  }
  const sourcesProp = Array.isArray(props.sources) ? props.sources : null;
  if (sourcesNodes.length) {
    out.push(...sourcesNodes);
  } else if (sourcesProp && sourcesProp.length) {
    const sourceChildren = sourcesToChildren({ sources: sourcesProp }) ?? [];
    out.push({
      type: "CardSources",
      key: "__card-sources",
      props: { sources: sourcesProp },
      children: sourceChildren
    });
  }
  return out;
}
function isCardPartial(props) {
  return props?.partial === true || isPartial(props);
}
function syncPartial2(el2, props, ctx) {
  const partial = isCardPartial(props);
  markPartial(el2, partial);
  const doc = ctx.document ?? el2.ownerDocument ?? globalThis.document;
  const existing = [...el2.childNodes].find(
    (n) => n.nodeType === 1 && /** @type {Element} */
    n.getAttribute?.("data-openui-partial-of") === "Card"
  );
  if (partial && !propsChildren(props) && !existing && doc?.createElement) {
    el2.appendChild(createPartialSkeleton(doc, { typeName: "Card" }));
  } else if (!partial && existing && existing.parentNode === el2) {
    el2.removeChild(existing);
  }
}
function syncCard(el2, props, ctx) {
  const variant = normalizeVariant(props);
  applyFlexDom(el2, props, {
    baseClass: "canvas-card",
    extraClasses: [`canvas-card--${variant}`, "canvas-card--full"]
  });
  el2.setAttribute("data-variant", variant);
  el2.setAttribute("data-canvas-component", "Card");
  syncPartial2(el2, props, ctx);
  const kids = propsChildren(props);
  if (kids && typeof ctx.renderChildren === "function") {
    ctx.renderChildren(el2, partitionCardChildren(kids, props));
  } else if (!kids && Array.isArray(props.sources) && props.sources.length && typeof ctx.renderChildren === "function") {
  }
}
function create3(props = {}, ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("Card.create: ctx.document required");
  }
  const el2 = doc.createElement("article");
  el2.setAttribute("role", "group");
  syncCard(el2, props, ctx);
  return el2;
}
function update3(el2, props = {}, ctx = {}) {
  syncCard(el2, props, ctx);
}
function destroy3(_el, _ctx = {}) {
}
function partitionChildren(children, props = {}) {
  if (!Array.isArray(children)) return children;
  if (!children.length && !(Array.isArray(props.sources) && props.sources.length)) {
    return children;
  }
  return partitionCardChildren(children, props);
}
var Card = { create: create3, update: update3, destroy: destroy3, partitionChildren };

// src/Browser/components/layout/CardContent.js
function create4(props = {}, ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("CardContent.create: ctx.document required");
  }
  const el2 = doc.createElement("div");
  el2.setAttribute("class", "canvas-card__content");
  el2.setAttribute("data-canvas-region", "content");
  el2.setAttribute("data-canvas-component", "CardContent");
  markPartial(el2, props?.partial === true || isPartial(props));
  renderPropsChildren(el2, props, ctx);
  return el2;
}
function update4(el2, props = {}, ctx = {}) {
  el2.setAttribute("class", "canvas-card__content");
  el2.setAttribute("data-canvas-region", "content");
  markPartial(el2, props?.partial === true || isPartial(props));
  renderPropsChildren(el2, props, ctx);
}
function destroy4() {
}
var CardContent = { create: create4, update: update4, destroy: destroy4 };

// src/Browser/components/registerFoundation.js
function registerFoundation(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerFoundation: registry with register() required");
  }
  registry.register("Stack", Stack);
  registry.register("Card", Card);
  registry.register("CardContent", CardContent);
  registry.register("CardSources", CardSources);
  registry.register("CardSourcesHeading", CardSourcesHeading);
  registry.register("CardSourceItem", CardSourceItem);
  registry.register("Sources", CardSources);
  if (typeof registry.has !== "function" || !registry.has(PARTIAL_SKELETON_TYPE)) {
    registry.register(PARTIAL_SKELETON_TYPE, renderPartialSkeleton);
  }
  return registry;
}

// src/Browser/security/markdown.js
init_urlPolicy();
var CITE_ATTR = "data-citation";
function createFallbackDocument() {
  class N {
    constructor() {
      this.parentNode = null;
      this.childNodes = [];
      this.ownerDocument = null;
    }
    appendChild(c) {
      if (c.parentNode) c.parentNode.removeChild(c);
      c.parentNode = this;
      this.childNodes.push(c);
      return c;
    }
    removeChild(c) {
      const i = this.childNodes.indexOf(c);
      if (i >= 0) {
        this.childNodes.splice(i, 1);
        c.parentNode = null;
      }
      return c;
    }
  }
  class T2 extends N {
    constructor(data) {
      super();
      this.nodeType = 3;
      this.nodeName = "#text";
      this._data = String(data);
    }
    get textContent() {
      return this._data;
    }
  }
  class E extends N {
    constructor(tag) {
      super();
      this.nodeType = 1;
      this.tagName = String(tag).toUpperCase();
      this.nodeName = this.tagName;
      this._attrs = /* @__PURE__ */ new Map();
    }
    setAttribute(n, v) {
      this._attrs.set(String(n).toLowerCase(), String(v));
    }
    getAttribute(n) {
      const v = this._attrs.get(String(n).toLowerCase());
      return v === void 0 ? null : v;
    }
    get attributes() {
      return [...this._attrs.entries()].map(([name, value]) => ({ name, value }));
    }
    get textContent() {
      return this.childNodes.map((c) => c.textContent ?? "").join("");
    }
  }
  return {
    createElement(tag) {
      const el2 = new E(tag);
      el2.ownerDocument = this;
      return el2;
    },
    createTextNode(data) {
      const t = new T2(data);
      t.ownerDocument = this;
      return t;
    }
  };
}
function el(doc, tag, children = [], attrs = {}) {
  const node = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null) node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c) node.appendChild(c);
  }
  return node;
}
function text(doc, textValue) {
  return doc.createTextNode(textValue);
}
function formatInlineNodes(doc, raw) {
  const tokens = [];
  let s = String(raw);
  let i = 0;
  while (i < s.length) {
    if (s[i] === "`") {
      const end = s.indexOf("`", i + 1);
      if (end > i) {
        tokens.push({ type: "code", value: s.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (s[i] === "[") {
      const citeRe = /^(\[\d+\](?:\s*\[\d+\])*)/;
      const cm = citeRe.exec(s.slice(i));
      if (cm) {
        const after = s.slice(i + cm[0].length);
        if (!after.startsWith("(")) {
          const ids = [...cm[0].matchAll(/\[(\d+)\]/g)].map((m) => m[1]);
          tokens.push({ type: "cite", ids });
          i += cm[0].length;
          continue;
        }
      }
      const linkRe = /^\[([^\]]+)\]\(([^)\s]+)\)/;
      const lm = linkRe.exec(s.slice(i));
      if (lm) {
        tokens.push({ type: "link", label: lm[1], href: lm[2] });
        i += lm[0].length;
        continue;
      }
    }
    if (s[i] === "*" && s[i + 1] === "*") {
      const end = s.indexOf("**", i + 2);
      if (end > i) {
        tokens.push({ type: "strong", value: s.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (s[i] === "*") {
      const end = s.indexOf("*", i + 1);
      if (end > i) {
        tokens.push({ type: "em", value: s.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    let j = i + 1;
    while (j < s.length && s[j] !== "`" && s[j] !== "[" && s[j] !== "*") j += 1;
    tokens.push({ type: "text", value: s.slice(i, j) });
    i = j;
  }
  const nodes = [];
  for (const t of tokens) {
    if (t.type === "text") {
      if (t.value) nodes.push(text(doc, t.value));
    } else if (t.type === "code") {
      nodes.push(el(doc, "code", [text(doc, t.value ?? "")]));
    } else if (t.type === "strong") {
      nodes.push(el(doc, "strong", formatInlineNodes(doc, t.value ?? "")));
    } else if (t.type === "em") {
      nodes.push(el(doc, "em", formatInlineNodes(doc, t.value ?? "")));
    } else if (t.type === "link") {
      const href = sanitizeUrl(t.href);
      if (href) {
        nodes.push(
          el(doc, "a", formatInlineNodes(doc, t.label ?? ""), {
            href,
            rel: "noopener noreferrer"
          })
        );
      } else {
        nodes.push(...formatInlineNodes(doc, t.label ?? ""));
      }
    } else if (t.type === "cite") {
      for (const id of t.ids || []) {
        nodes.push(el(doc, "cite", [text(doc, id)], { [CITE_ATTR]: id }));
      }
    }
  }
  return nodes;
}
function isTableSeparator(line) {
  const t = line.trim();
  if (!t || !t.includes("-")) return false;
  if (!/^[\s|:\-]+$/.test(t)) return false;
  return /:?-+:?/.test(t);
}
function splitTableRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}
function markdownToSafeDom(markdown, document2) {
  const doc = document2 || globalThis.document || createFallbackDocument();
  const root = el(doc, "div");
  if (markdown == null) return root;
  const raw = String(markdown);
  if (!raw) return root;
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  const appendParagraph = (buf) => {
    const joined = buf.join("\n").trim();
    if (!joined) return;
    for (const part of joined.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
      const kids = [];
      const bits = part.split("\n");
      bits.forEach((bit, idx) => {
        kids.push(...formatInlineNodes(doc, bit));
        if (idx < bits.length - 1) kids.push(el(doc, "br"));
      });
      root.appendChild(el(doc, "p", kids));
    }
  };
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf2 = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf2.push(lines[i]);
        i += 1;
      }
      i += 1;
      root.appendChild(el(doc, "pre", [el(doc, "code", [text(doc, buf2.join("\n"))])]));
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      root.appendChild(el(doc, `h${level}`, formatInlineNodes(doc, heading[2].trim())));
      i += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buf2 = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf2.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      root.appendChild(el(doc, "blockquote", formatInlineNodes(doc, buf2.join("\n"))));
      continue;
    }
    if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headerCells = splitTableRow(line);
      i += 2;
      const bodyRows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        bodyRows.push(splitTableRow(lines[i]));
        i += 1;
      }
      const thead = el(doc, "thead", [
        el(
          doc,
          "tr",
          headerCells.map((c) => el(doc, "th", formatInlineNodes(doc, c)))
        )
      ]);
      const tbody = el(
        doc,
        "tbody",
        bodyRows.map(
          (row) => el(
            doc,
            "tr",
            row.map((c) => el(doc, "td", formatInlineNodes(doc, c)))
          )
        )
      );
      root.appendChild(el(doc, "table", [thead, tbody]));
      continue;
    }
    if (/^(\s*[-*+]|\s*\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const tag = ordered ? "ol" : "ul";
      const items = [];
      while (i < lines.length && /^(\s*[-*+]|\s*\d+\.)\s+/.test(lines[i])) {
        const item = lines[i].replace(/^(\s*[-*+]|\s*\d+\.)\s+/, "");
        items.push(el(doc, "li", formatInlineNodes(doc, item)));
        i += 1;
      }
      root.appendChild(el(doc, tag, items));
      continue;
    }
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^```/.test(lines[i]) && !/^#{1,3}\s/.test(lines[i]) && !/^>\s?/.test(lines[i]) && !/^(\s*[-*+]|\s*\d+\.)\s+/.test(lines[i]) && !(lines[i].includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1]))) {
      buf.push(lines[i]);
      i += 1;
    }
    appendParagraph(buf);
  }
  return root;
}

// src/Browser/components/content/TextContent.js
init_shared();
var VARIANTS2 = /* @__PURE__ */ new Set(["clear", "card", "sunk"]);
var WEIGHTS = /* @__PURE__ */ new Set(["normal", "medium", "bold"]);
function resolveVariant(props) {
  const v = asText(props.variant) || "sunk";
  return VARIANTS2.has(v) ? v : "sunk";
}
var SIZE_ALIAS = {
  sm: "sm",
  md: "md",
  lg: "lg",
  small: "sm",
  default: "md",
  large: "lg",
  "small-heavy": "sm",
  "large-heavy": "lg"
};
function resolveSize(props) {
  const s = asText(props.size) || "default";
  return SIZE_ALIAS[s] || "md";
}
function resolveWeight(props) {
  const explicit = asText(props.weight);
  if (explicit && WEIGHTS.has(explicit)) return explicit;
  const size = asText(props.size) || "";
  if (size.endsWith("-heavy") || size === "heavy") return "bold";
  return "normal";
}
function bodyText(props) {
  return asText(props.text ?? props.content ?? props.children);
}
var TextContent = lifecycle({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "TextContent");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const variant = resolveVariant(props);
    const size = resolveSize(props);
    const weight = resolveWeight(props);
    setClass(
      el2,
      `canvas-text-content canvas-text-content--${variant} canvas-text-content--size-${size} canvas-text-content--weight-${weight}`
    );
    el2.setAttribute("data-variant", variant);
    el2.setAttribute("data-size", size);
    el2.setAttribute("data-weight", weight);
    clearChildren(el2);
    const text2 = bodyText(props);
    const effective = resolveStatusFromProps(props) === "ready" && !text2 ? { ...props, status: "empty" } : props;
    const { status } = applySurfaceStatus(el2, doc, effective, {
      emptyMessage: asText(props.emptyMessage) || "No text"
    });
    if (status !== "ready") return;
    const body = markdownToSafeDom(text2, doc);
    body.setAttribute("class", "canvas-text-content__body");
    body.setAttribute("data-canvas-body", "");
    el2.insertBefore(body, el2.firstChild);
  }
});
function resolveStatusFromProps(props) {
  const raw = props.status ?? props.state;
  if (raw === "loading" || raw === "empty" || raw === "error" || raw === "ready") {
    return raw;
  }
  if (props.loading === true) return "loading";
  if (props.error != null && props.error !== false) return "error";
  if (props.empty === true) return "empty";
  return "ready";
}

// src/Browser/components/content/TextCallout.js
init_shared();
var VARIANTS3 = /* @__PURE__ */ new Set(["neutral", "info", "warning", "success", "danger"]);
var VARIANT_LABELS = {
  neutral: "Neutral callout",
  info: "Information",
  warning: "Warning",
  success: "Success",
  danger: "Danger"
};
function resolveVariant2(props) {
  const v = asText(props.variant) || "neutral";
  return VARIANTS3.has(v) ? v : "neutral";
}
var TextCallout = lifecycle({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "TextCallout");
    el2.setAttribute("role", "note");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const variant = resolveVariant2(props);
    setClass(el2, `canvas-text-callout canvas-text-callout--${variant}`);
    applyVariantCue(el2, variant, VARIANT_LABELS);
    clearChildren(el2);
    const { status } = applySurfaceStatus(el2, doc, props);
    if (status !== "ready") return;
    const content = doc.createElement("div");
    content.setAttribute("class", "canvas-text-callout__content");
    const title = asText(props.title);
    const description = asText(props.description);
    if (title) {
      const t = doc.createElement("span");
      t.setAttribute("class", "canvas-text-callout__title");
      t.textContent = title;
      content.appendChild(t);
    }
    if (description) {
      const d = doc.createElement("span");
      d.setAttribute("class", "canvas-text-callout__description");
      d.textContent = description;
      content.appendChild(d);
    }
    if (!title && !description) {
      applySurfaceStatus(el2, doc, { ...props, status: "empty" }, {
        emptyMessage: "Empty callout"
      });
      return;
    }
    el2.insertBefore(content, el2.firstChild);
  }
});

// src/Browser/components/content/Callout.js
init_shared();
init_inlineStyle();
var VARIANTS4 = /* @__PURE__ */ new Set(["neutral", "info", "warning", "success", "danger"]);
var VARIANT_LABELS2 = {
  neutral: "Neutral notice",
  info: "Information",
  warning: "Warning",
  success: "Success",
  danger: "Danger"
};
var dismissTimers = /* @__PURE__ */ new WeakMap();
function resolveVariant3(props) {
  const v = asText(props.variant) || "neutral";
  return VARIANTS4.has(v) ? v : "neutral";
}
function clearDismiss(el2) {
  const t = dismissTimers.get(el2);
  if (t != null) {
    clearTimeout(t);
    dismissTimers.delete(el2);
  }
}
var Callout = lifecycle({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "Callout");
    el2.setAttribute("role", "status");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const variant = resolveVariant3(props);
    const duration = Number(props.duration);
    const autodismiss = Number.isFinite(duration) && duration > 0;
    let cls = `canvas-callout canvas-callout--${variant}`;
    if (autodismiss) cls += " canvas-callout--autodismiss";
    setClass(el2, cls);
    applyVariantCue(el2, variant, VARIANT_LABELS2);
    if (autodismiss) {
      setInlineStyle(el2, { "--canvas-callout-duration": `${duration}ms` });
      el2.setAttribute("data-autodismiss", "true");
    } else {
      clearInlineStyle(el2);
      el2.removeAttribute("data-autodismiss");
    }
    setOrRemoveAttr(el2, "hidden", props.visible === false ? "true" : null);
    clearChildren(el2);
    const { status } = applySurfaceStatus(el2, doc, props);
    if (status !== "ready") {
      clearDismiss(el2);
      return;
    }
    const title = asText(props.title);
    const description = asText(props.description);
    if (title) {
      const t = doc.createElement("span");
      t.setAttribute("class", "canvas-callout__title");
      t.textContent = title;
      el2.appendChild(t);
    }
    if (description) {
      const d = doc.createElement("span");
      d.setAttribute("class", "canvas-callout__description");
      d.textContent = description;
      el2.appendChild(d);
    }
    if (!title && !description) {
      applySurfaceStatus(el2, doc, { ...props, status: "empty" }, {
        emptyMessage: "Empty callout"
      });
    }
    clearDismiss(el2);
    if (autodismiss && typeof setTimeout === "function") {
      const timer = setTimeout(() => {
        el2.setAttribute("data-dismissed", "true");
        el2.setAttribute("hidden", "true");
        dismissTimers.delete(el2);
      }, duration);
      dismissTimers.set(el2, timer);
    }
  },
  unmount(el2) {
    clearDismiss(el2);
  }
});

// src/Browser/components/content/Separator.js
init_shared();
var Separator = lifecycle({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "Separator");
    return el2;
  },
  patch(el2, props = {}) {
    const orientation = asText(props.orientation) === "vertical" ? "vertical" : "horizontal";
    const decorative = props.decorative !== false;
    setClass(el2, `canvas-separator canvas-separator--${orientation}`);
    el2.setAttribute("data-orientation", orientation);
    el2.setAttribute("data-status", "ready");
    if (decorative) {
      el2.setAttribute("role", "none");
      el2.removeAttribute("aria-orientation");
      setOrRemoveAttr(el2, "aria-hidden", "true");
    } else {
      el2.setAttribute("role", "separator");
      el2.setAttribute("aria-orientation", orientation);
      el2.removeAttribute("aria-hidden");
    }
  }
});

// src/Browser/components/content/Tag.js
init_shared();
var SIZES = /* @__PURE__ */ new Set(["sm", "md", "lg"]);
var VARIANTS5 = /* @__PURE__ */ new Set(["neutral", "info", "success", "warning", "danger"]);
var VARIANT_LABELS3 = {
  neutral: "Tag",
  info: "Info tag",
  success: "Success tag",
  warning: "Warning tag",
  danger: "Danger tag"
};
function resolveSize2(props) {
  const s = asText(props.size) || "md";
  return SIZES.has(s) ? s : "md";
}
function resolveVariant4(props) {
  const v = asText(props.variant) || "neutral";
  return VARIANTS5.has(v) ? v : "neutral";
}
var Tag = lifecycle({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "Tag");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const size = resolveSize2(props);
    const variant = resolveVariant4(props);
    setClass(el2, `canvas-tag canvas-tag--${size} canvas-tag--${variant}`);
    el2.setAttribute("data-size", size);
    applyVariantCue(el2, variant, VARIANT_LABELS3);
    clearChildren(el2);
    const text2 = asText(props.text);
    const effective = resolveStatus(props) === "ready" && !text2 ? { ...props, status: "empty" } : props;
    const { status } = applySurfaceStatus(el2, doc, effective, {
      emptyMessage: "Empty tag",
      showStatusText: true
    });
    if (status !== "ready") return;
    const icon = asText(props.icon);
    if (icon) {
      const iconEl = doc.createElement("span");
      iconEl.setAttribute("class", "canvas-tag__icon");
      iconEl.setAttribute("aria-hidden", "true");
      iconEl.textContent = icon;
      el2.appendChild(iconEl);
    }
    const textEl = doc.createElement("span");
    textEl.setAttribute("class", "canvas-tag__text");
    textEl.textContent = text2;
    el2.appendChild(textEl);
  }
});

// src/Browser/components/content/TagBlock.js
init_shared();
function normalizeTags(props) {
  if (Array.isArray(props.tags)) return props.tags;
  if (Array.isArray(props.children)) return props.children;
  return [];
}
var TagBlock = lifecycle({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "TagBlock");
    el2.setAttribute("role", "list");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const size = asText(props.size) || "";
    setClass(el2, "canvas-tag-block");
    if (size) el2.setAttribute("data-size", size);
    clearChildren(el2);
    const tags = normalizeTags(props);
    const { status } = applySurfaceStatus(el2, doc, props, {
      emptyMessage: "No tags"
    });
    if (status === "loading" || status === "error") return;
    if (!tags.length || status === "empty") {
      applySurfaceStatus(el2, doc, { ...props, status: "empty" }, {
        emptyMessage: asText(props.emptyMessage) || "No tags"
      });
      return;
    }
    for (const item of tags) {
      const tagProps = typeof item === "string" ? { text: item, size: size || "md" } : { size: size || void 0, ...item };
      const tagEl = Tag.create(tagProps, { document: doc });
      tagEl.setAttribute("role", "listitem");
      el2.appendChild(tagEl);
    }
  },
  unmount(el2, ctx) {
    for (const child of [...el2.childNodes ?? []]) {
      if (child.nodeType === 1 && child.getAttribute?.("data-canvas-component") === "Tag") {
        Tag.destroy(child, ctx);
      }
    }
  }
});

// src/Browser/components/content/EntityList.js
init_shared();
var SIZES2 = /* @__PURE__ */ new Set(["small", "default"]);
function createRow(doc, row, rowType) {
  const rightVariant = asText(row.rightVariant) === "number" ? "number" : "text";
  const rowEl = doc.createElement("div");
  rowEl.setAttribute(
    "class",
    `canvas-entity-list__row canvas-entity-list__row--${rowType}`
  );
  rowEl.setAttribute("data-row-type", rowType);
  const left = doc.createElement("span");
  left.setAttribute(
    "class",
    `canvas-entity-list__cell-left canvas-entity-list__cell-left--${rowType}`
  );
  left.textContent = asText(row.left);
  const right = doc.createElement("span");
  right.setAttribute(
    "class",
    `canvas-entity-list__cell-right canvas-entity-list__cell-right--${rightVariant} canvas-entity-list__cell-right--${rowType}`
  );
  right.setAttribute("data-right-variant", rightVariant);
  right.textContent = asText(row.right);
  rowEl.appendChild(left);
  rowEl.appendChild(right);
  return rowEl;
}
var EntityList = lifecycle({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "EntityList");
    el2.setAttribute("role", "table");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const sizeRaw = asText(props.size) || "default";
    const size = SIZES2.has(sizeRaw) ? sizeRaw : "default";
    setClass(el2, `canvas-entity-list canvas-entity-list--${size}`);
    el2.setAttribute("data-size", size);
    clearChildren(el2);
    const { status } = applySurfaceStatus(el2, doc, props, {
      emptyMessage: "No rows"
    });
    if (status === "loading" || status === "error") return;
    const rows = Array.isArray(props.rows) ? props.rows : [];
    const showHeaderFooter = size === "default";
    if (!rows.length && !(showHeaderFooter && (props.header || props.footer))) {
      applySurfaceStatus(el2, doc, { ...props, status: "empty" }, {
        emptyMessage: asText(props.emptyMessage) || "No rows"
      });
      return;
    }
    if (showHeaderFooter && props.header && typeof props.header === "object") {
      el2.appendChild(createRow(doc, props.header, "header"));
    }
    for (const row of rows) {
      if (row && typeof row === "object") {
        el2.appendChild(createRow(doc, row, "body"));
      }
    }
    if (showHeaderFooter && props.footer && typeof props.footer === "object") {
      el2.appendChild(createRow(doc, props.footer, "footer"));
    }
  }
});

// src/Browser/components/content/InlineHeader.js
init_shared();
var InlineHeader = lifecycle({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "InlineHeader");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    setClass(el2, "canvas-inline-header");
    clearChildren(el2);
    const heading = asText(props.heading ?? props.title);
    const description = asText(props.description);
    const { status } = applySurfaceStatus(el2, doc, props, {
      emptyMessage: "No heading"
    });
    if (status !== "ready") return;
    if (!heading && !description) {
      applySurfaceStatus(el2, doc, { ...props, status: "empty" }, {
        emptyMessage: "No heading"
      });
      return;
    }
    if (heading) {
      const h = doc.createElement("div");
      h.setAttribute("class", "canvas-inline-header__heading");
      h.textContent = heading;
      el2.appendChild(h);
    }
    if (description) {
      const d = doc.createElement("div");
      d.setAttribute("class", "canvas-inline-header__description");
      d.textContent = description;
      el2.appendChild(d);
    }
  }
});

// src/Browser/components/content/CardHeader.js
init_shared();
var CardHeader = lifecycle({
  mount(doc) {
    const el2 = doc.createElement("header");
    el2.setAttribute("data-canvas-component", "CardHeader");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    setClass(el2, "canvas-card-header");
    clearChildren(el2);
    const { status } = applySurfaceStatus(el2, doc, props, {
      emptyMessage: "No title"
    });
    if (status !== "ready") return;
    const title = asText(props.title);
    const subtitle = asText(props.subtitle);
    const icon = asText(props.icon);
    if (!title && !subtitle && !icon) {
      applySurfaceStatus(el2, doc, { ...props, status: "empty" }, {
        emptyMessage: "No title"
      });
      return;
    }
    const top = doc.createElement("div");
    top.setAttribute("class", "canvas-card-header__top");
    const left = doc.createElement("div");
    left.setAttribute("class", "canvas-card-header__top-left");
    if (icon) {
      const iconEl = doc.createElement("span");
      iconEl.setAttribute("class", "canvas-card-header__icon");
      iconEl.setAttribute("aria-hidden", "true");
      iconEl.textContent = icon;
      left.appendChild(iconEl);
    }
    if (title) {
      const titleEl = doc.createElement("span");
      titleEl.setAttribute("class", "canvas-card-header__title");
      titleEl.textContent = title;
      left.appendChild(titleEl);
    }
    top.appendChild(left);
    const actions = props.actions;
    const actionLabels = Array.isArray(actions) ? actions.map((a) => typeof a === "string" ? a : asText(a?.label ?? a?.text)) : typeof actions === "string" ? [actions] : [];
    if (actionLabels.some(Boolean)) {
      const right = doc.createElement("div");
      right.setAttribute("class", "canvas-card-header__top-right");
      right.setAttribute("data-actions", "labels");
      for (const label of actionLabels) {
        if (!label) continue;
        const a = doc.createElement("span");
        a.setAttribute("class", "canvas-card-header__action-label");
        a.textContent = label;
        right.appendChild(a);
      }
      top.appendChild(right);
    }
    el2.appendChild(top);
    if (subtitle) {
      const bottom = doc.createElement("div");
      bottom.setAttribute("class", "canvas-card-header__bottom");
      bottom.textContent = subtitle;
      el2.appendChild(bottom);
    }
  }
});

// src/Browser/components/content/MetricIndicator.js
init_shared();
var VARIANTS6 = /* @__PURE__ */ new Set(["with-strikethrough", "inline"]);
function resolveVariant5(props) {
  const raw = asText(props.variant);
  if (VARIANTS6.has(raw)) return raw;
  if (props.previousValue != null && asText(props.previousValue) !== "") {
    return "with-strikethrough";
  }
  return "inline";
}
function trendDirection(trend) {
  if (!trend || typeof trend !== "object") return null;
  const d = asText(trend.direction);
  return d === "up" || d === "down" ? d : null;
}
var MetricIndicator = lifecycle({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "MetricIndicator");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const variant = resolveVariant5(props);
    const subtext = asText(props.subtext);
    let cls = `canvas-metric-indicator canvas-metric-indicator--${variant}`;
    if (subtext) cls += " canvas-metric-indicator--has-subtext";
    setClass(el2, cls);
    el2.setAttribute("data-variant", variant);
    clearChildren(el2);
    const { status } = applySurfaceStatus(el2, doc, props, {
      emptyMessage: "No metric"
    });
    if (status !== "ready") return;
    const value = asText(props.value);
    if (!value) {
      applySurfaceStatus(el2, doc, { ...props, status: "empty" }, {
        emptyMessage: "No metric"
      });
      return;
    }
    const row = doc.createElement("div");
    row.setAttribute("class", "canvas-metric-indicator__row");
    const main = doc.createElement("div");
    main.setAttribute("class", "canvas-metric-indicator__main-value");
    main.textContent = value;
    row.appendChild(main);
    const previousValue = asText(props.previousValue);
    if (variant === "with-strikethrough" && previousValue) {
      const prev = doc.createElement("div");
      prev.setAttribute("class", "canvas-metric-indicator__previous-value");
      prev.textContent = previousValue;
      row.appendChild(prev);
    }
    const dir = trendDirection(props.trend);
    if (dir && props.trend) {
      const trendEl = doc.createElement("div");
      const tone = dir === "up" ? "up" : "down";
      trendEl.setAttribute(
        "class",
        `canvas-metric-indicator__trend canvas-metric-indicator__trend--${tone}`
      );
      trendEl.setAttribute("data-trend", dir);
      const pct = Number(props.trend.value);
      const pctText = Number.isFinite(pct) ? `${pct}%` : asText(props.trend.value);
      const word = dir === "up" ? "up" : "down";
      const sign = dir === "up" ? "+" : "-";
      trendEl.setAttribute("aria-label", `Trend ${word} ${pctText}`);
      trendEl.textContent = `${sign}${pctText}`;
      applyVariantCue(trendEl, tone, { up: "Trend up", down: "Trend down" });
      row.appendChild(trendEl);
    }
    if (variant === "inline" && subtext) {
      const s = doc.createElement("div");
      s.setAttribute("class", "canvas-metric-indicator__subtext");
      s.textContent = subtext;
      row.appendChild(s);
    }
    el2.appendChild(row);
    if (variant !== "inline" && subtext) {
      const s = doc.createElement("div");
      s.setAttribute("class", "canvas-metric-indicator__subtext");
      s.textContent = subtext;
      el2.appendChild(s);
    }
  }
});
var MetricIndicatorWithStrikethrough = {
  create(props = {}, ctx = {}) {
    const el2 = MetricIndicator.create({ ...props, variant: "with-strikethrough" }, ctx);
    el2.setAttribute("data-canvas-component", "MetricIndicatorWithStrikethrough");
    return el2;
  },
  update(el2, props = {}, ctx = {}) {
    return MetricIndicator.update(el2, { ...props, variant: "with-strikethrough" }, ctx);
  },
  destroy(el2, ctx = {}) {
    return MetricIndicator.destroy(el2, ctx);
  }
};
var MetricIndicatorInline = {
  create(props = {}, ctx = {}) {
    const el2 = MetricIndicator.create({ ...props, variant: "inline" }, ctx);
    el2.setAttribute("data-canvas-component", "MetricIndicatorInline");
    return el2;
  },
  update(el2, props = {}, ctx = {}) {
    return MetricIndicator.update(el2, { ...props, variant: "inline" }, ctx);
  },
  destroy(el2, ctx = {}) {
    return MetricIndicator.destroy(el2, ctx);
  }
};

// src/Browser/components/content/registerContent.js
init_ListBlock();
init_ListItem();
init_CodeBlock();
init_Image();
init_ImageBlock();

// src/Browser/components/content/Icon.js
init_shared();

// src/Browser/components/content/iconAllowlist.js
var ICON_GLYPHS = {
  accessibility: [
    { tag: "circle", attrs: { cx: "16", cy: "4", r: "1" } },
    { tag: "path", attrs: { d: "m18 19 1-7-6 1" } },
    { tag: "path", attrs: { d: "m5 8 3-3 5.5 3-2.36 3.5" } },
    { tag: "path", attrs: { d: "M4.24 14.5a5 5 0 0 0 6.88 6" } },
    { tag: "path", attrs: { d: "M13.76 17.5a5 5 0 0 0-6.88-6" } }
  ],
  "arrow-right": [{ tag: "path", attrs: { d: "M5 12h14" } }, { tag: "path", attrs: { d: "m12 5 7 7-7 7" } }],
  bell: [
    { tag: "path", attrs: { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" } },
    { tag: "path", attrs: { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0" } }
  ],
  box: [
    { tag: "path", attrs: { d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" } },
    { tag: "path", attrs: { d: "m3.3 7 8.7 5 8.7-5" } },
    { tag: "path", attrs: { d: "M12 22V12" } }
  ],
  building: [
    { tag: "rect", attrs: { width: "16", height: "20", x: "4", y: "2", rx: "2", ry: "2" } },
    { tag: "path", attrs: { d: "M9 22v-4h6v4" } },
    { tag: "path", attrs: { d: "M8 6h.01" } },
    { tag: "path", attrs: { d: "M16 6h.01" } },
    { tag: "path", attrs: { d: "M12 6h.01" } },
    { tag: "path", attrs: { d: "M12 10h.01" } },
    { tag: "path", attrs: { d: "M12 14h.01" } },
    { tag: "path", attrs: { d: "M16 10h.01" } },
    { tag: "path", attrs: { d: "M16 14h.01" } },
    { tag: "path", attrs: { d: "M8 10h.01" } },
    { tag: "path", attrs: { d: "M8 14h.01" } }
  ],
  calculator: [
    { tag: "rect", attrs: { width: "16", height: "20", x: "4", y: "2", rx: "2" } },
    { tag: "line", attrs: { x1: "8", x2: "16", y1: "6", y2: "6" } },
    { tag: "line", attrs: { x1: "16", x2: "16", y1: "14", y2: "18" } },
    { tag: "path", attrs: { d: "M16 10h.01" } },
    { tag: "path", attrs: { d: "M12 10h.01" } },
    { tag: "path", attrs: { d: "M8 10h.01" } },
    { tag: "path", attrs: { d: "M12 14h.01" } },
    { tag: "path", attrs: { d: "M8 14h.01" } },
    { tag: "path", attrs: { d: "M12 18h.01" } },
    { tag: "path", attrs: { d: "M8 18h.01" } }
  ],
  camera: [
    { tag: "path", attrs: { d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" } },
    { tag: "circle", attrs: { cx: "12", cy: "13", r: "3" } }
  ],
  car: [
    { tag: "path", attrs: { d: "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" } },
    { tag: "circle", attrs: { cx: "7", cy: "17", r: "2" } },
    { tag: "path", attrs: { d: "M9 17h6" } },
    { tag: "circle", attrs: { cx: "17", cy: "17", r: "2" } }
  ],
  cat: [
    { tag: "path", attrs: { d: "M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.14 1 2.4 1 3.74C21 17.2 16.97 21 12 21s-9-3.8-9-8.26c0-1.34.43-2.6 1-3.74 0 0-1.82-6.42-.42-7C4.97 2.16 8.22 3 10 5c.65-.17 1.33-.26 2-.26Z" } },
    { tag: "path", attrs: { d: "M8 14v.5" } },
    { tag: "path", attrs: { d: "M16 14v.5" } },
    { tag: "path", attrs: { d: "M11.25 16.25h1.5L12 17l-.75-.75Z" } }
  ],
  "chart-line": [
    { tag: "path", attrs: { d: "M3 3v18h18" } },
    { tag: "path", attrs: { d: "m19 9-5 5-4-4-3 3" } }
  ],
  "check-circle": [
    { tag: "path", attrs: { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" } },
    { tag: "path", attrs: { d: "m9 11 3 3L22 4" } }
  ],
  "circle-check": [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attrs: { d: "m9 12 2 2 4-4" } }
  ],
  "circle-dot": [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "1", fill: "currentColor" } }
  ],
  "circle-dollar-sign": [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attrs: { d: "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" } },
    { tag: "path", attrs: { d: "M12 18V6" } }
  ],
  circle: [{ tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } }],
  clock: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attrs: { d: "M12 6v6l4 2" } }
  ],
  cloud: [{ tag: "path", attrs: { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" } }],
  code: [
    { tag: "path", attrs: { d: "m16 18 6-6-6-6" } },
    { tag: "path", attrs: { d: "m8 6-6 6 6 6" } }
  ],
  "cooking-pot": [
    { tag: "path", attrs: { d: "M2 12h20" } },
    { tag: "path", attrs: { d: "M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" } },
    { tag: "path", attrs: { d: "m4 8 16-4" } },
    { tag: "path", attrs: { d: "m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8" } }
  ],
  "dollar-sign": [
    { tag: "line", attrs: { x1: "12", x2: "12", y1: "2", y2: "22" } },
    { tag: "path", attrs: { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" } }
  ],
  file: [
    { tag: "path", attrs: { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" } },
    { tag: "path", attrs: { d: "M14 2v4a2 2 0 0 0 2 2h4" } }
  ],
  gamepad: [
    { tag: "line", attrs: { x1: "6", x2: "10", y1: "12", y2: "12" } },
    { tag: "line", attrs: { x1: "8", x2: "8", y1: "10", y2: "14" } },
    { tag: "line", attrs: { x1: "15", x2: "15.01", y1: "13", y2: "13" } },
    { tag: "line", attrs: { x1: "18", x2: "18.01", y1: "11", y2: "11" } },
    { tag: "rect", attrs: { width: "20", height: "12", x: "2", y: "6", rx: "2" } }
  ],
  "heart-pulse": [
    { tag: "path", attrs: { d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" } },
    { tag: "path", attrs: { d: "M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" } }
  ],
  home: [
    { tag: "path", attrs: { d: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" } },
    { tag: "polyline", attrs: { points: "9 22 9 12 15 12 15 22" } }
  ],
  house: [
    { tag: "path", attrs: { d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" } },
    { tag: "path", attrs: { d: "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" } }
  ],
  layout: [
    { tag: "rect", attrs: { width: "18", height: "18", x: "3", y: "3", rx: "2" } },
    { tag: "path", attrs: { d: "M3 9h18" } },
    { tag: "path", attrs: { d: "M9 21V9" } }
  ],
  leaf: [
    { tag: "path", attrs: { d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" } },
    { tag: "path", attrs: { d: "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" } }
  ],
  mail: [
    { tag: "rect", attrs: { width: "20", height: "16", x: "2", y: "4", rx: "2" } },
    { tag: "path", attrs: { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" } }
  ],
  "map-pin": [
    { tag: "path", attrs: { d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" } },
    { tag: "circle", attrs: { cx: "12", cy: "10", r: "3" } }
  ],
  "message-square": [
    { tag: "path", attrs: { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" } }
  ],
  microscope: [
    { tag: "path", attrs: { d: "M6 18h8" } },
    { tag: "path", attrs: { d: "M3 22h18" } },
    { tag: "path", attrs: { d: "M14 22a7 7 0 1 0 0-14h-1" } },
    { tag: "path", attrs: { d: "M9 14h2" } },
    { tag: "path", attrs: { d: "M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" } },
    { tag: "path", attrs: { d: "M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" } }
  ],
  "mouse-pointer": [
    { tag: "path", attrs: { d: "m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" } },
    { tag: "path", attrs: { d: "m13 13 6 6" } }
  ],
  music: [
    { tag: "path", attrs: { d: "M9 18V5l12-2v13" } },
    { tag: "circle", attrs: { cx: "6", cy: "18", r: "3" } },
    { tag: "circle", attrs: { cx: "18", cy: "16", r: "3" } }
  ],
  package: [
    { tag: "path", attrs: { d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" } },
    { tag: "path", attrs: { d: "M12 22V12" } },
    { tag: "path", attrs: { d: "m3.3 7 8.7 5 8.7-5" } },
    { tag: "path", attrs: { d: "m7.5 4.27 9 5.15" } }
  ],
  palette: [
    { tag: "circle", attrs: { cx: "13.5", cy: "6.5", r: ".5", fill: "currentColor" } },
    { tag: "circle", attrs: { cx: "17.5", cy: "10.5", r: ".5", fill: "currentColor" } },
    { tag: "circle", attrs: { cx: "8.5", cy: "7.5", r: ".5", fill: "currentColor" } },
    { tag: "circle", attrs: { cx: "6.5", cy: "12.5", r: ".5", fill: "currentColor" } },
    { tag: "path", attrs: { d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" } }
  ],
  plane: [
    { tag: "path", attrs: { d: "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" } }
  ],
  rocket: [
    { tag: "path", attrs: { d: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" } },
    { tag: "path", attrs: { d: "m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" } },
    { tag: "path", attrs: { d: "M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" } },
    { tag: "path", attrs: { d: "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" } }
  ],
  "share-2": [
    { tag: "circle", attrs: { cx: "18", cy: "5", r: "3" } },
    { tag: "circle", attrs: { cx: "6", cy: "12", r: "3" } },
    { tag: "circle", attrs: { cx: "18", cy: "19", r: "3" } },
    { tag: "line", attrs: { x1: "8.59", x2: "15.42", y1: "13.51", y2: "17.49" } },
    { tag: "line", attrs: { x1: "15.41", x2: "8.59", y1: "6.51", y2: "10.49" } }
  ],
  shield: [
    { tag: "path", attrs: { d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" } }
  ],
  "shopping-cart": [
    { tag: "circle", attrs: { cx: "8", cy: "21", r: "1" } },
    { tag: "circle", attrs: { cx: "19", cy: "21", r: "1" } },
    { tag: "path", attrs: { d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" } }
  ],
  smartphone: [
    { tag: "rect", attrs: { width: "14", height: "20", x: "5", y: "2", rx: "2", ry: "2" } },
    { tag: "path", attrs: { d: "M12 18h.01" } }
  ],
  smile: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attrs: { d: "M8 14s1.5 2 4 2 4-2 4-2" } },
    { tag: "line", attrs: { x1: "9", x2: "9.01", y1: "9", y2: "9" } },
    { tag: "line", attrs: { x1: "15", x2: "15.01", y1: "9", y2: "9" } }
  ],
  star: [
    { tag: "path", attrs: { d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" } }
  ],
  sun: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "4" } },
    { tag: "path", attrs: { d: "M12 2v2" } },
    { tag: "path", attrs: { d: "M12 20v2" } },
    { tag: "path", attrs: { d: "m4.93 4.93 1.41 1.41" } },
    { tag: "path", attrs: { d: "m17.66 17.66 1.41 1.41" } },
    { tag: "path", attrs: { d: "M2 12h2" } },
    { tag: "path", attrs: { d: "M20 12h2" } },
    { tag: "path", attrs: { d: "m6.34 17.66-1.41 1.41" } },
    { tag: "path", attrs: { d: "m19.07 4.93-1.41 1.41" } }
  ],
  target: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "6" } },
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "2" } }
  ],
  "tree-pine": [
    { tag: "path", attrs: { d: "m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z" } },
    { tag: "path", attrs: { d: "M12 22v-3" } }
  ],
  "trending-up": [
    { tag: "polyline", attrs: { points: "22 7 13.5 15.5 8.5 10.5 2 17" } },
    { tag: "polyline", attrs: { points: "16 7 22 7 22 13" } }
  ],
  trophy: [
    { tag: "path", attrs: { d: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6" } },
    { tag: "path", attrs: { d: "M18 9h1.5a2.5 2.5 0 0 0 0-5H18" } },
    { tag: "path", attrs: { d: "M4 22h16" } },
    { tag: "path", attrs: { d: "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" } },
    { tag: "path", attrs: { d: "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" } },
    { tag: "path", attrs: { d: "M18 2H6v7a6 6 0 0 0 12 0V2Z" } }
  ],
  type: [
    { tag: "polyline", attrs: { points: "4 7 4 4 20 4 20 7" } },
    { tag: "line", attrs: { x1: "9", x2: "15", y1: "20", y2: "20" } },
    { tag: "line", attrs: { x1: "12", x2: "12", y1: "4", y2: "20" } }
  ],
  user: [
    { tag: "path", attrs: { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" } },
    { tag: "circle", attrs: { cx: "12", cy: "7", r: "4" } }
  ],
  "user-minus": [
    { tag: "path", attrs: { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" } },
    { tag: "circle", attrs: { cx: "9", cy: "7", r: "4" } },
    { tag: "line", attrs: { x1: "22", x2: "16", y1: "11", y2: "11" } }
  ],
  users: [
    { tag: "path", attrs: { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" } },
    { tag: "circle", attrs: { cx: "9", cy: "7", r: "4" } },
    { tag: "path", attrs: { d: "M22 21v-2a4 4 0 0 0-3-3.87" } },
    { tag: "path", attrs: { d: "M16 3.13a4 4 0 0 1 0 7.75" } }
  ],
  wifi: [
    { tag: "path", attrs: { d: "M12 20h.01" } },
    { tag: "path", attrs: { d: "M2 8.82a15 15 0 0 1 20 0" } },
    { tag: "path", attrs: { d: "M5 12.859a10 10 0 0 1 14 0" } },
    { tag: "path", attrs: { d: "M8.5 16.429a5 5 0 0 1 7 0" } }
  ],
  wrench: [
    { tag: "path", attrs: { d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" } }
  ]
};
var CATEGORY_FALLBACKS = Object.freeze({
  accessibility: "accessibility",
  account: "user",
  animals: "cat",
  arrows: "arrow-right",
  brands: "box",
  buildings: "building",
  charts: "chart-line",
  communication: "message-square",
  connectivity: "wifi",
  cursors: "mouse-pointer",
  design: "palette",
  development: "code",
  devices: "smartphone",
  emoji: "smile",
  files: "file",
  finance: "dollar-sign",
  "food-beverage": "cooking-pot",
  gaming: "gamepad",
  home: "house",
  layout: "layout",
  mail: "mail",
  math: "calculator",
  medical: "heart-pulse",
  multimedia: "music",
  nature: "tree-pine",
  navigation: "map-pin",
  notifications: "bell",
  people: "users",
  photography: "camera",
  science: "microscope",
  seasons: "sun",
  security: "shield",
  shapes: "circle",
  shopping: "shopping-cart",
  social: "share-2",
  sports: "trophy",
  sustainability: "leaf",
  text: "type",
  time: "clock",
  tools: "wrench",
  transportation: "car",
  travel: "plane",
  weather: "cloud"
});
var DEFAULT_FALLBACK_ICON = "circle-dot";
function toKebabIconCandidates(name) {
  const base = String(name || "").trim().replace(/[\s_]+/g, "-").replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2").replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Za-z])(\d)/g, "$1-$2").toLowerCase();
  if (!base) return [];
  const digitSplit = base.replace(/(\d)(?=\d)/g, "$1-");
  return [.../* @__PURE__ */ new Set([base, digitSplit])];
}
function getFallbackIconName(category) {
  const key = String(category ?? "").trim().toLowerCase();
  return CATEGORY_FALLBACKS[key] ?? DEFAULT_FALLBACK_ICON;
}
function resolveIconGlyph(name, category) {
  const raw = String(name || "").trim();
  if (raw && ICON_GLYPHS[raw]) {
    return { resolved: raw, exact: true, glyphs: ICON_GLYPHS[raw] };
  }
  for (const cand of toKebabIconCandidates(raw)) {
    if (ICON_GLYPHS[cand]) {
      return { resolved: cand, exact: true, glyphs: ICON_GLYPHS[cand] };
    }
  }
  const fallback = getFallbackIconName(category);
  const glyphs = ICON_GLYPHS[fallback] ?? ICON_GLYPHS[DEFAULT_FALLBACK_ICON];
  return { resolved: fallback, exact: false, glyphs };
}

// src/Browser/components/content/Icon.js
var SVG_NS = "http://www.w3.org/2000/svg";
var SIZE_PX = Object.freeze({
  "extra-small": 12,
  sm: 12,
  small: 12,
  md: 14,
  medium: 14,
  lg: 18,
  large: 20
});
function resolveIconSize(size) {
  if (typeof size === "number" && Number.isFinite(size) && size > 0) {
    return Math.round(size);
  }
  const key = asText(size).toLowerCase();
  if (key && SIZE_PX[key] != null) return SIZE_PX[key];
  const asNum = Number(key);
  if (key && Number.isFinite(asNum) && asNum > 0) return Math.round(asNum);
  return 14;
}
function resolveIconDecorative(props = {}) {
  if (props.decorative === false || props.decorative === "false") return false;
  if (props.decorative === true || props.decorative === "true") return true;
  if (asText(props.ariaLabel) || asText(props.label) || asText(props.title)) {
    return false;
  }
  return true;
}
function humanizeIconName(name) {
  return String(name || "").trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}
function buildSvg(doc, glyphs, px) {
  const svg = typeof doc.createElementNS === "function" ? doc.createElementNS(SVG_NS, "svg") : doc.createElement("svg");
  svg.setAttribute("class", "canvas-icon__svg");
  svg.setAttribute("width", String(px));
  svg.setAttribute("height", String(px));
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const node of glyphs) {
    const child = typeof doc.createElementNS === "function" ? doc.createElementNS(SVG_NS, node.tag) : doc.createElement(node.tag);
    for (const [k, v] of Object.entries(node.attrs || {})) {
      child.setAttribute(k, v);
    }
    svg.appendChild(child);
  }
  return svg;
}
var Icon = lifecycle({
  mount(doc) {
    const el2 = doc.createElement("span");
    el2.setAttribute("data-canvas-component", "Icon");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const name = asText(props.name);
    const category = asText(props.category);
    const px = resolveIconSize(props.size);
    const decorative = resolveIconDecorative(props);
    setClass(el2, `canvas-icon canvas-icon--${px}`);
    el2.setAttribute("data-size", String(px));
    clearChildren(el2);
    if (!name) {
      el2.setAttribute("data-status", "empty");
      el2.removeAttribute("data-icon");
      el2.removeAttribute("data-resolved");
      el2.removeAttribute("data-exact");
      el2.setAttribute("role", "presentation");
      setOrRemoveAttr(el2, "aria-hidden", "true");
      el2.removeAttribute("aria-label");
      return;
    }
    const { resolved, exact, glyphs } = resolveIconGlyph(name, category);
    const used = glyphs?.length ? resolved : DEFAULT_FALLBACK_ICON;
    const nodes = glyphs?.length ? glyphs : resolveIconGlyph(DEFAULT_FALLBACK_ICON).glyphs;
    el2.setAttribute("data-status", "ready");
    el2.setAttribute("data-icon", name);
    el2.setAttribute("data-resolved", used);
    el2.setAttribute("data-exact", exact ? "true" : "false");
    if (category) el2.setAttribute("data-category", category);
    else el2.removeAttribute("data-category");
    if (decorative) {
      el2.setAttribute("role", "presentation");
      setOrRemoveAttr(el2, "aria-hidden", "true");
      el2.removeAttribute("aria-label");
    } else {
      el2.setAttribute("role", "img");
      el2.removeAttribute("aria-hidden");
      const label = asText(props.ariaLabel) || asText(props.label) || asText(props.title) || humanizeIconName(name);
      el2.setAttribute("aria-label", label);
    }
    el2.appendChild(buildSvg(doc, nodes, px));
  }
});

// src/Browser/components/content/MarkDownRenderer.js
init_shared();
var VARIANTS9 = /* @__PURE__ */ new Set(["clear", "card", "sunk"]);
var MarkDownRenderer = lifecycle({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "MarkDownRenderer");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const variant = VARIANTS9.has(asText(props.variant)) ? asText(props.variant) : "clear";
    setClass(el2, `canvas-markdown canvas-markdown--${variant}`);
    el2.setAttribute("data-variant", variant);
    clearChildren(el2);
    const text2 = asText(props.textMarkdown ?? props.text ?? props.content);
    const rendered = markdownToSafeDom(text2, doc);
    el2.appendChild(rendered);
  }
});

// src/Browser/components/content/registerContent.js
var CONTENT_COMPONENTS = {
  TextContent,
  TextCallout,
  Callout,
  Separator,
  Tag,
  TagBlock,
  Icon,
  EntityList,
  InlineHeader,
  CardHeader,
  MetricIndicator,
  MetricIndicatorWithStrikethrough,
  MetricIndicatorInline,
  // A5.3 shared media / lists
  ListBlock,
  ListItem,
  CodeBlock,
  Image,
  ImageBlock,
  MarkDownRenderer
};
function registerContent(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerContent: registry with register() required");
  }
  for (const [type, entry] of Object.entries(CONTENT_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}

// src/Browser/components/containers/Tabs.js
init_shared2();
var STATE = /* @__PURE__ */ new WeakMap();
function getState(el2) {
  let s = STATE.get(el2);
  if (!s) {
    s = {
      selected: "",
      userHasInteracted: false,
      prevContentSizes: {},
      uid: nextUid(),
      onKeyDown: () => {
      },
      onClick: () => {
      }
    };
    STATE.set(el2, s);
  }
  return s;
}
function getTriggers(root) {
  const list = findDirectByAttr(root, "data-canvas-part", "tablist")[0];
  if (!list) return [];
  return findDirectByAttr(list, "role", "tab");
}
function getPanels(root) {
  const panels = findDirectByAttr(root, "data-canvas-part", "panels")[0];
  if (!panels) return [];
  return findDirectByAttr(panels, "role", "tabpanel");
}
function applySelection(root, value) {
  const state = getState(root);
  state.selected = value;
  root.setAttribute("data-selected", value);
  for (const tab of getTriggers(root)) {
    const v = tab.getAttribute("data-value") || "";
    const selected = v === value;
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.setAttribute("tabindex", selected ? "0" : "-1");
    tab.setAttribute("data-state", selected ? "active" : "inactive");
  }
  for (const panel of getPanels(root)) {
    const v = panel.getAttribute("data-value") || "";
    const selected = v === value;
    setOrRemoveAttr2(panel, "hidden", selected ? null : "true");
    panel.setAttribute("data-state", selected ? "active" : "inactive");
    setOrRemoveAttr2(panel, "aria-hidden", selected ? null : "true");
  }
}
function selectTab(root, value, opts = {}) {
  if (!value) return;
  const state = getState(root);
  if (opts.user) state.userHasInteracted = true;
  applySelection(root, value);
  if (opts.focus) {
    const tab = getTriggers(root).find((t) => t.getAttribute("data-value") === value);
    if (tab && typeof tab.focus === "function") tab.focus();
  }
}
function moveRovingFocus(root, delta) {
  const tabs = getTriggers(root).filter((t) => !t.disabled && t.getAttribute("disabled") == null);
  if (!tabs.length) return;
  const doc = root.ownerDocument;
  const active = doc && "activeElement" in doc ? doc.activeElement : null;
  let idx = tabs.findIndex((t) => t === active);
  if (idx < 0) {
    idx = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
  }
  if (idx < 0) idx = 0;
  const next = tabs[(idx + delta + tabs.length * 10) % tabs.length];
  const value = next.getAttribute("data-value") || "";
  selectTab(root, value, { focus: true, user: true });
}
function jumpRovingFocus(root, which) {
  const tabs = getTriggers(root).filter((t) => !t.disabled && t.getAttribute("disabled") == null);
  if (!tabs.length) return;
  const target = which === "start" ? tabs[0] : tabs[tabs.length - 1];
  selectTab(root, target.getAttribute("data-value") || "", { focus: true, user: true });
}
function autoFollowSelection(state, items) {
  if (state.userHasInteracted) {
    if (state.selected && !items.some((i) => i.value === state.selected)) {
      return items[0]?.value || "";
    }
    return state.selected;
  }
  if (!state.selected && items[0]) {
    return items[0].value;
  }
  let candidate = null;
  const nextSizes = {};
  for (const item of items) {
    const size = contentSize(item.content);
    const prev = state.prevContentSizes[item.value] ?? 0;
    nextSizes[item.value] = size;
    if (size > prev) candidate = item.value;
  }
  state.prevContentSizes = nextSizes;
  if (candidate) return candidate;
  if (state.selected && !items.some((i) => i.value === state.selected)) {
    return items[0]?.value || "";
  }
  return state.selected;
}
function ensureShell(doc, root) {
  let list = findDirectByAttr(root, "data-canvas-part", "tablist")[0];
  if (!list) {
    list = doc.createElement("div");
    list.setAttribute("data-canvas-part", "tablist");
    list.setAttribute("role", "tablist");
    list.setAttribute("class", "canvas-tabs__list");
    root.appendChild(list);
  }
  let panels = findDirectByAttr(root, "data-canvas-part", "panels")[0];
  if (!panels) {
    panels = doc.createElement("div");
    panels.setAttribute("data-canvas-part", "panels");
    panels.setAttribute("class", "canvas-tabs__panels");
    root.appendChild(panels);
  }
  return { list, panels };
}
function syncItems(root, items, ctx) {
  const doc = requireDocument2(ctx);
  const state = getState(root);
  const { list, panels } = ensureShell(doc, root);
  const existingTabs = /* @__PURE__ */ new Map();
  for (const t of getTriggers(root)) {
    existingTabs.set(t.getAttribute("data-value") || "", t);
  }
  const existingPanels = /* @__PURE__ */ new Map();
  for (const p of getPanels(root)) {
    existingPanels.set(p.getAttribute("data-value") || "", p);
  }
  const keepValues = new Set(items.map((i) => i.value));
  for (const [v, el2] of existingTabs) {
    if (!keepValues.has(v) && el2.parentNode) el2.parentNode.removeChild(el2);
  }
  for (const [v, el2] of existingPanels) {
    if (!keepValues.has(v) && el2.parentNode) el2.parentNode.removeChild(el2);
  }
  items.forEach((item, index) => {
    const key = itemKey(item, index);
    const tabId = `canvas-tab-${state.uid}-${item.value}`;
    const panelId = `canvas-panel-${state.uid}-${item.value}`;
    let tab = existingTabs.get(item.value);
    if (!tab) {
      tab = doc.createElement("button");
      tab.setAttribute("type", "button");
      tab.setAttribute("role", "tab");
      tab.setAttribute("data-value", item.value);
      tab.setAttribute("data-item-key", key);
    }
    list.appendChild(tab);
    tab.setAttribute("id", tabId);
    tab.setAttribute("aria-controls", panelId);
    tab.setAttribute("class", "canvas-tabs__trigger");
    tab.setAttribute("data-item-key", key);
    while (tab.firstChild) tab.removeChild(tab.firstChild);
    tab.appendChild(doc.createTextNode(item.trigger || item.value));
    let panel = existingPanels.get(item.value);
    if (!panel) {
      panel = doc.createElement("div");
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("data-value", item.value);
      panel.setAttribute("data-item-key", key);
    }
    panels.appendChild(panel);
    panel.setAttribute("id", panelId);
    panel.setAttribute("aria-labelledby", tabId);
    panel.setAttribute("class", "canvas-tabs__panel");
    panel.setAttribute("data-item-key", key);
    panel.setAttribute("tabindex", "0");
    const body = findDirectByAttr(panel, "data-canvas-part", "panel-body")[0];
    let bodyEl = body;
    if (!bodyEl) {
      bodyEl = doc.createElement("div");
      bodyEl.setAttribute("data-canvas-part", "panel-body");
      bodyEl.setAttribute("class", "canvas-tabs__panel-inner");
      panel.appendChild(bodyEl);
    }
    renderItemContent(bodyEl, item.content, ctx);
  });
  const nextSelected = autoFollowSelection(state, items);
  if (nextSelected) {
    applySelection(root, nextSelected);
  } else if (!items.length) {
    state.selected = "";
    root.removeAttribute("data-selected");
  }
}
function bindOnce(root) {
  const state = getState(root);
  if (
    /** @type {any} */
    root._canvasTabsBound
  ) return;
  state.onKeyDown = (e) => {
    if (isPartial(root)) return;
    const key = e?.key;
    if (key === "ArrowRight" || key === "ArrowDown") {
      e.preventDefault?.();
      moveRovingFocus(root, 1);
    } else if (key === "ArrowLeft" || key === "ArrowUp") {
      e.preventDefault?.();
      moveRovingFocus(root, -1);
    } else if (key === "Home") {
      e.preventDefault?.();
      jumpRovingFocus(root, "start");
    } else if (key === "End") {
      e.preventDefault?.();
      jumpRovingFocus(root, "end");
    }
  };
  state.onClick = (e) => {
    if (isPartial(root)) return;
    let node = e?.target;
    while (node && node !== root) {
      if (node.nodeType === 1 && /** @type {Element} */
      node.getAttribute?.("role") === "tab") {
        const value = (
          /** @type {Element} */
          node.getAttribute("data-value") || ""
        );
        selectTab(root, value, { user: true, focus: true });
        return;
      }
      node = node.parentNode;
    }
  };
  root.addEventListener("keydown", state.onKeyDown);
  root.addEventListener("click", state.onClick);
  root._canvasTabsBound = true;
}
function unbind(root) {
  const state = STATE.get(root);
  if (!state) return;
  if (typeof root.removeEventListener === "function") {
    root.removeEventListener("keydown", state.onKeyDown);
    root.removeEventListener("click", state.onClick);
  }
  root._canvasTabsBound = false;
  STATE.delete(root);
}
var Tabs = lifecycle2({
  ownsChildren: true,
  mount(doc, _props, _ctx) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "Tabs");
    setClass2(el2, "canvas-tabs canvas-tabs--clear");
    getState(el2);
    bindOnce(el2);
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const variant = asText2(props.variant) || "clear";
    setClass2(el2, `canvas-tabs canvas-tabs--${variant}`);
    el2.setAttribute("data-variant", variant);
    const partial = props.partial === true || isPartial(props);
    markPartial(el2, partial);
    setOrRemoveAttr2(el2, "aria-disabled", partial ? "true" : null);
    const state = getState(el2);
    if (typeof props.value === "string" && props.value) {
      state.userHasInteracted = true;
      state.selected = props.value;
    }
    const items = normalizeItems(props, "TabItem");
    el2.setAttribute("data-item-count", String(items.length));
    syncItems(el2, items, ctx);
    bindOnce(el2);
  },
  unmount(el2) {
    unbind(el2);
  }
});
var TabItem = lifecycle2({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "TabItem");
    el2.setAttribute("hidden", "true");
    return el2;
  },
  patch(el2, props = {}) {
    const value = asText2(props.value);
    setOrRemoveAttr2(el2, "data-value", value || null);
    setOrRemoveAttr2(el2, "data-trigger", asText2(props.trigger) || null);
  }
});

// src/Browser/components/containers/Accordion.js
init_shared2();
var STATE2 = /* @__PURE__ */ new WeakMap();
function getState2(el2) {
  let s = STATE2.get(el2);
  if (!s) {
    s = {
      open: "",
      userHasInteracted: false,
      prevItemCount: 0,
      uid: nextUid(),
      onClick: () => {
      },
      onKeyDown: () => {
      }
    };
    STATE2.set(el2, s);
  }
  return s;
}
function getItems(root) {
  return findDirectByAttr(root, "data-canvas-part", "item");
}
function applyOpen(root, value, expanded = true) {
  const state = getState2(root);
  state.open = expanded ? value : "";
  setOrRemoveAttr2(root, "data-open", state.open || null);
  for (const item of getItems(root)) {
    const v = item.getAttribute("data-value") || "";
    const isOpen = expanded && v === value;
    item.setAttribute("data-state", isOpen ? "open" : "closed");
    const header = findDirectByAttr(item, "data-canvas-part", "header")[0];
    const trigger = header && findDirectByAttr(header, "data-canvas-part", "trigger")[0] || findDirectByAttr(item, "data-canvas-part", "trigger")[0];
    const panel = findDirectByAttr(item, "data-canvas-part", "panel")[0];
    if (trigger) {
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      trigger.setAttribute("data-state", isOpen ? "open" : "closed");
    }
    if (panel) {
      setOrRemoveAttr2(panel, "hidden", isOpen ? null : "true");
      panel.setAttribute("data-state", isOpen ? "open" : "closed");
      setOrRemoveAttr2(panel, "aria-hidden", isOpen ? null : "true");
    }
  }
}
function setOpen(root, value, opts = {}) {
  const state = getState2(root);
  if (opts.user) state.userHasInteracted = true;
  if (!value) {
    applyOpen(root, "", false);
    return;
  }
  if (state.open === value) {
    applyOpen(root, value, false);
  } else {
    applyOpen(root, value, true);
  }
}
function autoOpenSelection(state, items) {
  if (state.userHasInteracted) {
    if (state.open && !items.some((i) => i.value === state.open)) {
      return items[0]?.value || "";
    }
    return state.open;
  }
  if (items.length > state.prevItemCount) {
    const newest = items[items.length - 1];
    state.prevItemCount = items.length;
    return newest?.value || "";
  }
  state.prevItemCount = items.length;
  if (!state.open && items[0]) return items[0].value;
  if (state.open && !items.some((i) => i.value === state.open)) {
    return items[0]?.value || "";
  }
  return state.open;
}
function syncItems2(root, items, ctx) {
  const doc = requireDocument2(ctx);
  const state = getState2(root);
  const existing = /* @__PURE__ */ new Map();
  for (const item of getItems(root)) {
    existing.set(item.getAttribute("data-value") || "", item);
  }
  const keep = new Set(items.map((i) => i.value));
  for (const [v, el2] of existing) {
    if (!keep.has(v) && el2.parentNode) el2.parentNode.removeChild(el2);
  }
  items.forEach((item, index) => {
    const key = itemKey(item, index);
    const triggerId = `canvas-acc-trigger-${state.uid}-${item.value}`;
    const panelId = `canvas-acc-panel-${state.uid}-${item.value}`;
    let itemEl = existing.get(item.value);
    if (!itemEl) {
      itemEl = doc.createElement("div");
      itemEl.setAttribute("data-canvas-part", "item");
      itemEl.setAttribute("data-value", item.value);
      itemEl.setAttribute("class", "canvas-accordion__item");
    }
    root.appendChild(itemEl);
    itemEl.setAttribute("data-item-key", key);
    itemEl.setAttribute("data-value", item.value);
    itemEl.setAttribute("class", "canvas-accordion__item");
    let header = findDirectByAttr(itemEl, "data-canvas-part", "header")[0];
    if (!header) {
      header = doc.createElement("h3");
      header.setAttribute("data-canvas-part", "header");
      header.setAttribute("class", "canvas-accordion__header");
      itemEl.appendChild(header);
    }
    let trigger = findDirectByAttr(header, "data-canvas-part", "trigger")[0];
    if (!trigger) {
      trigger = findDirectByAttr(itemEl, "data-canvas-part", "trigger")[0];
    }
    if (!trigger) {
      trigger = doc.createElement("button");
      trigger.setAttribute("type", "button");
      trigger.setAttribute("data-canvas-part", "trigger");
      trigger.setAttribute("class", "canvas-accordion__trigger");
      header.appendChild(trigger);
    } else if (trigger.parentNode !== header) {
      header.appendChild(trigger);
    }
    trigger.setAttribute("id", triggerId);
    trigger.setAttribute("aria-controls", panelId);
    trigger.setAttribute("aria-expanded", "false");
    let label = findDirectByAttr(trigger, "data-canvas-part", "trigger-label")[0];
    if (!label) {
      label = doc.createElement("span");
      label.setAttribute("data-canvas-part", "trigger-label");
      label.setAttribute("class", "canvas-accordion__trigger-label");
      trigger.appendChild(label);
    }
    label.textContent = item.trigger || item.value;
    let chevron = findDirectByAttr(trigger, "data-canvas-part", "chevron")[0];
    if (!chevron) {
      chevron = doc.createElement("span");
      chevron.setAttribute("data-canvas-part", "chevron");
      chevron.setAttribute("class", "canvas-accordion__chevron");
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "\u25BE";
      trigger.appendChild(chevron);
    }
    let panel = findDirectByAttr(itemEl, "data-canvas-part", "panel")[0];
    if (!panel) {
      panel = doc.createElement("div");
      panel.setAttribute("data-canvas-part", "panel");
      panel.setAttribute("role", "region");
      panel.setAttribute("class", "canvas-accordion__panel");
      itemEl.appendChild(panel);
    }
    panel.setAttribute("id", panelId);
    panel.setAttribute("aria-labelledby", triggerId);
    panel.setAttribute("hidden", "true");
    let body = findDirectByAttr(panel, "data-canvas-part", "panel-body")[0];
    if (!body) {
      body = doc.createElement("div");
      body.setAttribute("data-canvas-part", "panel-body");
      body.setAttribute("class", "canvas-accordion__panel-inner");
      panel.appendChild(body);
    }
    renderItemContent(body, item.content, ctx);
  });
  const nextOpen = autoOpenSelection(state, items);
  if (nextOpen) {
    applyOpen(root, nextOpen, true);
  } else {
    applyOpen(root, "", false);
  }
}
function bindOnce2(root) {
  if (
    /** @type {any} */
    root._canvasAccordionBound
  ) return;
  const state = getState2(root);
  state.onClick = (e) => {
    if (isPartial(root)) return;
    let node = e?.target;
    while (node && node !== root) {
      if (node.nodeType === 1 && /** @type {Element} */
      node.getAttribute?.("data-canvas-part") === "trigger") {
        const item = (
          /** @type {Element} */
          node.parentNode?.parentNode
        );
        const value = item && item.getAttribute?.("data-value") || /** @type {Element} */
        node.getAttribute("aria-controls")?.replace(/^canvas-acc-panel-[^-]+-/, "") || "";
        let cur = node;
        let found = "";
        while (cur && cur !== root) {
          if (cur.nodeType === 1 && /** @type {Element} */
          cur.getAttribute?.("data-canvas-part") === "item") {
            found = /** @type {Element} */
            cur.getAttribute("data-value") || "";
            break;
          }
          cur = cur.parentNode;
        }
        setOpen(root, found || value, { user: true });
        return;
      }
      node = node.parentNode;
    }
  };
  state.onKeyDown = (e) => {
    if (isPartial(root)) return;
    const key = e?.key;
    if (key !== "Enter" && key !== " ") return;
    let node = e?.target;
    while (node && node !== root) {
      if (node.nodeType === 1 && /** @type {Element} */
      node.getAttribute?.("data-canvas-part") === "trigger") {
        e.preventDefault?.();
        let cur = node;
        while (cur && cur !== root) {
          if (cur.nodeType === 1 && /** @type {Element} */
          cur.getAttribute?.("data-canvas-part") === "item") {
            setOpen(
              root,
              /** @type {Element} */
              cur.getAttribute("data-value") || "",
              {
                user: true
              }
            );
            return;
          }
          cur = cur.parentNode;
        }
        return;
      }
      node = node.parentNode;
    }
  };
  root.addEventListener("click", state.onClick);
  root.addEventListener("keydown", state.onKeyDown);
  root._canvasAccordionBound = true;
}
function unbind2(root) {
  const state = STATE2.get(root);
  if (!state) return;
  if (typeof root.removeEventListener === "function") {
    root.removeEventListener("click", state.onClick);
    root.removeEventListener("keydown", state.onKeyDown);
  }
  root._canvasAccordionBound = false;
  STATE2.delete(root);
}
var Accordion = lifecycle2({
  ownsChildren: true,
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "Accordion");
    setClass2(el2, "canvas-accordion canvas-accordion--clear");
    getState2(el2);
    bindOnce2(el2);
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const variant = asText2(props.variant) || "clear";
    setClass2(el2, `canvas-accordion canvas-accordion--${variant}`);
    el2.setAttribute("data-variant", variant);
    const partial = props.partial === true || isPartial(props);
    markPartial(el2, partial);
    setOrRemoveAttr2(el2, "aria-disabled", partial ? "true" : null);
    const state = getState2(el2);
    if (typeof props.value === "string") {
      state.userHasInteracted = true;
      state.open = props.value;
    }
    const items = normalizeItems(props, "AccordionItem");
    el2.setAttribute("data-item-count", String(items.length));
    syncItems2(el2, items, ctx);
    bindOnce2(el2);
  },
  unmount(el2) {
    unbind2(el2);
  }
});
var AccordionItem = lifecycle2({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "AccordionItem");
    el2.setAttribute("hidden", "true");
    return el2;
  },
  patch(el2, props = {}) {
    setOrRemoveAttr2(el2, "data-value", asText2(props.value) || null);
    setOrRemoveAttr2(el2, "data-trigger", asText2(props.trigger) || null);
  }
});

// src/Browser/components/containers/registerContainers.js
var CONTAINER_COMPONENTS = {
  Tabs,
  TabItem,
  Accordion,
  AccordionItem
};
function registerContainers(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerContainers: registry with register() required");
  }
  for (const [type, entry] of Object.entries(CONTAINER_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}

// src/Browser/components/forms/formValidationController.js
init_formValidation();
function createFormValidationController() {
  const errors = /* @__PURE__ */ Object.create(null);
  const fields = /* @__PURE__ */ Object.create(null);
  function validateOne(name, value, rules) {
    const bag = rules ?? fields[name]?.rules ?? {};
    if (!bag || !Object.keys(bag).length) {
      errors[name] = void 0;
      return true;
    }
    const result = validateField(value, bag);
    if (result.ok) {
      errors[name] = void 0;
      return true;
    }
    errors[name] = result.message || result.code || "invalid";
    return false;
  }
  return {
    errors,
    registerField(name, rules, getValue) {
      if (!name) return;
      fields[name] = {
        rules: rules && typeof rules === "object" ? { ...rules } : {},
        getValue: typeof getValue === "function" ? getValue : () => void 0
      };
    },
    unregisterField(name) {
      delete fields[name];
      delete errors[name];
    },
    validateField(name, value, rules) {
      return validateOne(name, value, rules);
    },
    validateForm() {
      let ok = true;
      for (const [name, reg] of Object.entries(fields)) {
        const value = reg.getValue();
        if (!validateOne(name, value, reg.rules)) ok = false;
      }
      return ok;
    },
    clearFieldError(name) {
      if (name in errors) errors[name] = void 0;
    },
    setFieldError(name, message) {
      errors[name] = String(message ?? "invalid");
    },
    fieldNames() {
      return Object.keys(fields);
    }
  };
}

// src/Browser/components/forms/shared.js
init_formValidation();
function requireDocument3(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("form component: ctx.document required");
  }
  return doc;
}
function setClass3(el2, className) {
  el2.setAttribute("class", String(className).trim());
}
function clearChildren3(el2) {
  while (el2.firstChild) {
    el2.removeChild(el2.firstChild);
  }
}
function setOrRemoveAttr3(el2, name, value) {
  if (value == null || value === false || value === "") {
    el2.removeAttribute(name);
  } else {
    el2.setAttribute(name, value === true ? "true" : String(value));
  }
}
function asText3(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function resolveIsStreaming2(props = {}, ctx = {}) {
  if (props.isStreaming === true || props.streaming === true) return true;
  if (props.isStreaming === false || props.streaming === false) return false;
  if (props.disabled === true) return false;
  const stream = ctx.stream;
  if (stream && typeof stream === "object" && stream.isStreaming === true) {
    return true;
  }
  return false;
}
function resolveDisabled(props = {}, ctx = {}) {
  if (props.disabled === true || props.loading === true) return true;
  if (resolveIsStreaming2(props, ctx)) return true;
  if (ctx.form?.submitting === true) return true;
  return false;
}
function resolveReadonly(props = {}) {
  return props.readonly === true || props.readOnly === true;
}
function normalizeRules(rules) {
  if (!rules) return {};
  if (Array.isArray(rules)) {
    const out = {};
    for (const r of rules) {
      if (r && typeof r === "object") Object.assign(out, r);
    }
    return out;
  }
  if (typeof rules === "object") {
    return (
      /** @type {Record<string, unknown>} */
      { ...rules }
    );
  }
  return {};
}
function readBound(raw, fallback) {
  if (raw && typeof raw === "object") {
    if (typeof /** @type {{ get?: unknown }} */
    raw.get === "function") {
      return (
        /** @type {{ get: () => unknown }} */
        raw.get()
      );
    }
    if ("value" in /** @type {object} */
    raw) {
      return (
        /** @type {{ value: unknown }} */
        raw.value
      );
    }
  }
  if (raw === void 0) return fallback;
  return raw;
}
function writeBound(raw, value, props = {}) {
  if (raw && typeof raw === "object" && typeof /** @type {{ set?: unknown }} */
  raw.set === "function") {
    raw.set(value);
  }
  if (typeof props.onChange === "function") {
    props.onChange(value);
  }
}
function fieldName(props = {}) {
  return asText3(props.name);
}
function resolveFormName(ctx = {}) {
  return asText3(ctx.formName);
}
function resolveFormValidation(ctx = {}) {
  const fv = ctx.formValidation;
  if (fv && typeof fv === "object" && typeof fv.registerField === "function") {
    return (
      /** @type {import('./formValidationController.js').FormValidationController} */
      fv
    );
  }
  return null;
}
function controlId(name, suffix = "") {
  const base = name ? `canvas-field-${name}` : `canvas-field-${nextUid2()}`;
  return suffix ? `${base}-${suffix}` : base;
}
var _uid2 = 0;
function nextUid2() {
  _uid2 += 1;
  return `f${_uid2}`;
}
function lifecycle3(impl) {
  return {
    create(props = {}, ctx = {}) {
      const doc = requireDocument3(ctx);
      const el2 = impl.mount(doc, props, ctx);
      impl.patch(el2, props, ctx);
      return el2;
    },
    update(el2, props = {}, ctx = {}) {
      impl.patch(el2, props, ctx);
    },
    destroy(el2, ctx = {}) {
      impl.unmount?.(el2, ctx);
    },
    ownsChildren: impl.ownsChildren === true
  };
}
function renderContent(host, content, ctx) {
  clearChildren3(host);
  const doc = requireDocument3(ctx);
  if (content == null) return;
  if (typeof content === "string" || typeof content === "number") {
    host.appendChild(doc.createTextNode(String(content)));
    return;
  }
  if (Array.isArray(content)) {
    if (typeof ctx.renderChildren === "function") {
      ctx.renderChildren(host, content);
    } else {
      for (const part of content) {
        if (typeof part === "string" || typeof part === "number") {
          host.appendChild(doc.createTextNode(String(part)));
        }
      }
    }
    return;
  }
  if (typeof content === "object" && content !== null && "type" in /** @type {object} */
  content) {
    if (typeof ctx.renderChildren === "function") {
      ctx.renderChildren(host, [content]);
    }
  }
}
function unwrapProps(raw) {
  if (raw == null || typeof raw !== "object") return null;
  const obj = (
    /** @type {Record<string, unknown>} */
    raw
  );
  if (obj.props && typeof obj.props === "object") {
    return (
      /** @type {Record<string, unknown>} */
      obj.props
    );
  }
  return obj;
}
function mapItems(items, mapFn) {
  if (!Array.isArray(items)) return [];
  const out = [];
  items.forEach((raw, i) => {
    const p = unwrapProps(raw);
    if (!p) return;
    const mapped = mapFn(p, raw, i);
    if (mapped) out.push(mapped);
  });
  return out;
}
function registerFormField(ctx, name, componentType, initial, rules, getValue) {
  if (!name) return () => {
  };
  const form = resolveFormName(ctx);
  const streaming = resolveIsStreaming2({}, ctx);
  const bindings = ctx.bindings;
  if (form && bindings && typeof bindings.registerField === "function" && !streaming) {
    bindings.registerField(form, name, componentType, initial);
  }
  const fv = resolveFormValidation(ctx);
  const hasRules = rules && Object.keys(rules).length > 0;
  if (fv && hasRules && !streaming) {
    fv.registerField(name, rules, getValue);
  }
  return () => {
    if (form && bindings && typeof bindings.unregisterField === "function") {
      bindings.unregisterField(form, name);
    }
    if (fv && hasRules) {
      fv.unregisterField(name);
    }
  };
}
function persistFieldValue(ctx, name, value) {
  if (!name) return;
  const form = resolveFormName(ctx);
  const bindings = ctx.bindings;
  if (form && bindings && typeof bindings.setFieldValue === "function") {
    bindings.setFieldValue(form, name, value);
  }
}
function loadFieldValue(ctx, name, fallback) {
  if (!name) return fallback;
  const form = resolveFormName(ctx);
  const bindings = ctx.bindings;
  if (form && bindings && typeof bindings.getFieldValue === "function") {
    const v = bindings.getFieldValue(form, name);
    if (v !== void 0) return v;
  }
  return fallback;
}
function applyControlState(el2, props, ctx) {
  const disabled = resolveDisabled(props, ctx);
  const readonly = resolveReadonly(props);
  setOrRemoveAttr3(el2, "disabled", disabled ? true : null);
  setOrRemoveAttr3(el2, "readonly", readonly ? true : null);
  setOrRemoveAttr3(el2, "aria-disabled", disabled ? "true" : null);
  setOrRemoveAttr3(el2, "aria-busy", props.loading === true ? "true" : null);
  if (disabled) el2.setAttribute("data-disabled", "1");
  else el2.removeAttribute("data-disabled");
  if (readonly) el2.setAttribute("data-readonly", "1");
  else el2.removeAttribute("data-readonly");
}
function applyA11yIds(el2, opts) {
  el2.setAttribute("id", opts.id);
  if (opts.labelledBy) setOrRemoveAttr3(el2, "aria-labelledby", opts.labelledBy);
  if (opts.describedBy && opts.describedBy.length) {
    setOrRemoveAttr3(el2, "aria-describedby", opts.describedBy.filter(Boolean).join(" "));
  } else {
    el2.removeAttribute("aria-describedby");
  }
  setOrRemoveAttr3(el2, "aria-invalid", opts.invalid ? "true" : null);
}
function runFieldValidation(fv, name, value, rules) {
  if (!fv || !name || !rules || !Object.keys(rules).length) return { ok: true };
  const result = validateField(value, rules);
  if (result.ok) {
    fv.clearFieldError(name);
  } else {
    fv.setFieldError(name, result.message || result.code || "invalid");
  }
  return result;
}

// src/Browser/components/forms/Form.js
var STATE3 = /* @__PURE__ */ new WeakMap();
function getState3(el2) {
  return STATE3.get(el2);
}
function buildFormChildCtx(ctx, formName, formValidation, formMeta) {
  return {
    ...ctx,
    formName,
    formValidation,
    form: formMeta,
    parentFormName: ctx.formName
  };
}
function rejectNested(props, ctx) {
  const parent = asText3(ctx.formName);
  if (parent) {
    const err = new Error(`Form: nested forms are not allowed (parent="${parent}")`);
    if (typeof ctx.reportError === "function") ctx.reportError(err);
    throw err;
  }
}
async function submitForm(el2, props = {}, ctx = {}, opts = {}) {
  const state = getState3(el2);
  if (!state) return { ok: false, reason: "no-state" };
  if (state.submitting) return { ok: false, reason: "busy" };
  if (resolveDisabled(props, ctx) || resolveIsStreaming2(props, ctx)) {
    return { ok: false, reason: "disabled" };
  }
  const fv = state.formValidation;
  if (!fv.validateForm()) {
    el2.setAttribute("data-invalid", "1");
    return { ok: false, reason: "invalid" };
  }
  el2.removeAttribute("data-invalid");
  state.submitting = true;
  state.childCtx.form = { submitting: true };
  el2.setAttribute("data-submitting", "1");
  el2.setAttribute("aria-busy", "true");
  try {
    const plan = props.action ?? props.onSubmit ?? props.submitAction;
    const runner = ctx.actions ?? ctx.actionRunner;
    if (plan && runner && typeof runner.run === "function") {
      const result = await runner.run(plan, { userGesture: opts.userGesture === true });
      if (result && result.ok === false) {
        el2.setAttribute("data-mutation-failed", "1");
        return result;
      }
      el2.removeAttribute("data-mutation-failed");
      return result ?? { ok: true };
    }
    if (typeof props.onSubmit === "function") {
      await /** @type {(p: object) => unknown} */
      props.onSubmit({ formName: state.formName });
    }
    return { ok: true };
  } finally {
    state.submitting = false;
    state.childCtx.form = { submitting: false };
    el2.removeAttribute("data-submitting");
    el2.removeAttribute("aria-busy");
  }
}
function resetForm(el2, props = {}, ctx = {}) {
  const state = getState3(el2);
  if (!state) return;
  const fv = state.formValidation;
  for (const name of fv.fieldNames()) {
    fv.clearFieldError(name);
    const bindings = ctx.bindings;
    if (bindings && typeof bindings.setFieldValue === "function") {
      bindings.setFieldValue(state.formName, name, void 0);
    }
  }
  el2.removeAttribute("data-invalid");
  el2.removeAttribute("data-mutation-failed");
  if (typeof props.onReset === "function") {
    props.onReset();
  }
  const plan = props.resetAction;
  const runner = ctx.actions ?? ctx.actionRunner;
  if (plan && runner && typeof runner.run === "function") {
    void runner.run(plan, { userGesture: true });
  }
}
var Form = lifecycle3({
  ownsChildren: true,
  mount(doc) {
    const el2 = doc.createElement("form");
    el2.setAttribute("data-canvas-component", "Form");
    el2.setAttribute("role", "form");
    el2.setAttribute("novalidate", "");
    const fields = doc.createElement("div");
    fields.setAttribute("data-canvas-part", "fields");
    fields.setAttribute("class", "canvas-form__fields");
    const buttons = doc.createElement("div");
    buttons.setAttribute("data-canvas-part", "buttons");
    buttons.setAttribute("class", "canvas-form__buttons");
    el2.appendChild(fields);
    el2.appendChild(buttons);
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    rejectNested(props, ctx);
    const doc = requireDocument3(ctx);
    const formName = asText3(props.name) || "form";
    let state = getState3(el2);
    if (!state || state.formName !== formName) {
      const formValidation = createFormValidationController();
      const formMeta = { submitting: false };
      state = {
        formName,
        formValidation,
        childCtx: buildFormChildCtx(ctx, formName, formValidation, formMeta),
        submitting: false
      };
      STATE3.set(el2, state);
    } else {
      state.childCtx = buildFormChildCtx(
        ctx,
        formName,
        state.formValidation,
        state.childCtx.form || { submitting: state.submitting }
      );
    }
    setClass3(el2, "canvas-form");
    el2.setAttribute("data-form-name", formName);
    el2.setAttribute("name", formName);
    setOrRemoveAttr3(el2, "aria-busy", resolveIsStreaming2(props, ctx) || state.submitting ? "true" : null);
    if (resolveIsStreaming2(props, ctx)) el2.setAttribute("data-streaming", "1");
    else el2.removeAttribute("data-streaming");
    if (resolveDisabled(props, ctx)) el2.setAttribute("data-disabled", "1");
    else el2.removeAttribute("data-disabled");
    if (!el2._canvasSubmitBound) {
      el2.addEventListener("submit", (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        void submitForm(el2, el2._canvasProps || {}, el2._canvasCtx || {}, { userGesture: true });
      });
      el2.addEventListener("reset", (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        resetForm(el2, el2._canvasProps || {}, el2._canvasCtx || {});
      });
      el2._canvasSubmitBound = true;
    }
    el2._canvasProps = props;
    el2._canvasCtx = ctx;
    const fieldsHost = el2.querySelector?.('[data-canvas-part="fields"]') || el2.childNodes[0];
    const buttonsHost = el2.querySelector?.('[data-canvas-part="buttons"]') || el2.childNodes[1];
    const childCtx = state.childCtx;
    if (fieldsHost) {
      if (props.fields != null) {
        renderContent(fieldsHost, props.fields, childCtx);
      } else if (props.children != null) {
        renderContent(fieldsHost, props.children, childCtx);
      } else {
        clearChildren3(fieldsHost);
      }
    }
    if (buttonsHost) {
      if (props.buttons != null) {
        renderContent(buttonsHost, props.buttons, childCtx);
      } else {
        clearChildren3(buttonsHost);
      }
    }
    void doc;
  },
  unmount(el2) {
    STATE3.delete(el2);
  }
});

// src/Browser/components/forms/FormControl.js
function extractInputName(input) {
  const p = unwrapProps(input);
  if (!p) return "";
  if (typeof p.name === "string") return p.name;
  if (p.name && typeof p.name === "object" && "name" in /** @type {object} */
  p.name) {
    return asText3(
      /** @type {{ name: unknown }} */
      p.name.name
    );
  }
  return asText3(p.name);
}
function inputIsRequired(input) {
  const p = unwrapProps(input);
  const rules = p?.rules;
  if (!rules || typeof rules !== "object") return false;
  return (
    /** @type {Record<string, unknown>} */
    rules.required === true
  );
}
var FormControl = lifecycle3({
  ownsChildren: true,
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "FormControl");
    const label = doc.createElement("label");
    label.setAttribute("data-canvas-part", "label");
    label.setAttribute("class", "canvas-form-control__label");
    const inputHost = doc.createElement("div");
    inputHost.setAttribute("data-canvas-part", "input");
    inputHost.setAttribute("class", "canvas-form-control__input");
    const message = doc.createElement("div");
    message.setAttribute("data-canvas-part", "message");
    message.setAttribute("class", "canvas-form-control__message");
    el2.appendChild(label);
    el2.appendChild(inputHost);
    el2.appendChild(message);
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const field = extractInputName(props.input) || asText3(props.name);
    const fv = resolveFormValidation(ctx);
    const error = field && fv?.errors ? fv.errors[field] : void 0;
    const hasError = !!(error || props.hasError);
    const required = props.required === true || inputIsRequired(props.input);
    const id = field ? controlId(field) : controlId("", "control");
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    setClass3(el2, `canvas-form-control${hasError ? " canvas-form-control--error" : ""}`);
    setOrRemoveAttr3(el2, "data-invalid", hasError ? "1" : null);
    setOrRemoveAttr3(el2, "data-required", required ? "1" : null);
    if (field) el2.setAttribute("data-field", field);
    const labelEl = el2.childNodes[0];
    const inputHost = el2.childNodes[1];
    const messageEl = el2.childNodes[2];
    if (labelEl) {
      labelEl.setAttribute("for", id);
      labelEl.setAttribute("id", `${id}-label`);
      clearChildren3(labelEl);
      const text2 = asText3(props.label);
      if (text2) labelEl.appendChild((ctx.document ?? el2.ownerDocument).createTextNode(text2));
      if (required) {
        const req = (ctx.document ?? el2.ownerDocument).createElement("span");
        req.setAttribute("aria-hidden", "true");
        req.setAttribute("class", "canvas-form-control__required");
        req.textContent = " *";
        labelEl.appendChild(req);
      }
    }
    if (inputHost) {
      const inputProps = props.input && typeof props.input === "object" ? {
        ...unwrapProps(props.input) || {},
        id,
        labelledBy: `${id}-label`,
        hintId: !hasError && props.hint ? hintId : void 0,
        errorId: hasError ? errorId : void 0
      } : { id, labelledBy: `${id}-label` };
      if (props.input && typeof props.input === "object" && "type" in /** @type {object} */
      props.input) {
        const vnode = {
          .../** @type {object} */
          props.input,
          props: inputProps
        };
        renderContent(inputHost, [vnode], ctx);
      } else if (props.input != null) {
        if (typeof ctx.renderInput === "function") {
          clearChildren3(inputHost);
          ctx.renderInput(inputHost, inputProps, ctx);
        } else {
          renderContent(inputHost, props.input, ctx);
        }
      } else {
        clearChildren3(inputHost);
      }
    }
    if (messageEl) {
      clearChildren3(messageEl);
      const doc = ctx.document ?? el2.ownerDocument;
      if (hasError && error) {
        messageEl.setAttribute("id", errorId);
        messageEl.setAttribute("role", "alert");
        messageEl.setAttribute("data-kind", "error");
        messageEl.textContent = String(error);
      } else if (props.hint) {
        messageEl.setAttribute("id", hintId);
        messageEl.removeAttribute("role");
        messageEl.setAttribute("data-kind", "hint");
        messageEl.textContent = asText3(props.hint);
      } else {
        messageEl.removeAttribute("id");
        messageEl.removeAttribute("role");
        messageEl.removeAttribute("data-kind");
      }
      void doc;
    }
  }
});

// src/Browser/components/forms/Label.js
var Label = lifecycle3({
  mount(doc) {
    const el2 = doc.createElement("label");
    el2.setAttribute("data-canvas-component", "Label");
    return el2;
  },
  patch(el2, props = {}) {
    setClass3(el2, "canvas-label");
    const text2 = asText3(props.text ?? props.children ?? props.label);
    clearChildren3(el2);
    if (text2) {
      el2.appendChild(el2.ownerDocument.createTextNode(text2));
    }
    if (props.htmlFor || props.for) {
      el2.setAttribute("for", asText3(props.htmlFor ?? props.for));
    }
    setOrRemoveAttr3(el2, "data-required", props.required === true ? "1" : null);
    if (props.required === true) {
      const star = el2.ownerDocument.createElement("span");
      star.setAttribute("aria-hidden", "true");
      star.setAttribute("class", "canvas-label__required");
      star.textContent = " *";
      el2.appendChild(star);
    }
  }
});
var Description = lifecycle3({
  mount(doc) {
    const el2 = doc.createElement("p");
    el2.setAttribute("data-canvas-component", "Description");
    return el2;
  },
  patch(el2, props = {}) {
    const hasError = props.hasError === true || props.variant === "error";
    setClass3(
      el2,
      `canvas-description${hasError ? " canvas-description--error" : ""}`
    );
    setOrRemoveAttr3(el2, "role", hasError ? "alert" : null);
    setOrRemoveAttr3(el2, "data-kind", hasError ? "error" : "hint");
    if (props.id) el2.setAttribute("id", asText3(props.id));
    clearChildren3(el2);
    const text2 = asText3(props.text ?? props.children ?? props.hint ?? props.message);
    if (text2) el2.appendChild(el2.ownerDocument.createTextNode(text2));
  }
});

// src/Browser/components/forms/Submit.js
var STATE4 = /* @__PURE__ */ new WeakMap();
function findParentForm(el2) {
  let n = el2?.parentNode;
  while (n) {
    if (n.nodeType === 1 && n.getAttribute?.("data-canvas-component") === "Form") {
      return n;
    }
    n = n.parentNode;
  }
  return null;
}
function makeButton(doc, kind) {
  const el2 = doc.createElement("button");
  el2.setAttribute("data-canvas-component", kind);
  el2.setAttribute("type", kind === "Submit" ? "submit" : "reset");
  return el2;
}
function patchActionButton(el2, kind, props, ctx) {
  const label = asText3(props.label ?? props.text ?? (kind === "Submit" ? "Submit" : "Reset"));
  setClass3(
    el2,
    `canvas-button canvas-button--${kind === "Submit" ? "primary" : "secondary"} canvas-${kind.toLowerCase()}`
  );
  el2.textContent = label;
  const disabled = resolveDisabled(props, ctx) || resolveIsStreaming2(props, ctx);
  setOrRemoveAttr3(el2, "disabled", disabled ? true : null);
  setOrRemoveAttr3(el2, "aria-disabled", disabled ? "true" : null);
  let state = STATE4.get(el2);
  if (!state) {
    state = {
      onClick: (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        if (el2.getAttribute("disabled") != null || el2.getAttribute("aria-disabled") === "true") {
          return;
        }
        const form = findParentForm(el2);
        const p = el2._canvasProps || {};
        const c = el2._canvasCtx || {};
        if (!form) {
          if (kind === "Submit" && typeof p.onClick === "function") p.onClick(e);
          return;
        }
        if (kind === "Submit") {
          void submitForm(form, form._canvasProps || p, form._canvasCtx || c, {
            userGesture: true
          });
        } else {
          resetForm(form, form._canvasProps || p, form._canvasCtx || c);
        }
      }
    };
    el2.addEventListener("click", state.onClick);
    STATE4.set(el2, state);
  }
  el2._canvasProps = props;
  el2._canvasCtx = ctx;
}
var Submit = lifecycle3({
  ownsChildren: true,
  mount(doc) {
    return makeButton(doc, "Submit");
  },
  patch(el2, props = {}, ctx = {}) {
    patchActionButton(el2, "Submit", props, ctx);
  },
  unmount(el2) {
    const state = STATE4.get(el2);
    if (state) el2.removeEventListener("click", state.onClick);
    STATE4.delete(el2);
  }
});
var Reset = lifecycle3({
  ownsChildren: true,
  mount(doc) {
    return makeButton(doc, "Reset");
  },
  patch(el2, props = {}, ctx = {}) {
    patchActionButton(el2, "Reset", props, ctx);
  },
  unmount(el2) {
    const state = STATE4.get(el2);
    if (state) el2.removeEventListener("click", state.onClick);
    STATE4.delete(el2);
  }
});

// src/Browser/components/forms/fieldControl.js
var FIELD_STATE = /* @__PURE__ */ new WeakMap();
function getFieldState(el2) {
  let s = FIELD_STATE.get(el2);
  if (!s) {
    s = {};
    FIELD_STATE.set(el2, s);
  }
  return s;
}
function resolveFieldValue(props, ctx, fallback = "") {
  const name = fieldName(props);
  const bound = readBound(props.value, void 0);
  if (bound !== void 0) return bound;
  const persisted = loadFieldValue(ctx, name, void 0);
  if (persisted !== void 0) return persisted;
  if (props.defaultValue !== void 0) return props.defaultValue;
  return fallback;
}
function ensureFieldRegistration(root, props, ctx, componentType, getValue, initial) {
  const state = getFieldState(root);
  const name = fieldName(props);
  const rules = normalizeRules(props.rules);
  const streaming = resolveIsStreaming2(props, ctx);
  if (state.unregister && (state.name !== name || streaming)) {
    state.unregister();
    state.unregister = void 0;
    state.name = void 0;
  }
  if (!streaming && name && !state.unregister) {
    state.unregister = registerFormField(ctx, name, componentType, initial, rules, getValue);
    state.name = name;
    state.getValue = getValue;
  }
}
function teardownField(root, ctx = {}) {
  const state = getFieldState(root);
  state.unregister?.();
  state.unregister = void 0;
  state.name = void 0;
  FIELD_STATE.delete(root);
  void ctx;
}
function commitFieldValue(props, ctx, value, opts = {}) {
  const name = fieldName(props);
  writeBound(props.value, value, props);
  persistFieldValue(ctx, name, value);
  const fv = resolveFormValidation(ctx);
  const rules = normalizeRules(props.rules);
  if (opts.clearError && fv && name) fv.clearFieldError(name);
  if (opts.validate) {
    if (fv && typeof fv.validateField === "function" && Object.keys(rules).length) {
      fv.validateField(name, value, rules);
    } else {
      runFieldValidation(fv, name, value, rules);
    }
  }
}
function wireControlA11y(control, props, ctx, extra = {}) {
  const name = fieldName(props);
  const id = asText3(props.id) || controlId(name);
  const fv = resolveFormValidation(ctx);
  const invalid = !!(name && fv?.errors?.[name]);
  const described = [...extra.describedBy ?? []];
  if (props.hintId) described.push(asText3(props.hintId));
  if (props.errorId) described.push(asText3(props.errorId));
  applyA11yIds(control, {
    id,
    labelledBy: extra.labelledBy || asText3(props.labelledBy) || void 0,
    describedBy: described,
    invalid
  });
  applyControlState(control, props, ctx);
  return id;
}
function normalizeSelection(type, existing, defaultValue) {
  if (type === "single") {
    if (typeof existing === "string" && existing) return [existing];
    if (Array.isArray(existing) && existing[0]) return [String(existing[0])];
    if (typeof defaultValue === "string" && defaultValue) return [defaultValue];
    if (Array.isArray(defaultValue) && defaultValue[0]) return [String(defaultValue[0])];
    return [];
  }
  if (Array.isArray(existing)) return existing.map(String);
  if (typeof existing === "string" && existing) return [existing];
  if (Array.isArray(defaultValue)) return defaultValue.map(String);
  if (typeof defaultValue === "string" && defaultValue) return [defaultValue];
  return [];
}
function toggleSelection(type, selection, itemValue) {
  const v = String(itemValue);
  if (type === "single") {
    return selection[0] === v ? [] : [v];
  }
  if (selection.includes(v)) return selection.filter((x) => x !== v);
  return [...selection, v];
}

// src/Browser/components/forms/Input.js
var TYPES = /* @__PURE__ */ new Set(["text", "number", "email", "password", "url", "search", "tel"]);
var STATE5 = /* @__PURE__ */ new WeakMap();
function resolveType(props) {
  const t = asText3(props.type) || "text";
  return TYPES.has(t) ? t : "text";
}
var Input = lifecycle3({
  mount(doc) {
    const el2 = doc.createElement("input");
    el2.setAttribute("data-canvas-component", "Input");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const name = fieldName(props);
    const type = resolveType(props);
    setClass3(el2, `canvas-input canvas-input--${type}`);
    el2.setAttribute("type", type);
    setOrRemoveAttr3(el2, "name", name || null);
    setOrRemoveAttr3(el2, "placeholder", asText3(props.placeholder) || null);
    if (props.min != null) el2.setAttribute("min", String(props.min));
    else el2.removeAttribute("min");
    if (props.max != null) el2.setAttribute("max", String(props.max));
    else el2.removeAttribute("max");
    if (props.step != null) el2.setAttribute("step", String(props.step));
    else el2.removeAttribute("step");
    if (props.maxLength != null) el2.setAttribute("maxlength", String(props.maxLength));
    else el2.removeAttribute("maxlength");
    const value = resolveFieldValue(props, ctx, "");
    el2.value = value == null ? "" : String(value);
    wireControlA11y(el2, props, ctx);
    ensureFieldRegistration(
      el2,
      props,
      ctx,
      "Input",
      () => el2.value,
      value
    );
    let state = STATE5.get(el2);
    if (!state) {
      state = {
        onInput: () => {
          const p = el2._canvasProps || {};
          const c = el2._canvasCtx || {};
          commitFieldValue(p, c, el2.value, { clearError: true });
        },
        onBlur: () => {
          const p = el2._canvasProps || {};
          const c = el2._canvasCtx || {};
          commitFieldValue(p, c, el2.value, { validate: true });
        },
        onFocus: () => {
          const p = el2._canvasProps || {};
          const c = el2._canvasCtx || {};
          const fv = c.formValidation;
          const n = fieldName(p);
          if (fv && n) fv.clearFieldError(n);
        }
      };
      el2.addEventListener("input", state.onInput);
      el2.addEventListener("change", state.onInput);
      el2.addEventListener("blur", state.onBlur);
      el2.addEventListener("focus", state.onFocus);
      STATE5.set(el2, state);
    }
    el2._canvasProps = props;
    el2._canvasCtx = ctx;
  },
  unmount(el2, ctx) {
    const state = STATE5.get(el2);
    if (state) {
      el2.removeEventListener("input", state.onInput);
      el2.removeEventListener("change", state.onInput);
      el2.removeEventListener("blur", state.onBlur);
      el2.removeEventListener("focus", state.onFocus);
    }
    STATE5.delete(el2);
    teardownField(el2, ctx);
  }
});

// src/Browser/components/forms/TextArea.js
var STATE6 = /* @__PURE__ */ new WeakMap();
var TextArea = lifecycle3({
  mount(doc) {
    const el2 = doc.createElement("textarea");
    el2.setAttribute("data-canvas-component", "TextArea");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const name = fieldName(props);
    setClass3(el2, "canvas-textarea");
    setOrRemoveAttr3(el2, "name", name || null);
    setOrRemoveAttr3(el2, "placeholder", asText3(props.placeholder) || null);
    const rows = Number(props.rows) || 3;
    el2.setAttribute("rows", String(rows));
    if (props.maxLength != null) el2.setAttribute("maxlength", String(props.maxLength));
    else el2.removeAttribute("maxlength");
    const value = resolveFieldValue(props, ctx, "");
    el2.value = value == null ? "" : String(value);
    if (el2.childNodes.length === 0 || el2.textContent !== el2.value) {
      el2.textContent = el2.value;
    }
    wireControlA11y(el2, props, ctx);
    ensureFieldRegistration(el2, props, ctx, "TextArea", () => el2.value, value);
    let state = STATE6.get(el2);
    if (!state) {
      state = {
        onInput: () => {
          commitFieldValue(el2._canvasProps || {}, el2._canvasCtx || {}, el2.value, {
            clearError: true
          });
        },
        onBlur: () => {
          commitFieldValue(el2._canvasProps || {}, el2._canvasCtx || {}, el2.value, {
            validate: true
          });
        },
        onFocus: () => {
          const p = el2._canvasProps || {};
          const c = el2._canvasCtx || {};
          const n = fieldName(p);
          if (c.formValidation && n) c.formValidation.clearFieldError(n);
        }
      };
      el2.addEventListener("input", state.onInput);
      el2.addEventListener("change", state.onInput);
      el2.addEventListener("blur", state.onBlur);
      el2.addEventListener("focus", state.onFocus);
      STATE6.set(el2, state);
    }
    el2._canvasProps = props;
    el2._canvasCtx = ctx;
  },
  unmount(el2, ctx) {
    const state = STATE6.get(el2);
    if (state) {
      el2.removeEventListener("input", state.onInput);
      el2.removeEventListener("change", state.onInput);
      el2.removeEventListener("blur", state.onBlur);
      el2.removeEventListener("focus", state.onFocus);
    }
    STATE6.delete(el2);
    teardownField(el2, ctx);
  }
});

// src/Browser/components/forms/DatePicker.js
var STATE7 = /* @__PURE__ */ new WeakMap();
function toDateString(v) {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v.slice(0, 10);
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  return String(v).slice(0, 10);
}
var DatePicker = lifecycle3({
  ownsChildren: true,
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "DatePicker");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const name = fieldName(props);
    const mode = asText3(props.mode) === "range" ? "range" : "single";
    setClass3(el2, `canvas-datepicker canvas-datepicker--${mode}`);
    el2.setAttribute("data-mode", mode);
    const value = resolveFieldValue(props, ctx, mode === "range" ? {} : "");
    clearChildren3(el2);
    if (mode === "range") {
      const start = doc.createElement("input");
      start.setAttribute("type", "date");
      start.setAttribute("data-canvas-part", "start");
      start.setAttribute("class", "canvas-datepicker__input");
      const end = doc.createElement("input");
      end.setAttribute("type", "date");
      end.setAttribute("data-canvas-part", "end");
      end.setAttribute("class", "canvas-datepicker__input");
      const range = value && typeof value === "object" ? value : { from: "", to: "" };
      start.value = toDateString(range.from ?? range.start ?? "");
      end.value = toDateString(range.to ?? range.end ?? "");
      setOrRemoveAttr3(start, "name", name ? `${name}.from` : null);
      setOrRemoveAttr3(end, "name", name ? `${name}.to` : null);
      wireControlA11y(start, { ...props, id: props.id ? `${props.id}-from` : void 0 }, ctx);
      wireControlA11y(end, { ...props, id: props.id ? `${props.id}-to` : void 0 }, ctx);
      el2.appendChild(start);
      el2.appendChild(end);
      ensureFieldRegistration(
        el2,
        props,
        ctx,
        "DatePicker",
        () => ({ from: start.value, to: end.value }),
        value
      );
      let state = STATE7.get(el2);
      if (!state) {
        state = {
          onChange: () => {
            const next = { from: start.value, to: end.value };
            commitFieldValue(el2._canvasProps || {}, el2._canvasCtx || {}, next, {
              validate: true
            });
          }
        };
        start.addEventListener("change", state.onChange);
        end.addEventListener("change", state.onChange);
        STATE7.set(el2, state);
      } else {
        start.addEventListener("change", state.onChange);
        end.addEventListener("change", state.onChange);
      }
    } else {
      const input = doc.createElement("input");
      input.setAttribute("type", "date");
      input.setAttribute("data-canvas-part", "single");
      input.setAttribute("class", "canvas-datepicker__input");
      input.value = toDateString(value);
      setOrRemoveAttr3(input, "name", name || null);
      if (props.min) input.setAttribute("min", toDateString(props.min));
      if (props.max) input.setAttribute("max", toDateString(props.max));
      wireControlA11y(input, props, ctx);
      el2.appendChild(input);
      ensureFieldRegistration(el2, props, ctx, "DatePicker", () => input.value, value);
      let state = STATE7.get(el2);
      if (!state) {
        state = {
          onChange: () => {
            commitFieldValue(el2._canvasProps || {}, el2._canvasCtx || {}, input.value, {
              validate: true
            });
          }
        };
        STATE7.set(el2, state);
      }
      input.addEventListener("change", state.onChange);
    }
    el2._canvasProps = props;
    el2._canvasCtx = ctx;
  },
  unmount(el2, ctx) {
    STATE7.delete(el2);
    teardownField(el2, ctx);
  }
});

// src/Browser/components/forms/Slider.js
var STATE8 = /* @__PURE__ */ new WeakMap();
function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
var Slider = lifecycle3({
  ownsChildren: true,
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "Slider");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const name = fieldName(props);
    const variant = asText3(props.variant) === "discrete" ? "discrete" : "continuous";
    const min = num(props.min, 0);
    const max = num(props.max, 100);
    const step = props.step != null ? num(props.step, 1) : variant === "discrete" ? 1 : "any";
    setClass3(el2, `canvas-slider canvas-slider--${variant}`);
    el2.setAttribute("data-variant", variant);
    const raw = resolveFieldValue(props, ctx, props.defaultValue ?? min);
    let current;
    if (Array.isArray(raw)) current = num(raw[0], min);
    else current = num(raw, min);
    current = Math.min(max, Math.max(min, current));
    clearChildren3(el2);
    const labelText = asText3(props.label);
    if (labelText) {
      const lab = doc.createElement("div");
      lab.setAttribute("class", "canvas-slider__label");
      lab.setAttribute("data-canvas-part", "label");
      lab.textContent = labelText;
      el2.appendChild(lab);
    }
    const input = doc.createElement("input");
    input.setAttribute("type", "range");
    input.setAttribute("class", "canvas-slider__input");
    input.setAttribute("data-canvas-part", "input");
    input.setAttribute("min", String(min));
    input.setAttribute("max", String(max));
    input.setAttribute("step", String(step));
    input.value = String(current);
    setOrRemoveAttr3(input, "name", name || null);
    wireControlA11y(input, props, ctx);
    el2.appendChild(input);
    const valueEl = doc.createElement("output");
    valueEl.setAttribute("class", "canvas-slider__value");
    valueEl.setAttribute("data-canvas-part", "value");
    valueEl.textContent = String(current);
    el2.appendChild(valueEl);
    ensureFieldRegistration(
      el2,
      props,
      ctx,
      "Slider",
      () => [Number(input.value)],
      [current]
    );
    let state = STATE8.get(el2);
    if (!state) {
      state = {
        onInput: () => {
          valueEl.textContent = input.value;
          commitFieldValue(el2._canvasProps || {}, el2._canvasCtx || {}, [Number(input.value)], {
            clearError: true
          });
        },
        onChange: () => {
          valueEl.textContent = input.value;
          commitFieldValue(el2._canvasProps || {}, el2._canvasCtx || {}, [Number(input.value)], {
            validate: true
          });
        }
      };
      STATE8.set(el2, state);
    }
    input.addEventListener("input", state.onInput);
    input.addEventListener("change", state.onChange);
    el2._canvasProps = props;
    el2._canvasCtx = ctx;
  },
  unmount(el2, ctx) {
    STATE8.delete(el2);
    teardownField(el2, ctx);
  }
});

// src/Browser/components/forms/Select.js
var STATE9 = /* @__PURE__ */ new WeakMap();
var SelectItem = lifecycle3({
  mount(doc) {
    const el2 = doc.createElement("option");
    el2.setAttribute("data-canvas-component", "SelectItem");
    return el2;
  },
  patch(el2, props = {}) {
    const value = asText3(props.value);
    el2.setAttribute("value", value);
    el2.textContent = asText3(props.label) || value;
    setOrRemoveAttr3(el2, "disabled", props.disabled === true ? true : null);
  }
});
var Select = lifecycle3({
  // Options come from props.items — reconciler must not clear them.
  ownsChildren: true,
  mount(doc) {
    const el2 = doc.createElement("select");
    el2.setAttribute("data-canvas-component", "Select");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const name = fieldName(props);
    const size = asText3(props.size) || "md";
    setClass3(el2, `canvas-select canvas-select--${size}`);
    setOrRemoveAttr3(el2, "name", name || null);
    const items = mapItems(props.items, (p) => ({
      value: asText3(p.value),
      label: asText3(p.label) || asText3(p.value),
      disabled: p.disabled === true
    })).filter((i) => i.value);
    clearChildren3(el2);
    const doc = ctx.document ?? el2.ownerDocument;
    const placeholder = asText3(props.placeholder) || "Select...";
    const ph = doc.createElement("option");
    ph.setAttribute("value", "");
    ph.textContent = placeholder;
    el2.appendChild(ph);
    for (const item of items) {
      const opt = doc.createElement("option");
      opt.setAttribute("value", item.value);
      opt.textContent = item.label;
      if (item.disabled) opt.setAttribute("disabled", "true");
      el2.appendChild(opt);
    }
    const value = resolveFieldValue(props, ctx, "");
    el2.value = value == null ? "" : String(value);
    wireControlA11y(el2, props, ctx);
    ensureFieldRegistration(el2, props, ctx, "Select", () => el2.value || void 0, value);
    let state = STATE9.get(el2);
    if (!state) {
      state = {
        onChange: () => {
          commitFieldValue(el2._canvasProps || {}, el2._canvasCtx || {}, el2.value, {
            validate: true
          });
        }
      };
      el2.addEventListener("change", state.onChange);
      STATE9.set(el2, state);
    }
    el2._canvasProps = props;
    el2._canvasCtx = ctx;
  },
  unmount(el2, ctx) {
    const state = STATE9.get(el2);
    if (state) el2.removeEventListener("change", state.onChange);
    STATE9.delete(el2);
    teardownField(el2, ctx);
  }
});

// src/Browser/components/forms/CheckBoxGroup.js
var STATE10 = /* @__PURE__ */ new WeakMap();
var CheckBoxItem = lifecycle3({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "CheckBoxItem");
    return el2;
  },
  patch() {
  }
});
function buildAggregate(props, ctx, items) {
  const stored = resolveFieldValue(props, ctx, void 0);
  const out = {};
  for (const item of items) {
    const key = item.name;
    if (stored && typeof stored === "object" && !Array.isArray(stored) && key in stored) {
      out[key] = !!stored[key];
    } else {
      out[key] = item.defaultChecked === true;
    }
  }
  return out;
}
var CheckBoxGroup = lifecycle3({
  // Items are rendered by patch from props.items — do not let reconciler wipe them.
  ownsChildren: true,
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "CheckBoxGroup");
    el2.setAttribute("role", "group");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const name = fieldName(props);
    setClass3(el2, "canvas-checkbox-group");
    setOrRemoveAttr3(el2, "aria-labelledby", asText3(props.labelledBy) || null);
    const items = mapItems(props.items, (p) => ({
      name: asText3(p.name),
      label: asText3(p.label),
      description: asText3(p.description),
      defaultChecked: p.defaultChecked === true,
      disabled: p.disabled === true
    })).filter((i) => i.name);
    const aggregate = buildAggregate(props, ctx, items);
    const disabled = resolveDisabled(props, ctx);
    clearChildren3(el2);
    for (const item of items) {
      const row = doc.createElement("label");
      row.setAttribute("class", "canvas-checkbox-item");
      row.setAttribute("data-canvas-part", "item");
      row.setAttribute("data-name", item.name);
      const input = doc.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("class", "canvas-checkbox-item__input");
      input.setAttribute("name", `${name}.${item.name}`);
      input.checked = !!aggregate[item.name];
      if (input.checked) input.setAttribute("checked", "true");
      else input.removeAttribute("checked");
      setOrRemoveAttr3(input, "disabled", disabled || item.disabled ? true : null);
      const body = doc.createElement("span");
      body.setAttribute("class", "canvas-checkbox-item__body");
      const lab = doc.createElement("span");
      lab.setAttribute("class", "canvas-checkbox-item__label");
      lab.textContent = item.label || item.name;
      body.appendChild(lab);
      if (item.description) {
        const desc = doc.createElement("span");
        desc.setAttribute("class", "canvas-checkbox-item__description");
        desc.textContent = item.description;
        body.appendChild(desc);
      }
      row.appendChild(input);
      row.appendChild(body);
      el2.appendChild(row);
    }
    ensureFieldRegistration(el2, props, ctx, "CheckBoxGroup", () => {
      const next = {};
      for (const row of el2.childNodes) {
        if (row.nodeType !== 1) continue;
        const input = row.childNodes?.[0];
        const key = row.getAttribute?.("data-name");
        if (key && input) next[key] = !!input.checked || input.getAttribute?.("checked") === "true";
      }
      return next;
    }, aggregate);
    let state = STATE10.get(el2);
    if (!state) {
      state = {
        onChange: (e) => {
          const target = e?.target;
          if (!target || target.getAttribute?.("type") !== "checkbox") return;
          const next = {};
          for (const row of el2.childNodes) {
            if (row.nodeType !== 1) continue;
            const input = row.childNodes?.[0];
            const key = row.getAttribute?.("data-name");
            if (!key || !input) continue;
            if (input === target) {
              input.checked = !!(target.checked ?? target.getAttribute("checked") === "true");
              if (e && "checked" in e) input.checked = !!e.checked;
              else if (typeof target.checked === "boolean") {
              } else {
                const was = input.getAttribute("checked") === "true";
                input.checked = !was;
              }
              if (input.checked) input.setAttribute("checked", "true");
              else input.removeAttribute("checked");
            }
            next[key] = !!input.checked || input.getAttribute("checked") === "true";
          }
          commitFieldValue(el2._canvasProps || {}, el2._canvasCtx || {}, next, {
            validate: true
          });
        }
      };
      el2.addEventListener("change", state.onChange);
      el2.addEventListener("click", state.onChange);
      STATE10.set(el2, state);
    }
    el2._canvasProps = props;
    el2._canvasCtx = ctx;
  },
  unmount(el2, ctx) {
    const state = STATE10.get(el2);
    if (state) {
      el2.removeEventListener("change", state.onChange);
      el2.removeEventListener("click", state.onChange);
    }
    STATE10.delete(el2);
    teardownField(el2, ctx);
  }
});
var CheckboxGroup = CheckBoxGroup;
var CheckboxItem = CheckBoxItem;

// src/Browser/components/forms/RadioGroup.js
var STATE11 = /* @__PURE__ */ new WeakMap();
var RadioItem = lifecycle3({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "RadioItem");
    return el2;
  },
  patch() {
  }
});
var RadioGroup = lifecycle3({
  ownsChildren: true,
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "RadioGroup");
    el2.setAttribute("role", "radiogroup");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const name = fieldName(props);
    setClass3(el2, "canvas-radio-group");
    setOrRemoveAttr3(el2, "aria-labelledby", asText3(props.labelledBy) || null);
    const items = mapItems(props.items, (p) => ({
      value: asText3(p.value),
      label: asText3(p.label) || asText3(p.value),
      description: asText3(p.description),
      disabled: p.disabled === true
    })).filter((i) => i.value);
    const value = String(
      resolveFieldValue(props, ctx, props.defaultValue ?? "") ?? ""
    );
    const disabled = resolveDisabled(props, ctx);
    clearChildren3(el2);
    items.forEach((item, index) => {
      const row = doc.createElement("label");
      row.setAttribute("class", "canvas-radio-item");
      row.setAttribute("data-canvas-part", "item");
      row.setAttribute("data-value", item.value);
      const input = doc.createElement("input");
      input.setAttribute("type", "radio");
      input.setAttribute("class", "canvas-radio-item__input");
      input.setAttribute("name", name || "radio");
      input.setAttribute("value", item.value);
      input.checked = item.value === value;
      if (input.checked) input.setAttribute("checked", "true");
      else input.removeAttribute("checked");
      input.setAttribute("tabindex", item.value === value || !value && index === 0 ? "0" : "-1");
      setOrRemoveAttr3(input, "disabled", disabled || item.disabled ? true : null);
      const body = doc.createElement("span");
      body.setAttribute("class", "canvas-radio-item__body");
      const lab = doc.createElement("span");
      lab.setAttribute("class", "canvas-radio-item__label");
      lab.textContent = item.label;
      body.appendChild(lab);
      if (item.description) {
        const desc = doc.createElement("span");
        desc.setAttribute("class", "canvas-radio-item__description");
        desc.textContent = item.description;
        body.appendChild(desc);
      }
      row.appendChild(input);
      row.appendChild(body);
      el2.appendChild(row);
    });
    ensureFieldRegistration(el2, props, ctx, "RadioGroup", () => {
      for (const row of el2.childNodes) {
        if (row.nodeType !== 1) continue;
        const input = row.childNodes?.[0];
        if (input && (input.checked || input.getAttribute("checked") === "true")) {
          return input.getAttribute("value") || row.getAttribute("data-value");
        }
      }
      return void 0;
    }, value || void 0);
    let state = STATE11.get(el2);
    if (!state) {
      state = {
        onChange: (e) => {
          const target = e?.target;
          const v = target?.getAttribute?.("value") || target?.value || e?.value;
          if (v == null) return;
          for (const row of el2.childNodes) {
            if (row.nodeType !== 1) continue;
            const input = row.childNodes?.[0];
            if (!input) continue;
            const selected = input.getAttribute("value") === String(v);
            input.checked = selected;
            if (selected) input.setAttribute("checked", "true");
            else input.removeAttribute("checked");
            input.setAttribute("tabindex", selected ? "0" : "-1");
          }
          commitFieldValue(el2._canvasProps || {}, el2._canvasCtx || {}, String(v), {
            validate: true
          });
        },
        onKeyDown: (e) => {
          const key = e?.key;
          if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "ArrowRight" && key !== "ArrowLeft") {
            return;
          }
          if (typeof e.preventDefault === "function") e.preventDefault();
          const radios = [...el2.childNodes].filter((n) => n.nodeType === 1).map((n) => n.childNodes?.[0]).filter(Boolean);
          const idx = radios.findIndex(
            (r) => r.checked || r.getAttribute("checked") === "true"
          );
          const dir = key === "ArrowDown" || key === "ArrowRight" ? 1 : -1;
          const next = radios[(idx + dir + radios.length) % radios.length];
          if (next) {
            state.onChange({ target: next, value: next.getAttribute("value") });
            if (typeof next.focus === "function") next.focus();
          }
        }
      };
      el2.addEventListener("change", state.onChange);
      el2.addEventListener("click", state.onChange);
      el2.addEventListener("keydown", state.onKeyDown);
      STATE11.set(el2, state);
    }
    el2._canvasProps = props;
    el2._canvasCtx = ctx;
  },
  unmount(el2, ctx) {
    const state = STATE11.get(el2);
    if (state) {
      el2.removeEventListener("change", state.onChange);
      el2.removeEventListener("click", state.onChange);
      el2.removeEventListener("keydown", state.onKeyDown);
    }
    STATE11.delete(el2);
    teardownField(el2, ctx);
  }
});

// src/Browser/components/forms/SwitchGroup.js
var STATE12 = /* @__PURE__ */ new WeakMap();
var SwitchItem = lifecycle3({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "SwitchItem");
    return el2;
  },
  patch() {
  }
});
function buildAggregate2(props, ctx, items) {
  const stored = resolveFieldValue(props, ctx, void 0);
  const out = {};
  for (const item of items) {
    if (stored && typeof stored === "object" && item.name in stored) {
      out[item.name] = !!stored[item.name];
    } else {
      out[item.name] = item.defaultChecked === true;
    }
  }
  return out;
}
var SwitchGroup = lifecycle3({
  ownsChildren: true,
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "SwitchGroup");
    el2.setAttribute("role", "group");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const name = fieldName(props);
    const variant = asText3(props.variant) || "clear";
    setClass3(el2, `canvas-switch-group canvas-switch-group--${variant}`);
    const items = mapItems(props.items, (p) => ({
      name: asText3(p.name),
      label: asText3(p.label),
      description: asText3(p.description),
      defaultChecked: p.defaultChecked === true,
      disabled: p.disabled === true
    })).filter((i) => i.name);
    const aggregate = buildAggregate2(props, ctx, items);
    const disabled = resolveDisabled(props, ctx);
    clearChildren3(el2);
    for (const item of items) {
      const row = doc.createElement("label");
      row.setAttribute("class", "canvas-switch-item");
      row.setAttribute("data-canvas-part", "item");
      row.setAttribute("data-name", item.name);
      const input = doc.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("role", "switch");
      input.setAttribute("class", "canvas-switch-item__input");
      input.setAttribute("name", `${name}.${item.name}`);
      input.checked = !!aggregate[item.name];
      input.setAttribute("aria-checked", input.checked ? "true" : "false");
      if (input.checked) input.setAttribute("checked", "true");
      else input.removeAttribute("checked");
      setOrRemoveAttr3(input, "disabled", disabled || item.disabled ? true : null);
      const body = doc.createElement("span");
      body.setAttribute("class", "canvas-switch-item__body");
      const lab = doc.createElement("span");
      lab.setAttribute("class", "canvas-switch-item__label");
      lab.textContent = item.label || item.name;
      body.appendChild(lab);
      if (item.description) {
        const desc = doc.createElement("span");
        desc.setAttribute("class", "canvas-switch-item__description");
        desc.textContent = item.description;
        body.appendChild(desc);
      }
      row.appendChild(input);
      row.appendChild(body);
      el2.appendChild(row);
    }
    ensureFieldRegistration(el2, props, ctx, "SwitchGroup", () => {
      const next = {};
      for (const row of el2.childNodes) {
        if (row.nodeType !== 1) continue;
        const input = row.childNodes?.[0];
        const key = row.getAttribute?.("data-name");
        if (key && input) {
          next[key] = !!input.checked || input.getAttribute("checked") === "true";
        }
      }
      return next;
    }, aggregate);
    let state = STATE12.get(el2);
    if (!state) {
      state = {
        onChange: (e) => {
          const target = e?.target;
          if (!target || target.getAttribute?.("role") !== "switch") {
            if (target?.getAttribute?.("type") !== "checkbox") return;
          }
          const next = {};
          for (const row of el2.childNodes) {
            if (row.nodeType !== 1) continue;
            const input = row.childNodes?.[0];
            const key = row.getAttribute?.("data-name");
            if (!key || !input) continue;
            if (input === target) {
              const was = input.getAttribute("checked") === "true" || !!input.checked;
              const now = typeof target.checked === "boolean" ? target.checked : !was;
              input.checked = now;
              if (now) input.setAttribute("checked", "true");
              else input.removeAttribute("checked");
              input.setAttribute("aria-checked", now ? "true" : "false");
            }
            next[key] = !!input.checked || input.getAttribute("checked") === "true";
          }
          commitFieldValue(el2._canvasProps || {}, el2._canvasCtx || {}, next, {});
        }
      };
      el2.addEventListener("change", state.onChange);
      el2.addEventListener("click", state.onChange);
      STATE12.set(el2, state);
    }
    el2._canvasProps = props;
    el2._canvasCtx = ctx;
  },
  unmount(el2, ctx) {
    const state = STATE12.get(el2);
    if (state) {
      el2.removeEventListener("change", state.onChange);
      el2.removeEventListener("click", state.onChange);
    }
    STATE12.delete(el2);
    teardownField(el2, ctx);
  }
});

// src/Browser/components/forms/Chips.js
var STATE13 = /* @__PURE__ */ new WeakMap();
var ChipItem = lifecycle3({
  mount(doc) {
    const el2 = doc.createElement("button");
    el2.setAttribute("data-canvas-component", "ChipItem");
    return el2;
  },
  patch() {
  }
});
var Chips = lifecycle3({
  ownsChildren: true,
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "Chips");
    el2.setAttribute("role", "group");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const name = fieldName(props);
    const type = asText3(props.type) === "single" ? "single" : "multiple";
    setClass3(el2, `canvas-chips canvas-chips--${type}`);
    el2.setAttribute("data-type", type);
    const items = mapItems(props.items, (p) => ({
      value: asText3(p.value),
      label: asText3(p.label) || asText3(p.value),
      disabled: p.disabled === true
    })).filter((i) => i.value);
    const existing = resolveFieldValue(props, ctx, void 0);
    const selection = normalizeSelection(type, existing, props.defaultValue);
    const disabled = resolveDisabled(props, ctx);
    clearChildren3(el2);
    for (const item of items) {
      const btn = doc.createElement("button");
      btn.setAttribute("type", "button");
      btn.setAttribute("class", "canvas-chip");
      btn.setAttribute("data-canvas-part", "chip");
      btn.setAttribute("data-value", item.value);
      btn.setAttribute("aria-pressed", selection.includes(item.value) ? "true" : "false");
      if (selection.includes(item.value)) btn.setAttribute("data-selected", "1");
      else btn.removeAttribute("data-selected");
      setOrRemoveAttr3(btn, "disabled", disabled || item.disabled ? true : null);
      btn.textContent = item.label;
      el2.appendChild(btn);
    }
    ensureFieldRegistration(
      el2,
      props,
      ctx,
      "Chips",
      () => {
        const selected = [...el2.childNodes].filter((n) => n.nodeType === 1 && n.getAttribute("data-selected") === "1").map((n) => n.getAttribute("data-value"));
        if (type === "single") return selected[0] || void 0;
        return selected.length ? selected : void 0;
      },
      type === "single" ? selection[0] : selection
    );
    let state = STATE13.get(el2);
    if (!state) {
      state = {
        onClick: (e) => {
          const btn = e?.target;
          if (!btn || btn.getAttribute?.("data-canvas-part") !== "chip") return;
          if (btn.getAttribute("disabled") != null) return;
          const p = el2._canvasProps || {};
          const c = el2._canvasCtx || {};
          const t = asText3(p.type) === "single" ? "single" : "multiple";
          const current = [...el2.childNodes].filter((n) => n.nodeType === 1 && n.getAttribute("data-selected") === "1").map((n) => n.getAttribute("data-value"));
          const next = toggleSelection(t, current, btn.getAttribute("data-value"));
          for (const node of el2.childNodes) {
            if (node.nodeType !== 1) continue;
            const v = node.getAttribute("data-value");
            const on = next.includes(v);
            node.setAttribute("aria-pressed", on ? "true" : "false");
            if (on) node.setAttribute("data-selected", "1");
            else node.removeAttribute("data-selected");
          }
          const stored = t === "single" ? next[0] ?? void 0 : next;
          commitFieldValue(p, c, stored, { validate: true });
        },
        onKeyDown: (e) => {
          if (e?.key !== " " && e?.key !== "Enter") return;
          if (typeof e.preventDefault === "function") e.preventDefault();
          state.onClick(e);
        }
      };
      el2.addEventListener("click", state.onClick);
      el2.addEventListener("keydown", state.onKeyDown);
      STATE13.set(el2, state);
    }
    el2._canvasProps = props;
    el2._canvasCtx = ctx;
    void name;
  },
  unmount(el2, ctx) {
    const state = STATE13.get(el2);
    if (state) {
      el2.removeEventListener("click", state.onClick);
      el2.removeEventListener("keydown", state.onKeyDown);
    }
    STATE13.delete(el2);
    teardownField(el2, ctx);
  }
});

// src/Browser/components/forms/OptionCards.js
var STATE14 = /* @__PURE__ */ new WeakMap();
var OptionCard = lifecycle3({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "OptionCard");
    return el2;
  },
  patch() {
  }
});
var OptionCards = lifecycle3({
  ownsChildren: true,
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "OptionCards");
    el2.setAttribute("role", "group");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const name = fieldName(props);
    const type = asText3(props.type) === "multiple" ? "multiple" : "single";
    setClass3(el2, `canvas-option-cards canvas-option-cards--${type}`);
    el2.setAttribute("data-type", type);
    const items = mapItems(props.items, (p, raw) => ({
      value: asText3(p.value),
      title: asText3(p.title) || asText3(p.label) || asText3(p.value),
      subtitle: asText3(p.subtitle),
      topContent: p.topContent,
      disabled: p.disabled === true,
      raw
    })).filter((i) => i.value);
    const existing = resolveFieldValue(props, ctx, void 0);
    const selection = normalizeSelection(type, existing, props.defaultValue);
    const disabled = resolveDisabled(props, ctx);
    clearChildren3(el2);
    for (const item of items) {
      const card = doc.createElement("button");
      card.setAttribute("type", "button");
      card.setAttribute("class", "canvas-option-card");
      card.setAttribute("data-canvas-part", "card");
      card.setAttribute("data-value", item.value);
      card.setAttribute("aria-pressed", selection.includes(item.value) ? "true" : "false");
      if (selection.includes(item.value)) card.setAttribute("data-selected", "1");
      setOrRemoveAttr3(card, "disabled", disabled || item.disabled ? true : null);
      if (item.topContent != null) {
        const top = doc.createElement("div");
        top.setAttribute("class", "canvas-option-card__top");
        top.setAttribute("data-canvas-part", "top");
        renderContent(top, item.topContent, ctx);
        card.appendChild(top);
      }
      const title = doc.createElement("div");
      title.setAttribute("class", "canvas-option-card__title");
      title.textContent = item.title;
      card.appendChild(title);
      if (item.subtitle) {
        const sub = doc.createElement("div");
        sub.setAttribute("class", "canvas-option-card__subtitle");
        sub.textContent = item.subtitle;
        card.appendChild(sub);
      }
      el2.appendChild(card);
    }
    ensureFieldRegistration(
      el2,
      props,
      ctx,
      "OptionCards",
      () => {
        const selected = [...el2.childNodes].filter((n) => n.nodeType === 1 && n.getAttribute("data-selected") === "1").map((n) => n.getAttribute("data-value"));
        if (type === "single") return selected[0] || void 0;
        return selected.length ? selected : void 0;
      },
      type === "single" ? selection[0] : selection
    );
    let state = STATE14.get(el2);
    if (!state) {
      state = {
        onClick: (e) => {
          let btn = e?.target;
          while (btn && btn !== el2 && btn.getAttribute?.("data-canvas-part") !== "card") {
            btn = btn.parentNode;
          }
          if (!btn || btn === el2 || btn.getAttribute("disabled") != null) return;
          const p = el2._canvasProps || {};
          const c = el2._canvasCtx || {};
          const t = asText3(p.type) === "multiple" ? "multiple" : "single";
          const current = [...el2.childNodes].filter((n) => n.nodeType === 1 && n.getAttribute("data-selected") === "1").map((n) => n.getAttribute("data-value"));
          const next = toggleSelection(t, current, btn.getAttribute("data-value"));
          for (const node of el2.childNodes) {
            if (node.nodeType !== 1) continue;
            const on = next.includes(node.getAttribute("data-value"));
            node.setAttribute("aria-pressed", on ? "true" : "false");
            if (on) node.setAttribute("data-selected", "1");
            else node.removeAttribute("data-selected");
          }
          const stored = t === "single" ? next[0] ?? void 0 : next;
          commitFieldValue(p, c, stored, { validate: true });
        },
        onKeyDown: (e) => {
          if (e?.key !== " " && e?.key !== "Enter") return;
          if (typeof e.preventDefault === "function") e.preventDefault();
          state.onClick(e);
        }
      };
      el2.addEventListener("click", state.onClick);
      el2.addEventListener("keydown", state.onKeyDown);
      STATE14.set(el2, state);
    }
    el2._canvasProps = props;
    el2._canvasCtx = ctx;
    void name;
  },
  unmount(el2, ctx) {
    const state = STATE14.get(el2);
    if (state) {
      el2.removeEventListener("click", state.onClick);
      el2.removeEventListener("keydown", state.onKeyDown);
    }
    STATE14.delete(el2);
    teardownField(el2, ctx);
  }
});

// src/Browser/components/forms/registerForms.js
var FORM_COMPONENTS = {
  Form,
  FormControl,
  Label,
  Description,
  Submit,
  Reset,
  Input,
  TextArea,
  DatePicker,
  Slider,
  Select,
  SelectItem,
  CheckBoxGroup,
  CheckBoxItem,
  CheckboxGroup,
  CheckboxItem,
  RadioGroup,
  RadioItem,
  SwitchGroup,
  SwitchItem,
  Chips,
  ChipItem,
  OptionCards,
  OptionCard
};
function registerForms(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerForms: registry with register() required");
  }
  for (const [type, entry] of Object.entries(FORM_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}

// src/Browser/components/actions/Buttons.js
var Buttons = lifecycle3({
  ownsChildren: true,
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "Buttons");
    el2.setAttribute("role", "group");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const direction = asText3(props.direction) || asText3(props.variant) || "row";
    const orientation = direction === "column" || direction === "vertical" ? "vertical" : "horizontal";
    setClass3(el2, `canvas-buttons canvas-buttons--${orientation}`);
    el2.setAttribute("data-orientation", orientation);
    const children = props.buttons ?? props.children;
    if (children != null) {
      renderContent(el2, children, ctx);
    } else {
      clearChildren3(el2);
    }
  }
});

// src/Browser/components/actions/actionDispatch.js
init_builtins();

// src/Browser/lang/ast.js
function isRuntimeExpr(node) {
  switch (node.k) {
    case "StateRef":
    case "RuntimeRef":
    case "BinOp":
    case "UnaryOp":
    case "Ternary":
    case "Member":
    case "Index":
    case "Assign":
      return true;
    default:
      return false;
  }
}
var AST_KINDS = /* @__PURE__ */ new Set([
  "Comp",
  "Ref",
  "StateRef",
  "RuntimeRef",
  "BinOp",
  "UnaryOp",
  "Ternary",
  "Member",
  "Index",
  "Assign",
  "Str",
  "Num",
  "Bool",
  "Null",
  "Arr",
  "Obj",
  "Ph"
]);
function isASTNode(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return AST_KINDS.has(value.k);
}
function walkAST(node, visit) {
  const walk = (current) => {
    visit(current);
    switch (current.k) {
      case "Comp":
        current.args.forEach(walk);
        Object.values(current.mappedProps ?? {}).forEach(walk);
        break;
      case "Arr":
        current.els.forEach(walk);
        break;
      case "Obj":
        current.entries.forEach(([, value]) => walk(value));
        break;
      case "BinOp":
        walk(current.left);
        walk(current.right);
        break;
      case "UnaryOp":
        walk(current.operand);
        break;
      case "Ternary":
        walk(current.cond);
        walk(current.then);
        walk(current.else);
        break;
      case "Member":
        walk(current.obj);
        break;
      case "Index":
        walk(current.obj);
        walk(current.index);
        break;
      case "Assign":
        walk(current.value);
        break;
    }
  };
  walk(node);
}

// src/Browser/runtime/evaluator.js
init_builtins();

// src/Browser/lang/types.js
function isElementNode(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const node = value;
  return node.type === "element" && typeof node.typeName === "string" && typeof node.props === "object" && node.props !== null && typeof node.partial === "boolean";
}

// src/Browser/lang/reactive.js
var reactiveSchemas = /* @__PURE__ */ new WeakSet();
function isReactiveSchema(schema) {
  return typeof schema === "object" && schema !== null && reactiveSchemas.has(schema);
}

// src/Browser/runtime/evaluate-prop.js
function evaluatePropCore(value, context, schemaCtx, reactiveSchema, callbacks) {
  if (value == null) return value;
  if (typeof value !== "object") return value;
  if (isASTNode(value)) {
    if (value.k === "StateRef" && reactiveSchema && isReactiveSchema(reactiveSchema)) {
      return {
        __reactive: "assign",
        target: value.n,
        expr: { k: "StateRef", n: "$value" }
      };
    }
    const result = evaluate(value, context, schemaCtx);
    if (isElementNode(result)) {
      return callbacks.recurseElement(result);
    }
    if (Array.isArray(result)) {
      return result.map(
        (item) => isElementNode(item) ? callbacks.recurseElement(item) : item
      );
    }
    if (isReactiveAssign(result) && !(reactiveSchema && isReactiveSchema(reactiveSchema))) {
      return context.getState(result.target) ?? null;
    }
    return result;
  }
  if (typeof value === "string" && reactiveSchema && isReactiveSchema(reactiveSchema)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => callbacks.recurse(v, reactiveSchema));
  }
  if (isElementNode(value)) {
    return callbacks.recurseElement(value);
  }
  const obj = value;
  if ("steps" in obj && Array.isArray(obj.steps)) return value;
  if ("type" in obj && "valueAST" in obj) return value;
  let needsEval = false;
  for (const val of Object.values(obj)) {
    if (typeof val === "object" && val !== null) {
      needsEval = true;
      break;
    }
  }
  if (needsEval) {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = callbacks.recurse(v, reactiveSchema);
    }
    return result;
  }
  return value;
}

// src/Browser/runtime/evaluator.js
function isReactiveAssign(value) {
  return typeof value === "object" && value !== null && value.__reactive === "assign";
}
function evaluate(node, context, schemaCtx) {
  switch (node.k) {
    case "Str":
      return node.v;
    case "Num":
      return node.v;
    case "Bool":
      return node.v;
    case "Null":
      return null;
    case "Ph":
      return null;
    case "StateRef":
      return context.extraScope?.[node.n] ?? context.getState(node.n);
    case "Ref":
    case "RuntimeRef":
      return context.resolveRef(node.n);
    case "Arr":
      return node.els.map((el2) => evaluate(el2, context, schemaCtx));
    case "Obj":
      return Object.fromEntries(node.entries.map(([k, v]) => [k, evaluate(v, context, schemaCtx)]));
    case "Comp": {
      if (LAZY_BUILTINS.has(node.name)) {
        return evaluateLazyBuiltin(node.name, node.args, context, schemaCtx);
      }
      const builtin = BUILTINS[node.name];
      if (builtin) {
        const args = node.args.map((a) => evaluate(a, context, schemaCtx));
        return builtin.fn(...args);
      }
      if (ACTION_NAMES.has(node.name)) {
        return evaluateActionCall(node.name, node.args, context);
      }
      if (node.mappedProps) {
        const def = schemaCtx?.library.components[node.name];
        const props = {};
        for (const [key, val] of Object.entries(node.mappedProps)) {
          const propSchema = def?.props?.shape?.[key];
          if (val.k === "StateRef" && propSchema && isReactiveSchema(propSchema)) {
            props[key] = {
              __reactive: "assign",
              target: val.n,
              expr: { k: "StateRef", n: "$value" }
            };
          } else if (val.k === "StateRef") {
            props[key] = schemaCtx ? context.getState(val.n) : val;
          } else {
            props[key] = evaluate(val, context, schemaCtx);
          }
        }
        const result = {
          type: "element",
          typeName: node.name,
          props,
          partial: false,
          hasDynamicProps: true
        };
        if (schemaCtx) {
          for (const [key, val] of Object.entries(props)) {
            if (isElementNode(val)) {
              props[key] = evaluateElementInline(val, context, schemaCtx);
            } else if (Array.isArray(val)) {
              props[key] = val.map(
                (item) => isElementNode(item) ? evaluateElementInline(item, context, schemaCtx) : item
              );
            }
          }
        }
        return result;
      }
      console.warn(`[openui] Unexpected unmapped Comp node: ${node.name}`);
      return null;
    }
    case "BinOp": {
      if (node.op === "&&") {
        const left2 = evaluate(node.left, context, schemaCtx);
        return left2 ? evaluate(node.right, context, schemaCtx) : left2;
      }
      if (node.op === "||") {
        const left2 = evaluate(node.left, context, schemaCtx);
        return left2 ? left2 : evaluate(node.right, context, schemaCtx);
      }
      const left = evaluate(node.left, context, schemaCtx);
      const right = evaluate(node.right, context, schemaCtx);
      switch (node.op) {
        case "+":
          if (typeof left === "string" || typeof right === "string") {
            return String(left ?? "") + String(right ?? "");
          }
          return toNumber(left) + toNumber(right);
        case "-":
          return toNumber(left) - toNumber(right);
        case "*":
          return toNumber(left) * toNumber(right);
        case "/":
          return toNumber(right) === 0 ? 0 : toNumber(left) / toNumber(right);
        case "%":
          return toNumber(right) === 0 ? 0 : toNumber(left) % toNumber(right);
        case "==":
          return left == right;
        case "!=":
          return left != right;
        case ">":
          return toNumber(left) > toNumber(right);
        case "<":
          return toNumber(left) < toNumber(right);
        case ">=":
          return toNumber(left) >= toNumber(right);
        case "<=":
          return toNumber(left) <= toNumber(right);
        default:
          return null;
      }
    }
    case "UnaryOp":
      if (node.op === "!") {
        return !evaluate(node.operand, context, schemaCtx);
      }
      if (node.op === "-") {
        return -toNumber(evaluate(node.operand, context, schemaCtx));
      }
      return null;
    case "Ternary": {
      const cond = evaluate(node.cond, context, schemaCtx);
      return cond ? evaluate(node.then, context, schemaCtx) : evaluate(node.else, context, schemaCtx);
    }
    case "Member": {
      const obj = evaluate(node.obj, context, schemaCtx);
      if (obj == null) return null;
      if (Array.isArray(obj)) {
        if (node.field === "length") return obj.length;
        return obj.map((item) => item?.[node.field] ?? null);
      }
      return obj[node.field];
    }
    case "Index": {
      const obj = evaluate(node.obj, context, schemaCtx);
      const idx = evaluate(node.index, context, schemaCtx);
      if (obj == null || idx == null) return null;
      if (Array.isArray(obj)) {
        return obj[toNumber(idx)];
      }
      return obj[String(idx)];
    }
    case "Assign":
      return {
        __reactive: "assign",
        target: node.target,
        expr: node.value
      };
  }
}
function evaluateElementInline(el2, context, schemaCtx) {
  if (el2.hasDynamicProps === false) return el2;
  const def = schemaCtx.library.components[el2.typeName];
  const evaluated = {};
  for (const [key, value] of Object.entries(el2.props)) {
    const propSchema = def?.props?.shape?.[key];
    evaluated[key] = evaluatePropInline(value, context, schemaCtx, propSchema);
  }
  return { ...el2, props: evaluated };
}
function evaluatePropInline(value, context, schemaCtx, reactiveSchema) {
  return evaluatePropCore(value, context, schemaCtx, reactiveSchema, {
    recurseElement: (el2) => evaluateElementInline(el2, context, schemaCtx),
    recurse: (v, rs) => evaluatePropInline(v, context, schemaCtx, rs)
  });
}
function toLiteralAST(value) {
  if (value === null || value === void 0) return { k: "Null" };
  if (typeof value === "string") return { k: "Str", v: value };
  if (typeof value === "number") return { k: "Num", v: value };
  if (typeof value === "boolean") return { k: "Bool", v: value };
  if (Array.isArray(value)) return { k: "Arr", els: value.map(toLiteralAST) };
  if (typeof value === "object") {
    return {
      k: "Obj",
      entries: Object.entries(value).map(([k, v]) => [k, toLiteralAST(v)])
    };
  }
  return { k: "Null" };
}
function evaluateActionCall(name, args, context) {
  switch (name) {
    case "Action": {
      const stepsArg = args.length > 0 ? evaluate(args[0], context) : [];
      const rawSteps = Array.isArray(stepsArg) ? stepsArg : [];
      const steps = rawSteps.filter((s) => s != null && typeof s === "object" && "type" in s);
      return { steps };
    }
    case "Run": {
      if (args.length === 0) return null;
      const refNode = args[0];
      if (refNode.k === "RuntimeRef") {
        return { type: ACTION_STEPS.Run, statementId: refNode.n, refType: refNode.refType };
      }
      return null;
    }
    case "ToAssistant": {
      const message = args.length > 0 ? String(evaluate(args[0], context) ?? "") : "";
      const ctx = args.length > 1 ? String(evaluate(args[1], context) ?? "") : void 0;
      return { type: ACTION_STEPS.ToAssistant, message, context: ctx };
    }
    case "OpenUrl": {
      const url = args.length > 0 ? String(evaluate(args[0], context) ?? "") : "";
      return { type: ACTION_STEPS.OpenUrl, url };
    }
    case "Set": {
      if (args.length < 2) return null;
      const targetNode = args[0];
      if (targetNode.k !== "StateRef") return null;
      return { type: ACTION_STEPS.Set, target: targetNode.n, valueAST: args[1] };
    }
    case "Reset": {
      const targets = args.filter((a) => a.k === "StateRef").map((a) => a.n);
      if (targets.length === 0) return null;
      return { type: ACTION_STEPS.Reset, targets };
    }
    default:
      return null;
  }
}
function substituteRef(node, varName, value) {
  switch (node.k) {
    case "Ref":
      return node.n === varName ? toLiteralAST(value) : node;
    case "Member": {
      if (isASTNode(node.obj)) {
        const subObj = substituteRef(node.obj, varName, value);
        if (subObj.k === "Obj") {
          const entry = subObj.entries.find(([k]) => k === node.field);
          if (entry) return entry[1];
        }
        return { ...node, obj: subObj };
      }
      return node;
    }
    case "Index":
      return {
        ...node,
        obj: isASTNode(node.obj) ? substituteRef(node.obj, varName, value) : node.obj,
        index: isASTNode(node.index) ? substituteRef(node.index, varName, value) : node.index
      };
    case "BinOp":
      return {
        ...node,
        left: substituteRef(node.left, varName, value),
        right: substituteRef(node.right, varName, value)
      };
    case "UnaryOp":
      return { ...node, operand: substituteRef(node.operand, varName, value) };
    case "Ternary":
      return {
        ...node,
        cond: substituteRef(node.cond, varName, value),
        then: substituteRef(node.then, varName, value),
        else: substituteRef(node.else, varName, value)
      };
    case "Arr":
      return { ...node, els: node.els.map((e) => substituteRef(e, varName, value)) };
    case "Obj":
      return {
        ...node,
        entries: node.entries.map(([k, v]) => [k, substituteRef(v, varName, value)])
      };
    case "Comp": {
      const result = {
        ...node,
        args: (node.args ?? []).map((a) => substituteRef(a, varName, value))
      };
      if (node.mappedProps) {
        const subProps = {};
        for (const [k, v] of Object.entries(node.mappedProps)) {
          subProps[k] = substituteRef(v, varName, value);
        }
        result.mappedProps = subProps;
      }
      return result;
    }
    case "Assign":
      return { ...node, value: substituteRef(node.value, varName, value) };
    default:
      return node;
  }
}
function evaluateLazyBuiltin(name, args, context, schemaCtx) {
  if (name === "Each") {
    if (args.length < 3) return [];
    const arr = evaluate(args[0], context, schemaCtx);
    if (!Array.isArray(arr)) return [];
    const varName = args[1].k === "Ref" ? args[1].n : args[1].k === "Str" ? args[1].v : null;
    if (!varName) return [];
    const template = args[2];
    return arr.map((item) => {
      const substituted = substituteRef(template, varName, item);
      const childCtx = {
        ...context,
        resolveRef: (refName) => {
          if (refName === varName) return item;
          return context.resolveRef(refName);
        }
      };
      const result = evaluate(substituted, childCtx, schemaCtx);
      if (schemaCtx && isElementNode(result)) {
        return evaluateElementInline(result, childCtx, schemaCtx);
      }
      return result;
    });
  }
  return null;
}

// src/Browser/components/actions/actionDispatch.js
init_urlPolicy();
function normalizeActionPlan(plan, ctx = {}) {
  if (!plan || typeof plan !== "object") return plan;
  if (Array.isArray(plan) || Array.isArray(
    /** @type {any} */
    plan.steps
  )) return plan;
  const node = (
    /** @type {Record<string, unknown>} */
    plan
  );
  if (node.k === "Comp" && typeof node.name === "string" && ACTION_NAMES.has(node.name)) {
    const store = ctx.state;
    const evalCtx = {
      getState: (n) => store && typeof store.get === "function" ? store.get(n) : void 0,
      resolveRef: () => void 0
    };
    try {
      return evaluate(
        /** @type {any} */
        plan,
        evalCtx
      );
    } catch {
      return plan;
    }
  }
  return plan;
}
var FIRE = /* @__PURE__ */ new WeakMap();
function beginFire(el2) {
  let s = FIRE.get(el2);
  if (!s) {
    s = { inflight: false };
    FIRE.set(el2, s);
  }
  if (s.inflight) return false;
  s.inflight = true;
  return true;
}
function endFire(el2) {
  const s = FIRE.get(el2);
  if (s) s.inflight = false;
}
function sanitizeActionPlan(plan, ctx = {}) {
  if (!plan) return { plan, rejected: false };
  const steps = Array.isArray(plan) ? plan : plan.steps;
  if (!Array.isArray(steps)) return { plan, rejected: false };
  const policy = ctx.urlPolicy;
  const safe = policy && typeof policy.safeUrl === "function" ? policy.safeUrl : safeUrl;
  const out = [];
  for (const step of steps) {
    if (!step || typeof step !== "object") continue;
    const type = step.type;
    if (type === ACTION_STEPS.OpenUrl || type === "open_url" || type === "OpenUrl") {
      const url = step.url;
      const cleaned = typeof url === "string" ? safe(url) : void 0;
      if (!cleaned) {
        return { plan: null, rejected: true, reason: "unsafe-url" };
      }
      out.push({ ...step, type: ACTION_STEPS.OpenUrl, url: cleaned });
    } else {
      out.push(step);
    }
  }
  if (Array.isArray(plan)) return { plan: out, rejected: false };
  return { plan: { .../** @type {object} */
  plan, steps: out }, rejected: false };
}
function needsFormValidation(plan, variant) {
  if (variant !== "primary") return false;
  if (!plan) return true;
  const steps = Array.isArray(plan) ? plan : plan?.steps;
  if (!Array.isArray(steps) || steps.length === 0) return true;
  return steps.some((s) => {
    if (!s || typeof s !== "object") return false;
    return s.type === ACTION_STEPS.ToAssistant || s.type === "continue_conversation" || s.type === "ToAssistant" || (s.type === ACTION_STEPS.Run || s.type === "run") && s.refType === "mutation";
  });
}
async function dispatchButtonAction(el2, props, ctx, meta = {}) {
  if (!beginFire(el2)) {
    return { ok: false, reason: "double-fire" };
  }
  el2.setAttribute("data-firing", "1");
  try {
    const variant = String(props.variant || "primary");
    const plan = normalizeActionPlan(props.action, ctx);
    const fv = ctx.formValidation;
    if (fv && needsFormValidation(plan, variant)) {
      if (!fv.validateForm()) {
        return { ok: false, reason: "invalid" };
      }
    }
    const { plan: safePlan, rejected, reason } = sanitizeActionPlan(plan, ctx);
    if (rejected) {
      if (typeof ctx.reportError === "function") {
        ctx.reportError(new Error(`Button OpenUrl rejected: ${reason}`));
      }
      return { ok: false, reason: reason || "unsafe-url" };
    }
    const runner = ctx.actions ?? ctx.actionRunner;
    if (safePlan && runner && typeof runner.run === "function") {
      return await runner.run(safePlan, { userGesture: true });
    }
    if (typeof props.onClick === "function") {
      await /** @type {(e?: unknown) => unknown} */
      props.onClick({
        label: meta.label,
        formName: ctx.formName
      });
      return { ok: true };
    }
    return { ok: true, reason: "no-action" };
  } finally {
    el2.removeAttribute("data-firing");
    endFire(el2);
  }
}

// src/Browser/components/actions/Button.js
var VARIANTS10 = /* @__PURE__ */ new Set(["primary", "secondary", "tertiary", "ghost"]);
var SIZES5 = /* @__PURE__ */ new Set(["extra-small", "small", "medium", "large", "sm", "md", "lg", "xs"]);
var STATE15 = /* @__PURE__ */ new WeakMap();
function resolveVariant6(props) {
  const v = asText3(props.variant) || "primary";
  if (v === "ghost") return "tertiary";
  return VARIANTS10.has(v) ? v : "primary";
}
function resolveSize3(props) {
  const s = asText3(props.size) || "medium";
  if (s === "xs") return "extra-small";
  if (s === "sm") return "small";
  if (s === "md") return "medium";
  if (s === "lg") return "large";
  return SIZES5.has(s) ? s : "medium";
}
var Button = lifecycle3({
  // Label is textContent — reconciler must not wipe the text node.
  ownsChildren: true,
  mount(doc) {
    const el2 = doc.createElement("button");
    el2.setAttribute("data-canvas-component", "Button");
    el2.setAttribute("type", "button");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const variant = resolveVariant6(props);
    const size = resolveSize3(props);
    const destructive = props.type === "destructive" || props.buttonType === "destructive" || props.destructive === true;
    const label = asText3(props.label ?? props.text ?? props.children);
    setClass3(
      el2,
      [
        "canvas-button",
        `canvas-button--${variant}`,
        `canvas-button--${size}`,
        destructive ? "canvas-button--destructive" : ""
      ].filter(Boolean).join(" ")
    );
    el2.setAttribute("data-variant", variant);
    el2.setAttribute("data-size", size);
    setOrRemoveAttr3(el2, "data-destructive", destructive ? "1" : null);
    const loading = props.loading === true;
    const disabled = resolveDisabled(props, ctx) || resolveIsStreaming2(props, ctx) || loading;
    setOrRemoveAttr3(el2, "disabled", disabled ? true : null);
    setOrRemoveAttr3(el2, "aria-disabled", disabled ? "true" : null);
    setOrRemoveAttr3(el2, "aria-busy", loading ? "true" : null);
    const href = asText3(props.href);
    if (href) {
      const policy = ctx.urlPolicy;
      const safe = policy && typeof policy.safeUrl === "function" ? policy.safeUrl(href) : href.startsWith("javascript:") ? void 0 : href;
      if (safe) {
        el2.setAttribute("data-href", safe);
        el2.setAttribute("role", "link");
      } else {
        el2.removeAttribute("data-href");
        el2.removeAttribute("role");
      }
    } else {
      el2.removeAttribute("data-href");
      if (el2.getAttribute("role") === "link") el2.removeAttribute("role");
    }
    el2.textContent = label;
    if (!label && props.ariaLabel) {
      el2.setAttribute("aria-label", asText3(props.ariaLabel));
    }
    let state = STATE15.get(el2);
    if (!state) {
      state = {
        onClick: (e) => {
          if (e && typeof e.preventDefault === "function") e.preventDefault();
          if (el2.getAttribute("disabled") != null) return;
          const p = el2._canvasProps || {};
          const c = el2._canvasCtx || {};
          const link = el2.getAttribute("data-href");
          if (link && !p.action) {
            if (c.urlPolicy && typeof c.urlPolicy.safeOpenUrl === "function") {
              c.urlPolicy.safeOpenUrl(link);
            } else if (typeof c.openUrl === "function") {
              c.openUrl(link);
            }
            return;
          }
          void dispatchButtonAction(el2, p, c, { label: asText3(p.label) });
        },
        onKeyDown: (e) => {
          if (e?.key !== "Enter" && e?.key !== " ") return;
          if (typeof e.preventDefault === "function") e.preventDefault();
          state.onClick(e);
        }
      };
      el2.addEventListener("click", state.onClick);
      el2.addEventListener("keydown", state.onKeyDown);
      STATE15.set(el2, state);
    }
    el2._canvasProps = props;
    el2._canvasCtx = ctx;
  },
  unmount(el2) {
    const state = STATE15.get(el2);
    if (state) {
      el2.removeEventListener("click", state.onClick);
      el2.removeEventListener("keydown", state.onKeyDown);
    }
    STATE15.delete(el2);
  }
});

// src/Browser/components/actions/IconButton.js
var STATE16 = /* @__PURE__ */ new WeakMap();
var IconButton = lifecycle3({
  ownsChildren: true,
  mount(doc) {
    const el2 = doc.createElement("button");
    el2.setAttribute("data-canvas-component", "IconButton");
    el2.setAttribute("type", "button");
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const variant = asText3(props.variant) || "secondary";
    const size = asText3(props.size) || "medium";
    const shape = asText3(props.shape) || "square";
    const name = asText3(props.name) || asText3(props.ariaLabel) || "Action";
    setClass3(
      el2,
      `canvas-icon-button canvas-icon-button--${variant} canvas-icon-button--${size} canvas-icon-button--${shape}`
    );
    el2.setAttribute("aria-label", name);
    el2.setAttribute("data-variant", variant);
    el2.setAttribute("data-size", size);
    el2.setAttribute("data-shape", shape);
    const disabled = resolveDisabled(props, ctx) || resolveIsStreaming2(props, ctx);
    setOrRemoveAttr3(el2, "disabled", disabled ? true : null);
    setOrRemoveAttr3(el2, "aria-disabled", disabled ? "true" : null);
    clearChildren3(el2);
    const doc = ctx.document ?? el2.ownerDocument;
    const iconHost = doc.createElement("span");
    iconHost.setAttribute("class", "canvas-icon-button__icon");
    iconHost.setAttribute("aria-hidden", "true");
    if (props.icon != null) {
      if (typeof props.icon === "string") {
        iconHost.setAttribute("data-icon", props.icon);
        iconHost.textContent = props.icon;
      } else {
        renderContent(iconHost, props.icon, ctx);
      }
    } else {
      iconHost.textContent = "\u2022";
    }
    el2.appendChild(iconHost);
    let state = STATE16.get(el2);
    if (!state) {
      state = {
        onClick: (e) => {
          if (e && typeof e.preventDefault === "function") e.preventDefault();
          if (el2.getAttribute("disabled") != null) return;
          void dispatchButtonAction(el2, el2._canvasProps || {}, el2._canvasCtx || {}, {
            label: name
          });
        },
        onKeyDown: (e) => {
          if (e?.key !== "Enter" && e?.key !== " ") return;
          if (typeof e.preventDefault === "function") e.preventDefault();
          state.onClick(e);
        }
      };
      el2.addEventListener("click", state.onClick);
      el2.addEventListener("keydown", state.onKeyDown);
      STATE16.set(el2, state);
    }
    el2._canvasProps = props;
    el2._canvasCtx = ctx;
  },
  unmount(el2) {
    const state = STATE16.get(el2);
    if (state) {
      el2.removeEventListener("click", state.onClick);
      el2.removeEventListener("keydown", state.onKeyDown);
    }
    STATE16.delete(el2);
  }
});

// src/Browser/components/actions/registerActions.js
var ACTION_COMPONENTS = {
  Buttons,
  Button,
  IconButton
};
function registerActions(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerActions: registry with register() required");
  }
  for (const [type, entry] of Object.entries(ACTION_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}

// src/Browser/components/cards/shared.js
init_urlPolicy();
function requireDocument4(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("cards component: ctx.document required");
  }
  return doc;
}
function setClass4(el2, className) {
  el2.setAttribute("class", String(className).trim());
}
function setOrRemoveAttr4(el2, name, value) {
  if (value == null || value === false || value === "") {
    el2.removeAttribute(name);
  } else {
    el2.setAttribute(name, value === true ? "true" : String(value));
  }
}
function clearChildren4(el2) {
  while (el2.firstChild) {
    el2.removeChild(el2.firstChild);
  }
}
function asText4(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
function resolveIsStreaming3(props = {}, ctx = {}) {
  if (props.isStreaming === true || props.streaming === true || props.partial === true) {
    return true;
  }
  if (props.isStreaming === false || props.streaming === false) return false;
  const stream = ctx.stream;
  if (stream && typeof stream === "object" && stream.isStreaming === true) {
    return true;
  }
  return false;
}
function unwrapItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const obj = (
    /** @type {Record<string, unknown>} */
    raw
  );
  if (obj.props && typeof obj.props === "object") {
    return (
      /** @type {Record<string, unknown>} */
      obj.props
    );
  }
  return obj;
}
function nodeTypeName(node) {
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return "#text";
  if (typeof node !== "object") return "?";
  const o = (
    /** @type {Record<string, unknown>} */
    node
  );
  if (typeof o.type === "string" && o.type !== "element") return o.type;
  if (typeof o.typeName === "string") return o.typeName;
  if (o.type === "element" && typeof o.typeName === "string") return o.typeName;
  return "?";
}
function itemStructureSignature(item, slotKeys) {
  return slotKeys.map((key) => {
    const val = item[key];
    if (val == null || val === false || val === "") return `${key}:\u2205`;
    if (Array.isArray(val)) {
      const types = val.map((n) => nodeTypeName(n) || "scalar").join(",");
      return `${key}:[${types}]`;
    }
    if (typeof val === "object") {
      return `${key}:${nodeTypeName(val) || "obj"}`;
    }
    return `${key}:scalar`;
  }).join("|");
}
function enforceHomogeneousItems(items, opts) {
  const unwrap2 = opts.unwrap ?? unwrapItem;
  const slotKeys = opts.slotKeys;
  const minItems = opts.minItems ?? 2;
  const normalized = [];
  for (const raw of Array.isArray(items) ? items : []) {
    const item = unwrap2(raw);
    if (item) normalized.push(item);
  }
  if (normalized.length === 0) {
    return {
      ok: false,
      items: [],
      signature: "",
      dropped: 0,
      reason: "empty"
    };
  }
  let signature = "";
  for (const item of normalized) {
    const sig = itemStructureSignature(item, slotKeys);
    if (sig && !sig.split("|").every((p) => p.endsWith(":\u2205"))) {
      signature = sig;
      break;
    }
  }
  if (!signature) {
    signature = itemStructureSignature(normalized[0], slotKeys);
  }
  const kept = [];
  let dropped = 0;
  for (const item of normalized) {
    if (itemStructureSignature(item, slotKeys) === signature) kept.push(item);
    else dropped += 1;
  }
  if (kept.length < minItems) {
    return {
      ok: false,
      items: [],
      signature,
      dropped: dropped + kept.length,
      reason: "below-min"
    };
  }
  return {
    ok: dropped === 0,
    items: kept,
    signature,
    dropped,
    reason: dropped > 0 ? "heterogeneous" : null
  };
}
function getRowConfiguration(n, maxPerRow) {
  if (n <= 0) return [];
  if (n === 1) return [1];
  if (maxPerRow === 2) {
    const fullRows = Math.floor(n / 2);
    const remainder = n % 2;
    const result2 = Array(fullRows).fill(2);
    if (remainder) result2.push(1);
    return result2;
  }
  if (n % 3 === 0) return Array(n / 3).fill(3);
  if (n % 3 === 2) {
    const threes2 = Math.floor(n / 3);
    const result2 = Array(threes2).fill(3);
    result2.splice(Math.ceil(result2.length / 2), 0, 2);
    return result2;
  }
  const threes = Math.floor((n - 4) / 3);
  const result = Array(Math.max(0, threes)).fill(3);
  return [...result, 2, 2];
}
function cardKeyDownHandler(onActivate) {
  return (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault?.();
    onActivate();
  };
}
function applyClickableCard(el2, opts) {
  const prevKey = (
    /** @type {any} */
    el2.__canvasCardKey
  );
  const prevClick = (
    /** @type {any} */
    el2.__canvasCardClick
  );
  if (prevKey) el2.removeEventListener("keydown", prevKey);
  if (prevClick) el2.removeEventListener("click", prevClick);
  el2.__canvasCardKey = null;
  el2.__canvasCardClick = null;
  const enabled = opts.clickable && typeof opts.onActivate === "function" && !opts.disabled;
  if (!enabled) {
    el2.removeAttribute("role");
    el2.removeAttribute("tabindex");
    setOrRemoveAttr4(el2, "aria-disabled", null);
    el2.classList?.remove?.("canvas-card-item--clickable");
    el2.classList?.add?.("canvas-card-item--static");
    return () => {
    };
  }
  el2.setAttribute("role", "button");
  el2.setAttribute("tabindex", "0");
  setOrRemoveAttr4(el2, "aria-disabled", null);
  el2.classList?.add?.("canvas-card-item--clickable");
  el2.classList?.remove?.("canvas-card-item--static");
  const onClick = () => opts.onActivate?.();
  const onKey = cardKeyDownHandler(onClick);
  el2.addEventListener("click", onClick);
  el2.addEventListener("keydown", onKey);
  el2.__canvasCardClick = onClick;
  el2.__canvasCardKey = onKey;
  return () => {
    el2.removeEventListener("click", onClick);
    el2.removeEventListener("keydown", onKey);
  };
}
function resolveBackgroundCssUrl(src, ctx = {}) {
  const raw = asText4(src);
  if (!raw) return void 0;
  const policy = ctx.urlPolicy && typeof ctx.urlPolicy.toCssUrl === "function" ? ctx.urlPolicy.toCssUrl : toCssUrl;
  return policy(raw);
}
function resolveSafeUrl(url, ctx = {}) {
  const raw = asText4(url);
  if (!raw) return void 0;
  const policy = ctx.urlPolicy && typeof ctx.urlPolicy.safeUrl === "function" ? ctx.urlPolicy.safeUrl : safeUrl;
  return policy(raw);
}
function lifecycle4(impl) {
  return {
    create(props = {}, ctx = {}) {
      const doc = requireDocument4(ctx);
      const el2 = impl.mount(doc, props, ctx);
      impl.patch(el2, props, ctx);
      return el2;
    },
    update(el2, props = {}, ctx = {}) {
      impl.patch(el2, props, ctx);
    },
    destroy(el2, ctx = {}) {
      impl.unmount?.(el2, ctx);
    },
    ownsChildren: impl.ownsChildren !== false
  };
}
function renderSlot(host, node, ctx, doc) {
  clearChildren4(host);
  if (node == null || node === false) return;
  if (typeof node === "string" || typeof node === "number") {
    host.textContent = String(node);
    return;
  }
  if (typeof ctx.renderChildren === "function") {
    ctx.renderChildren(host, [node]);
    return;
  }
  const type = nodeTypeName(node);
  const props = node && typeof node === "object" && /** @type {any} */
  node.props ? (
    /** @type {Record<string, unknown>} */
    /** @type {any} */
    node.props
  ) : (
    /** @type {Record<string, unknown>} */
    node
  );
  const span = doc.createElement("span");
  span.setAttribute("data-slot-type", type || "unknown");
  span.textContent = asText4(props.title) || asText4(props.value) || asText4(props.body) || asText4(props.label) || "";
  host.appendChild(span);
}

// src/Browser/components/cards/Text.js
function bodyText2(props = {}) {
  return asText4(props.text ?? props.content ?? props.children ?? props.title ?? props.value);
}
var Text = lifecycle4({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "Text");
    return el2;
  },
  patch(el2, props = {}) {
    setClass4(el2, "canvas-text canvas-text--plain");
    el2.setAttribute("data-weight", "normal");
    clearChildren4(el2);
    const primary = docCreateBody(el2, props, false);
    if (primary) el2.appendChild(primary);
  }
});
var BoldText = lifecycle4({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "BoldText");
    return el2;
  },
  patch(el2, props = {}) {
    setClass4(el2, "canvas-text canvas-text--bold");
    el2.setAttribute("data-weight", "bold");
    clearChildren4(el2);
    const primary = docCreateBody(el2, props, true);
    if (primary) el2.appendChild(primary);
  }
});
function docCreateBody(el2, props, bold) {
  const doc = el2.ownerDocument;
  const text2 = bodyText2(props);
  if (!text2) {
    el2.setAttribute("data-status", "empty");
    return null;
  }
  el2.setAttribute("data-status", "ready");
  const span = doc.createElement("span");
  span.setAttribute("class", bold ? "canvas-text__primary canvas-text__primary--bold" : "canvas-text__primary");
  span.textContent = text2;
  return span;
}

// src/Browser/components/cards/IconText.js
var LAYOUTS = /* @__PURE__ */ new Set(["horizontal", "vertical"]);
var VARIANTS11 = /* @__PURE__ */ new Set([
  "neutral",
  "info",
  "success",
  "warning",
  "danger",
  "inverted",
  "filled",
  "soft"
]);
function resolveIconLabel(icon) {
  if (icon == null) return "";
  if (typeof icon === "string" || typeof icon === "number") return String(icon);
  if (typeof icon === "object") {
    const o = (
      /** @type {Record<string, unknown>} */
      icon
    );
    const props = o.props && typeof o.props === "object" ? (
      /** @type {Record<string, unknown>} */
      o.props
    ) : o;
    return asText4(props.name ?? props.icon ?? props.label ?? props.title);
  }
  return "";
}
var IconText = lifecycle4({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "IconText");
    return el2;
  },
  patch(el2, props = {}) {
    const doc = el2.ownerDocument;
    const layout = LAYOUTS.has(asText4(props.layout)) ? asText4(props.layout) : "horizontal";
    let variant = asText4(props.iconVariant) || "neutral";
    if (variant === "filled" || variant === "soft") variant = "neutral";
    if (!VARIANTS11.has(variant)) variant = "neutral";
    const bold = props.bold === true;
    const title = asText4(props.title);
    const subtitle = asText4(props.subtitle);
    const iconLabel = resolveIconLabel(props.icon);
    setClass4(
      el2,
      `canvas-icon-text canvas-icon-text--${layout}${bold ? " canvas-icon-text--bold" : ""}`
    );
    el2.setAttribute("data-layout", layout);
    el2.setAttribute("data-icon-variant", variant);
    clearChildren4(el2);
    const badge = doc.createElement("span");
    badge.setAttribute(
      "class",
      `canvas-icon-text__badge canvas-icon-text__badge--${variant}`
    );
    badge.setAttribute("aria-hidden", "true");
    badge.setAttribute("data-icon", iconLabel || "\u2022");
    badge.textContent = iconLabel ? iconLabel.slice(0, 2).toUpperCase() : "\u2022";
    el2.appendChild(badge);
    const content = doc.createElement("div");
    content.setAttribute("class", "canvas-icon-text__content");
    const titleEl = doc.createElement("div");
    titleEl.setAttribute("class", "canvas-icon-text__title");
    titleEl.textContent = title;
    content.appendChild(titleEl);
    if (subtitle) {
      const sub = doc.createElement("div");
      sub.setAttribute("class", "canvas-icon-text__subtitle");
      sub.textContent = subtitle;
      content.appendChild(sub);
    }
    el2.appendChild(content);
    el2.setAttribute("data-status", title ? "ready" : "empty");
  }
});

// src/Browser/components/cards/ImageText.js
init_inlineStyle();
var LAYOUTS2 = /* @__PURE__ */ new Set(["horizontal", "vertical"]);
function createImageText(name, opts = {}) {
  return lifecycle4({
    mount(doc) {
      const el2 = doc.createElement("div");
      el2.setAttribute("data-canvas-component", name);
      return el2;
    },
    patch(el2, props = {}, ctx = {}) {
      const doc = ctx.document ?? el2.ownerDocument;
      const layout = opts.large ? "vertical" : LAYOUTS2.has(asText4(props.layout)) ? asText4(props.layout) : opts.defaultLayout || "horizontal";
      const bold = props.bold === true;
      const title = asText4(props.title);
      const subtitle = asText4(props.subtitle);
      const alt = asText4(props.alt) || title || "Image";
      const safe = resolveSafeUrl(props.src, ctx);
      let cls = `canvas-image-text canvas-image-text--${layout}`;
      if (opts.large) cls += " canvas-image-text--large";
      if (bold) cls += " canvas-image-text--bold";
      setClass4(el2, cls);
      el2.setAttribute("data-layout", layout);
      clearChildren4(el2);
      const imgWrap = doc.createElement("div");
      imgWrap.setAttribute("class", "canvas-image-text__image-container");
      if (!opts.large && props.imageSize != null) {
        const size = typeof props.imageSize === "number" ? `${props.imageSize}px` : asText4(props.imageSize);
        if (size) {
          setInlineStyle(imgWrap, { width: size, height: size });
        }
      }
      if (safe) {
        const img = doc.createElement("img");
        img.setAttribute("class", "canvas-image-text__image");
        img.setAttribute("src", safe);
        img.setAttribute("alt", alt);
        imgWrap.appendChild(img);
        el2.setAttribute("data-status", "ready");
      } else {
        const fb = doc.createElement("div");
        fb.setAttribute("class", "canvas-image-text__fallback");
        fb.setAttribute("role", "img");
        fb.setAttribute("aria-label", props.src ? "Unsafe image URL blocked" : "Image unavailable");
        fb.textContent = props.src ? "Blocked" : "\u2014";
        imgWrap.appendChild(fb);
        el2.setAttribute("data-status", props.src ? "error" : "empty");
      }
      el2.appendChild(imgWrap);
      const content = doc.createElement("div");
      content.setAttribute("class", "canvas-image-text__content");
      const titleEl = doc.createElement("div");
      titleEl.setAttribute("class", "canvas-image-text__title");
      titleEl.textContent = title;
      content.appendChild(titleEl);
      if (subtitle) {
        const sub = doc.createElement("div");
        sub.setAttribute("class", "canvas-image-text__subtitle");
        sub.textContent = subtitle;
        content.appendChild(sub);
      }
      el2.appendChild(content);
    }
  });
}
var ImageText = createImageText("ImageText", { defaultLayout: "horizontal" });
var ImageTextLarge = createImageText("ImageTextLarge", { large: true });

// src/Browser/components/cards/CardBlockLayout.js
init_inlineStyle();
function normalizeLayoutProps(props = {}, maxPerRow = 3) {
  const layout = asText4(props.layout) === "carousel" ? "carousel" : "grid";
  const responsive = props.responsive !== false;
  let gap = null;
  if (props.gap != null && props.gap !== "") {
    gap = typeof props.gap === "number" ? `${props.gap}px` : asText4(props.gap);
  }
  return { layout, responsive, gap, maxPerRow };
}
function buildCardBlockChrome(doc, el2, opts) {
  const base = `canvas-${opts.size}-card-block`;
  let cls = `${base} ${base}--${opts.cardType} ${base}--${opts.layout}`;
  setClass4(el2, cls);
  el2.setAttribute("data-card-type", opts.cardType);
  el2.setAttribute("data-layout", opts.layout);
  el2.setAttribute("data-count", String(opts.count));
  el2.setAttribute("data-size", opts.size);
  if (opts.gap) {
    const varName = opts.size === "small" ? "--canvas-small-card-gap" : "--canvas-medium-card-gap";
    setInlineStyle(el2, { [varName]: opts.gap });
  } else {
    clearInlineStyle(el2);
  }
  clearChildren4(el2);
  const itemHosts = [];
  if (opts.layout === "carousel") {
    const carousel = doc.createElement("div");
    let cCls = `${base}__carousel`;
    if (opts.responsive) cCls += ` ${base}__carousel--responsive`;
    setClass4(carousel, cCls);
    carousel.setAttribute("data-role", "carousel");
    carousel.setAttribute("tabindex", "0");
    carousel.setAttribute("role", "region");
    carousel.setAttribute("aria-label", `${opts.cardType} carousel`);
    const track = doc.createElement("div");
    setClass4(track, `${base}__carousel-track`);
    for (let i = 0; i < opts.count; i++) {
      const cell = doc.createElement("div");
      setClass4(cell, `${base}__carousel-item`);
      cell.setAttribute("data-item-index", String(i));
      track.appendChild(cell);
      itemHosts.push(cell);
    }
    carousel.appendChild(track);
    el2.appendChild(carousel);
    return { itemHosts, track };
  }
  const grid = doc.createElement("div");
  let gCls = `${base}__grid`;
  if (opts.responsive) gCls += ` ${base}__grid--responsive`;
  if (opts.responsive && opts.count % 2 === 1) gCls += ` ${base}__grid--odd-count`;
  setClass4(grid, gCls);
  const rows = getRowConfiguration(opts.count, opts.maxPerRow);
  let start = 0;
  for (let r = 0; r < rows.length; r++) {
    const itemsInRow = rows[r];
    const row = doc.createElement("div");
    setClass4(row, `${base}__row ${base}__row--${itemsInRow}`);
    for (let c = 0; c < itemsInRow; c++) {
      const cell = doc.createElement("div");
      setClass4(cell, `${base}__item`);
      cell.setAttribute("data-item-index", String(start + c));
      row.appendChild(cell);
      itemHosts.push(cell);
    }
    start += itemsInRow;
    grid.appendChild(row);
  }
  el2.appendChild(grid);
  return { itemHosts, track: null };
}
function renderInvalidBlock(el2, doc, message, reason) {
  clearChildren4(el2);
  setClass4(el2, "canvas-card-block canvas-card-block--invalid");
  el2.setAttribute("data-status", "invalid");
  el2.setAttribute("data-invalid-reason", reason);
  el2.setAttribute("role", "status");
  const msg = doc.createElement("span");
  msg.setAttribute("class", "canvas-status-text");
  msg.textContent = message;
  el2.appendChild(msg);
}
function resolveClickable(props = {}, ctx = {}) {
  const handler = typeof props.onItemClick === "function" ? props.onItemClick : typeof ctx.onCardItemClick === "function" ? ctx.onCardItemClick : null;
  const wantsClick = props.clickable === true || props.action != null && props.action !== false && props.clickable !== false;
  return {
    clickable: Boolean(wantsClick && handler),
    onItemClick: handler
  };
}
function createCardBlock(config) {
  return lifecycle4({
    ownsChildren: true,
    mount(doc) {
      const el2 = doc.createElement("div");
      el2.setAttribute("data-canvas-component", config.componentName);
      return el2;
    },
    patch(el2, props = {}, ctx = {}) {
      const doc = ctx.document ?? el2.ownerDocument;
      const prev = (
        /** @type {any} */
        el2.__canvasCardDisposers
      );
      if (Array.isArray(prev)) {
        for (const d of prev) {
          try {
            d?.();
          } catch {
          }
        }
      }
      el2.__canvasCardDisposers = [];
      const layoutOpts = normalizeLayoutProps(props, config.maxPerRow);
      const rawItems = config.normalizeItems(props);
      const homo = enforceHomogeneousItems(rawItems, {
        slotKeys: config.slotKeys,
        minItems: config.minItems ?? 2
      });
      if (!homo.items.length) {
        renderInvalidBlock(
          el2,
          doc,
          "Not enough matching cards to display",
          homo.reason || "empty"
        );
        return;
      }
      el2.setAttribute("data-status", "ready");
      el2.removeAttribute("data-invalid-reason");
      if (homo.dropped > 0) {
        el2.setAttribute("data-dropped-items", String(homo.dropped));
        el2.setAttribute("data-homogeneous", "partial");
      } else {
        el2.removeAttribute("data-dropped-items");
        el2.setAttribute("data-homogeneous", "ok");
      }
      el2.setAttribute("data-structure", homo.signature);
      const { itemHosts } = buildCardBlockChrome(doc, el2, {
        size: config.size,
        cardType: config.cardType,
        layout: layoutOpts.layout,
        responsive: layoutOpts.responsive,
        gap: layoutOpts.gap,
        count: homo.items.length,
        maxPerRow: layoutOpts.maxPerRow
      });
      const streaming = resolveIsStreaming3(props, ctx);
      const { clickable, onItemClick } = resolveClickable(props, ctx);
      const disposers = [];
      for (let i = 0; i < itemHosts.length; i++) {
        const host = itemHosts[i];
        clearChildren4(host);
        const item = homo.items[i];
        const onActivate = clickable && onItemClick ? () => {
          onItemClick(item, i);
        } : null;
        const dispose = config.renderItem(host, item, i, ctx, {
          clickable: Boolean(onActivate),
          onActivate,
          streaming
        });
        if (typeof dispose === "function") disposers.push(dispose);
      }
      el2.__canvasCardDisposers = disposers;
    },
    unmount(el2) {
      const prev = (
        /** @type {any} */
        el2.__canvasCardDisposers
      );
      if (Array.isArray(prev)) {
        for (const d of prev) {
          try {
            d?.();
          } catch {
          }
        }
      }
      el2.__canvasCardDisposers = null;
    }
  });
}

// src/Browser/components/cards/SnippetCardBlock.js
function normalizeSnippetItems(props = {}) {
  if (Array.isArray(props.items)) return props.items;
  if (Array.isArray(props.children)) return props.children;
  return [];
}
function appendChevron(doc, host) {
  const chevron = doc.createElement("div");
  chevron.setAttribute("class", "canvas-value-card__chevron");
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "\u203A";
  host.appendChild(chevron);
}
var SnippetCardBlock = createCardBlock({
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
    setClass4(card, cls);
    cell.appendChild(card);
    const dispose = applyClickableCard(card, {
      clickable: meta.clickable,
      onActivate: meta.onActivate ?? void 0
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
    if (asText4(item.id)) card.setAttribute("data-item-id", asText4(item.id));
    return dispose;
  }
});
var SnippetCardItem = {
  create(props = {}, ctx = {}) {
    const doc = ctx.document ?? globalThis.document;
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "SnippetCardItem");
    this.update(el2, props, ctx);
    return el2;
  },
  update(el2, props = {}, ctx = {}) {
    const item = unwrapItem(props) || props;
    clearChildren4(el2);
    setClass4(el2, "canvas-snippet-card-item");
    const doc = ctx.document ?? el2.ownerDocument;
    if (item.lhs != null) {
      const lhs = doc.createElement("div");
      lhs.setAttribute("data-slot", "lhs");
      renderSlot(lhs, item.lhs, ctx, doc);
      el2.appendChild(lhs);
    }
    if (item.rhs != null) {
      const rhs = doc.createElement("div");
      rhs.setAttribute("data-slot", "rhs");
      renderSlot(rhs, item.rhs, ctx, doc);
      el2.appendChild(rhs);
    }
  },
  destroy() {
  },
  ownsChildren: true
};

// src/Browser/components/cards/OverviewCardBlock.js
function normalizeOverviewItems(props = {}) {
  if (Array.isArray(props.items)) return props.items;
  if (Array.isArray(props.children)) return props.children;
  return [];
}
function unwrapMetric(bottom) {
  if (bottom == null) return null;
  if (typeof bottom !== "object") return { value: String(bottom) };
  const o = (
    /** @type {Record<string, unknown>} */
    bottom
  );
  if (o.props && typeof o.props === "object") {
    return (
      /** @type {Record<string, unknown>} */
      o.props
    );
  }
  return o;
}
var OverviewCardBlock = createCardBlock({
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
    setClass4(card, "canvas-overview-card canvas-card-item");
    cell.appendChild(card);
    const dispose = applyClickableCard(card, {
      clickable: meta.clickable,
      onActivate: meta.onActivate ?? void 0
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
      chevron.textContent = "\u203A";
      topRow.appendChild(chevron);
    }
    vertical.appendChild(topRow);
    const metricProps = unwrapMetric(item.bottom);
    if (metricProps) {
      const bottom = doc.createElement("div");
      bottom.setAttribute(
        "class",
        "canvas-overview-card__slot canvas-overview-card__slot--bottom"
      );
      const metricEl = MetricIndicatorInline.create(
        { ...metricProps, variant: "inline" },
        ctx
      );
      bottom.appendChild(metricEl);
      vertical.appendChild(bottom);
    }
    card.appendChild(vertical);
    if (asText4(item.id)) card.setAttribute("data-item-id", asText4(item.id));
    return dispose;
  }
});
var OverviewCardItem = {
  create(props = {}, ctx = {}) {
    const doc = ctx.document ?? globalThis.document;
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "OverviewCardItem");
    this.update(el2, props, ctx);
    return el2;
  },
  update(el2, props = {}, ctx = {}) {
    const item = unwrapItem(props) || props;
    clearChildren4(el2);
    setClass4(el2, "canvas-overview-card-item");
    const doc = ctx.document ?? el2.ownerDocument;
    if (item.top != null) {
      const top = doc.createElement("div");
      top.setAttribute("data-slot", "top");
      renderSlot(top, item.top, ctx, doc);
      el2.appendChild(top);
    }
  },
  destroy() {
  },
  ownsChildren: true
};

// src/Browser/components/cards/ContextCardBlock.js
init_inlineStyle();
var BG_COLORS = /* @__PURE__ */ new Set(["gray", "info", "success", "warning", "danger"]);
function normalizeContextItems(props = {}) {
  if (Array.isArray(props.items)) return props.items;
  if (Array.isArray(props.children)) return props.children;
  return [];
}
function renderContextCard(card, item, ctx, meta) {
  const doc = ctx.document ?? card.ownerDocument;
  const bgCss = resolveBackgroundCssUrl(item.bgImageSrc, ctx);
  const bgColor = BG_COLORS.has(asText4(item.bgColor)) ? asText4(item.bgColor) : "";
  const variant = bgCss ? "image" : bgColor || "plain";
  let cls = "canvas-context-card canvas-card-item";
  cls += ` canvas-context-card--variant-${variant}`;
  setClass4(card, cls);
  if (bgCss) {
    setInlineStyle(card, { "background-image": bgCss });
    const alt = asText4(item.bgImageAlt);
    if (alt) card.setAttribute("aria-label", alt);
  } else {
    card.removeAttribute("style");
    card.removeAttribute("aria-label");
  }
  const dispose = applyClickableCard(card, {
    clickable: meta.clickable,
    onActivate: meta.onActivate ?? void 0
  });
  clearChildren4(card);
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
    } else if (nodeTypeName(title) === "Tag" || title && typeof title === "object" && /** @type {any} */
    (title.text != null || /** @type {any} */
    title.props)) {
      const wrap = doc.createElement("div");
      wrap.setAttribute("class", "canvas-context-card__tag-wrapper");
      const tagHost = doc.createElement("div");
      tagHost.setAttribute("class", "canvas-context-card__tag");
      const tagProps = unwrapItem(title) || /** @type {Record<string, unknown>} */
      title;
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
    chevron.textContent = "\u203A";
    top.appendChild(chevron);
  }
  vertical.appendChild(top);
  const body = asText4(item.body);
  if (body) {
    const bottom = doc.createElement("div");
    bottom.setAttribute(
      "class",
      "canvas-context-card__slot canvas-context-card__slot--bottom"
    );
    const bodyEl = doc.createElement("div");
    bodyEl.setAttribute("class", "canvas-context-card__body-text");
    const md = markdownToSafeDom(body, doc);
    while (md.firstChild) bodyEl.appendChild(md.firstChild);
    bottom.appendChild(bodyEl);
    vertical.appendChild(bottom);
  }
  card.appendChild(vertical);
  if (asText4(item.id)) card.setAttribute("data-item-id", asText4(item.id));
  return dispose;
}
var ContextCardBlock = createCardBlock({
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
  }
});
var ContextCardItem = {
  create(props = {}, ctx = {}) {
    const doc = ctx.document ?? globalThis.document;
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "ContextCardItem");
    this.update(el2, props, ctx);
    return el2;
  },
  update(el2, props = {}, ctx = {}) {
    const item = unwrapItem(props) || props;
    renderContextCard(el2, item, ctx, { clickable: false, onActivate: null });
  },
  destroy() {
  },
  ownsChildren: true
};

// src/Browser/components/cards/CompositeCardBlock.js
function normalizeCompositeItems(props = {}) {
  if (Array.isArray(props.items)) return props.items;
  if (Array.isArray(props.children)) return props.children;
  return [];
}
function renderCompositeCard(card, item, ctx, meta) {
  const doc = ctx.document ?? card.ownerDocument;
  setClass4(card, "canvas-composite-card canvas-card-item");
  const dispose = applyClickableCard(card, {
    clickable: meta.clickable,
    onActivate: meta.onActivate ?? void 0
  });
  clearChildren4(card);
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
  const footer = item.footer && typeof item.footer === "object" ? (
    /** @type {Record<string, unknown>} */
    item.footer
  ) : null;
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
      renderSlot(btn, footer.button, ctx, doc);
      content.appendChild(btn);
    }
    foot.appendChild(content);
    card.appendChild(foot);
  }
  if (asText4(item.id)) card.setAttribute("data-item-id", asText4(item.id));
  return dispose;
}
var CompositeCardBlock = createCardBlock({
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
  }
});
var CompositeCardItem = {
  create(props = {}, ctx = {}) {
    const doc = ctx.document ?? globalThis.document;
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "CompositeCardItem");
    this.update(el2, props, ctx);
    return el2;
  },
  update(el2, props = {}, ctx = {}) {
    const item = unwrapItem(props) || props;
    renderCompositeCard(el2, item, ctx, { clickable: false, onActivate: null });
  },
  destroy() {
  },
  ownsChildren: true
};

// src/Browser/components/cards/VisualCardBlock.js
init_inlineStyle();
function normalizeVisualItems(props = {}) {
  if (Array.isArray(props.items)) return props.items;
  if (Array.isArray(props.children)) return props.children;
  return [];
}
function renderVisualCard(card, item, ctx, meta) {
  const doc = ctx.document ?? card.ownerDocument;
  const bgCss = resolveBackgroundCssUrl(item.bgImageSrc, ctx);
  setClass4(card, "canvas-visual-first-card canvas-card-item");
  if (bgCss) {
    setInlineStyle(card, { "--canvas-visual-card-image": bgCss });
    const alt = asText4(item.bgImageAlt);
    if (alt) card.setAttribute("aria-label", alt);
  } else {
    clearInlineStyle(card);
    card.removeAttribute("aria-label");
  }
  const dispose = applyClickableCard(card, {
    clickable: meta.clickable,
    onActivate: meta.onActivate ?? void 0
  });
  clearChildren4(card);
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
    action.textContent = "\u203A";
    top.appendChild(action);
  }
  card.appendChild(top);
  if (item.body != null) {
    const bottom = doc.createElement("div");
    bottom.setAttribute("class", "canvas-visual-first-card__bottom");
    renderSlot(bottom, item.body, ctx, doc);
    card.appendChild(bottom);
  }
  if (asText4(item.id)) card.setAttribute("data-item-id", asText4(item.id));
  return dispose;
}
var VisualCardBlock = createCardBlock({
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
  }
});
var VisualCardItem = {
  create(props = {}, ctx = {}) {
    const doc = ctx.document ?? globalThis.document;
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "VisualCardItem");
    this.update(el2, props, ctx);
    return el2;
  },
  update(el2, props = {}, ctx = {}) {
    const item = unwrapItem(props) || props;
    renderVisualCard(el2, item, ctx, { clickable: false, onActivate: null });
  },
  destroy() {
  },
  ownsChildren: true
};

// src/Browser/components/cards/ImageGallery.js
var MAX_GRID_IMAGES = 5;
function galleryLayoutClass(n) {
  switch (n) {
    case 1:
      return "canvas-gallery--single";
    case 2:
      return "canvas-gallery--double";
    case 3:
      return "canvas-gallery--triple";
    case 4:
      return "canvas-gallery--quad";
    default:
      return "canvas-gallery--default";
  }
}
function normalizeGalleryImages(props = {}) {
  const raw = Array.isArray(props.images) ? props.images : [];
  return raw.map((img) => {
    if (!img || typeof img !== "object") return null;
    const o = (
      /** @type {Record<string, unknown>} */
      img
    );
    if (o.props && typeof o.props === "object") {
      return (
        /** @type {Record<string, unknown>} */
        o.props
      );
    }
    return o;
  }).filter(Boolean);
}
var STATE17 = /* @__PURE__ */ new WeakMap();
function ensureState(el2) {
  let s = STATE17.get(el2);
  if (!s) {
    s = { open: false, selected: 0, onKey: null };
    STATE17.set(el2, s);
  }
  return s;
}
function renderLightbox(el2, doc, images, ctx, state) {
  let overlay = null;
  for (const child of el2.childNodes) {
    if (child.nodeType === 1 && /** @type {Element} */
    child.getAttribute?.("data-role") === "lightbox") {
      overlay = /** @type {Element} */
      child;
      break;
    }
  }
  if (!state.open) {
    if (overlay) el2.removeChild(overlay);
    if (state.onKey) {
      doc.removeEventListener?.("keydown", state.onKey);
      state.onKey = null;
    }
    return;
  }
  if (!overlay) {
    overlay = doc.createElement("div");
    overlay.setAttribute("class", "canvas-gallery__lightbox");
    overlay.setAttribute("data-role", "lightbox");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Image gallery");
    el2.appendChild(overlay);
  }
  clearChildren4(overlay);
  const closeBtn = doc.createElement("button");
  closeBtn.setAttribute("type", "button");
  closeBtn.setAttribute("class", "canvas-gallery__lightbox-close");
  closeBtn.setAttribute("aria-label", "Close gallery");
  closeBtn.textContent = "\xD7";
  closeBtn.addEventListener("click", () => {
    state.open = false;
    renderLightbox(el2, doc, images, ctx, state);
  });
  overlay.appendChild(closeBtn);
  const imgData = images[state.selected] || images[0];
  const safe = imgData ? resolveSafeUrl(imgData.src, ctx) : void 0;
  const figure = doc.createElement("div");
  figure.setAttribute("class", "canvas-gallery__lightbox-figure");
  if (safe) {
    const img = doc.createElement("img");
    img.setAttribute("src", safe);
    img.setAttribute(
      "alt",
      asText4(imgData.alt) || `Gallery image ${state.selected + 1}`
    );
    figure.appendChild(img);
  } else {
    const fb = doc.createElement("div");
    fb.setAttribute("class", "canvas-gallery__fallback");
    fb.textContent = "Image unavailable";
    figure.appendChild(fb);
  }
  overlay.appendChild(figure);
  if (asText4(imgData?.details)) {
    const details = doc.createElement("p");
    details.setAttribute("class", "canvas-gallery__lightbox-details");
    details.textContent = asText4(imgData.details);
    overlay.appendChild(details);
  }
  if (images.length > 1) {
    const nav = doc.createElement("div");
    nav.setAttribute("class", "canvas-gallery__lightbox-nav");
    const prev = doc.createElement("button");
    prev.setAttribute("type", "button");
    prev.setAttribute("aria-label", "Previous image");
    prev.textContent = "\u2039";
    prev.addEventListener("click", () => {
      state.selected = (state.selected - 1 + images.length) % images.length;
      renderLightbox(el2, doc, images, ctx, state);
    });
    const next = doc.createElement("button");
    next.setAttribute("type", "button");
    next.setAttribute("aria-label", "Next image");
    next.textContent = "\u203A";
    next.addEventListener("click", () => {
      state.selected = (state.selected + 1) % images.length;
      renderLightbox(el2, doc, images, ctx, state);
    });
    nav.appendChild(prev);
    nav.appendChild(next);
    overlay.appendChild(nav);
  }
  if (!state.onKey) {
    state.onKey = (e) => {
      if (e.key === "Escape") {
        state.open = false;
        renderLightbox(el2, doc, images, ctx, state);
      }
    };
    doc.addEventListener?.("keydown", state.onKey);
  }
}
var ImageGallery = lifecycle4({
  mount(doc) {
    const el2 = doc.createElement("div");
    el2.setAttribute("data-canvas-component", "ImageGallery");
    ensureState(el2);
    return el2;
  },
  patch(el2, props = {}, ctx = {}) {
    const doc = ctx.document ?? el2.ownerDocument;
    const state = ensureState(el2);
    const images = normalizeGalleryImages(props);
    const layout = galleryLayoutClass(images.length);
    setClass4(el2, `canvas-gallery ${layout}`);
    el2.setAttribute("data-count", String(images.length));
    let lightbox = null;
    for (const child of [...el2.childNodes]) {
      if (child.nodeType === 1 && /** @type {Element} */
      child.getAttribute?.("data-role") === "lightbox") {
        lightbox = /** @type {Element} */
        child;
      } else {
        el2.removeChild(child);
      }
    }
    const grid = doc.createElement("div");
    grid.setAttribute("class", "canvas-gallery__grid");
    const visible = images.slice(0, MAX_GRID_IMAGES);
    for (let i = 0; i < visible.length; i++) {
      const image = visible[i];
      const cell = doc.createElement("div");
      let cellCls = "canvas-gallery__image";
      if (i === 0) cellCls += " canvas-gallery__image--main";
      setClass4(cell, cellCls);
      cell.setAttribute("role", "button");
      cell.setAttribute("tabindex", "0");
      cell.setAttribute(
        "aria-label",
        asText4(image.alt) || `Open gallery image ${i + 1}`
      );
      const safe = resolveSafeUrl(image.src, ctx);
      if (safe) {
        const img = doc.createElement("img");
        img.setAttribute("src", safe);
        img.setAttribute("alt", asText4(image.alt) || `Gallery image ${i + 1}`);
        cell.appendChild(img);
      } else {
        const fb = doc.createElement("div");
        fb.setAttribute("class", "canvas-gallery__fallback");
        fb.setAttribute("role", "img");
        fb.setAttribute(
          "aria-label",
          image.src ? "Unsafe image URL blocked" : "Image unavailable"
        );
        fb.textContent = image.src ? "Blocked" : "\u2014";
        cell.appendChild(fb);
        setOrRemoveAttr4(cell, "data-blocked", "true");
      }
      const openAt = () => {
        state.selected = i;
        state.open = true;
        renderLightbox(el2, doc, images, ctx, state);
      };
      cell.addEventListener("click", openAt);
      cell.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault?.();
          openAt();
        }
      });
      grid.appendChild(cell);
    }
    if (images.length > MAX_GRID_IMAGES) {
      const showAll = doc.createElement("div");
      showAll.setAttribute("class", "canvas-gallery__show-all-button");
      const btn = doc.createElement("button");
      btn.setAttribute("type", "button");
      btn.setAttribute("class", "canvas-gallery__show-all");
      btn.textContent = "Show All";
      btn.addEventListener("click", () => {
        state.selected = 0;
        state.open = true;
        renderLightbox(el2, doc, images, ctx, state);
      });
      showAll.appendChild(btn);
      grid.appendChild(showAll);
    }
    el2.insertBefore(grid, lightbox);
    if (state.open) renderLightbox(el2, doc, images, ctx, state);
  },
  unmount(el2, ctx = {}) {
    const state = STATE17.get(el2);
    const doc = ctx.document ?? el2.ownerDocument;
    if (state?.onKey) {
      doc.removeEventListener?.("keydown", state.onKey);
      state.onKey = null;
    }
    STATE17.delete(el2);
  }
});

// src/Browser/components/cards/index.js
var CARD_COMPONENTS = {
  Text,
  BoldText,
  IconText,
  ImageText,
  ImageTextLarge,
  SnippetCardBlock,
  SnippetCardItem,
  OverviewCardBlock,
  OverviewCardItem,
  ContextCardBlock,
  ContextCardItem,
  CompositeCardBlock,
  CompositeCardItem,
  VisualCardBlock,
  VisualCardItem,
  ImageGallery
};
function registerCards(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerCards: registry with register() required");
  }
  for (const [type, entry] of Object.entries(CARD_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}

// src/Browser/host/registerShellComponents.js
function registerShellComponents(registry) {
  registerFoundation(registry);
  registerContent(registry);
  registerContainers(registry);
  registerForms(registry);
  registerActions(registry);
  registerCards(registry);
  return registry;
}

// src/Browser/host/registerAllComponents.js
init_registerSectionSteps();
init_registerCarouselModal();
init_registerTable();
init_registerCharts();
init_registerTools();
init_registerChatContent();
function registerAllComponents(registry) {
  registerShellComponents(registry);
  registerChatContent(registry);
  registerSectionSteps(registry);
  registerCarouselModal(registry);
  registerTable(registry);
  registerCharts(registry);
  registerTools(registry);
  return registry;
}

// src/Browser/renderer/registry.js
function createUnknownFallback(doc, type) {
  const el2 = doc.createElement("div");
  el2.setAttribute("data-openui-unknown", String(type ?? ""));
  el2.textContent = "";
  return el2;
}
function unknownLifecycle(type) {
  return {
    create(_props, ctx = {}) {
      const doc = ctx.document ?? globalThis.document;
      if (!doc?.createElement) {
        throw new Error("registry fallback: ctx.document required");
      }
      return createUnknownFallback(doc, type);
    },
    update() {
    },
    destroy() {
    },
    ownsChildren: false
  };
}
function wrapRenderFn(renderFn) {
  return {
    create(props, ctx) {
      return renderFn(props, ctx);
    },
    update() {
    },
    destroy() {
    },
    ownsChildren: false
  };
}
function normalizeEntry(entry, type) {
  if (typeof entry === "function") {
    return wrapRenderFn(entry);
  }
  if (entry && typeof entry === "object" && typeof entry.create === "function") {
    return {
      create: entry.create,
      update: typeof entry.update === "function" ? entry.update : () => {
      },
      destroy: typeof entry.destroy === "function" ? entry.destroy : () => {
      },
      // Containers (Tabs/Accordion) own chrome DOM; skip reconciler child wipe.
      ownsChildren: entry.ownsChildren === true,
      // Components that derive extra child nodes from props (Card → sources
      // strip) reshape vnode.children before the reconciler applies them.
      ...typeof entry.partitionChildren === "function" ? { partitionChildren: entry.partitionChildren } : {}
    };
  }
  throw new Error(
    `register: expected render function or { create } lifecycle for ${type}`
  );
}
function createComponentRegistry(initial = {}) {
  const map = /* @__PURE__ */ new Map();
  for (const [type, entry] of Object.entries(initial)) {
    map.set(type, normalizeEntry(entry, type));
  }
  return {
    /**
     * @param {string} type
     * @param {ComponentEntry} entry
     */
    register(type, entry) {
      if (typeof type !== "string" || !type) {
        throw new Error("register: type must be a non-empty string");
      }
      map.set(type, normalizeEntry(entry, type));
    },
    /**
     * Normalized lifecycle for `type`, or fail-closed unknown fallback.
     * @param {string} type
     * @returns {NormalizedLifecycle}
     */
    resolve(type) {
      return map.get(type) ?? unknownLifecycle(type);
    },
    /**
     * Alias for {@link resolve} — always returns `{ create, update, destroy }`.
     * @param {string} type
     * @returns {NormalizedLifecycle}
     */
    get(type) {
      return this.resolve(type);
    },
    /**
     * @param {string} type
     * @returns {boolean}
     */
    has(type) {
      return map.has(type);
    },
    /**
     * @returns {string[]}
     */
    list() {
      return [...map.keys()];
    },
    /**
     * Mount via `create` (registered or unknown fallback).
     * @param {string} type
     * @param {Record<string, unknown>} [props]
     * @param {Record<string, unknown>} [ctx]
     * @returns {Element}
     */
    render(type, props = {}, ctx = {}) {
      return this.resolve(type).create(props, ctx);
    }
  };
}

// src/Browser/renderer/context.js
init_urlPolicy();

// src/Browser/renderer/reconciler.js
var META = /* @__PURE__ */ new WeakMap();
function getMeta(node) {
  return META.get(node);
}
function setMeta(node, meta) {
  META.set(node, meta);
}
function childKey(child, index) {
  if (child != null && typeof child === "object") {
    if ("key" in child && /** @type {VNode} */
    child.key != null) {
      return (
        /** @type {VNode} */
        child.key
      );
    }
    const vnode = (
      /** @type {VNode} */
      child
    );
    if (vnode.id != null && vnode.type != null) {
      return `${vnode.type}::${vnode.id}`;
    }
  }
  return index;
}
function liveChildren(parent) {
  return Array.from(parent.childNodes);
}
function applyProps(el2, props = {}) {
  for (const [name, value] of Object.entries(props)) {
    if (name === "children" || name === "key" || name === "id") continue;
    if (/^on/i.test(name)) continue;
    if (name === "dangerouslySetInnerHTML" || name === "innerHTML") continue;
    if (value == null || value === false) {
      el2.removeAttribute(name);
      continue;
    }
    if (name === "className") {
      el2.setAttribute("class", String(value));
      continue;
    }
    if (name === "textContent") {
      el2.textContent = String(value);
      continue;
    }
    if (name === "value" && "value" in el2) {
      el2.setAttribute("value", String(value));
      continue;
    }
    if (typeof value === "boolean") {
      if (value) el2.setAttribute(name, "");
      else el2.removeAttribute(name);
      continue;
    }
    if (typeof value === "object") continue;
    el2.setAttribute(name, String(value));
  }
}
function captureInteractiveState(root) {
  const entries = [];
  const doc = root.ownerDocument;
  const active = doc && "activeElement" in doc ? (
    /** @type {Element | null} */
    doc.activeElement
  ) : null;
  function visit(el2) {
    const entry = { el: el2 };
    let keep = false;
    const tag = String(el2.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || "value" in el2) {
      entry.value = /** @type {{ value?: string }} */
      el2.value;
      if ("selectionStart" in el2) {
        entry.selectionStart = /** @type {{ selectionStart?: number|null }} */
        el2.selectionStart;
        entry.selectionEnd = /** @type {{ selectionEnd?: number|null }} */
        el2.selectionEnd;
      }
      keep = true;
    }
    if ("scrollTop" in el2) {
      entry.scrollTop = /** @type {{ scrollTop: number }} */
      el2.scrollTop;
      entry.scrollLeft = /** @type {{ scrollLeft?: number }} */
      el2.scrollLeft ?? 0;
      keep = true;
    }
    if (tag === "DETAILS" || "open" in el2) {
      entry.open = Boolean(
        /** @type {{ open?: boolean }} */
        el2.open
      );
      keep = true;
    }
    if (keep) entries.push(entry);
    for (const child of Array.from(el2.childNodes)) {
      if (child.nodeType === 1) visit(
        /** @type {Element} */
        child
      );
    }
  }
  visit(root);
  let focused = null;
  if (active && active.nodeType === 1) {
    let n = (
      /** @type {Node | null} */
      active
    );
    while (n) {
      if (n === root) {
        focused = /** @type {Element} */
        active;
        break;
      }
      n = n.parentNode;
    }
  }
  return { focused, entries };
}
function restoreInteractiveState(snap) {
  for (const entry of snap.entries) {
    const el2 = entry.el;
    if (entry.value !== void 0 && "value" in el2) {
      el2.value = entry.value;
    }
    if (entry.selectionStart != null && entry.selectionEnd != null && "setSelectionRange" in el2 && typeof /** @type {{ setSelectionRange?: Function }} */
    el2.setSelectionRange === "function") {
      try {
        el2.setSelectionRange(
          entry.selectionStart,
          entry.selectionEnd
        );
      } catch {
      }
    } else if (entry.selectionStart != null || entry.selectionEnd != null) {
      try {
        if (entry.selectionStart != null && "selectionStart" in el2) {
          el2.selectionStart = entry.selectionStart;
        }
        if (entry.selectionEnd != null && "selectionEnd" in el2) {
          el2.selectionEnd = entry.selectionEnd;
        }
      } catch {
      }
    }
    if (entry.scrollTop !== void 0 && "scrollTop" in el2) {
      el2.scrollTop = entry.scrollTop;
    }
    if (entry.scrollLeft !== void 0 && "scrollLeft" in el2) {
      el2.scrollLeft = entry.scrollLeft;
    }
    if (entry.open !== void 0 && ("open" in el2 || String(el2.tagName).toUpperCase() === "DETAILS")) {
      el2.open = entry.open;
    }
  }
  if (snap.focused && typeof snap.focused.focus === "function") {
    snap.focused.focus();
  }
}
function resolveLifecycle(registry, type) {
  if (typeof registry.resolve === "function") {
    return registry.resolve(type);
  }
  if (typeof registry.get === "function") {
    const got = registry.get(type);
    if (typeof got === "function") {
      return { create: got, update() {
      }, destroy() {
      }, ownsChildren: false };
    }
    if (got && typeof got.create === "function") {
      return {
        create: got.create,
        update: typeof got.update === "function" ? got.update : () => {
        },
        destroy: typeof got.destroy === "function" ? got.destroy : () => {
        },
        ownsChildren: got.ownsChildren === true,
        partitionChildren: typeof got.partitionChildren === "function" ? got.partitionChildren : void 0
      };
    }
  }
  throw new Error(`reconciler: cannot resolve component "${type}"`);
}
function childrenFor(life, vnode, ctx) {
  const raw = vnode.children ?? [];
  if (typeof life.partitionChildren !== "function") return raw;
  const out = life.partitionChildren(raw, vnode.props ?? {}, ctx);
  return Array.isArray(out) ? out : raw;
}
function createElementFromVNode(vnode, ctx) {
  const doc = ctx.document ?? globalThis.document;
  const registry = ctx.registry;
  if (!registry) {
    throw new Error("reconciler: ctx.registry required");
  }
  if (!doc?.createElement) {
    throw new Error("reconciler: ctx.document required");
  }
  const life = resolveLifecycle(registry, vnode.type);
  const el2 = life.create(vnode.props ?? {}, { ...ctx, document: doc });
  if (!el2 || el2.nodeType !== 1) {
    throw new Error(`reconciler: create() for "${vnode.type}" must return an Element`);
  }
  applyProps(el2, vnode.props ?? {});
  const key = vnode.key ?? (vnode.id != null ? `${vnode.type}::${vnode.id}` : void 0);
  setMeta(el2, { type: vnode.type, key, id: vnode.id });
  if (!life.ownsChildren) {
    reconcileChildren(el2, childrenFor(life, vnode, ctx), ctx);
  }
  return el2;
}
function createText(text2, ctx) {
  const doc = ctx.document ?? globalThis.document;
  const node = doc.createTextNode(String(text2));
  setMeta(node, { isText: true, key: void 0 });
  return node;
}
function disposeTree(node, ctx) {
  if (node.nodeType === 1) {
    for (const child of Array.from(node.childNodes)) {
      disposeTree(child, ctx);
    }
    const meta = getMeta(node);
    const registry = ctx.registry;
    if (registry && meta?.type) {
      try {
        const life = resolveLifecycle(registry, meta.type);
        if (typeof life.destroy === "function") {
          life.destroy(
            /** @type {Element} */
            node,
            ctx
          );
        }
      } catch (err) {
        if (typeof ctx.reportError === "function") {
          ctx.reportError(err);
        }
      }
    }
  }
  if (typeof ctx.onDispose === "function") {
    ctx.onDispose(node);
  }
}
function reconcileChildren(parentEl, nextChildren, ctx = {}) {
  const normalized = (nextChildren ?? []).filter((c) => c != null && c !== false);
  const prev = liveChildren(parentEl);
  const prevByKey = /* @__PURE__ */ new Map();
  for (let i = 0; i < prev.length; i++) {
    const node = prev[i];
    const meta = getMeta(node);
    const key = meta?.key != null ? meta.key : i;
    prevByKey.set(key, node);
  }
  const kept = /* @__PURE__ */ new Set();
  const nextNodes = [];
  for (let i = 0; i < normalized.length; i++) {
    const child = normalized[i];
    const key = childKey(child, i);
    if (typeof child === "string" || typeof child === "number") {
      const existing2 = prevByKey.get(key);
      if (existing2 && existing2.nodeType === 3) {
        if (existing2.textContent !== String(child)) {
          existing2.textContent = String(child);
        }
        setMeta(existing2, { isText: true, key });
        kept.add(existing2);
        nextNodes.push(existing2);
      } else {
        nextNodes.push(createText(child, ctx));
      }
      continue;
    }
    if (typeof child !== "object" || !child.type) {
      continue;
    }
    const vnode = child;
    const existing = prevByKey.get(key);
    const existingMeta = existing ? getMeta(existing) : void 0;
    if (existing && existing.nodeType === 1 && existingMeta && existingMeta.type === vnode.type) {
      const el2 = (
        /** @type {Element} */
        existing
      );
      const snap = captureInteractiveState(el2);
      const registry = ctx.registry;
      let ownsChildren = false;
      let nextChildren2 = vnode.children ?? [];
      if (registry) {
        const life = resolveLifecycle(registry, vnode.type);
        ownsChildren = life.ownsChildren === true;
        if (typeof life.update === "function") {
          life.update(el2, vnode.props ?? {}, ctx);
        }
        nextChildren2 = childrenFor(life, vnode, ctx);
      }
      applyProps(el2, vnode.props ?? {});
      setMeta(el2, {
        type: vnode.type,
        key: vnode.key ?? key,
        id: vnode.id
      });
      if (!ownsChildren) {
        reconcileChildren(el2, nextChildren2, ctx);
      }
      restoreInteractiveState(snap);
      kept.add(el2);
      nextNodes.push(el2);
    } else {
      nextNodes.push(
        createElementFromVNode(
          { ...vnode, key: vnode.key ?? key },
          ctx
        )
      );
    }
  }
  for (const node of prev) {
    if (!kept.has(node) && !nextNodes.includes(node)) {
      disposeTree(node, ctx);
      if (node.parentNode === parentEl) {
        parentEl.removeChild(node);
      }
    }
  }
  let anchor = parentEl.firstChild;
  for (const node of nextNodes) {
    if (anchor !== node) {
      parentEl.insertBefore(node, anchor);
    }
    anchor = node.nextSibling;
  }
}
function render(rootEl, nodeTree, ctx = {}) {
  if (!rootEl) throw new Error("render: rootEl required");
  if (typeof rootEl.innerHTML === "string") {
  }
  const children = nodeTree == null ? [] : Array.isArray(nodeTree) ? nodeTree : [nodeTree];
  reconcileChildren(rootEl, children, ctx);
  return rootEl;
}
function unmount(rootEl, ctx = {}) {
  for (const child of liveChildren(rootEl)) {
    disposeTree(child, ctx);
    rootEl.removeChild(child);
  }
}

// src/Browser/renderer/context.js
function createStubFocusManager() {
  let remembered = null;
  return {
    remember(el2 = null) {
      remembered = el2 ?? null;
    },
    restore() {
      if (remembered && typeof remembered.focus === "function") {
        remembered.focus();
      }
    },
    getFocused() {
      return remembered;
    }
  };
}
function createRenderContext(opts = {}) {
  const doc = opts.document ?? globalThis.document;
  const ctx = {
    document: doc,
    registry: opts.registry ?? null,
    state: opts.state ?? null,
    actions: opts.actions ?? null,
    query: opts.query ?? null,
    stream: opts.stream ?? { isStreaming: false },
    urlPolicy: opts.urlPolicy ?? urlPolicy_exports,
    focus: opts.focus ?? createStubFocusManager(),
    reportError: typeof opts.reportError === "function" ? opts.reportError : (error) => {
      if (typeof console !== "undefined" && console.error) {
        console.error("[openui]", error);
      }
    },
    onDispose: opts.onDispose
  };
  for (const [k, v] of Object.entries(opts)) {
    if (!(k in ctx) || ctx[k] === void 0) {
      ctx[k] = v;
    }
  }
  ctx.renderChildren = (parentEl, children) => {
    reconcileChildren(
      parentEl,
      /** @type {any} */
      children ?? [],
      ctx
    );
  };
  return ctx;
}

// src/Browser/renderer/lastGoodSubtree.js
var SNAPSHOTS = /* @__PURE__ */ new Map();
function getRootKey(rootEl, ctx = {}) {
  if (typeof ctx.rootKey === "string" && ctx.rootKey) return ctx.rootKey;
  if (rootEl && typeof rootEl.getAttribute === "function") {
    const attr = rootEl.getAttribute("data-openui-root");
    if (attr) return attr;
  }
  if (rootEl && rootEl.nodeId != null) return `node:${rootEl.nodeId}`;
  return "default";
}
function serializeNode(node) {
  if (node.nodeType === 3) {
    return { text: String(node.textContent ?? "") };
  }
  const attrs = [];
  if (Array.isArray(node.attributes)) {
    for (const a of node.attributes) {
      attrs.push([String(a.name), String(a.value)]);
    }
  } else if (node._attrs instanceof Map) {
    for (const [k, v] of node._attrs) {
      attrs.push([String(k), String(v)]);
    }
  } else if (typeof node.getAttributeNames === "function") {
    for (const name of node.getAttributeNames()) {
      attrs.push([name, String(node.getAttribute(name) ?? "")]);
    }
  }
  const tagName = String(node.tagName || "div").toLowerCase();
  const children = Array.from(node.childNodes ?? []).map(serializeNode);
  return { tagName, attrs, children };
}
function hydrateNode(doc, snap) {
  if ("text" in snap) {
    return doc.createTextNode(snap.text);
  }
  const el2 = doc.createElement(snap.tagName || "div");
  for (const [name, value] of snap.attrs ?? []) {
    el2.setAttribute(name, value);
  }
  for (const child of snap.children ?? []) {
    el2.appendChild(hydrateNode(doc, child));
  }
  return el2;
}
function hasLastGood(rootKey) {
  return SNAPSHOTS.has(rootKey);
}
function captureLastGood(rootKey, rootEl) {
  if (!rootKey) throw new Error("captureLastGood: rootKey required");
  if (!rootEl) throw new Error("captureLastGood: rootEl required");
  const children = Array.from(rootEl.childNodes ?? []).map(serializeNode);
  SNAPSHOTS.set(rootKey, children);
}
function restoreLastGood(rootKey, rootEl, ctx = {}) {
  const snap = SNAPSHOTS.get(rootKey);
  if (!snap) return false;
  const doc = ctx.document ?? rootEl.ownerDocument ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("restoreLastGood: document required");
  }
  while (rootEl.firstChild) {
    rootEl.removeChild(rootEl.firstChild);
  }
  for (const child of snap) {
    rootEl.appendChild(hydrateNode(doc, child));
  }
  return true;
}

// src/Browser/renderer/safeRender.js
function assertNoBrokenTail(nodeTree) {
  if (nodeTree == null || nodeTree === false) return;
  if (Array.isArray(nodeTree)) {
    for (const c of nodeTree) assertNoBrokenTail(c);
    return;
  }
  if (typeof nodeTree !== "object") return;
  if (nodeTree.brokenTail === true || nodeTree.__brokenTail === true) {
    throw new Error("broken-tail: malformed trailing chunk");
  }
  if (nodeTree.props && typeof nodeTree.props === "object") {
    if (nodeTree.props.__throw === true || nodeTree.props.brokenTail === true) {
      throw new Error("broken-tail: hostile vnode props");
    }
  }
  if (Array.isArray(nodeTree.children)) {
    for (const c of nodeTree.children) assertNoBrokenTail(c);
  }
}
function sanitizeRenderError(err, ctx) {
  const development = ctx.development === true || ctx.isDev === true;
  const name = err && typeof err === "object" && "name" in err ? String(err.name) : "Error";
  const message = err && typeof err === "object" && "message" in err ? String(err.message) : String(err ?? "render-failed");
  if (development) {
    return { name, message };
  }
  return { message: "render-failed" };
}
function withPartialRegistry(ctx) {
  const registry = ctx.registry;
  if (!registry || typeof registry.register !== "function") return ctx;
  if (typeof registry.has === "function" && registry.has(PARTIAL_SKELETON_TYPE)) {
    return ctx;
  }
  registry.register(PARTIAL_SKELETON_TYPE, renderPartialSkeleton);
  return ctx;
}
function safeRender(rootEl, nodeTree, ctx = {}) {
  if (!rootEl) throw new Error("safeRender: rootEl required");
  const rootKey = getRootKey(rootEl, ctx);
  const nextCtx = withPartialRegistry({ ...ctx });
  const tree = mapPartialToSkeleton(nodeTree);
  try {
    assertNoBrokenTail(tree);
    render(rootEl, tree, nextCtx);
    captureLastGood(rootKey, rootEl);
    return {
      ok: true,
      rootKey,
      sideEffectsAllowed: assertInteractive(nextCtx)
    };
  } catch (err) {
    const restored = hasLastGood(rootKey) ? restoreLastGood(rootKey, rootEl, nextCtx) : false;
    const error = sanitizeRenderError(err, nextCtx);
    if (typeof nextCtx.onRenderError === "function") {
      nextCtx.onRenderError(error, { rootKey, restored, err });
    }
    return {
      ok: false,
      rootKey,
      restored,
      error,
      sideEffectsAllowed: false
    };
  }
}

// src/Browser/runtime/store.js
var STORE_CHANGE = "sanctum:store-change";
function createStore() {
  const emitter = new EventTarget();
  const state = /* @__PURE__ */ new Map();
  let declaredDefaults = {};
  let snapshot = {};
  let batchDepth = 0;
  let pendingNotify = false;
  let disposed = false;
  function rebuildSnapshot() {
    snapshot = Object.fromEntries(state);
  }
  function dispatchChange() {
    if (disposed) return;
    emitter.dispatchEvent(new Event(STORE_CHANGE));
  }
  function flushPendingNotify() {
    if (pendingNotify && batchDepth === 0) {
      pendingNotify = false;
      dispatchChange();
    }
  }
  function scheduleNotify() {
    if (disposed) return;
    if (batchDepth > 0) {
      pendingNotify = true;
      return;
    }
    dispatchChange();
  }
  function shouldSkipSet(existing, value) {
    if (Object.is(existing, value)) return true;
    if (value && existing && typeof value === "object" && typeof existing === "object" && !Array.isArray(value) && !Array.isArray(existing)) {
      const nk = Object.keys(value);
      const ok = Object.keys(existing);
      if (nk.length === ok.length && nk.every((k) => Object.is(value[k], existing[k]))) {
        return true;
      }
    }
    return false;
  }
  function setInternal(name, value) {
    const existing = state.get(name);
    if (shouldSkipSet(existing, value)) return false;
    state.set(name, value);
    rebuildSnapshot();
    return true;
  }
  function get(name) {
    return state.get(name);
  }
  function set(name, value) {
    if (setInternal(name, value)) scheduleNotify();
  }
  function subscribe(listener) {
    const onEvent = () => listener();
    emitter.addEventListener(STORE_CHANGE, onEvent);
    return () => emitter.removeEventListener(STORE_CHANGE, onEvent);
  }
  function getSnapshot() {
    return snapshot;
  }
  function initialize(defaults, persisted) {
    batch(() => {
      for (const key of Object.keys(persisted)) {
        setInternal(key, persisted[key]);
      }
      declaredDefaults = { ...declaredDefaults, ...defaults };
      for (const key of Object.keys(defaults)) {
        if (!state.has(key)) {
          setInternal(key, defaults[key]);
        }
      }
    });
    scheduleNotify();
  }
  function reset(targets) {
    const keys = targets && targets.length > 0 ? targets : Object.keys(declaredDefaults);
    batch(() => {
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(declaredDefaults, key)) {
          set(key, declaredDefaults[key]);
        }
      }
    });
  }
  function batch(fn) {
    if (disposed) return;
    batchDepth += 1;
    try {
      fn();
    } finally {
      batchDepth -= 1;
      flushPendingNotify();
    }
  }
  function transaction(fn) {
    batch(fn);
  }
  function dispose() {
    disposed = true;
    state.clear();
    declaredDefaults = {};
    snapshot = {};
    pendingNotify = false;
  }
  const store = {
    get,
    set,
    subscribe,
    getSnapshot,
    initialize,
    reset,
    batch,
    transaction,
    dispose,
    addEventListener(type, listener, options) {
      return emitter.addEventListener(type, listener, options);
    },
    removeEventListener(type, listener, options) {
      return emitter.removeEventListener(type, listener, options);
    },
    dispatchEvent(event) {
      return emitter.dispatchEvent(event);
    }
  };
  return store;
}

// src/Browser/runtime/bindings.js
function createBindingManager(store, opts = {}) {
  const fields = /* @__PURE__ */ new Map();
  let disposed = false;
  function fieldKey(form, name) {
    return `${form}::${name}`;
  }
  function registerField(form, name, componentType, initial) {
    if (disposed) return;
    const key = fieldKey(form, name);
    fields.set(key, { form, name, componentType });
    const path = `$${form}.${name}`;
    if (store.get(path) === void 0 && initial !== void 0) {
      store.set(path, { value: initial, componentType });
    }
  }
  function unregisterField(form, name) {
    fields.delete(fieldKey(form, name));
  }
  function setFieldValue(form, name, value) {
    const meta = fields.get(fieldKey(form, name));
    const componentType = meta?.componentType ?? "unknown";
    store.set(`$${form}.${name}`, { value, componentType });
  }
  function getFieldValue(form, name) {
    const entry = store.get(`$${form}.${name}`);
    return entry && typeof entry === "object" ? entry.value : entry;
  }
  function bind(targetStateName) {
    return {
      get: () => store.get(targetStateName),
      set: (v) => store.set(targetStateName, v)
    };
  }
  function dispose() {
    disposed = true;
    fields.clear();
  }
  return {
    registerField,
    unregisterField,
    setFieldValue,
    getFieldValue,
    bind,
    dispose,
    _fieldCount: () => fields.size
  };
}

// src/Browser/runtime/actionRunner.js
init_builtins();
function createActionRunner(deps) {
  const {
    store,
    mutations,
    host = {},
    isProgramComplete = () => true
  } = deps;
  async function run(plan, opts = {}) {
    if (!isProgramComplete()) {
      return { ok: false, reason: "incomplete-program" };
    }
    const steps = Array.isArray(plan) ? plan : plan?.steps ?? [];
    for (const step of steps) {
      if (!step || typeof step !== "object") continue;
      switch (step.type) {
        case ACTION_STEPS.Set: {
          const ctx = {
            getState: (n) => store.get(n),
            resolveRef: () => void 0
          };
          const value = evaluate(step.valueAST, ctx);
          store.set(step.target, value);
          break;
        }
        case ACTION_STEPS.Reset: {
          store.reset(step.targets);
          break;
        }
        case ACTION_STEPS.Run: {
          if (!mutations) throw new Error("mutations-required");
          const result = await mutations.runMutation(step.statementId);
          if (result.status === "error") {
            return { ok: false, reason: "mutation-failed", step, result };
          }
          break;
        }
        case ACTION_STEPS.OpenUrl: {
          if (!opts.userGesture) {
            return { ok: false, reason: "gesture-required" };
          }
          host.openUrl?.(step.url);
          break;
        }
        case ACTION_STEPS.ToAssistant: {
          if (!opts.userGesture) {
            return { ok: false, reason: "gesture-required" };
          }
          host.continueConversation?.(step.message, step.context);
          break;
        }
        default:
          break;
      }
    }
    return { ok: true };
  }
  return { run };
}

// src/Browser/runtime/evaluate-tree.js
function evaluateElementProps(el2, evalCtx) {
  if (el2.hasDynamicProps === false) return el2;
  const schemaCtx = { library: evalCtx.library };
  const def = evalCtx.library.components[el2.typeName];
  const evaluated = {};
  for (const [key, value] of Object.entries(el2.props)) {
    const propSchema = def?.props?.shape?.[key];
    try {
      evaluated[key] = evaluatePropValue(value, evalCtx, schemaCtx, propSchema);
    } catch (e) {
      evaluated[key] = value;
      const msg = e instanceof Error ? e.message : String(e);
      evalCtx.errors?.push({
        source: "runtime",
        code: "runtime-error",
        component: el2.typeName,
        statementId: el2.statementId,
        message: `Evaluating prop "${key}" on ${el2.typeName} failed: ${msg}`,
        hint: `Check the expression used for prop "${key}"`
      });
    }
  }
  return { ...el2, props: evaluated };
}
function evaluatePropValue(value, evalCtx, schemaCtx, reactiveSchema) {
  return evaluatePropCore(value, evalCtx.ctx, schemaCtx, reactiveSchema, {
    recurseElement: (el2) => evaluateElementProps(el2, evalCtx),
    recurse: (v, rs) => evaluatePropValue(v, evalCtx, schemaCtx, rs)
  });
}

// src/Browser/host/mountCore.js
init_urlPolicy();

// src/Browser/lang/parser.js
init_builtins();

// src/Browser/lang/expressions.js
init_builtins();

// src/Browser/lang/tokens.js
var T = Object.freeze({
  Newline: 0,
  LParen: 1,
  RParen: 2,
  LBrack: 3,
  RBrack: 4,
  LBrace: 5,
  RBrace: 6,
  Comma: 7,
  Colon: 8,
  Equals: 9,
  True: 10,
  False: 11,
  Null: 12,
  EOF: 13,
  Str: 14,
  Num: 15,
  Ident: 16,
  Type: 17,
  StateVar: 18,
  Dot: 19,
  Plus: 20,
  Minus: 21,
  Star: 22,
  Slash: 23,
  Percent: 24,
  EqEq: 25,
  NotEq: 26,
  Greater: 27,
  Less: 28,
  GreaterEq: 29,
  LessEq: 30,
  And: 31,
  Or: 32,
  Not: 33,
  Question: 34,
  BuiltinCall: 35
});
var TOKEN_NAMES = Object.freeze(
  Object.fromEntries(Object.entries(T).map(([name, value]) => [value, name]))
);

// src/Browser/lang/expressions.js
var PREC_TERNARY = 1;
var PREC_OR = 2;
var PREC_AND = 3;
var PREC_EQ = 4;
var PREC_CMP = 5;
var PREC_ADD = 6;
var PREC_MUL = 7;
var PREC_UNARY = 8;
var PREC_MEMBER = 9;
function parseExpression(tokens) {
  let pos = 0;
  const cur = () => tokens[pos] ?? { t: T.EOF };
  const adv = () => {
    const tok = cur();
    pos++;
    return tok;
  };
  const eat = (kind) => {
    if (cur().t === kind) pos++;
  };
  function getInfixPrec(tok) {
    switch (tok.t) {
      case T.Question:
        return PREC_TERNARY;
      case T.Or:
        return PREC_OR;
      case T.And:
        return PREC_AND;
      case T.EqEq:
      case T.NotEq:
        return PREC_EQ;
      case T.Greater:
      case T.Less:
      case T.GreaterEq:
      case T.LessEq:
        return PREC_CMP;
      case T.Plus:
      case T.Minus:
        return PREC_ADD;
      case T.Star:
      case T.Slash:
      case T.Percent:
        return PREC_MUL;
      case T.Dot:
      case T.LBrack:
        return PREC_MEMBER;
      default:
        return 0;
    }
  }
  function parseExpr(minPrec = 0) {
    let left = parsePrefix();
    while (getInfixPrec(cur()) > minPrec) {
      left = parseInfix(left);
    }
    return left;
  }
  function parsePrefix() {
    const tok = cur();
    if (tok.t === T.Str) {
      adv();
      return { k: "Str", v: tok.v };
    }
    if (tok.t === T.Num) {
      adv();
      return { k: "Num", v: tok.v };
    }
    if (tok.t === T.True) {
      adv();
      return { k: "Bool", v: true };
    }
    if (tok.t === T.False) {
      adv();
      return { k: "Bool", v: false };
    }
    if (tok.t === T.Null) {
      adv();
      return { k: "Null" };
    }
    if (tok.t === T.LBrack) return parseArr();
    if (tok.t === T.LBrace) return parseObj();
    if (tok.t === T.StateVar) {
      const name = tok.v;
      adv();
      if (cur().t === T.Equals) {
        adv();
        const value = parseExpr(0);
        return { k: "Assign", target: name, value };
      }
      return { k: "StateRef", n: name };
    }
    if (tok.t === T.Type) {
      const name = tok.v;
      if (tokens[pos + 1]?.t === T.LParen && (!isBuiltin(name) || name === "Action"))
        return parseComp();
      adv();
      return { k: "Ref", n: name };
    }
    if (tok.t === T.BuiltinCall) {
      if (tokens[pos + 1]?.t === T.LParen) return parseComp();
      adv();
      return { k: "Ref", n: tok.v };
    }
    if (tok.t === T.Ident) {
      adv();
      return { k: "Ref", n: tok.v };
    }
    if (tok.t === T.Not) {
      adv();
      return { k: "UnaryOp", op: "!", operand: parseExpr(PREC_UNARY) };
    }
    if (tok.t === T.Minus) {
      adv();
      return { k: "UnaryOp", op: "-", operand: parseExpr(PREC_UNARY) };
    }
    if (tok.t === T.LParen) {
      adv();
      const inner = parseExpr(0);
      eat(T.RParen);
      return inner;
    }
    adv();
    return { k: "Null" };
  }
  function parseInfix(left) {
    const tok = cur();
    if (tok.t === T.Plus) {
      adv();
      return { k: "BinOp", op: "+", left, right: parseExpr(PREC_ADD) };
    }
    if (tok.t === T.Minus) {
      adv();
      return { k: "BinOp", op: "-", left, right: parseExpr(PREC_ADD) };
    }
    if (tok.t === T.Star) {
      adv();
      return { k: "BinOp", op: "*", left, right: parseExpr(PREC_MUL) };
    }
    if (tok.t === T.Slash) {
      adv();
      return { k: "BinOp", op: "/", left, right: parseExpr(PREC_MUL) };
    }
    if (tok.t === T.Percent) {
      adv();
      return { k: "BinOp", op: "%", left, right: parseExpr(PREC_MUL) };
    }
    if (tok.t === T.EqEq) {
      adv();
      return { k: "BinOp", op: "==", left, right: parseExpr(PREC_EQ) };
    }
    if (tok.t === T.NotEq) {
      adv();
      return { k: "BinOp", op: "!=", left, right: parseExpr(PREC_EQ) };
    }
    if (tok.t === T.Greater) {
      adv();
      return { k: "BinOp", op: ">", left, right: parseExpr(PREC_CMP) };
    }
    if (tok.t === T.Less) {
      adv();
      return { k: "BinOp", op: "<", left, right: parseExpr(PREC_CMP) };
    }
    if (tok.t === T.GreaterEq) {
      adv();
      return { k: "BinOp", op: ">=", left, right: parseExpr(PREC_CMP) };
    }
    if (tok.t === T.LessEq) {
      adv();
      return { k: "BinOp", op: "<=", left, right: parseExpr(PREC_CMP) };
    }
    if (tok.t === T.And) {
      adv();
      return { k: "BinOp", op: "&&", left, right: parseExpr(PREC_AND) };
    }
    if (tok.t === T.Or) {
      adv();
      return { k: "BinOp", op: "||", left, right: parseExpr(PREC_OR) };
    }
    if (tok.t === T.Question) {
      adv();
      const then = parseExpr(0);
      eat(T.Colon);
      const els = parseExpr(0);
      return { k: "Ternary", cond: left, then, else: els };
    }
    if (tok.t === T.Dot) {
      adv();
      const fieldTok = cur();
      const field = fieldTok.t === T.Ident || fieldTok.t === T.Type || fieldTok.t === T.Str || fieldTok.t === T.Num ? (adv(), String(fieldTok.v)) : fieldTok.t === T.StateVar ? (adv(), fieldTok.v.replace(/^\$/, "")) : (adv(), "?");
      return { k: "Member", obj: left, field };
    }
    if (tok.t === T.LBrack) {
      adv();
      const index = parseExpr(0);
      eat(T.RBrack);
      return { k: "Index", obj: left, index };
    }
    return left;
  }
  function parseComp() {
    const name = cur().v;
    adv();
    eat(T.LParen);
    const args = [];
    while (cur().t !== T.RParen && cur().t !== T.EOF) {
      args.push(parseExpr(0));
      if (cur().t === T.Comma) adv();
    }
    eat(T.RParen);
    return { k: "Comp", name, args };
  }
  function parseArr() {
    adv();
    const els = [];
    while (cur().t !== T.RBrack && cur().t !== T.EOF) {
      els.push(parseExpr(0));
      if (cur().t === T.Comma) adv();
    }
    eat(T.RBrack);
    return { k: "Arr", els };
  }
  function parseObj() {
    adv();
    const entries = [];
    while (cur().t !== T.RBrace && cur().t !== T.EOF) {
      const kt = cur();
      const key = kt.t === T.Ident || kt.t === T.Str || kt.t === T.Type || kt.t === T.Num ? (adv(), String(kt.v)) : kt.t === T.StateVar ? (adv(), kt.v.replace(/^\$/, "")) : (adv(), "?");
      eat(T.Colon);
      entries.push([key, parseExpr(0)]);
      if (cur().t === T.Comma) adv();
    }
    eat(T.RBrace);
    return { k: "Obj", entries };
  }
  return parseExpr(0);
}

// src/Browser/lang/lexer.js
function tokenize(src) {
  const tokens = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    while (i < n && (src[i] === " " || src[i] === "	" || src[i] === "\r")) i++;
    if (i >= n) break;
    const c = src[i];
    if (c === "\n") {
      tokens.push({ t: T.Newline });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ t: T.LParen });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ t: T.RParen });
      i++;
      continue;
    }
    if (c === "[") {
      tokens.push({ t: T.LBrack });
      i++;
      continue;
    }
    if (c === "]") {
      tokens.push({ t: T.RBrack });
      i++;
      continue;
    }
    if (c === "{") {
      tokens.push({ t: T.LBrace });
      i++;
      continue;
    }
    if (c === "}") {
      tokens.push({ t: T.RBrace });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ t: T.Comma });
      i++;
      continue;
    }
    if (c === ":") {
      tokens.push({ t: T.Colon });
      i++;
      continue;
    }
    if (c === "=") {
      if (i + 1 < n && src[i + 1] === "=") {
        tokens.push({ t: T.EqEq });
        i += 2;
      } else {
        tokens.push({ t: T.Equals });
        i++;
      }
      continue;
    }
    if (c === "!") {
      if (i + 1 < n && src[i + 1] === "=") {
        tokens.push({ t: T.NotEq });
        i += 2;
      } else {
        tokens.push({ t: T.Not });
        i++;
      }
      continue;
    }
    if (c === ">") {
      if (i + 1 < n && src[i + 1] === "=") {
        tokens.push({ t: T.GreaterEq });
        i += 2;
      } else {
        tokens.push({ t: T.Greater });
        i++;
      }
      continue;
    }
    if (c === "<") {
      if (i + 1 < n && src[i + 1] === "=") {
        tokens.push({ t: T.LessEq });
        i += 2;
      } else {
        tokens.push({ t: T.Less });
        i++;
      }
      continue;
    }
    if (c === "&") {
      if (i + 1 < n && src[i + 1] === "&") {
        tokens.push({ t: T.And });
        i += 2;
      } else {
        tokens.push({ t: T.And });
        i++;
      }
      continue;
    }
    if (c === "|") {
      if (i + 1 < n && src[i + 1] === "|") {
        tokens.push({ t: T.Or });
        i += 2;
      } else {
        tokens.push({ t: T.Or });
        i++;
      }
      continue;
    }
    if (c === ".") {
      tokens.push({ t: T.Dot });
      i++;
      continue;
    }
    if (c === "?") {
      tokens.push({ t: T.Question });
      i++;
      continue;
    }
    if (c === "+") {
      tokens.push({ t: T.Plus });
      i++;
      continue;
    }
    if (c === "*") {
      tokens.push({ t: T.Star });
      i++;
      continue;
    }
    if (c === "/") {
      tokens.push({ t: T.Slash });
      i++;
      continue;
    }
    if (c === "%") {
      tokens.push({ t: T.Percent });
      i++;
      continue;
    }
    if (c === '"') {
      const start = i;
      i++;
      let isClosed = false;
      while (i < n) {
        if (src[i] === "\\") {
          i += 2;
        } else if (src[i] === '"') {
          i++;
          isClosed = true;
          break;
        } else {
          i++;
        }
      }
      const rawString = src.slice(start, i);
      try {
        const validJsonString = isClosed ? rawString : rawString + '"';
        tokens.push({ t: T.Str, v: JSON.parse(validJsonString) });
      } catch {
        const stripped = rawString.replace(/^"|"$/g, "");
        tokens.push({ t: T.Str, v: stripped });
      }
      continue;
    }
    if (c === "'") {
      i++;
      let result = "";
      let isClosed = false;
      while (i < n) {
        if (src[i] === "\\") {
          i++;
          if (i < n) {
            const esc = src[i];
            if (esc === "'") result += "'";
            else if (esc === "\\") result += "\\";
            else if (esc === "n") result += "\n";
            else if (esc === "t") result += "	";
            else result += esc;
            i++;
          }
        } else if (src[i] === "'") {
          i++;
          isClosed = true;
          break;
        } else {
          result += src[i];
          i++;
        }
      }
      void isClosed;
      tokens.push({ t: T.Str, v: result });
      continue;
    }
    if (c === "-") {
      const prev = tokens.length > 0 ? tokens[tokens.length - 1] : null;
      const afterValue = prev != null && (prev.t === T.Num || prev.t === T.Str || prev.t === T.Ident || prev.t === T.Type || prev.t === T.RParen || prev.t === T.RBrack || prev.t === T.True || prev.t === T.False || prev.t === T.Null || prev.t === T.StateVar || prev.t === T.BuiltinCall);
      if (!afterValue && i + 1 < n && src[i + 1] >= "0" && src[i + 1] <= "9") {
      } else {
        tokens.push({ t: T.Minus });
        i++;
        continue;
      }
    }
    const isDigit = c >= "0" && c <= "9";
    const isNegDigit = c === "-" && i + 1 < n && src[i + 1] >= "0" && src[i + 1] <= "9";
    if (isDigit || isNegDigit) {
      const start = i;
      if (src[i] === "-") i++;
      while (i < n && src[i] >= "0" && src[i] <= "9") i++;
      if (i < n && src[i] === "." && i + 1 < n && src[i + 1] >= "0" && src[i + 1] <= "9") {
        i++;
        while (i < n && src[i] >= "0" && src[i] <= "9") i++;
      }
      if (i < n && (src[i] === "e" || src[i] === "E")) {
        i++;
        if (i < n && (src[i] === "+" || src[i] === "-")) i++;
        while (i < n && src[i] >= "0" && src[i] <= "9") i++;
      }
      tokens.push({ t: T.Num, v: +src.slice(start, i) });
      continue;
    }
    if (c === "$" && i + 1 < n && (src[i + 1] >= "a" && src[i + 1] <= "z" || src[i + 1] >= "A" && src[i + 1] <= "Z" || src[i + 1] === "_")) {
      const start = i;
      i++;
      while (i < n && (src[i] >= "a" && src[i] <= "z" || src[i] >= "A" && src[i] <= "Z" || src[i] >= "0" && src[i] <= "9" || src[i] === "_"))
        i++;
      tokens.push({ t: T.StateVar, v: src.slice(start, i) });
      continue;
    }
    const isAlpha = c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c === "_";
    if (isAlpha) {
      const start = i;
      while (i < n && (src[i] >= "a" && src[i] <= "z" || src[i] >= "A" && src[i] <= "Z" || src[i] >= "0" && src[i] <= "9" || src[i] === "_"))
        i++;
      const word = src.slice(start, i);
      if (word === "true") {
        tokens.push({ t: T.True });
        continue;
      }
      if (word === "false") {
        tokens.push({ t: T.False });
        continue;
      }
      if (word === "null") {
        tokens.push({ t: T.Null });
        continue;
      }
      const kind = c >= "A" && c <= "Z" ? T.Type : T.Ident;
      tokens.push({ t: kind, v: word });
      continue;
    }
    if (c === "@" && i + 1 < n && (src[i + 1] >= "a" && src[i + 1] <= "z" || src[i + 1] >= "A" && src[i + 1] <= "Z" || src[i + 1] === "_")) {
      i++;
      const start = i;
      while (i < n && (src[i] >= "a" && src[i] <= "z" || src[i] >= "A" && src[i] <= "Z" || src[i] >= "0" && src[i] <= "9" || src[i] === "_"))
        i++;
      tokens.push({ t: T.BuiltinCall, v: src.slice(start, i) });
      continue;
    }
    i++;
  }
  tokens.push({ t: T.EOF });
  return tokens;
}

// src/Browser/lang/materialize.js
init_builtins();

// src/Browser/lang/validation.js
var SCALAR_TYPEOFS = ["string", "number", "boolean"];
var NO_PROPS = {};
var NO_REQUIRED = [];
function jsType(value) {
  return Array.isArray(value) ? "array" : typeof value;
}
function isCompositeSchema(s) {
  return "$ref" in s || "anyOf" in s || "oneOf" in s || "allOf" in s;
}
function getScalarTypeInfo(s) {
  if (Array.isArray(s["enum"])) return { enumValues: s["enum"] };
  if ("const" in s) return { enumValues: [s["const"]] };
  switch (s["type"]) {
    case "string":
      return { expectedType: "string" };
    case "number":
    case "integer":
      return { expectedType: "number" };
    case "boolean":
      return { expectedType: "boolean" };
    default:
      return {};
  }
}
function getSchemaDefaultValue(property) {
  if (!property || typeof property !== "object" || Array.isArray(property)) {
    return void 0;
  }
  return property.default;
}
function getTypeFromSchema(property) {
  if (!property || typeof property !== "object" || Array.isArray(property)) {
    return void 0;
  }
  const p = property;
  if (typeof p.$ref === "string") {
    return p.$ref.split("/").pop();
  }
  const leaf = getScalarTypeInfo(p);
  if (leaf.enumValues) {
    return leaf.enumValues.map((v) => JSON.stringify(v)).join("|");
  }
  if (leaf.expectedType) {
    return leaf.expectedType;
  }
  return typeof p.type === "string" ? p.type : void 0;
}
function buildParamsSignature(component, params) {
  const rendered = params.map((p) => {
    const type = getTypeFromSchema(p.schema);
    const marked = p.required ? `${p.name}*` : p.name;
    return type ? `${marked}: ${type}` : marked;
  }).join(", ");
  return `${component}(${rendered})`;
}
function checkTypeMismatch(value, info) {
  const actual = typeof value;
  if (info.enumValues) {
    if (!SCALAR_TYPEOFS.includes(actual)) return null;
    if (info.enumValues.includes(value)) return null;
    return {
      expected: `one of [${info.enumValues.map((v) => JSON.stringify(v)).join(", ")}]`,
      actual: JSON.stringify(value)
    };
  }
  if (info.expectedType && info.expectedType !== actual) {
    return { expected: info.expectedType, actual: jsType(value) };
  }
  return null;
}
function validationMessage(component, path, issue) {
  switch (issue.code) {
    case "type-mismatch":
      return `field "${path}" expects ${issue.expected} but got ${issue.actual}`;
    case "missing-required":
      return `missing required field "${path}"${issue.signature ? ` \u2014 signature: ${issue.signature}` : ""}`;
    case "null-required":
      return `required field "${path}" cannot be null${issue.signature ? ` \u2014 signature: ${issue.signature}` : ""}`;
    case "unknown-component":
      return `Unknown component "${component}" \u2014 not found in catalog or builtins${issue.available?.length ? `. Available components: ${issue.available.join(", ")}` : ""}`;
    case "inline-reserved":
      return `${component}() must be declared as a top-level statement, not used inline as a value`;
    case "excess-args":
      return `${component} takes ${issue.declared} arg(s), got ${issue.got} (${issue.got - issue.declared} excess dropped)`;
  }
}
function pushValidationIssue(ctx, component, path, issue) {
  ctx.errors.push({
    code: issue.code,
    component,
    path,
    message: validationMessage(component, path, issue),
    statementId: ctx.currentStatementId
  });
}
function resolveInvalidValue(container, key, required, defaultValue) {
  if (defaultValue !== void 0) {
    container[key] = defaultValue;
    return false;
  }
  if (required) return true;
  delete container[key];
  return false;
}
function validateElementPosition(element, s, component, path, ctx) {
  if (isCompositeSchema(s)) return false;
  if (typeof s["type"] === "string" || Array.isArray(s["enum"]) || "const" in s) {
    pushValidationIssue(ctx, component, path, {
      code: "type-mismatch",
      expected: typeof s["type"] === "string" ? s["type"] : "a literal value",
      actual: `component "${element.typeName}"`
    });
    return true;
  }
  return false;
}
function validateObjectValue(value, s, component, path, ctx) {
  if (typeof value !== "object" || Array.isArray(value)) {
    pushValidationIssue(ctx, component, path, {
      code: "type-mismatch",
      expected: "object",
      actual: jsType(value)
    });
    return true;
  }
  const obj = value;
  const props = s["properties"] && typeof s["properties"] === "object" ? s["properties"] : NO_PROPS;
  const required = Array.isArray(s["required"]) ? s["required"] : NO_REQUIRED;
  let invalid = false;
  if (!ctx.partial) {
    for (const key of required) {
      const present = key in obj;
      if (!present || obj[key] == null) {
        const fallback = getSchemaDefaultValue(props[key]);
        if (fallback !== void 0) {
          obj[key] = fallback;
          continue;
        }
        pushValidationIssue(ctx, component, `${path}/${key}`, {
          code: present ? "null-required" : "missing-required"
        });
        invalid = true;
      }
    }
  }
  for (const key of Object.keys(props)) {
    if (key in obj) {
      const sub = props[key];
      if (validateSchemaValue(obj[key], sub, component, `${path}/${key}`, ctx)) {
        if (resolveInvalidValue(obj, key, required.includes(key), getSchemaDefaultValue(sub))) {
          invalid = true;
        }
      }
    }
  }
  return invalid;
}
function validateArrayValue(value, s, component, path, ctx) {
  if (!Array.isArray(value)) {
    pushValidationIssue(ctx, component, path, {
      code: "type-mismatch",
      expected: "array",
      actual: jsType(value)
    });
    return true;
  }
  const items = s["items"];
  if (!items || typeof items !== "object" || Array.isArray(items)) return false;
  let invalid;
  for (let i = 0; i < value.length; i++) {
    if (validateSchemaValue(value[i], items, component, `${path}/${i}`, ctx)) {
      (invalid ??= []).push(i);
    }
  }
  if (invalid) {
    for (let i = invalid.length - 1; i >= 0; i--) value.splice(invalid[i], 1);
  }
  return false;
}
function validateLeafValue(value, s, component, path, ctx) {
  const leaf = getScalarTypeInfo(s);
  if (leaf.expectedType == null && leaf.enumValues == null) return false;
  if (leaf.enumValues && ctx.partial) return false;
  const mismatch = checkTypeMismatch(value, leaf);
  if (mismatch) {
    pushValidationIssue(ctx, component, path, { code: "type-mismatch", ...mismatch });
    return true;
  }
  return false;
}
function validateSchemaValue(value, schema, component, path, ctx) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return false;
  const s = schema;
  if (value == null) return false;
  if (isASTNode(value)) return false;
  if (isElementNode(value)) return validateElementPosition(value, s, component, path, ctx);
  if (isCompositeSchema(s)) return false;
  const type = s["type"];
  if (type === "object") return validateObjectValue(value, s, component, path, ctx);
  if (type === "array") return validateArrayValue(value, s, component, path, ctx);
  return validateLeafValue(value, s, component, path, ctx);
}

// src/Browser/lang/materialize.js
function containsDynamicValue(v) {
  if (v == null || typeof v !== "object") return false;
  if (isASTNode(v)) return true;
  if (Array.isArray(v)) return v.some(containsDynamicValue);
  if (isElementNode(v)) {
    return Object.values(v.props).some(containsDynamicValue);
  }
  const obj = v;
  return Object.values(obj).some(containsDynamicValue);
}
function resolveRef(name, ctx, mode) {
  if (ctx.visited.has(name)) {
    ctx.unres.push(name);
    return mode === "expr" ? { k: "Ph", n: name } : null;
  }
  if (!ctx.syms.has(name)) {
    ctx.unres.push(name);
    return mode === "expr" ? { k: "Ph", n: name } : null;
  }
  const target = ctx.syms.get(name);
  ctx.unreached?.delete(name);
  if (target.k === "Comp" && isReservedCall(target.name)) {
    const refType = target.name === RESERVED_CALLS.Mutation ? "mutation" : "query";
    return { k: "RuntimeRef", n: name, refType };
  }
  ctx.visited.add(name);
  const prevStatementId = ctx.currentStatementId;
  ctx.currentStatementId = name;
  try {
    const result = mode === "value" ? materializeValue(target, ctx) : materializeExpr(target, ctx);
    if (mode === "value" && isElementNode(result)) {
      result.statementId = name;
    }
    return result;
  } finally {
    ctx.currentStatementId = prevStatementId;
    ctx.visited.delete(name);
  }
}
function materializeLazyBuiltin(node, ctx, scopedRefs) {
  if (!LAZY_BUILTINS.has(node.name) || node.args.length < 3) return null;
  const varArg = node.args[1];
  const varName = varArg.k === "Ref" ? varArg.n : varArg.k === "Str" ? varArg.v : null;
  if (!varName) return null;
  const nextScopedRefs = new Set(scopedRefs);
  nextScopedRefs.add(varName);
  const recursedArgs = node.args.map(
    (a, i) => i === 1 ? a : materializeExprInternal(a, ctx, nextScopedRefs)
  );
  return { ...node, args: recursedArgs };
}
function materializeExprInternal(node, ctx, scopedRefs) {
  switch (node.k) {
    case "Ref":
      return scopedRefs.has(node.n) ? node : resolveRef(node.n, ctx, "expr");
    case "Ph":
      return node;
    case "Comp": {
      const lazy = materializeLazyBuiltin(node, ctx, scopedRefs);
      if (lazy) return lazy;
      const recursedArgs = node.args.map((a) => materializeExprInternal(a, ctx, scopedRefs));
      if (isBuiltin(node.name) || isReservedCall(node.name)) {
        return { ...node, args: recursedArgs };
      }
      const def = ctx.cat?.get(node.name);
      if (def) {
        const mappedProps = {};
        for (let i = 0; i < def.params.length && i < recursedArgs.length; i++) {
          mappedProps[def.params[i].name] = recursedArgs[i];
        }
        return { ...node, args: recursedArgs, mappedProps };
      }
      pushValidationIssue(ctx, node.name, "", {
        code: "unknown-component",
        available: ctx.cat && [...ctx.cat.keys()]
      });
      return { ...node, args: recursedArgs };
    }
    case "Arr":
      return { ...node, els: node.els.map((e) => materializeExprInternal(e, ctx, scopedRefs)) };
    case "Obj":
      return {
        ...node,
        entries: node.entries.map(
          ([k, v]) => [k, materializeExprInternal(v, ctx, scopedRefs)]
        )
      };
    case "BinOp":
      return {
        ...node,
        left: materializeExprInternal(node.left, ctx, scopedRefs),
        right: materializeExprInternal(node.right, ctx, scopedRefs)
      };
    case "UnaryOp":
      return { ...node, operand: materializeExprInternal(node.operand, ctx, scopedRefs) };
    case "Ternary":
      return {
        ...node,
        cond: materializeExprInternal(node.cond, ctx, scopedRefs),
        then: materializeExprInternal(node.then, ctx, scopedRefs),
        else: materializeExprInternal(node.else, ctx, scopedRefs)
      };
    case "Member":
      return { ...node, obj: materializeExprInternal(node.obj, ctx, scopedRefs) };
    case "Index":
      return {
        ...node,
        obj: materializeExprInternal(node.obj, ctx, scopedRefs),
        index: materializeExprInternal(node.index, ctx, scopedRefs)
      };
    case "Assign":
      return { ...node, value: materializeExprInternal(node.value, ctx, scopedRefs) };
    // Literals, StateRef, RuntimeRef — pass through unchanged
    default:
      return node;
  }
}
function materializeExpr(node, ctx) {
  return materializeExprInternal(node, ctx, /* @__PURE__ */ new Set());
}
function materializeValue(node, ctx) {
  switch (node.k) {
    // ── Ref resolution ───────────────────────────────────────────────────
    case "Ref":
      return resolveRef(node.n, ctx, "value");
    // ── Literals → plain values ──────────────────────────────────────────
    case "Str":
      return node.v;
    case "Num":
      return node.v;
    case "Bool":
      return node.v;
    case "Null":
      return null;
    case "Ph":
      return null;
    // ── Collections ──────────────────────────────────────────────────────
    case "Arr": {
      const items = [];
      for (const e of node.els) {
        if (e.k === "Ph") continue;
        const value = materializeValue(e, ctx);
        if (value === null && (e.k === "Comp" || e.k === "Ref")) continue;
        items.push(value);
      }
      return items;
    }
    case "Obj": {
      const o = {};
      for (const [k, v] of node.entries) o[k] = materializeValue(v, ctx);
      return o;
    }
    // ── Component nodes ──────────────────────────────────────────────────
    case "Comp": {
      const { name, args } = node;
      if (isBuiltin(name)) {
        const lazy = materializeLazyBuiltin(node, ctx, /* @__PURE__ */ new Set());
        if (lazy) return lazy;
        return { ...node, args: args.map((a) => materializeExpr(a, ctx)) };
      }
      if (isReservedCall(name)) {
        pushValidationIssue(ctx, name, "", { code: "inline-reserved" });
        return null;
      }
      const def = ctx.cat?.get(name);
      const props = {};
      if (def) {
        let dropComponent = false;
        for (let i = 0; i < def.params.length && i < args.length; i++) {
          const param = def.params[i];
          const value = materializeValue(args[i], ctx);
          props[param.name] = value;
          if (param.schema !== void 0 && validateSchemaValue(value, param.schema, name, `/${param.name}`, ctx)) {
            if (resolveInvalidValue(props, param.name, param.required, param.defaultValue)) {
              dropComponent = true;
            }
          }
        }
        if (args.length > def.params.length) {
          pushValidationIssue(ctx, name, "", {
            code: "excess-args",
            declared: def.params.length,
            got: args.length
          });
        }
        const missingRequired = def.params.filter(
          (p) => p.required && (!(p.name in props) || props[p.name] === null)
        );
        if (missingRequired.length) {
          const stillInvalid = missingRequired.filter((p) => {
            if (p.defaultValue !== void 0) {
              props[p.name] = p.defaultValue;
              return false;
            }
            return true;
          });
          if (stillInvalid.length) {
            for (const p of stillInvalid) {
              pushValidationIssue(ctx, name, `/${p.name}`, {
                code: p.name in props ? "null-required" : "missing-required",
                signature: buildParamsSignature(name, def.params)
              });
            }
            return null;
          }
        }
        if (dropComponent) return null;
      } else if (!isBuiltin(name) && !isReservedCall(name)) {
        pushValidationIssue(ctx, name, "", {
          code: "unknown-component",
          available: ctx.cat && [...ctx.cat.keys()]
        });
        return null;
      }
      const hasDynamicProps = Object.values(props).some((v) => containsDynamicValue(v));
      return { type: "element", typeName: name, props, partial: ctx.partial, hasDynamicProps };
    }
    // ── Runtime expression nodes → preserve as ASTNode, normalize children ─
    default: {
      if (isRuntimeExpr(node)) {
        return materializeExpr(node, ctx);
      }
      return node;
    }
  }
}

// src/Browser/lang/statements.js
function autoClose(input) {
  const stack = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === "\\" && inStr) {
      esc = true;
      continue;
    }
    if (inStr) {
      if (c === inStr) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") stack.push(c);
    else if (c === ")" && stack[stack.length - 1] === "(") stack.pop();
    else if (c === "]" && stack[stack.length - 1] === "[") stack.pop();
    else if (c === "}" && stack[stack.length - 1] === "{") stack.pop();
  }
  const wasIncomplete = !!inStr || stack.length > 0;
  if (!wasIncomplete) return { text: input, wasIncomplete: false };
  let out = input;
  if (inStr) {
    if (esc) out += "\\";
    out += inStr;
  }
  for (let j = stack.length - 1; j >= 0; j--)
    out += stack[j] === "(" ? ")" : stack[j] === "[" ? "]" : "}";
  return { text: out, wasIncomplete: true };
}
function split(tokens) {
  const stmts = [];
  let pos = 0;
  while (pos < tokens.length) {
    while (pos < tokens.length && tokens[pos].t === T.Newline) pos++;
    if (pos >= tokens.length || tokens[pos].t === T.EOF) break;
    const tok = tokens[pos];
    if (tok.t !== T.Ident && tok.t !== T.Type && tok.t !== T.StateVar) {
      while (pos < tokens.length && tokens[pos].t !== T.Newline && tokens[pos].t !== T.EOF) pos++;
      continue;
    }
    const id = tok.v;
    const idTokenType = tok.t;
    pos++;
    if (pos >= tokens.length || tokens[pos].t !== T.Equals) {
      while (pos < tokens.length && tokens[pos].t !== T.Newline && tokens[pos].t !== T.EOF) pos++;
      continue;
    }
    pos++;
    const expr = [];
    let depth = 0;
    let ternaryDepth = 0;
    while (pos < tokens.length && tokens[pos].t !== T.EOF) {
      const tt = tokens[pos].t;
      if (tt === T.Newline && depth <= 0 && ternaryDepth <= 0) {
        let peek = pos + 1;
        while (peek < tokens.length && tokens[peek].t === T.Newline) peek++;
        const nextT = peek < tokens.length ? tokens[peek].t : T.EOF;
        if (nextT === T.Question || nextT === T.Colon && ternaryDepth > 0) {
          pos++;
          continue;
        }
        break;
      }
      if (tt === T.Newline) {
        pos++;
        continue;
      }
      if (tt === T.LParen || tt === T.LBrack || tt === T.LBrace) depth++;
      else if ((tt === T.RParen || tt === T.RBrack || tt === T.RBrace) && depth > 0) depth--;
      else if (tt === T.Question && depth === 0) ternaryDepth++;
      else if (tt === T.Colon && depth === 0 && ternaryDepth > 0) ternaryDepth--;
      expr.push(tokens[pos++]);
    }
    if (expr.length) stmts.push({ id, idTokenType, tokens: expr });
  }
  return stmts;
}

// src/Browser/lang/parser.js
function emptyResult(incomplete = true) {
  return {
    root: null,
    meta: {
      incomplete,
      unresolved: [],
      orphaned: [],
      statementCount: 0,
      errors: []
    },
    stateDeclarations: {},
    queryStatements: [],
    mutationStatements: []
  };
}
function collectQueryDeps(node) {
  if (!isASTNode(node)) return [];
  const refs = /* @__PURE__ */ new Set();
  walkAST(node, (current) => {
    if (current.k === "StateRef") refs.add(current.n);
  });
  return [...refs];
}
function classifyStatement(raw, expr) {
  if (expr.k === "Comp" && expr.name === RESERVED_CALLS.Query) {
    const deps = collectQueryDeps(expr.args[1]);
    return {
      kind: "query",
      id: raw.id,
      call: { callee: RESERVED_CALLS.Query, args: expr.args },
      expr,
      deps: deps.length > 0 ? deps : void 0
    };
  }
  if (expr.k === "Comp" && expr.name === RESERVED_CALLS.Mutation) {
    return {
      kind: "mutation",
      id: raw.id,
      call: { callee: RESERVED_CALLS.Mutation, args: expr.args },
      expr
    };
  }
  if (raw.idTokenType === T.StateVar) {
    return { kind: "state", id: raw.id, init: expr };
  }
  return { kind: "value", id: raw.id, expr };
}
function extractStatements(stmts, ctx) {
  const stateDeclarations = {};
  const queryStatements = [];
  const mutationStatements = [];
  for (const stmt of stmts) {
    switch (stmt.kind) {
      case "state":
        stateDeclarations[stmt.id] = materializeValue(stmt.init, ctx);
        break;
      case "query":
        queryStatements.push({
          statementId: stmt.id,
          toolAST: stmt.call.args[0] ?? null,
          argsAST: stmt.call.args[1] ?? null,
          defaultsAST: stmt.call.args[2] ?? null,
          refreshAST: stmt.call.args[3] ?? null,
          deps: stmt.deps,
          complete: true
        });
        break;
      case "mutation":
        mutationStatements.push({
          statementId: stmt.id,
          toolAST: stmt.call.args[0] ?? null,
          argsAST: stmt.call.args[1] ?? null
        });
        break;
    }
  }
  for (const stmt of stmts) {
    const nodes = stmt.kind === "state" ? [stmt.init] : stmt.kind === "value" ? [stmt.expr] : stmt.kind === "query" || stmt.kind === "mutation" ? stmt.call.args : [];
    for (const node of nodes) {
      for (const dep of collectQueryDeps(node)) {
        if (!(dep in stateDeclarations)) {
          stateDeclarations[dep] = null;
        }
      }
    }
  }
  return { stateDeclarations, queryStatements, mutationStatements };
}
var DEFAULT_ROOT_STATEMENT_ID = "root";
function isComponentStatement(stmt) {
  return stmt.kind === "value" && stmt.expr.k === "Comp" && !isBuiltin(stmt.expr.name) && stmt.expr.name !== RESERVED_CALLS.Query && stmt.expr.name !== RESERVED_CALLS.Mutation;
}
function pickEntryId(stmtMap, typedStmts, firstId, rootName) {
  if (stmtMap.has(DEFAULT_ROOT_STATEMENT_ID)) return DEFAULT_ROOT_STATEMENT_ID;
  if (rootName && stmtMap.has(rootName)) return rootName;
  const preferredComponent = rootName ? typedStmts.find((stmt) => isComponentStatement(stmt) && stmt.expr.name === rootName) : void 0;
  if (preferredComponent) return preferredComponent.id;
  const firstComponent = typedStmts.find(isComponentStatement);
  return firstComponent?.id ?? firstId;
}
function buildResult(stmtMap, typedStmts, firstId, wasIncomplete, stmtCount, cat, rootName) {
  const entryId = pickEntryId(stmtMap, typedStmts, firstId, rootName);
  if (!stmtMap.has(entryId)) return emptyResult(wasIncomplete);
  const syms = /* @__PURE__ */ new Map();
  for (const [id, stmt] of stmtMap) {
    syms.set(id, stmt.kind === "state" ? stmt.init : stmt.expr);
  }
  const unres = [];
  const errors = [];
  const unreached = /* @__PURE__ */ new Set();
  for (const [id, stmt] of stmtMap) {
    if (id === entryId) continue;
    if (stmt.kind === "state" || stmt.kind === "query" || stmt.kind === "mutation") continue;
    unreached.add(id);
  }
  const ctx = {
    syms,
    cat,
    errors,
    unres,
    visited: /* @__PURE__ */ new Set(),
    partial: wasIncomplete,
    currentStatementId: entryId,
    unreached
  };
  const materialized = materializeValue(syms.get(entryId), ctx);
  const root = isElementNode(materialized) ? materialized : null;
  if (root) root.statementId = entryId;
  const { stateDeclarations, queryStatements, mutationStatements } = extractStatements(
    typedStmts,
    ctx
  );
  const orphaned = [...unreached];
  return {
    root,
    meta: {
      incomplete: wasIncomplete,
      unresolved: unres,
      orphaned,
      statementCount: stmtCount,
      errors
    },
    stateDeclarations,
    queryStatements,
    mutationStatements
  };
}
function skipString(input, start) {
  if (input[start] !== '"') return start;
  let i = start + 1;
  while (i < input.length) {
    const c = input[i];
    if (c === "\\") {
      i += 2;
    } else if (c === '"') {
      return i + 1;
    } else {
      i++;
    }
  }
  return i;
}
function stripFences(input) {
  const blocks = [];
  let i = 0;
  while (i < input.length) {
    let fenceStart = -1;
    while (i < input.length) {
      const nextI = skipString(input, i);
      if (nextI > i) {
        i = nextI;
        continue;
      }
      const c = input[i];
      if (c === "`" && i + 1 < input.length && input[i + 1] === "`" && i + 2 < input.length && input[i + 2] === "`") {
        fenceStart = i;
        break;
      }
      i++;
    }
    if (fenceStart === -1) break;
    let j = fenceStart + 3;
    while (j < input.length && input[j] !== "\n") j++;
    if (j >= input.length) {
      blocks.push(input.slice(fenceStart + 3).replace(/^[^\n]*\n?/, ""));
      i = input.length;
      break;
    }
    j++;
    let closePos = -1;
    let k = j;
    while (k < input.length) {
      const nextK = skipString(input, k);
      if (nextK > k) {
        k = nextK;
        continue;
      }
      const c = input[k];
      if (c === "`" && k + 1 < input.length && input[k + 1] === "`" && k + 2 < input.length && input[k + 2] === "`") {
        closePos = k;
        break;
      }
      k++;
    }
    if (closePos !== -1) {
      blocks.push(input.slice(j, closePos));
      i = closePos + 3;
    } else {
      blocks.push(input.slice(j));
      i = input.length;
    }
  }
  if (blocks.length > 0) return blocks.join("\n");
  return input;
}
function stripComments(input) {
  let inStr = false;
  return input.split("\n").map((line) => {
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inStr) {
        if (c === "\\" && i + 1 < line.length) {
          i++;
          continue;
        }
        if (c === inStr) inStr = false;
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = c;
        continue;
      }
      if (c === "/" && line[i + 1] === "/") {
        return line.substring(0, i).trimEnd();
      }
      if (c === "#") {
        return line.substring(0, i).trimEnd();
      }
    }
    return line;
  }).join("\n");
}
function preprocess(input) {
  return stripComments(stripFences(input.trim())).trim();
}
function createStreamParser(cat, rootName) {
  let buf = "";
  let cleaned = "";
  let completedEnd = 0;
  const completedStmtMap = /* @__PURE__ */ new Map();
  let completedCount = 0;
  let firstId = "";
  function addStmt(text2) {
    const t = text2.trim();
    if (!t) return;
    for (const s of split(tokenize(t))) {
      const expr = parseExpression(s.tokens);
      const stmt = classifyStatement(s, expr);
      completedStmtMap.set(s.id, stmt);
      completedCount++;
      if (!firstId) firstId = s.id;
    }
  }
  function refreshCleaned() {
    const next = preprocess(buf);
    if (!next.startsWith(cleaned.slice(0, completedEnd))) {
      completedEnd = 0;
      completedStmtMap.clear();
      completedCount = 0;
      firstId = "";
    }
    cleaned = next;
  }
  function scanNewCompleted() {
    let depth = 0, ternaryDepth = 0, inStr = false, esc = false;
    let stmtStart = completedEnd;
    for (let i = completedEnd; i < cleaned.length; i++) {
      const c = cleaned[i];
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\" && inStr) {
        esc = true;
        continue;
      }
      if (inStr) {
        if (c === inStr) inStr = false;
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = c;
        continue;
      }
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") depth = Math.max(0, depth - 1);
      else if (c === "?" && depth === 0) ternaryDepth++;
      else if (c === ":" && depth === 0 && ternaryDepth > 0) ternaryDepth--;
      else if (c === "\n" && depth <= 0 && ternaryDepth <= 0) {
        let peek = i + 1;
        while (peek < cleaned.length && (cleaned[peek] === " " || cleaned[peek] === "	" || cleaned[peek] === "\r" || cleaned[peek] === "\n"))
          peek++;
        if (peek < cleaned.length && (cleaned[peek] === "?" || cleaned[peek] === ":" && ternaryDepth > 0)) {
          continue;
        }
        const t = cleaned.slice(stmtStart, i).trim();
        if (t) addStmt(t);
        stmtStart = i + 1;
        completedEnd = i + 1;
      }
    }
    return stmtStart;
  }
  function currentResult() {
    refreshCleaned();
    const pendingStart = scanNewCompleted();
    const pendingText = cleaned.slice(pendingStart).trim();
    if (!pendingText) {
      if (completedCount === 0) return emptyResult();
      return buildResult(
        completedStmtMap,
        [...completedStmtMap.values()],
        firstId,
        false,
        completedCount,
        cat,
        rootName
      );
    }
    const { text: closed, wasIncomplete } = autoClose(pendingText);
    const stmts = split(tokenize(closed));
    if (!stmts.length) {
      if (completedCount === 0) return emptyResult(wasIncomplete);
      return buildResult(
        completedStmtMap,
        [...completedStmtMap.values()],
        firstId,
        wasIncomplete,
        completedCount,
        cat,
        rootName
      );
    }
    const allStmtMap = new Map(completedStmtMap);
    for (const s of stmts) {
      if (completedStmtMap.has(s.id)) continue;
      const expr = parseExpression(s.tokens);
      const stmt = classifyStatement(s, expr);
      allStmtMap.set(s.id, stmt);
    }
    const allTypedStmts = [...allStmtMap.values()];
    const fid = firstId || stmts[0].id;
    return buildResult(
      allStmtMap,
      allTypedStmts,
      fid,
      wasIncomplete,
      completedCount + stmts.length,
      cat,
      rootName
    );
  }
  function reset() {
    buf = "";
    cleaned = "";
    completedEnd = 0;
    completedStmtMap.clear();
    completedCount = 0;
    firstId = "";
  }
  return {
    push(chunk) {
      buf += chunk;
      return currentResult();
    },
    set(fullText) {
      if (fullText.length < buf.length || !fullText.startsWith(buf)) {
        reset();
      }
      const delta = fullText.slice(buf.length);
      if (delta) buf += delta;
      return currentResult();
    },
    getResult: currentResult
  };
}
function compileSchema(schema) {
  const map = /* @__PURE__ */ new Map();
  const defs = schema.$defs ?? {};
  for (const [name, def] of Object.entries(defs)) {
    const properties = def.properties ?? {};
    const required = def.required ?? [];
    const params = Object.keys(properties).map((key) => ({
      name: key,
      required: required.includes(key),
      defaultValue: getSchemaDefaultValue(properties[key]),
      schema: properties[key]
    }));
    map.set(name, { params });
  }
  return map;
}
function createStreamingParser(schema, rootName) {
  return createStreamParser(compileSchema(schema), rootName);
}

// src/Browser/lang/limits.js
var DEFAULT_LIMITS = Object.freeze({
  maxSourceBytes: 512e3,
  maxStatements: 2e3,
  maxDepth: 64,
  maxExpressionOps: 1e4
});
function checkSourceLimits(input, limits = DEFAULT_LIMITS) {
  if (typeof input !== "string") {
    return { ok: false, error: { code: "invalid-input", message: "source must be a string" } };
  }
  if (input.length > limits.maxSourceBytes) {
    return {
      ok: false,
      error: {
        code: "source-too-large",
        message: `Source exceeds ${limits.maxSourceBytes} bytes`
      }
    };
  }
  return { ok: true };
}
function checkStatementCount(count, limits = DEFAULT_LIMITS) {
  if (count > limits.maxStatements) {
    return {
      ok: false,
      error: {
        code: "too-many-statements",
        message: `Program exceeds ${limits.maxStatements} statements`
      }
    };
  }
  return { ok: true };
}

// src/Browser/lang/librarySchema.js
function libraryToJsonSchema(library) {
  const defs = {};
  for (const [name, comp] of Object.entries(library.components)) {
    const properties = {};
    for (const prop of comp.propertyOrder) {
      properties[prop] = comp.properties[prop] || { type: "any" };
    }
    defs[name] = {
      type: "object",
      properties,
      required: comp.required || [],
      additionalProperties: false,
      description: comp.prompt?.description
    };
  }
  return { $defs: defs };
}

// src/Browser/lang/index.js
function wrapResult(result, limits) {
  const chk = checkStatementCount(result.meta?.statementCount ?? 0, limits);
  if (!chk.ok) {
    result.meta.errors = [...result.meta.errors || [], chk.error];
  }
  return result;
}
function createStreamingParser2(schema, rootName, limits = DEFAULT_LIMITS) {
  const inner = createStreamingParser(schema, rootName);
  return {
    push(chunk) {
      const pre = checkSourceLimits(chunk, limits);
      if (!pre.ok) {
        return {
          root: null,
          meta: {
            incomplete: true,
            unresolved: [],
            orphaned: [],
            statementCount: 0,
            errors: [pre.error]
          },
          stateDeclarations: {},
          queryStatements: [],
          mutationStatements: []
        };
      }
      return wrapResult(inner.push(chunk), limits);
    },
    set(input) {
      return this.push(input);
    },
    getResult() {
      return wrapResult(inner.getResult(), limits);
    }
  };
}

// src/Browser/lang/contractLoader.js
function validateLibrary(library) {
  if (!library || typeof library !== "object") {
    throw new Error("Library root must be an object");
  }
  for (const key of ["contractFormatVersion", "id", "variant", "root", "components"]) {
    if (!(key in library)) {
      throw new Error(`Library missing required field: ${key}`);
    }
  }
  const components = library.components;
  if (!components || typeof components !== "object") {
    throw new Error("components must be an object/map");
  }
  for (const [key, component] of Object.entries(components)) {
    validateComponent(key, component);
  }
  if (!(library.root in components)) {
    throw new Error(`root component '${library.root}' is not in components`);
  }
  return library;
}
function validateComponent(key, component) {
  for (const field of [
    "name",
    "version",
    "propertyOrder",
    "properties",
    "required",
    "reactiveProps",
    "renderer",
    "securityCapabilities",
    "prompt"
  ]) {
    if (!(field in component)) {
      throw new Error(`Component ${key} missing field: ${field}`);
    }
  }
  if (component.name !== key) {
    throw new Error(`Component key '${key}' must equal name`);
  }
  if (!Array.isArray(component.propertyOrder)) {
    throw new Error(`${key}.propertyOrder must be an array`);
  }
  if (!("allowedChildren" in component)) {
    throw new Error(`${key}.allowedChildren is required (null for leaf)`);
  }
  if (!Array.isArray(component.reactiveProps)) {
    throw new Error(`${key}.reactiveProps must be an array (use [] if none)`);
  }
  for (const prop of component.propertyOrder) {
    if (!(prop in component.properties)) {
      throw new Error(`${key}.propertyOrder lists '${prop}' but properties map lacks it`);
    }
  }
  for (const prop of Object.keys(component.properties)) {
    if (!component.propertyOrder.includes(prop)) {
      throw new Error(`${key}.properties has '${prop}' missing from propertyOrder`);
    }
  }
  for (const prop of component.reactiveProps) {
    if (!component.propertyOrder.includes(prop)) {
      throw new Error(`${key}.reactiveProps '${prop}' is not in propertyOrder`);
    }
  }
  for (const prop of component.required) {
    if (!component.propertyOrder.includes(prop)) {
      throw new Error(`${key}.required '${prop}' is not in propertyOrder`);
    }
  }
}
function loadLibraryJson(jsonText) {
  return validateLibrary(JSON.parse(jsonText));
}

// src/Browser/transport/eventReducer.js
var eventReducer_exports = {};
__export(eventReducer_exports, {
  EventType: () => EventType,
  MAX_DIAGNOSTIC_DETAIL_CHARS: () => MAX_DIAGNOSTIC_DETAIL_CHARS,
  MAX_DIAGNOSTIC_ENTRIES: () => MAX_DIAGNOSTIC_ENTRIES,
  createEventReducer: () => createEventReducer,
  createInitialState: () => createInitialState,
  default: () => eventReducer_default,
  freezeState: () => freezeState,
  reduceEvent: () => reduceEvent,
  reduceEvents: () => reduceEvents,
  summarizeState: () => summarizeState
});
var EventType = Object.freeze({
  RUN_STARTED: "RUN_STARTED",
  RUN_FINISHED: "RUN_FINISHED",
  RUN_ERROR: "RUN_ERROR",
  TEXT_MESSAGE_START: "TEXT_MESSAGE_START",
  TEXT_MESSAGE_CONTENT: "TEXT_MESSAGE_CONTENT",
  TEXT_MESSAGE_END: "TEXT_MESSAGE_END",
  TEXT_MESSAGE_CHUNK: "TEXT_MESSAGE_CHUNK",
  TOOL_CALL_START: "TOOL_CALL_START",
  TOOL_CALL_ARGS: "TOOL_CALL_ARGS",
  TOOL_CALL_END: "TOOL_CALL_END",
  TOOL_CALL_RESULT: "TOOL_CALL_RESULT",
  TOOL_CALL_CHUNK: "TOOL_CALL_CHUNK",
  /** Adapter → reducer: skipped non-terminal malformed wire frame */
  DIAGNOSTIC_SKIP: "DIAGNOSTIC_SKIP",
  /** Adapter → reducer: cooperative cancel */
  RUN_CANCELLED: "RUN_CANCELLED"
});
var MAX_DIAGNOSTIC_ENTRIES = 32;
var MAX_DIAGNOSTIC_DETAIL_CHARS = 240;
function clipDetail(value, max = MAX_DIAGNOSTIC_DETAIL_CHARS) {
  let s;
  if (typeof value === "string") s = value;
  else {
    try {
      s = JSON.stringify(value);
    } catch {
      s = String(value);
    }
  }
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\u2026`;
}
function createInitialState(options = {}) {
  return {
    runId: options.runId ?? null,
    runStatus: (
      /** @type {RunStatus} */
      "idle"
    ),
    messages: [],
    tools: [],
    currentMessageId: null,
    isStreaming: false,
    cancelled: false,
    error: null,
    diagnostics: {
      skippedMalformed: 0,
      entries: []
    }
  };
}
function freezeState(state) {
  const clone = structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
  return deepFreeze(clone);
}
function deepFreeze(obj) {
  if (obj && typeof obj === "object") {
    Object.freeze(obj);
    for (const v of Object.values(obj)) deepFreeze(v);
  }
  return obj;
}
function summarizeState(state) {
  const lastTool = state.tools.length ? state.tools[state.tools.length - 1] : null;
  let toolStatus = null;
  if (lastTool) {
    toolStatus = lastTool.status === "result" || lastTool.status === "complete" ? "complete" : lastTool.status;
  }
  return {
    messages: state.messages.length,
    runStatus: state.runStatus,
    toolStatus,
    skippedMalformed: state.diagnostics.skippedMalformed,
    tools: state.tools.length,
    isStreaming: state.isStreaming,
    cancelled: state.cancelled,
    error: state.error
  };
}
function pushDiagnostic(state, entry) {
  const next = {
    ...state,
    diagnostics: {
      ...state.diagnostics,
      entries: [
        ...state.diagnostics.entries,
        {
          kind: entry.kind,
          detail: clipDetail(entry.detail ?? ""),
          at: state.diagnostics.entries.length
        }
      ].slice(-MAX_DIAGNOSTIC_ENTRIES)
    }
  };
  if (entry.kind === "malformed" || entry.kind === "skip") {
    next.diagnostics = {
      ...next.diagnostics,
      skippedMalformed: state.diagnostics.skippedMalformed + 1
    };
  }
  return next;
}
function ensureMessage(state, messageId, role = "assistant") {
  const idx = state.messages.findIndex((m) => m.id === messageId);
  if (idx !== -1) {
    return { state, index: idx };
  }
  const messages = [
    ...state.messages,
    {
      id: messageId,
      role,
      content: "",
      status: (
        /** @type {MessageStatus} */
        "streaming"
      )
    }
  ];
  return {
    state: { ...state, messages, currentMessageId: messageId },
    index: messages.length - 1
  };
}
function ensureTool(state, toolCallId, name = "") {
  const idx = state.tools.findIndex((t) => t.id === toolCallId);
  if (idx !== -1) {
    const tools2 = [...state.tools];
    if (name && !tools2[idx].name) {
      tools2[idx] = { ...tools2[idx], name };
    }
    return { state: { ...state, tools: tools2 }, index: idx };
  }
  const tools = [
    ...state.tools,
    {
      id: toolCallId,
      name: name || "",
      args: "",
      status: (
        /** @type {ToolStatus} */
        "streaming"
      ),
      result: null,
      error: null
    }
  ];
  return { state: { ...state, tools }, index: tools.length - 1 };
}
function reduceEvent(state, event) {
  if (event == null || typeof event !== "object") {
    return pushDiagnostic(state, { kind: "malformed", detail: event });
  }
  if ("raw" in event && !event.type) {
    return pushDiagnostic(state, { kind: "malformed", detail: event.raw });
  }
  const type = typeof event.type === "string" ? event.type : "";
  if (!type) {
    return pushDiagnostic(state, { kind: "malformed", detail: event });
  }
  switch (type) {
    case EventType.RUN_STARTED: {
      const runId = typeof event.runId === "string" ? event.runId : typeof event.threadId === "string" ? event.threadId : state.runId;
      return {
        ...state,
        runId: runId ?? state.runId,
        runStatus: "running",
        isStreaming: true,
        cancelled: false,
        error: null
      };
    }
    case EventType.RUN_FINISHED: {
      if (state.cancelled) return state;
      const runId = typeof event.runId === "string" ? event.runId : state.runId;
      return {
        ...state,
        runId: runId ?? state.runId,
        runStatus: "finished",
        isStreaming: false
      };
    }
    case EventType.RUN_ERROR: {
      const raw = event.message ?? event.error ?? "Stream error";
      const errorText = typeof raw === "string" ? raw : clipDetail(raw);
      const tools = state.tools.map(
        (t) => t.status === "streaming" || t.status === "executing" ? { ...t, status: (
          /** @type {ToolStatus} */
          "error"
        ), error: errorText } : t
      );
      return {
        ...state,
        runStatus: "error",
        isStreaming: false,
        error: errorText,
        tools
      };
    }
    case EventType.RUN_CANCELLED: {
      return {
        ...state,
        runStatus: "cancelled",
        isStreaming: false,
        cancelled: true
      };
    }
    case EventType.TEXT_MESSAGE_START: {
      const messageId = typeof event.messageId === "string" && event.messageId ? event.messageId : `msg-${state.messages.length + 1}`;
      const role = typeof event.role === "string" ? event.role : "assistant";
      const { state: s } = ensureMessage(state, messageId, role);
      return { ...s, isStreaming: true };
    }
    case EventType.TEXT_MESSAGE_CONTENT:
    case EventType.TEXT_MESSAGE_CHUNK: {
      const delta = typeof event.delta === "string" ? event.delta : "";
      if (!delta) return state;
      let messageId = typeof event.messageId === "string" && event.messageId ? event.messageId : state.currentMessageId;
      if (!messageId) {
        messageId = `msg-${state.messages.length + 1}`;
      }
      const role = typeof event.role === "string" ? event.role : "assistant";
      const { state: withMsg, index } = ensureMessage(state, messageId, role);
      const messages = [...withMsg.messages];
      const prev = messages[index];
      messages[index] = {
        ...prev,
        content: (prev.content || "") + delta,
        status: "streaming"
      };
      return {
        ...withMsg,
        messages,
        currentMessageId: messageId,
        isStreaming: true
      };
    }
    case EventType.TEXT_MESSAGE_END: {
      const messageId = typeof event.messageId === "string" && event.messageId ? event.messageId : state.currentMessageId;
      if (!messageId) return state;
      const messages = state.messages.map(
        (m) => m.id === messageId ? { ...m, status: (
          /** @type {MessageStatus} */
          "complete"
        ) } : m
      );
      return { ...state, messages };
    }
    case EventType.TOOL_CALL_START: {
      const toolCallId = typeof event.toolCallId === "string" ? event.toolCallId : "";
      if (!toolCallId) {
        return pushDiagnostic(state, { kind: "malformed", detail: event });
      }
      const name = typeof event.toolCallName === "string" && event.toolCallName || typeof event.toolName === "string" && event.toolName || "";
      const { state: s } = ensureTool(state, toolCallId, name);
      return { ...s, isStreaming: true };
    }
    case EventType.TOOL_CALL_ARGS: {
      const toolCallId = typeof event.toolCallId === "string" ? event.toolCallId : "";
      if (!toolCallId) {
        return pushDiagnostic(state, { kind: "malformed", detail: event });
      }
      const delta = typeof event.delta === "string" ? event.delta : "";
      const { state: s, index } = ensureTool(state, toolCallId);
      const tools = [...s.tools];
      const prev = tools[index];
      tools[index] = {
        ...prev,
        args: (prev.args || "") + delta,
        status: "streaming"
      };
      return { ...s, tools, isStreaming: true };
    }
    case EventType.TOOL_CALL_END: {
      const toolCallId = typeof event.toolCallId === "string" ? event.toolCallId : "";
      if (!toolCallId) {
        return pushDiagnostic(state, { kind: "malformed", detail: event });
      }
      const { state: s, index } = ensureTool(state, toolCallId);
      const tools = [...s.tools];
      tools[index] = { ...tools[index], status: "executing" };
      return { ...s, tools };
    }
    case EventType.TOOL_CALL_RESULT: {
      const toolCallId = typeof event.toolCallId === "string" ? event.toolCallId : "";
      if (!toolCallId) {
        return pushDiagnostic(state, { kind: "malformed", detail: event });
      }
      const content = typeof event.content === "string" ? event.content : event.content != null ? clipDetail(event.content) : "";
      const failed = event.isError === true || typeof event.error === "string" && event.error.length > 0;
      const errorText = failed ? typeof event.error === "string" && event.error ? event.error : content : null;
      const { state: s, index } = ensureTool(state, toolCallId);
      const tools = [...s.tools];
      tools[index] = {
        ...tools[index],
        status: failed ? "error" : "complete",
        result: content,
        error: errorText
      };
      return { ...s, tools };
    }
    case EventType.TOOL_CALL_CHUNK: {
      const toolCallId = typeof event.toolCallId === "string" ? event.toolCallId : "";
      if (!toolCallId) return state;
      const name = typeof event.toolCallName === "string" && event.toolCallName || typeof event.toolName === "string" && event.toolName || "";
      const delta = typeof event.delta === "string" ? event.delta : "";
      const { state: s, index } = ensureTool(state, toolCallId, name);
      const tools = [...s.tools];
      const prev = tools[index];
      tools[index] = {
        ...prev,
        name: prev.name || name,
        args: (prev.args || "") + delta,
        status: "streaming"
      };
      return { ...s, tools, isStreaming: true };
    }
    case EventType.DIAGNOSTIC_SKIP: {
      return pushDiagnostic(state, {
        kind: "malformed",
        detail: event.detail ?? event.raw ?? event
      });
    }
    default:
      return pushDiagnostic(state, { kind: "unknown_event", detail: type });
  }
}
function reduceEvents(events, initial = createInitialState()) {
  let state = initial;
  for (const event of events) {
    state = reduceEvent(state, event);
  }
  return state;
}
function createEventReducer(options = {}) {
  let state = createInitialState(options);
  return {
    /** @returns {ReturnType<typeof createInitialState>} */
    getState() {
      return state;
    },
    /**
     * @param {Record<string, unknown>|null|undefined} event
     * @returns {ReturnType<typeof createInitialState>}
     */
    dispatch(event) {
      state = reduceEvent(state, event);
      return state;
    },
    /**
     * @param {Iterable<Record<string, unknown>|null|undefined>} events
     */
    dispatchAll(events) {
      state = reduceEvents(events, state);
      return state;
    },
    reset(nextOptions = options) {
      state = createInitialState(nextOptions);
      return state;
    },
    summarize() {
      return summarizeState(state);
    }
  };
}
var eventReducer_default = {
  EventType,
  createInitialState,
  reduceEvent,
  reduceEvents,
  createEventReducer,
  summarizeState,
  freezeState,
  MAX_DIAGNOSTIC_ENTRIES,
  MAX_DIAGNOSTIC_DETAIL_CHARS
};

// src/Browser/transport/sseAdapter.js
var sseAdapter_exports = {};
__export(sseAdapter_exports, {
  DEFAULT_MAX_BUFFER_BYTES: () => DEFAULT_MAX_BUFFER_BYTES,
  consumeSseResponse: () => consumeSseResponse,
  createSseAdapter: () => createSseAdapter,
  default: () => sseAdapter_default,
  parseSseBlock: () => parseSseBlock,
  splitSseBlocks: () => splitSseBlocks
});
var DEFAULT_MAX_BUFFER_BYTES = 256 * 1024;
function parseSseBlock(block) {
  let event = "";
  let id = null;
  let retry = null;
  const dataLines = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      const rest = line.slice(5);
      dataLines.push(rest.startsWith(" ") ? rest.slice(1) : rest);
    } else if (line.startsWith("id:")) {
      id = line.slice(3).trim();
    } else if (line.startsWith("retry:")) {
      const n = Number(line.slice(6).trim());
      if (Number.isFinite(n)) retry = n;
    }
  }
  return {
    event,
    data: dataLines.join("\n"),
    id,
    retry
  };
}
function splitSseBlocks(buffer) {
  const normalized = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = normalized.split("\n\n");
  const rest = parts.pop() ?? "";
  const blocks = parts.filter((b) => b.trim().length > 0);
  return { blocks, rest };
}
function parseAgUiPayload(data) {
  const trimmed = data.trim();
  if (!trimmed || trimmed === "[DONE]") return null;
  return JSON.parse(trimmed);
}
function createSseAdapter(options = {}) {
  const maxBufferBytes = typeof options.maxBufferBytes === "number" && options.maxBufferBytes > 0 ? options.maxBufferBytes : DEFAULT_MAX_BUFFER_BYTES;
  const reducer = options.reducer ?? createEventReducer();
  const onEvent = typeof options.onEvent === "function" ? options.onEvent : null;
  const onMalformed = typeof options.onMalformed === "function" ? options.onMalformed : null;
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let textBuffer = "";
  let cancelled = false;
  let lastEventId = null;
  let closed = false;
  function reportMalformed(detail, terminal = false) {
    reducer.dispatch({
      type: EventType.DIAGNOSTIC_SKIP,
      detail: typeof detail === "string" ? detail : String(detail)
    });
    if (onMalformed) onMalformed({ detail, terminal, lastEventId });
    if (terminal) {
      reducer.dispatch({
        type: EventType.RUN_ERROR,
        message: typeof detail === "string" ? detail : "SSE terminal parse error"
      });
    }
  }
  function handleBlock(block) {
    if (cancelled || closed) return;
    const parsed = parseSseBlock(block);
    if (parsed.id != null && parsed.id !== "") lastEventId = parsed.id;
    if (!parsed.data) return;
    const terminalEvent = parsed.event === "error";
    let payload;
    try {
      payload = parseAgUiPayload(parsed.data);
    } catch (err) {
      reportMalformed(
        `invalid json: ${parsed.data.slice(0, 120)} (${err && err.message ? err.message : err})`,
        terminalEvent
      );
      return;
    }
    if (payload == null) return;
    if (typeof payload !== "object" || Array.isArray(payload)) {
      reportMalformed(parsed.data, terminalEvent);
      return;
    }
    if (typeof payload.type !== "string" || !payload.type) {
      reportMalformed(payload, terminalEvent);
      return;
    }
    const meta = {
      sseEvent: parsed.event || null,
      id: parsed.id,
      lastEventId,
      retry: parsed.retry
    };
    reducer.dispatch(
      /** @type {Record<string, unknown>} */
      payload
    );
    if (onEvent) onEvent(
      /** @type {Record<string, unknown>} */
      payload,
      meta
    );
  }
  function enforceBound() {
    if (textBuffer.length <= maxBufferBytes) return;
    const overflow = textBuffer.length - maxBufferBytes;
    textBuffer = textBuffer.slice(-Math.floor(maxBufferBytes / 2));
    reportMalformed(`buffer overflow trimmed ${overflow} chars`, false);
  }
  return {
    get reducer() {
      return reducer;
    },
    getState() {
      return reducer.getState();
    },
    getLastEventId() {
      return lastEventId;
    },
    isCancelled() {
      return cancelled;
    },
    /**
     * Push a network chunk (string or Uint8Array).
     * @param {string|Uint8Array|ArrayBuffer} chunk
     */
    push(chunk) {
      if (cancelled || closed) return reducer.getState();
      if (chunk == null) return reducer.getState();
      if (typeof chunk === "string") {
        textBuffer += chunk;
      } else if (chunk instanceof ArrayBuffer) {
        textBuffer += decoder.decode(new Uint8Array(chunk), { stream: true });
      } else if (ArrayBuffer.isView(chunk)) {
        textBuffer += decoder.decode(chunk, { stream: true });
      } else {
        reportMalformed(chunk, false);
        return reducer.getState();
      }
      enforceBound();
      const { blocks, rest } = splitSseBlocks(textBuffer);
      textBuffer = rest;
      for (const block of blocks) handleBlock(block);
      return reducer.getState();
    },
    /** Flush decoder + trailing incomplete block (stream ended). */
    flush() {
      if (cancelled || closed) return reducer.getState();
      textBuffer += decoder.decode();
      if (textBuffer.trim()) {
        handleBlock(textBuffer);
        textBuffer = "";
      }
      closed = true;
      return reducer.getState();
    },
    /** Cooperative cancel — stop parsing; mark run cancelled. */
    cancel(reason = "cancelled") {
      if (cancelled) return reducer.getState();
      cancelled = true;
      textBuffer = "";
      reducer.dispatch({ type: EventType.RUN_CANCELLED, message: reason });
      return reducer.getState();
    },
    reset() {
      textBuffer = "";
      cancelled = false;
      closed = false;
      lastEventId = null;
      reducer.reset();
      return reducer.getState();
    }
  };
}
async function consumeSseResponse(response, options = {}) {
  const adapter = createSseAdapter(options);
  const body = response && response.body;
  if (!body || typeof body.getReader !== "function") {
    adapter.reducer.dispatch({
      type: EventType.RUN_ERROR,
      message: "No response body"
    });
    return adapter;
  }
  const reader = body.getReader();
  try {
    while (!adapter.isCancelled()) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) adapter.push(value);
    }
    if (!adapter.isCancelled()) adapter.flush();
  } catch (err) {
    if (!adapter.isCancelled()) {
      adapter.reducer.dispatch({
        type: EventType.RUN_ERROR,
        message: err && err.message ? err.message : String(err)
      });
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
    }
  }
  return adapter;
}
var sseAdapter_default = {
  createSseAdapter,
  consumeSseResponse,
  parseSseBlock,
  splitSseBlocks,
  DEFAULT_MAX_BUFFER_BYTES
};

// src/Browser/transport/ndjsonAdapter.js
var ndjsonAdapter_exports = {};
__export(ndjsonAdapter_exports, {
  DEFAULT_MAX_BUFFER_BYTES: () => DEFAULT_MAX_BUFFER_BYTES2,
  buildNdjsonReplay: () => buildNdjsonReplay,
  consumeNdjsonResponse: () => consumeNdjsonResponse,
  createNdjsonAdapter: () => createNdjsonAdapter,
  default: () => ndjsonAdapter_default
});
var DEFAULT_MAX_BUFFER_BYTES2 = 256 * 1024;
function makeIds(options = {}) {
  const idFactory = typeof options.idFactory === "function" ? options.idFactory : () => typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    messageId: options.messageId || idFactory(),
    idFactory
  };
}
function createNdjsonAdapter(options = {}) {
  const maxBufferBytes = typeof options.maxBufferBytes === "number" && options.maxBufferBytes > 0 ? options.maxBufferBytes : DEFAULT_MAX_BUFFER_BYTES2;
  const reducer = options.reducer ?? createEventReducer({ runId: options.runId });
  const onEvent = typeof options.onEvent === "function" ? options.onEvent : null;
  const onMalformed = typeof options.onMalformed === "function" ? options.onMalformed : null;
  const emitRunEnvelope = options.emitRunEnvelope !== false;
  const { messageId, idFactory } = makeIds(options);
  const toolCallIds = /* @__PURE__ */ Object.create(null);
  let messageStarted = false;
  let runStarted = false;
  let textEnded = false;
  let cancelled = false;
  let closed = false;
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let textBuffer = "";
  function emit(event) {
    reducer.dispatch(event);
    if (onEvent) onEvent(event);
  }
  function reportMalformed(detail) {
    emit({ type: EventType.DIAGNOSTIC_SKIP, detail: String(detail) });
    if (onMalformed) onMalformed({ detail });
  }
  function ensureRunStarted() {
    if (!emitRunEnvelope || runStarted) return;
    runStarted = true;
    emit({
      type: EventType.RUN_STARTED,
      runId: options.runId || reducer.getState().runId || "ndjson-run"
    });
  }
  function ensureMessageStart(role = "assistant") {
    if (messageStarted) return;
    messageStarted = true;
    ensureRunStarted();
    emit({
      type: EventType.TEXT_MESSAGE_START,
      messageId,
      role: role || "assistant"
    });
  }
  function handleObject(json) {
    if (cancelled || closed) return;
    if (typeof json.type === "string" && json.type) {
      const known = {
        RUN_STARTED: 1,
        RUN_FINISHED: 1,
        RUN_ERROR: 1,
        RUN_CANCELLED: 1,
        TEXT_MESSAGE_START: 1,
        TEXT_MESSAGE_CONTENT: 1,
        TEXT_MESSAGE_CHUNK: 1,
        TEXT_MESSAGE_END: 1,
        TOOL_CALL_START: 1,
        TOOL_CALL_ARGS: 1,
        TOOL_CALL_END: 1,
        TOOL_CALL_RESULT: 1
      };
      if (known[json.type]) {
        if (json.type === "RUN_STARTED") runStarted = true;
        if (json.type === "TEXT_MESSAGE_START" || json.type === "TEXT_MESSAGE_CONTENT" || json.type === "TEXT_MESSAGE_CHUNK") {
          messageStarted = true;
        }
        if (json.type === "TEXT_MESSAGE_END") textEnded = true;
        emit(json);
        return;
      }
    }
    if (json.error && typeof json.error === "object") {
      ensureRunStarted();
      const err = (
        /** @type {Record<string, unknown>} */
        json.error
      );
      const msg = typeof err.message === "string" && err.message || typeof json.message === "string" && json.message || "stream error";
      emit({ type: EventType.RUN_ERROR, message: msg });
      return;
    }
    const choices = Array.isArray(json.choices) ? json.choices : null;
    if (!choices || !choices.length) {
      return;
    }
    const choice = (
      /** @type {Record<string, unknown>} */
      choices[0] || {}
    );
    const delta = choice.delta && typeof choice.delta === "object" ? (
      /** @type {Record<string, unknown>} */
      choice.delta
    ) : null;
    const finishReason = typeof choice.finish_reason === "string" ? choice.finish_reason : null;
    if (delta) {
      if (!messageStarted && (delta.content || delta.role)) {
        ensureMessageStart(
          typeof delta.role === "string" ? delta.role : "assistant"
        );
      }
      if (typeof delta.content === "string" && delta.content) {
        ensureMessageStart();
        emit({
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId,
          delta: delta.content
        });
      }
      if (Array.isArray(delta.tool_calls)) {
        ensureRunStarted();
        for (const tc of delta.tool_calls) {
          if (!tc || typeof tc !== "object") continue;
          const toolCall = (
            /** @type {Record<string, unknown>} */
            tc
          );
          const index = typeof toolCall.index === "number" ? toolCall.index : Number(toolCall.index) || 0;
          const fn = toolCall.function && typeof toolCall.function === "object" ? (
            /** @type {Record<string, unknown>} */
            toolCall.function
          ) : {};
          if (typeof toolCall.id === "string" && toolCall.id) {
            toolCallIds[index] = toolCall.id;
            emit({
              type: EventType.TOOL_CALL_START,
              toolCallId: toolCall.id,
              toolCallName: typeof fn.name === "string" ? fn.name : "",
              toolName: typeof fn.name === "string" ? fn.name : ""
            });
          }
          if (typeof fn.arguments === "string" && fn.arguments) {
            const toolCallId = toolCallIds[index];
            if (toolCallId) {
              emit({
                type: EventType.TOOL_CALL_ARGS,
                toolCallId,
                delta: fn.arguments
              });
            }
          }
        }
      }
    }
    if (finishReason === "stop" || finishReason === "length") {
      if (messageStarted && !textEnded) {
        textEnded = true;
        emit({ type: EventType.TEXT_MESSAGE_END, messageId });
      }
      if (emitRunEnvelope) {
        emit({
          type: EventType.RUN_FINISHED,
          runId: options.runId || reducer.getState().runId || "ndjson-run"
        });
      }
    } else if (finishReason === "tool_calls") {
      for (const toolCallId of Object.values(toolCallIds)) {
        emit({ type: EventType.TOOL_CALL_END, toolCallId });
      }
      if (emitRunEnvelope) {
        emit({
          type: EventType.RUN_FINISHED,
          runId: options.runId || reducer.getState().runId || "ndjson-run"
        });
      }
    } else if (finishReason === "content_filter") {
      emit({
        type: EventType.RUN_ERROR,
        message: "content_filter"
      });
    }
  }
  function handleLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    const data = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
    if (!data || data === "[DONE]") {
      if (data === "[DONE]" && emitRunEnvelope && runStarted) {
        if (messageStarted && !textEnded) {
          textEnded = true;
          emit({ type: EventType.TEXT_MESSAGE_END, messageId });
        }
        const st = reducer.getState();
        if (st.runStatus === "running") {
          emit({
            type: EventType.RUN_FINISHED,
            runId: options.runId || st.runId || "ndjson-run"
          });
        }
      }
      return;
    }
    let json;
    try {
      json = JSON.parse(data);
    } catch {
      reportMalformed(data.slice(0, 160));
      return;
    }
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      reportMalformed(data.slice(0, 160));
      return;
    }
    handleObject(json);
  }
  function enforceBound() {
    if (textBuffer.length <= maxBufferBytes) return;
    const overflow = textBuffer.length - maxBufferBytes;
    textBuffer = textBuffer.slice(-Math.floor(maxBufferBytes / 2));
    reportMalformed(`buffer overflow trimmed ${overflow} chars`);
  }
  return {
    get reducer() {
      return reducer;
    },
    get messageId() {
      return messageId;
    },
    getState() {
      return reducer.getState();
    },
    isCancelled() {
      return cancelled;
    },
    /**
     * @param {string|Uint8Array|ArrayBuffer} chunk
     */
    push(chunk) {
      if (cancelled || closed) return reducer.getState();
      if (chunk == null) return reducer.getState();
      if (typeof chunk === "string") {
        textBuffer += chunk;
      } else if (chunk instanceof ArrayBuffer) {
        textBuffer += decoder.decode(new Uint8Array(chunk), { stream: true });
      } else if (ArrayBuffer.isView(chunk)) {
        textBuffer += decoder.decode(chunk, { stream: true });
      } else {
        reportMalformed(String(chunk));
        return reducer.getState();
      }
      enforceBound();
      const lines = textBuffer.split("\n");
      textBuffer = lines.pop() ?? "";
      for (const line of lines) {
        const cleaned = line.endsWith("\r") ? line.slice(0, -1) : line;
        handleLine(cleaned);
      }
      return reducer.getState();
    },
    flush() {
      if (cancelled || closed) return reducer.getState();
      textBuffer += decoder.decode();
      if (textBuffer.trim()) {
        handleLine(textBuffer);
        textBuffer = "";
      }
      closed = true;
      return reducer.getState();
    },
    cancel(reason = "cancelled") {
      if (cancelled) return reducer.getState();
      cancelled = true;
      textBuffer = "";
      emit({ type: EventType.RUN_CANCELLED, message: reason });
      return reducer.getState();
    },
    reset(nextOptions = {}) {
      textBuffer = "";
      cancelled = false;
      closed = false;
      messageStarted = false;
      runStarted = false;
      textEnded = false;
      for (const k of Object.keys(toolCallIds)) delete toolCallIds[k];
      reducer.reset({ runId: nextOptions.runId ?? options.runId });
      return reducer.getState();
    },
    /** @internal test helper */
    _ids: { messageId, idFactory, toolCallIds }
  };
}
async function consumeNdjsonResponse(response, options = {}) {
  const adapter = createNdjsonAdapter(options);
  const body = response && response.body;
  if (!body || typeof body.getReader !== "function") {
    adapter.reducer.dispatch({
      type: EventType.RUN_ERROR,
      message: "No response body"
    });
    return adapter;
  }
  const reader = body.getReader();
  try {
    while (!adapter.isCancelled()) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) adapter.push(value);
    }
    if (!adapter.isCancelled()) adapter.flush();
  } catch (err) {
    if (!adapter.isCancelled()) {
      adapter.reducer.dispatch({
        type: EventType.RUN_ERROR,
        message: err && err.message ? err.message : String(err)
      });
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
    }
  }
  return adapter;
}
function buildNdjsonReplay(opts = {}) {
  const runId = opts.runId || "r1";
  const messageId = opts.messageId || "m1";
  const lines = [];
  void runId;
  void messageId;
  if (opts.content) {
    lines.push({
      id: "chatcmpl-1",
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }]
    });
    const content = String(opts.content);
    const step = Math.max(1, Math.ceil(content.length / 3));
    for (let i = 0; i < content.length; i += step) {
      lines.push({
        id: "chatcmpl-1",
        object: "chat.completion.chunk",
        choices: [
          {
            index: 0,
            delta: { content: content.slice(i, i + step) },
            finish_reason: null
          }
        ]
      });
    }
  }
  if (Array.isArray(opts.tools)) {
    opts.tools.forEach((tool, index) => {
      lines.push({
        id: "chatcmpl-1",
        object: "chat.completion.chunk",
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index,
                  id: tool.id,
                  type: "function",
                  function: { name: tool.name, arguments: "" }
                }
              ]
            },
            finish_reason: null
          }
        ]
      });
      if (tool.arguments) {
        lines.push({
          id: "chatcmpl-1",
          object: "chat.completion.chunk",
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    index,
                    function: { arguments: tool.arguments }
                  }
                ]
              },
              finish_reason: null
            }
          ]
        });
      }
    });
    lines.push({
      id: "chatcmpl-1",
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }]
    });
  } else if (opts.content) {
    lines.push({
      id: "chatcmpl-1",
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
    });
  }
  return lines.map((o) => `${JSON.stringify(o)}
`).join("");
}
var ndjsonAdapter_default = {
  createNdjsonAdapter,
  consumeNdjsonResponse,
  buildNdjsonReplay,
  DEFAULT_MAX_BUFFER_BYTES: DEFAULT_MAX_BUFFER_BYTES2
};

// src/Browser/transport/register.js
var TRANSPORT_MODULES = Object.freeze({
  eventReducer: eventReducer_exports,
  sseAdapter: sseAdapter_exports,
  ndjsonAdapter: ndjsonAdapter_exports
});

// src/Browser/host/lazyPacks.js
var TYPE_TO_PACK = Object.freeze({
  // charts
  BarChart: "charts",
  LineChart: "charts",
  AreaChart: "charts",
  HorizontalBarChart: "charts",
  PieChart: "charts",
  SingleStackedBarChart: "charts",
  RadarChart: "charts",
  RadialChart: "charts",
  ScatterChart: "charts",
  Series: "charts",
  Slice: "charts",
  ScatterSeries: "charts",
  Point: "charts",
  // table
  Table: "table",
  EditableTable: "table",
  Col: "table",
  // tools
  ToolActivity: "tools",
  RunStatus: "tools",
  ToolCall: "tools",
  ToolResult: "tools",
  // chat-only (FollowUp / Citation — List/Code/Image already on shell via content)
  FollowUpBlock: "chat",
  FollowUpItem: "chat",
  CitationRef: "chat",
  Citation: "chat",
  // section / steps
  SectionBlock: "sectionSteps",
  SectionItem: "sectionSteps",
  Steps: "sectionSteps",
  StepsItem: "sectionSteps",
  // carousel / modal
  Carousel: "carouselModal",
  Modal: "carouselModal"
});
var PACK_CSS = Object.freeze({
  charts: ["../../css/components/charts.css"],
  table: ["../../css/components/table.css"],
  tools: ["../../css/components/tool-activity.css"],
  sectionSteps: [
    "../../css/components/section-block.css",
    "../../css/components/steps.css"
  ],
  carouselModal: [
    "../../css/components/carousel.css",
    "../../css/components/modal.css"
  ]
});
var loaded = /* @__PURE__ */ new Map();
function collectTypeNames(node, out = /* @__PURE__ */ new Set()) {
  if (node == null || node === false) return out;
  if (Array.isArray(node)) {
    for (const c of node) collectTypeNames(c, out);
    return out;
  }
  if (typeof node !== "object") return out;
  const obj = (
    /** @type {Record<string, unknown>} */
    node
  );
  if (typeof obj.typeName === "string") out.add(obj.typeName);
  if (typeof obj.type === "string" && obj.type !== "element") out.add(obj.type);
  if (obj.props && typeof obj.props === "object") {
    const props = (
      /** @type {Record<string, unknown>} */
      obj.props
    );
    for (const v of Object.values(props)) collectTypeNames(v, out);
  }
  if (Array.isArray(obj.children)) collectTypeNames(obj.children, out);
  return out;
}
function injectPackCss(packId, importMetaUrl) {
  const hrefs = PACK_CSS[packId];
  if (!hrefs || typeof document === "undefined") return;
  for (const rel of hrefs) {
    const href = new URL(rel, importMetaUrl).href;
    const candidates = [href];
    try {
      const u = new URL(importMetaUrl);
      if (u.pathname.includes("/js/")) {
        const cssRoot = u.pathname.replace(/\/js\/.*$/, "/css/");
        const name = rel.split("/").pop();
        candidates.push(`${u.origin}${cssRoot}components/${name}`);
      }
    } catch {
    }
    for (const h of candidates) {
      if (document.querySelector(`link[data-canvas-pack-css="${h}"]`)) continue;
      if (document.querySelector(`link[href="${h}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = h;
      link.dataset.canvasPackCss = h;
      document.head.appendChild(link);
      break;
    }
  }
}
async function importPackRegistrar(packId) {
  switch (packId) {
    case "charts":
      return (await Promise.resolve().then(() => (init_registerCharts(), registerCharts_exports))).registerCharts;
    case "table":
      return (await Promise.resolve().then(() => (init_registerTable(), registerTable_exports))).registerTable;
    case "tools":
      return (await Promise.resolve().then(() => (init_registerTools(), registerTools_exports))).registerTools;
    case "chat":
      return (await Promise.resolve().then(() => (init_registerChatContent(), registerChatContent_exports))).registerChatContent;
    case "sectionSteps":
      return (await Promise.resolve().then(() => (init_registerSectionSteps(), registerSectionSteps_exports))).registerSectionSteps;
    case "carouselModal":
      return (await Promise.resolve().then(() => (init_registerCarouselModal(), registerCarouselModal_exports))).registerCarouselModal;
    default:
      throw new Error(`unknown canvas pack: ${packId}`);
  }
}
async function ensureLazyPacks(registry, types, opts = {}) {
  const importMetaUrl = opts.importMetaUrl || import.meta.url;
  const needed = /* @__PURE__ */ new Set();
  for (const t of types) {
    const pack = TYPE_TO_PACK[t];
    if (pack) needed.add(pack);
  }
  for (const packId of needed) {
    if (!loaded.has(packId)) {
      loaded.set(
        packId,
        (async () => {
          const register2 = await importPackRegistrar(packId);
          injectPackCss(packId, importMetaUrl);
          return register2;
        })()
      );
    }
    const register = await loaded.get(packId);
    if (typeof register === "function") {
      register(registry);
    }
  }
}

// src/Browser/host/mountCore.js
var CONTRACT = "canvas-host-v1";
var RUNTIME_ID = "sanctum-canvas";
var RUNTIME_VERSION = "0.1.0";
var ROOT_ID = "sanctum-canvas-root";
var CAPABILITIES = Object.freeze([
  "ag-ui-events",
  "sse",
  "ndjson",
  "continue-conversation",
  "open-url-policy",
  "tool-dispatch-host"
]);
var mounting = /* @__PURE__ */ new WeakSet();
var leases = /* @__PURE__ */ new WeakMap();
function negotiateContract(hostOffer = {}) {
  const offer = hostOffer && typeof hostOffer === "object" ? (
    /** @type {Record<string, unknown>} */
    hostOffer
  ) : {};
  const contract = offer.contract ?? offer.compatibleContract ?? CONTRACT;
  if (contract !== CONTRACT) {
    return {
      ok: false,
      code: "contract-mismatch",
      message: `expected ${CONTRACT}, got ${String(contract)}`
    };
  }
  return { ok: true, contract: CONTRACT };
}
function clearRoot(el2) {
  if (!el2) return;
  if (typeof el2.replaceChildren === "function") {
    el2.replaceChildren();
    return;
  }
  while (el2.firstChild) el2.removeChild(el2.firstChild);
}
function elementToVnode(node) {
  if (node == null || node === false) return null;
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(elementToVnode).filter((x) => x != null);
  }
  if (typeof node !== "object") return null;
  const obj = (
    /** @type {Record<string, unknown>} */
    node
  );
  if (typeof obj.type === "string" && obj.type !== "element") {
    return obj;
  }
  if (obj.type === "element" && typeof obj.typeName === "string") {
    const rawProps = (
      /** @type {Record<string, unknown>} */
      obj.props || {}
    );
    const props = {};
    for (const [k, v] of Object.entries(rawProps)) {
      if (k === "children") {
        props.children = elementToVnode(v);
      } else if (Array.isArray(v)) {
        props[k] = v.map(
          (item) => item && typeof item === "object" && /** @type {any} */
          item.type === "element" ? elementToVnode(item) : item
        );
      } else if (v && typeof v === "object" && /** @type {any} */
      v.type === "element") {
        props[k] = elementToVnode(v);
      } else {
        props[k] = v;
      }
    }
    if (obj.partial === true) props.partial = true;
    const children = Array.isArray(props.children) ? props.children : void 0;
    return {
      type: obj.typeName,
      id: typeof obj.statementId === "string" ? obj.statementId : void 0,
      props,
      children
    };
  }
  return null;
}
function resolveLibrary(libraryOrText) {
  if (libraryOrText == null) return null;
  if (typeof libraryOrText === "string") return loadLibraryJson(libraryOrText);
  return validateLibrary(libraryOrText);
}
async function mountWithRegistry(canvasElement, options, registerComponents) {
  if (!canvasElement || typeof canvasElement !== "object") {
    throw new Error("mount: canvasElement required");
  }
  if (typeof registerComponents !== "function") {
    throw new Error("mount: registerComponents required");
  }
  const negotiated = negotiateContract(options);
  if (!negotiated.ok) {
    const err = new Error(negotiated.message);
    err.code = negotiated.code;
    throw err;
  }
  if (mounting.has(canvasElement)) {
    throw new Error("mount in progress");
  }
  const prior = leases.get(canvasElement);
  if (prior) {
    await prior.dispose("remount");
  }
  mounting.add(canvasElement);
  let abortUnsub = null;
  try {
    let eventNeedsLangSync = function(event) {
      if (!event || typeof event !== "object") return false;
      const t = event.type;
      return t === EventType.TEXT_MESSAGE_CONTENT || t === EventType.TEXT_MESSAGE_CHUNK || t === EventType.TEXT_MESSAGE_END || t === EventType.TEXT_MESSAGE_START || t === EventType.RUN_FINISHED || t === EventType.RUN_ERROR || t === EventType.RUN_CANCELLED;
    }, syncLangFromReducer = function() {
      const state = reducer.getState();
      const assistant = state.messages.filter((m) => m.role === "assistant" || !m.role).map((m) => m.content || "").join("");
      const streaming = state.isStreaming === true && state.runStatus === "running";
      void renderFromSource(assistant, { streaming });
    }, dispatchEvent = function(event) {
      if (disposed) return reducer.getState();
      const next = reducer.dispatch(event);
      onHostEvent(event, next);
      if (eventNeedsLangSync(event)) syncLangFromReducer();
      return next;
    };
    const doc = (
      /** @type {Document} */
      options.document || canvasElement.ownerDocument || (typeof document !== "undefined" ? document : null)
    );
    if (!doc) throw new Error("mount: document required");
    let library = resolveLibrary(options.library);
    if (!library && typeof options.libraryUrl === "string") {
      const fetchFn = typeof options.fetch === "function" ? options.fetch : typeof fetch === "function" ? fetch.bind(globalThis) : null;
      if (!fetchFn) throw new Error("mount: fetch unavailable for libraryUrl");
      const res = await fetchFn(String(options.libraryUrl));
      if (!res.ok) throw new Error(`mount: library fetch failed (${res.status})`);
      library = loadLibraryJson(await res.text());
    }
    if (!library) {
      throw new Error("mount: options.library or options.libraryUrl required");
    }
    const schema = libraryToJsonSchema(library);
    const rootName = typeof options.rootName === "string" && options.rootName ? options.rootName : String(library.root || "Stack");
    clearRoot(canvasElement);
    if (typeof canvasElement.setAttribute === "function" && !canvasElement.getAttribute?.("id")) {
    }
    const registry = createComponentRegistry();
    registerComponents(registry);
    const initiation = options.initiation && typeof options.initiation === "object" ? (
      /** @type {Record<string, unknown>} */
      options.initiation
    ) : {};
    const seed = initiation.seed && typeof initiation.seed === "object" ? (
      /** @type {Record<string, unknown>} */
      initiation.seed
    ) : {};
    const store = createStore();
    if (seed.stateHydration && typeof seed.stateHydration === "object") {
      store.initialize(
        {},
        /** @type {Record<string, unknown>} */
        seed.stateHydration
      );
    }
    const bindings = createBindingManager(store);
    const reducer = createEventReducer();
    let programSource = "";
    let streamingParser = createStreamingParser2(schema, rootName);
    let localAbort = null;
    let disposed = false;
    const hostSignal = options.signal && typeof options.signal === "object" ? (
      /** @type {AbortSignal} */
      options.signal
    ) : null;
    const continueConversation = typeof options.continueConversation === "function" ? options.continueConversation : typeof options.onContinueConversation === "function" ? options.onContinueConversation : () => {
    };
    const openUrl = typeof options.openUrl === "function" ? options.openUrl : (url) => safeOpenUrl(url);
    const dispatchAction = typeof options.dispatchAction === "function" ? options.dispatchAction : async () => {
      throw new Error("unsupported-action");
    };
    const reportError = typeof options.onError === "function" ? options.onError : () => {
    };
    const onHostEvent = typeof options.onEvent === "function" ? options.onEvent : () => {
    };
    const actions = createActionRunner({
      store,
      host: {
        openUrl,
        continueConversation
      }
    });
    const ctx = createRenderContext({
      document: doc,
      registry,
      urlPolicy: urlPolicy_exports,
      bindings,
      actions,
      state: store,
      stream: { isStreaming: false },
      development: options.development === true,
      reportError
    });
    ctx.continueConversation = continueConversation;
    ctx.openUrl = openUrl;
    ctx.dispatchAction = dispatchAction;
    ctx.actions = actions;
    let renderGen = 0;
    async function renderFromSource(source, { streaming = false } = {}) {
      const gen = ++renderGen;
      programSource = source || "";
      ctx.stream = { isStreaming: streaming };
      streamingParser = createStreamingParser2(schema, rootName);
      const result = streamingParser.push(programSource);
      if (result.root) {
        const types = collectTypeNames(result.root);
        if (options.lazyPacks !== false) {
          try {
            await ensureLazyPacks(registry, types, {
              importMetaUrl: import.meta.url
            });
          } catch (err) {
            reportError(err);
          }
        }
        if (gen !== renderGen || disposed) return result;
        let rootNode = result.root;
        try {
          if (rootNode && rootNode.type === "element") {
            rootNode = evaluateElementProps(rootNode, {
              ctx: {
                getState: (n) => store.get(n),
                resolveRef: () => void 0
              },
              library,
              store,
              errors: []
            });
          }
        } catch (err) {
          reportError(err);
        }
        const vnode = elementToVnode(rootNode);
        if (vnode) safeRender(canvasElement, vnode, ctx);
      } else if (!streaming && !programSource.trim()) {
        clearRoot(canvasElement);
      }
      return result;
    }
    if (typeof seed.programSource === "string" && seed.programSource) {
      await renderFromSource(seed.programSource, { streaming: false });
    }
    async function dispose(reason = "dispose") {
      if (disposed) return;
      disposed = true;
      if (abortUnsub) {
        abortUnsub();
        abortUnsub = null;
      }
      if (localAbort) {
        localAbort.abort(reason);
        localAbort = null;
      }
      try {
        unmount(canvasElement, ctx);
      } catch {
      }
      clearRoot(canvasElement);
      leases.delete(canvasElement);
    }
    if (hostSignal) {
      if (hostSignal.aborted) {
        await dispose("signal-aborted");
        throw new Error("mount: signal already aborted");
      }
      const onAbort = () => {
        void dispose("signal-aborted");
      };
      hostSignal.addEventListener("abort", onAbort, { once: true });
      abortUnsub = () => hostSignal.removeEventListener("abort", onAbort);
    }
    const handle = {
      contract: CONTRACT,
      runtime: RUNTIME_ID,
      runtimeVersion: RUNTIME_VERSION,
      root: canvasElement,
      dispatchEvent,
      setProgram(source, opts) {
        return renderFromSource(source, opts);
      },
      getState() {
        return reducer.getState();
      },
      getSummary() {
        return summarizeState(reducer.getState());
      },
      unmount: dispose,
      dispose
    };
    leases.set(canvasElement, handle);
    return handle;
  } finally {
    mounting.delete(canvasElement);
  }
}
async function sanctumCanvasMountWithRegistry(registerComponents, ctx = {}) {
  const root = ctx.root;
  if (!root) throw new Error("sanctumCanvasMount: ctx.root required");
  const handle = await mountWithRegistry(
    /** @type {Element} */
    root,
    {
      document: ctx.document,
      signal: ctx.signal,
      session: ctx.session,
      initiation: ctx.initiation,
      dispatchAction: ctx.dispatchAction,
      continueConversation: ctx.continueConversation,
      openUrl: ctx.openUrl,
      library: ctx.library,
      libraryUrl: ctx.libraryUrl,
      fetch: ctx.fetch,
      development: ctx.development === true,
      onError: ctx.onError,
      onEvent: ctx.onEvent,
      contract: ctx.contract || CONTRACT
    },
    registerComponents
  );
  return {
    async unmount(reason) {
      await handle.dispose(reason);
    },
    handle
  };
}
function createRendererAdapterWithRegistry(registerComponents, extra = {}) {
  return {
    id: RUNTIME_ID,
    version: RUNTIME_VERSION,
    contract: CONTRACT,
    capabilities: [...CAPABILITIES],
    async mount(ctx) {
      return sanctumCanvasMountWithRegistry(registerComponents, { ...extra, ...ctx });
    }
  };
}

// src/Browser/host/mount.js
async function mount(canvasElement, options = {}) {
  const profile = options.componentProfile === "shell" ? "shell" : "all";
  const register = profile === "shell" ? registerShellComponents : registerAllComponents;
  const opts = profile === "all" ? { ...options, lazyPacks: false } : options;
  return mountWithRegistry(canvasElement, opts, register);
}
async function sanctumCanvasMount(ctx = {}) {
  const profile = ctx.componentProfile === "shell" ? "shell" : "all";
  const register = profile === "shell" ? registerShellComponents : registerAllComponents;
  return sanctumCanvasMountWithRegistry(register, ctx);
}
function createRendererAdapter(extra = {}) {
  const profile = extra.componentProfile === "shell" ? "shell" : "all";
  const register = profile === "shell" ? registerShellComponents : registerAllComponents;
  return createRendererAdapterWithRegistry(register, extra);
}
export {
  CAPABILITIES,
  CONTRACT,
  ROOT_ID,
  RUNTIME_ID,
  RUNTIME_VERSION,
  clearRoot,
  createRendererAdapter,
  elementToVnode,
  mount,
  negotiateContract,
  registerAllComponents,
  registerShellComponents,
  sanctumCanvasMount
};
