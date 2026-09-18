/**
 * A5.5 container registry entrypoint.
 *
 * Registers SectionBlock / Steps. Tabs / Accordion (A5.4) land via the same
 * `registerContainers` name when that agent merges — until then this module
 * delegates to registerSectionSteps so A5.5 stays self-contained.
 */

import {
  registerSectionSteps,
  SECTION_STEPS_COMPONENTS,
  SectionBlock,
  SectionItem,
  Steps,
  StepsItem,
} from "./registerSectionSteps.js";

/** @type {Record<string, import("../../renderer/registry.js").ComponentEntry>} */
export const CONTAINER_COMPONENTS = { ...SECTION_STEPS_COMPONENTS };

export { SECTION_STEPS_COMPONENTS, registerSectionSteps };

/**
 * @param {{ register: (type: string, entry: unknown) => void }} registry
 * @returns {typeof registry}
 */
export function registerContainers(registry) {
  return registerSectionSteps(registry);
}

export { SectionBlock, SectionItem, Steps, StepsItem };

export default registerContainers;
