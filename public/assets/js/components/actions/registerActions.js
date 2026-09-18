/**
 * A6.4 — Register action / button components.
 */

import { Buttons } from "./Buttons.js";
import { Button } from "./Button.js";
import { IconButton } from "./IconButton.js";

/** @type {Record<string, import("../../renderer/registry.js").ComponentEntry>} */
export const ACTION_COMPONENTS = {
  Buttons,
  Button,
  IconButton,
};

/**
 * @param {{ register: (type: string, entry: unknown) => void }} registry
 */
export function registerActions(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerActions: registry with register() required");
  }
  for (const [type, entry] of Object.entries(ACTION_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}

export { Buttons, Button, IconButton };
export {
  dispatchButtonAction,
  sanitizeActionPlan,
  needsFormValidation,
  beginFire,
  endFire,
} from "./actionDispatch.js";

export default registerActions;
