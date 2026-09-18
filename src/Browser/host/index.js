/**
 * Track A host surface — canvas-host-v1 mount API (A8.6).
 */
export {
  CONTRACT,
  RUNTIME_ID,
  RUNTIME_VERSION,
  ROOT_ID,
  CAPABILITIES,
  negotiateContract,
  clearRoot,
  elementToVnode,
  registerAllComponents,
  mount,
  sanctumCanvasMount,
  createRendererAdapter,
} from "./mount.js";
