/**
 * A4.1 — Shared render context for component create/update/destroy.
 *
 * Provides renderChildren, state, actions, query, stream, urlPolicy, focus,
 * and reportError to every lifecycle call.
 */

import * as urlPolicyModule from "../security/urlPolicy.js";
import { reconcileChildren } from "./reconciler.js";

/**
 * Stub focus manager — real focus restore lives in the reconciler capture path;
 * components may still call remember/restore for higher-level bookkeeping.
 * @returns {{
 *   remember: (el?: Element | null) => void,
 *   restore: () => void,
 *   getFocused: () => Element | null,
 * }}
 */
export function createStubFocusManager() {
  /** @type {Element | null} */
  let remembered = null;
  return {
    remember(el = null) {
      remembered = el ?? null;
    },
    restore() {
      if (remembered && typeof remembered.focus === "function") {
        remembered.focus();
      }
    },
    getFocused() {
      return remembered;
    },
  };
}

/**
 * @typedef {object} CreateRenderContextOpts
 * @property {Document} [document]
 * @property {ReturnType<import('./registry.js').createComponentRegistry>} [registry]
 * @property {unknown} [state]
 * @property {unknown} [actions]
 * @property {unknown} [query]
 * @property {{ isStreaming?: boolean, [k: string]: unknown }} [stream]
 * @property {ReturnType<typeof createStubFocusManager>} [focus]
 * @property {(error: unknown) => void} [reportError]
 * @property {(node: Node) => void} [onDispose]
 * @property {typeof urlPolicyModule} [urlPolicy]
 */

/**
 * @param {CreateRenderContextOpts} [opts]
 */
export function createRenderContext(opts = {}) {
  const doc = opts.document ?? globalThis.document;
  /** @type {Record<string, unknown>} */
  const ctx = {
    document: doc,
    registry: opts.registry ?? null,
    state: opts.state ?? null,
    actions: opts.actions ?? null,
    query: opts.query ?? null,
    stream: opts.stream ?? { isStreaming: false },
    urlPolicy: opts.urlPolicy ?? urlPolicyModule,
    focus: opts.focus ?? createStubFocusManager(),
    reportError:
      typeof opts.reportError === "function"
        ? opts.reportError
        : (error) => {
            if (typeof console !== "undefined" && console.error) {
              console.error("[openui]", error);
            }
          },
    onDispose: opts.onDispose,
  };

  // Copy through any extra opts (tests / host wiring) without clobbering known keys.
  for (const [k, v] of Object.entries(opts)) {
    if (!(k in ctx) || ctx[k] === undefined) {
      ctx[k] = v;
    }
  }

  /**
   * Reconcile `children` under `parentEl` using this context.
   * @param {ParentNode} parentEl
   * @param {unknown[]} children
   */
  ctx.renderChildren = (parentEl, children) => {
    reconcileChildren(parentEl, /** @type {any} */ (children ?? []), ctx);
  };

  return ctx;
}
