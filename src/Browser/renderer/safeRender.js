/**
 * A4.3 — Safe render wrapper.
 *
 * Thin layer over the keyed reconciler: maps partial nodes to skeletons,
 * try/catch around render, restores last-good DOM on failure / broken tail,
 * and reports a sanitized error without running tool side effects.
 *
 * Intentionally separate from reconciler.js so sibling A4 work can edit the
 * reconciler without merge fights — reconciler (or hosts) call into this.
 */

import { render } from "./reconciler.js";
import {
  PARTIAL_SKELETON_TYPE,
  mapPartialToSkeleton,
  renderPartialSkeleton,
  assertInteractive,
} from "./partialGate.js";
import {
  getRootKey,
  captureLastGood,
  restoreLastGood,
  hasLastGood,
} from "./lastGoodSubtree.js";

/**
 * Walk a vnode tree; throw if a node is marked broken / hostile tail.
 * @param {unknown} nodeTree
 */
export function assertNoBrokenTail(nodeTree) {
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

/**
 * @param {unknown} err
 * @param {Record<string, unknown>} ctx
 * @returns {{ message: string, name?: string }}
 */
function sanitizeRenderError(err, ctx) {
  const development = ctx.development === true || ctx.isDev === true;
  const name = err && typeof err === "object" && "name" in err ? String(err.name) : "Error";
  const message =
    err && typeof err === "object" && "message" in err
      ? String(err.message)
      : String(err ?? "render-failed");

  if (development) {
    return { name, message };
  }
  // Production: no source paths or stack details.
  return { message: "render-failed" };
}

/**
 * Ensure the registry can render partial skeletons.
 * @param {Record<string, unknown>} ctx
 * @returns {Record<string, unknown>}
 */
function withPartialRegistry(ctx) {
  const registry = ctx.registry;
  if (!registry || typeof registry.register !== "function") return ctx;
  if (typeof registry.has === "function" && registry.has(PARTIAL_SKELETON_TYPE)) {
    return ctx;
  }
  registry.register(PARTIAL_SKELETON_TYPE, renderPartialSkeleton);
  return ctx;
}

/**
 * Mount/update with last-good recovery. Does not invoke tools on failure.
 *
 * @param {Element} rootEl
 * @param {unknown} nodeTree
 * @param {Record<string, unknown>} [ctx]
 * @returns {{
 *   ok: boolean,
 *   rootKey: string,
 *   restored?: boolean,
 *   error?: { message: string, name?: string },
 *   sideEffectsAllowed: boolean,
 * }}
 */
export function safeRender(rootEl, nodeTree, ctx = {}) {
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
      sideEffectsAllowed: assertInteractive(nextCtx),
    };
  } catch (err) {
    const restored = hasLastGood(rootKey)
      ? restoreLastGood(rootKey, rootEl, nextCtx)
      : false;

    const error = sanitizeRenderError(err, nextCtx);
    if (typeof nextCtx.onRenderError === "function") {
      nextCtx.onRenderError(error, { rootKey, restored, err });
    }

    // Failed / broken-tail passes must not authorize tool side effects.
    return {
      ok: false,
      rootKey,
      restored,
      error,
      sideEffectsAllowed: false,
    };
  }
}

/**
 * Gate a fake or real tool invoke against partial / failed render state.
 * @param {unknown} nodeOrCtx
 * @param {() => unknown} invoke
 * @returns {{ ok: boolean, reason?: string, result?: unknown }}
 */
export function guardedToolInvoke(nodeOrCtx, invoke) {
  if (!assertInteractive(nodeOrCtx)) {
    return { ok: false, reason: "partial-gate" };
  }
  return { ok: true, result: invoke() };
}

export { assertInteractive, getRootKey, captureLastGood, restoreLastGood };
