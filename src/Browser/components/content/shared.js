/**
 * Shared helpers for A5.2 content primitives (plain DOM + --canvas-* tokens).
 */

/** @typedef {"ready" | "loading" | "empty" | "error"} SurfaceStatus */

export const SURFACE_STATUS = Object.freeze({
  READY: "ready",
  LOADING: "loading",
  EMPTY: "empty",
  ERROR: "error",
});

const STATUS_LABELS = Object.freeze({
  ready: "",
  loading: "Loading",
  empty: "No content",
  error: "Error",
});

/**
 * @param {Record<string, unknown>} [ctx]
 * @returns {Document}
 */
export function requireDocument(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("content component: ctx.document required");
  }
  return doc;
}

/**
 * @param {Element} el
 * @param {string} className
 */
export function setClass(el, className) {
  el.setAttribute("class", String(className).trim());
}

/**
 * @param {Element} el
 * @param {string} name
 * @param {string | null | undefined} value
 */
export function setOrRemoveAttr(el, name, value) {
  if (value == null || value === false || value === "") {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, value === true ? "true" : String(value));
  }
}

/**
 * @param {Element} el
 */
export function clearChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/**
 * Normalize surface status from props.
 * @param {Record<string, unknown>} props
 * @returns {SurfaceStatus}
 */
export function resolveStatus(props = {}) {
  const raw = props.status ?? props.state;
  if (raw === "loading" || raw === "empty" || raw === "error" || raw === "ready") {
    return raw;
  }
  if (props.loading === true) return "loading";
  if (props.error != null && props.error !== false) return "error";
  if (props.empty === true) return "empty";
  return "ready";
}

/** @type {WeakMap<Element, Element>} */
const statusTextByHost = new WeakMap();

/**
 * Find a direct child marked as status text (miniDom-safe; no querySelector).
 * @param {Element} el
 * @returns {Element | null}
 */
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

/**
 * Non-color status cues: data-status, aria-busy, optional status text node.
 * @param {Element} el
 * @param {Document} doc
 * @param {Record<string, unknown>} props
 * @param {{
 *   emptyMessage?: string,
 *   loadingMessage?: string,
 *   errorMessage?: string,
 *   showStatusText?: boolean,
 * }} [opts]
 * @returns {{ status: SurfaceStatus, statusEl: Element | null }}
 */
export function applySurfaceStatus(el, doc, props = {}, opts = {}) {
  const status = resolveStatus(props);
  el.setAttribute("data-status", status);
  setOrRemoveAttr(el, "aria-busy", status === "loading" ? "true" : null);

  let statusEl = findStatusTextChild(el);

  const show =
    opts.showStatusText !== false &&
    (status === "loading" || status === "empty" || status === "error");

  if (show) {
    if (!statusEl) {
      statusEl = doc.createElement("span");
      statusEl.setAttribute("data-canvas-status-text", "");
      statusEl.setAttribute("class", "canvas-status-text");
      el.appendChild(statusEl);
      statusTextByHost.set(el, statusEl);
    }
    const msg =
      status === "loading"
        ? asText(props.loadingMessage) || opts.loadingMessage || STATUS_LABELS.loading
        : status === "empty"
          ? asText(props.emptyMessage) || opts.emptyMessage || STATUS_LABELS.empty
          : asText(props.errorMessage ?? props.error) ||
            opts.errorMessage ||
            STATUS_LABELS.error;
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

/**
 * Semantic variant cue (not color-only): data-variant + accessible name fragment.
 * @param {Element} el
 * @param {string} variant
 * @param {Record<string, string>} [labelMap]
 */
export function applyVariantCue(el, variant, labelMap = {}) {
  const v = String(variant || "neutral");
  el.setAttribute("data-variant", v);
  const label = labelMap[v] || v;
  const existing = el.getAttribute("aria-label");
  if (!existing) {
    el.setAttribute("aria-label", label);
  }
  return v;
}

/**
 * Build a simple create/update/destroy lifecycle from render + patch helpers.
 * @template T
 * @param {{
 *   mount: (doc: Document, props: Record<string, unknown>, ctx: Record<string, unknown>) => Element,
 *   patch: (el: Element, props: Record<string, unknown>, ctx: Record<string, unknown>) => void,
 *   unmount?: (el: Element, ctx: Record<string, unknown>) => void,
 * }} impl
 */
export function lifecycle(impl) {
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
  };
}
