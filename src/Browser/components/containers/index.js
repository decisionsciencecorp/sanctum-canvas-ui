/**
 * A5.5 containers — SectionBlock, Steps (+ open/progress state helpers).
 *
 * A5.4 Tabs / Accordion export from their own modules; that agent extends
 * registerContainers / this index when merging.
 */

export {
  SectionBlock,
  sectionUserSelect,
  getSectionOpenValues,
  didSectionUserIntervene,
} from "./SectionBlock.js";
export { SectionItem } from "./SectionItem.js";
export {
  Steps,
  stepsUserSelect,
  getStepsCurrentIndex,
  didStepsUserIntervene,
} from "./Steps.js";
export { StepsItem } from "./StepsItem.js";
export {
  registerContainers,
  registerSectionSteps,
  CONTAINER_COMPONENTS,
  SECTION_STEPS_COMPONENTS,
} from "./registerContainers.js";
export {
  createSectionOpenState,
  applySectionStreamTick,
  applySectionUserChange,
  toggleSectionValue,
  createStepsProgressState,
  applyStepsStreamTick,
  applyStepsUserSelect,
} from "./sectionOpenState.js";
export {
  normalizeSections,
  normalizeSteps,
  asText,
  lifecycle,
  resolveIsStreaming,
  renderPanelContent,
  requireDocument,
  clearChildren,
  normalizeItem,
  normalizeItems,
  itemKey,
  contentSize,
} from "./shared.js";
