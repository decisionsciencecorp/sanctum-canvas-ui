/**
 * A8.6 — Full canvas host mount (`canvas-host-v1`).
 *
 * Default profile registers the full Track A surface (charts, tables, tools…).
 * Pass `componentProfile: "shell"` to register only forms/content/layout —
 * or import `mount.shell.js` for a tree-shakeable shell-only bundle.
 */

import { registerAllComponents } from "./registerAllComponents.js";
import { registerShellComponents } from "./registerShellComponents.js";
import {
  CONTRACT,
  RUNTIME_ID,
  RUNTIME_VERSION,
  ROOT_ID,
  CAPABILITIES,
  negotiateContract,
  clearRoot,
  elementToVnode,
  mountWithRegistry,
  sanctumCanvasMountWithRegistry,
  createRendererAdapterWithRegistry,
} from "./mountCore.js";

export {
  CONTRACT,
  RUNTIME_ID,
  RUNTIME_VERSION,
  ROOT_ID,
  CAPABILITIES,
  negotiateContract,
  clearRoot,
  elementToVnode,
  registerShellComponents,
  registerAllComponents,
};

/**
 * @param {Element} canvasElement
 * @param {Record<string, unknown>} [options]
 * @returns {Promise<import("./mountCore.js").CanvasMountHandle>}
 */
export async function mount(canvasElement, options = {}) {
  const profile = options.componentProfile === "shell" ? "shell" : "all";
  const register =
    profile === "shell" ? registerShellComponents : registerAllComponents;
  return mountWithRegistry(canvasElement, options, register);
}

/**
 * Companion adapter entry (`canvas-host-v1`): mount into `ctx.root`.
 * @param {Record<string, unknown>} ctx
 */
export async function sanctumCanvasMount(ctx = {}) {
  const profile = ctx.componentProfile === "shell" ? "shell" : "all";
  const register =
    profile === "shell" ? registerShellComponents : registerAllComponents;
  return sanctumCanvasMountWithRegistry(register, ctx);
}

/**
 * Descriptor Track B may advertise / register.
 * @param {Record<string, unknown>} [extra]
 */
export function createRendererAdapter(extra = {}) {
  const profile = extra.componentProfile === "shell" ? "shell" : "all";
  const register =
    profile === "shell" ? registerShellComponents : registerAllComponents;
  return createRendererAdapterWithRegistry(register, extra);
}
