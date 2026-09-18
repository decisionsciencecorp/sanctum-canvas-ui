/**
 * A5.5 — Register SectionBlock / Steps (+ items) only.
 * Distinct from A5.4 Tabs/Accordion registration in registerContainers.js.
 */

import { SectionBlock } from "./SectionBlock.js";
import { SectionItem } from "./SectionItem.js";
import { Steps } from "./Steps.js";
import { StepsItem } from "./StepsItem.js";

/** @type {Record<string, import("../../renderer/registry.js").ComponentEntry>} */
export const SECTION_STEPS_COMPONENTS = {
  SectionBlock,
  SectionItem,
  Steps,
  StepsItem,
};

/**
 * @param {{ register: (type: string, entry: unknown) => void }} registry
 * @returns {typeof registry}
 */
export function registerSectionSteps(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerSectionSteps: registry with register() required");
  }
  for (const [type, entry] of Object.entries(SECTION_STEPS_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}

export { SectionBlock, SectionItem, Steps, StepsItem };

export default registerSectionSteps;
