/**
 * Containers barrel — A5.4 Tabs/Accordion plus sibling phase re-exports when present.
 */

export { Tabs, TabItem, __tabsTestUtils } from "./Tabs.js";
export { Accordion, AccordionItem, __accordionTestUtils } from "./Accordion.js";
export {
  registerContainers,
  CONTAINER_COMPONENTS,
} from "./registerContainers.js";

export {
  normalizeItem,
  normalizeItems,
  itemKey,
  contentSize,
  asText,
  lifecycle,
  requireDocument,
  clearChildren,
  normalizeSections,
  normalizeSteps,
  resolveIsStreaming,
  renderPanelContent,
} from "./shared.js";

// A5.5 — SectionBlock / Steps (sibling card; keep importable from barrel)
export {
  registerSectionSteps,
  SECTION_STEPS_COMPONENTS,
  SectionBlock,
  SectionItem,
  Steps,
  StepsItem,
} from "./registerSectionSteps.js";
export {
  sectionUserSelect,
  getSectionOpenValues,
  didSectionUserIntervene,
} from "./SectionBlock.js";
export {
  stepsUserSelect,
  getStepsCurrentIndex,
  didStepsUserIntervene,
} from "./Steps.js";
export {
  createSectionOpenState,
  applySectionStreamTick,
  applySectionUserChange,
  toggleSectionValue,
  createStepsProgressState,
  applyStepsStreamTick,
  applyStepsUserSelect,
} from "./sectionOpenState.js";
