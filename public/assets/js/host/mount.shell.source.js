/**
 * Shell-profile host mount — Deep Research / isolation lab.
 *
 * Static imports stop at forms + content + layout. Bundle this entry
 * (not mount.js) when the product only paints Form / Stack / cards.
 */

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
};

/** @param {Element} canvasElement @param {Record<string, unknown>} [options] */
export async function mount(canvasElement, options = {}) {
  return mountWithRegistry(canvasElement, { ...options, componentProfile: "shell" }, registerShellComponents);
}

/** @param {Record<string, unknown>} [ctx] */
export async function sanctumCanvasMount(ctx = {}) {
  return sanctumCanvasMountWithRegistry(registerShellComponents, {
    ...ctx,
    componentProfile: "shell",
  });
}

/** @param {Record<string, unknown>} [extra] */
export function createRendererAdapter(extra = {}) {
  return createRendererAdapterWithRegistry(registerShellComponents, {
    ...extra,
    componentProfile: "shell",
  });
}
