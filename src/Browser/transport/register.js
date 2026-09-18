/**
 * A7 — Register / export transport surface for lab + tests.
 */

import * as eventReducer from "./eventReducer.js";
import * as sseAdapter from "./sseAdapter.js";
import * as ndjsonAdapter from "./ndjsonAdapter.js";

export const TRANSPORT_MODULES = Object.freeze({
  eventReducer,
  sseAdapter,
  ndjsonAdapter,
});

/**
 * Attach transport helpers onto a registry-like object (optional lab hook).
 * @param {Record<string, unknown>} target
 * @returns {Record<string, unknown>}
 */
export function registerTransport(target = {}) {
  if (!target || typeof target !== "object") {
    throw new Error("registerTransport: target object required");
  }
  target.transport = TRANSPORT_MODULES;
  target.createEventReducer = eventReducer.createEventReducer;
  target.createSseAdapter = sseAdapter.createSseAdapter;
  target.createNdjsonAdapter = ndjsonAdapter.createNdjsonAdapter;
  return target;
}

export default registerTransport;
