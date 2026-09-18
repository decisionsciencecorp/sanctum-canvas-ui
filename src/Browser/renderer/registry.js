/**
 * A4.1 — Component type → lifecycle registry.
 *
 * Components register as `{ create, update?, destroy? }` or as a simple
 * `renderFn(props, ctx) → Element` (wrapped into create + no-op update/destroy).
 * Unknown types fail closed: `data-openui-unknown`, no scripts / handlers.
 */

/**
 * @typedef {(props: Record<string, unknown>, ctx: Record<string, unknown>) => Element} RenderFn
 * @typedef {{
 *   create: RenderFn,
 *   update?: (el: Element, props: Record<string, unknown>, ctx: Record<string, unknown>) => void,
 *   destroy?: (el: Element, ctx: Record<string, unknown>) => void,
 * }} ComponentLifecycle
 * @typedef {RenderFn | ComponentLifecycle} ComponentEntry
 * @typedef {{
 *   create: RenderFn,
 *   update: (el: Element, props: Record<string, unknown>, ctx: Record<string, unknown>) => void,
 *   destroy: (el: Element, ctx: Record<string, unknown>) => void,
 * }} NormalizedLifecycle
 */

/**
 * @param {Document} doc
 * @param {string} type
 * @returns {Element}
 */
function createUnknownFallback(doc, type) {
  const el = doc.createElement("div");
  el.setAttribute("data-openui-unknown", String(type ?? ""));
  el.textContent = "";
  return el;
}

/**
 * @param {string} type
 * @returns {NormalizedLifecycle}
 */
function unknownLifecycle(type) {
  return {
    create(_props, ctx = {}) {
      const doc = ctx.document ?? globalThis.document;
      if (!doc?.createElement) {
        throw new Error("registry fallback: ctx.document required");
      }
      return createUnknownFallback(doc, type);
    },
    update() {},
    destroy() {},
  };
}

/**
 * @param {RenderFn} renderFn
 * @returns {NormalizedLifecycle}
 */
function wrapRenderFn(renderFn) {
  return {
    create(props, ctx) {
      return renderFn(props, ctx);
    },
    update() {},
    destroy() {},
  };
}

/**
 * @param {ComponentEntry} entry
 * @param {string} type
 * @returns {NormalizedLifecycle}
 */
function normalizeEntry(entry, type) {
  if (typeof entry === "function") {
    return wrapRenderFn(entry);
  }
  if (entry && typeof entry === "object" && typeof entry.create === "function") {
    return {
      create: entry.create,
      update:
        typeof entry.update === "function"
          ? entry.update
          : () => {},
      destroy:
        typeof entry.destroy === "function"
          ? entry.destroy
          : () => {},
    };
  }
  throw new Error(
    `register: expected render function or { create } lifecycle for ${type}`,
  );
}

/**
 * @param {Record<string, ComponentEntry>} [initial]
 */
export function createComponentRegistry(initial = {}) {
  /** @type {Map<string, NormalizedLifecycle>} */
  const map = new Map();

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
    },
  };
}

/** @deprecated Prefer createComponentRegistry — alias for A4.1 callers. */
export const createRendererRegistry = createComponentRegistry;
