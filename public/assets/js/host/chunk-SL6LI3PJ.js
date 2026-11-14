// src/Browser/components/content/shared.js
var SURFACE_STATUS = Object.freeze({
  READY: "ready",
  LOADING: "loading",
  EMPTY: "empty",
  ERROR: "error"
});
var STATUS_LABELS = Object.freeze({
  ready: "",
  loading: "Loading",
  empty: "No content",
  error: "Error"
});
function requireDocument(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("content component: ctx.document required");
  }
  return doc;
}
function setClass(el, className) {
  el.setAttribute("class", String(className).trim());
}
function setOrRemoveAttr(el, name, value) {
  if (value == null || value === false || value === "") {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, value === true ? "true" : String(value));
  }
}
function clearChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
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
var statusTextByHost = /* @__PURE__ */ new WeakMap();
function findStatusTextChild(el) {
  const cached = statusTextByHost.get(el);
  if (cached && cached.parentNode === el) return cached;
  for (const child of el.childNodes ?? []) {
    if (child.nodeType === 1 && child.getAttribute?.("data-canvas-status-text") != null) {
      statusTextByHost.set(el, child);
      return child;
    }
  }
  return null;
}
function applySurfaceStatus(el, doc, props = {}, opts = {}) {
  const status = resolveStatus(props);
  el.setAttribute("data-status", status);
  setOrRemoveAttr(el, "aria-busy", status === "loading" ? "true" : null);
  let statusEl = findStatusTextChild(el);
  const show = opts.showStatusText !== false && (status === "loading" || status === "empty" || status === "error");
  if (show) {
    if (!statusEl) {
      statusEl = doc.createElement("span");
      statusEl.setAttribute("data-canvas-status-text", "");
      statusEl.setAttribute("class", "canvas-status-text");
      el.appendChild(statusEl);
      statusTextByHost.set(el, statusEl);
    }
    const msg = status === "loading" ? asText(props.loadingMessage) || opts.loadingMessage || STATUS_LABELS.loading : status === "empty" ? asText(props.emptyMessage) || opts.emptyMessage || STATUS_LABELS.empty : asText(props.errorMessage ?? props.error) || opts.errorMessage || STATUS_LABELS.error;
    statusEl.textContent = msg;
    statusEl.setAttribute("role", "status");
    setOrRemoveAttr(statusEl, "aria-live", status === "error" ? "assertive" : "polite");
  } else if (statusEl && statusEl.parentNode) {
    statusEl.parentNode.removeChild(statusEl);
    statusTextByHost.delete(el);
    statusEl = null;
  }
  return { status, statusEl };
}
function applyVariantCue(el, variant, labelMap = {}) {
  const v = String(variant || "neutral");
  el.setAttribute("data-variant", v);
  const label = labelMap[v] || v;
  const existing = el.getAttribute("aria-label");
  if (!existing) {
    el.setAttribute("aria-label", label);
  }
  return v;
}
function lifecycle(impl) {
  return {
    create(props = {}, ctx = {}) {
      const doc = requireDocument(ctx);
      const el = impl.mount(doc, props, ctx);
      impl.patch(el, props, ctx);
      return el;
    },
    update(el, props = {}, ctx = {}) {
      impl.patch(el, props, ctx);
    },
    destroy(el, ctx = {}) {
      impl.unmount?.(el, ctx);
    },
    // Content primitives render from props; keyed reconciler must not wipe chrome.
    ownsChildren: impl.ownsChildren !== false
  };
}

// src/Browser/renderer/inlineStyle.js
function setInlineStyle(el, declarations) {
  if (!el || !declarations) return;
  const style = (
    /** @type {any} */
    el.style
  );
  if (style && typeof style.setProperty === "function") {
    for (const [prop, value] of Object.entries(declarations)) {
      if (value == null || value === "") style.removeProperty(prop);
      else style.setProperty(prop, String(value));
    }
    return;
  }
  const existing = parseStyleAttr(el.getAttribute?.("style") || "");
  for (const [prop, value] of Object.entries(declarations)) {
    if (value == null || value === "") delete existing[prop];
    else existing[prop] = String(value);
  }
  const text = Object.entries(existing).map(([k, v]) => `${k}: ${v}`).join("; ");
  if (text) el.setAttribute("style", text);
  else el.removeAttribute("style");
}
function clearInlineStyle(el) {
  if (!el) return;
  const style = (
    /** @type {any} */
    el.style
  );
  if (style && typeof style.setProperty === "function" && typeof style.cssText === "string") {
    style.cssText = "";
  }
  if (typeof el.removeAttribute === "function") el.removeAttribute("style");
}
function parseStyleAttr(text) {
  const out = {};
  for (const part of text.split(";")) {
    const i = part.indexOf(":");
    if (i <= 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

export {
  setClass,
  setOrRemoveAttr,
  clearChildren,
  asText,
  resolveStatus,
  applySurfaceStatus,
  applyVariantCue,
  lifecycle,
  setInlineStyle,
  clearInlineStyle
};
