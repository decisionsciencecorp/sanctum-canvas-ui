/**
 * Shell component profile — forms / content / layout only.
 *
 * Deep Research and the canvas-lab isolation page paint Form, Stack,
 * InlineHeader, TextContent, OptionCards, CardHeader, etc. They do not
 * need charts, tables, tools, chat, carousel, or modal on every load.
 */
import { registerFoundation } from "../components/registerFoundation.js";
import { registerContent } from "../components/content/registerContent.js";
import { registerContainers } from "../components/containers/registerContainers.js";
import { registerForms } from "../components/forms/registerForms.js";
import { registerActions } from "../components/actions/registerActions.js";
import { registerCards } from "../components/cards/index.js";

/**
 * @param {ReturnType<import("../renderer/registry.js").createComponentRegistry>} registry
 */
export function registerShellComponents(registry) {
  registerFoundation(registry);
  registerContent(registry);
  registerContainers(registry);
  registerForms(registry);
  registerActions(registry);
  registerCards(registry);
  return registry;
}
