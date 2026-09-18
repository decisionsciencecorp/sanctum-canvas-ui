/**
 * Shared chart host helpers (plain DOM + --canvas-* tokens).
 */

/** @typedef {"ready" | "loading" | "empty" | "error"} SurfaceStatus */

export const SURFACE_STATUS = Object.freeze({
  READY: "ready",
  LOADING: "loading",
  EMPTY: "empty",
  ERROR: "error",
});

/**
 * @param {Record<string, unknown>} [ctx]
 * @returns {Document}
 */
export function requireDocument(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("chart component: ctx.document required");
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
 */
export function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
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

/**
 * @param {Element} el
 * @param {Document} doc
 * @param {Record<string, unknown>} props
 * @param {{ emptyMessage?: string, loadingMessage?: string, errorMessage?: string }} [opts]
 * @returns {{ status: SurfaceStatus }}
 */
export function applySurfaceStatus(el, doc, props = {}, opts = {}) {
  const status = resolveStatus(props);
  el.setAttribute("data-status", status);
  if (status === "loading") el.setAttribute("aria-busy", "true");
  else el.removeAttribute("aria-busy");

  // Remove previous status text
  for (const child of [...(el.childNodes ?? [])]) {
    if (child.nodeType === 1 && child.getAttribute?.("data-canvas-status-text") != null) {
      el.removeChild(child);
    }
  }

  if (status === "loading" || status === "empty" || status === "error") {
    const statusEl = doc.createElement("span");
    statusEl.setAttribute("data-canvas-status-text", "");
    statusEl.setAttribute("class", "canvas-status-text canvas-chart__status");
    statusEl.setAttribute("role", "status");
    statusEl.setAttribute("aria-live", status === "error" ? "assertive" : "polite");
    statusEl.textContent =
      status === "loading"
        ? asText(props.loadingMessage) || opts.loadingMessage || "Loading"
        : status === "empty"
          ? asText(props.emptyMessage) || opts.emptyMessage || "No data"
          : asText(props.errorMessage ?? props.error) || opts.errorMessage || "Error";
    el.appendChild(statusEl);
  }

  return { status };
}

/**
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
    ownsChildren: true,
  };
}

/** @type {WeakMap<Element, { disconnect?: () => void, destroyKeyboard?: () => void }>} */
export const chartRuntime = new WeakMap();

/**
 * Preferred reduced-motion from ctx.document.defaultView.
 * @param {Document} doc
 * @returns {boolean}
 */
export function prefersReducedMotion(doc) {
  try {
    const mq = doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)");
    return !!mq?.matches;
  } catch {
    return false;
  }
}
