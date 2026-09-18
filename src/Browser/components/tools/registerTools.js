/**
 * A6.11 — Register tool-activity and run-status presentation components.
 */

import { ToolActivity } from "./ToolActivity.js";
import { RunStatus } from "./RunStatus.js";

/** @type {Record<string, import("../../renderer/registry.js").ComponentEntry>} */
export const TOOL_COMPONENTS = {
  ToolActivity,
  RunStatus,
  // Aliases matching stream event vocabulary
  ToolCall: ToolActivity,
  ToolResult: {
    create(props = {}, ctx = {}) {
      return ToolActivity.create({ ...props, status: props.status || "result" }, ctx);
    },
    update(el, props = {}, ctx = {}) {
      return ToolActivity.update(el, { ...props, status: props.status || "result" }, ctx);
    },
    destroy(el, ctx = {}) {
      return ToolActivity.destroy(el, ctx);
    },
    ownsChildren: true,
  },
};

/**
 * @param {{ register: (type: string, entry: unknown) => void }} registry
 * @returns {typeof registry}
 */
export function registerTools(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerTools: registry with register() required");
  }
  for (const [type, entry] of Object.entries(TOOL_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}

export { ToolActivity, RunStatus };
export { partialJSONParse, balanceOpenJSON, isPartialJsonString } from "./partialJson.js";
export { redactValue, redactForDisplay, isSensitiveKey } from "./redact.js";

export default registerTools;
