/**
 * A6.11 — Shared helpers for tool-activity / run-status presentation.
 */

/**
 * @param {Record<string, unknown>} [ctx]
 * @returns {Document}
 */
export function requireDocument(ctx = {}) {
  const doc = ctx.document ?? globalThis.document;
  if (!doc?.createElement) {
    throw new Error("tools component: ctx.document required");
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
 * Whether reduced-motion should suppress spin/shimmer.
 * @param {Record<string, unknown>} [props]
 * @param {Record<string, unknown>} [ctx]
 * @returns {boolean}
 */
export function prefersReducedMotion(props = {}, ctx = {}) {
  if (props.reducedMotion === true || props.reduceMotion === true) return true;
  if (ctx.reducedMotion === true) return true;
  try {
    const mq = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * @param {{
 *   mount: (doc: Document, props: Record<string, unknown>, ctx: Record<string, unknown>) => Element,
 *   patch: (el: Element, props: Record<string, unknown>, ctx: Record<string, unknown>) => void,
 *   unmount?: (el: Element, ctx: Record<string, unknown>) => void,
 *   ownsChildren?: boolean,
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
    ownsChildren: impl.ownsChildren !== false,
  };
}

/** @typedef {"streaming" | "executing" | "complete" | "result" | "error"} ToolStatus */
/** @typedef {"start" | "finish" | "error"} RunPhase */

/** @type {Record<ToolStatus, (name: string) => string>} */
export const TOOL_STATUS_LABELS = {
  streaming: (n) => `Calling the ${n} tool`,
  executing: (n) => `Running the ${n} tool`,
  complete: (n) => `Called the ${n} tool`,
  result: (n) => `${n} result`,
  error: (n) => `${n} failed`,
};

/** @type {Record<ToolStatus, string>} */
export const TOOL_NAMELESS_LABELS = {
  streaming: "Calling the tool",
  executing: "Running the tool",
  complete: "Called the tool",
  result: "Tool result",
  error: "Tool failed",
};

/**
 * @param {string} status
 * @param {string} name
 * @returns {string}
 */
export function defaultToolLabel(status, name) {
  const key = /** @type {ToolStatus} */ (status);
  if (!TOOL_STATUS_LABELS[key]) return name ? `${name}: ${status}` : String(status);
  if (!name || !String(name).trim()) return TOOL_NAMELESS_LABELS[key];
  return TOOL_STATUS_LABELS[key](name);
}

/**
 * @param {string} phase
 * @returns {string}
 */
export function defaultRunLabel(phase) {
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

/**
 * Pretty-print a value for presentation panels (never throws).
 * @param {unknown} value
 * @returns {string}
 */
export function prettyValue(value) {
  if (value == null) return "";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
