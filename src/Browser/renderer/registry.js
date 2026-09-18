/**
 * A4 — Component type → render function registry.
 * Unknown types render a safe fallback element (`data-openui-unknown`).
 */

/**
 * @typedef {(props: Record<string, unknown>, ctx: Record<string, unknown>) => Element} RenderFn
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
 * @param {Record<string, RenderFn>} [initial]
 */
export function createComponentRegistry(initial = {}) {
  /** @type {Map<string, RenderFn>} */
  const map = new Map(Object.entries(initial));

  return {
    /**
     * @param {string} type
     * @param {RenderFn} renderFn
     */
    register(type, renderFn) {
      if (typeof type !== "string" || !type) {
        throw new Error("register: type must be a non-empty string");
      }
      if (typeof renderFn !== "function") {
        throw new Error(`register: render function required for ${type}`);
      }
      map.set(type, renderFn);
    },

    /**
     * Returns the registered render function, or a fallback that emits
     * `data-openui-unknown` when the type is not registered.
     * @param {string} type
     * @returns {RenderFn}
     */
    get(type) {
      const fn = map.get(type);
      if (fn) return fn;
      return (_props, ctx = {}) => {
        const doc = ctx.document ?? globalThis.document;
        if (!doc?.createElement) {
          throw new Error("registry fallback: ctx.document required");
        }
        return createUnknownFallback(doc, type);
      };
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
     * Render a component type (registered or unknown fallback).
     * @param {string} type
     * @param {Record<string, unknown>} [props]
     * @param {Record<string, unknown>} [ctx]
     * @returns {Element}
     */
    render(type, props = {}, ctx = {}) {
      return this.get(type)(props, ctx);
    },
  };
}

/** @deprecated Prefer createComponentRegistry — alias for A4.1 callers. */
export const createRendererRegistry = createComponentRegistry;
