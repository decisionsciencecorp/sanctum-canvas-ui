/**
 * A5.4 — Register Tabs / Accordion (+ item contracts).
 *
 * SectionBlock / Steps: registerSectionSteps.js (A5.5).
 * Carousel / Modal: registerCarouselModal.js (A5.6 / A5.7).
 */

import { Tabs, TabItem } from "./Tabs.js";
import { Accordion, AccordionItem } from "./Accordion.js";

/** @type {Record<string, import("../../renderer/registry.js").ComponentEntry>} */
export const CONTAINER_COMPONENTS = {
  Tabs,
  TabItem,
  Accordion,
  AccordionItem,
};

/**
 * @param {{ register: (type: string, entry: unknown) => void }} registry
 * @returns {typeof registry}
 */
export function registerContainers(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerContainers: registry with register() required");
  }
  for (const [type, entry] of Object.entries(CONTAINER_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}

export { Tabs, TabItem, Accordion, AccordionItem };

export default registerContainers;
