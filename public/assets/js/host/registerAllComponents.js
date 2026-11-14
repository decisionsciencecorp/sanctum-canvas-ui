/**
 * Full Track A component surface (catalog / walkthrough / kitchen-sink labs).
 */
import { registerShellComponents } from "./registerShellComponents.js";
import { registerSectionSteps } from "../components/containers/registerSectionSteps.js";
import { registerCarouselModal } from "../components/containers/registerCarouselModal.js";
import { registerTable } from "../components/table/registerTable.js";
import { registerCharts } from "../components/charts/registerCharts.js";
import { registerTools } from "../components/tools/registerTools.js";
import { registerChatContent } from "../components/chat/registerChatContent.js";

/**
 * @param {ReturnType<import("../renderer/registry.js").createComponentRegistry>} registry
 */
export function registerAllComponents(registry) {
  registerShellComponents(registry);
  registerChatContent(registry);
  registerSectionSteps(registry);
  registerCarouselModal(registry);
  registerTable(registry);
  registerCharts(registry);
  registerTools(registry);
  return registry;
}
