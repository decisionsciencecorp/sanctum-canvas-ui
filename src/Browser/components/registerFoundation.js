/**
 * A5.1 — Register foundation layout roots (Stack, Card + region sub-roots).
 *
 * @param {ReturnType<import('../renderer/registry.js').createComponentRegistry>} registry
 * @returns {typeof registry}
 */

import { Stack } from "./layout/Stack.js";
import { Card } from "./layout/Card.js";
import { CardContent } from "./layout/CardContent.js";
import {
  CardSources,
  CardSourcesHeading,
  CardSourceItem,
} from "./layout/CardSources.js";
import {
  PARTIAL_SKELETON_TYPE,
  renderPartialSkeleton,
} from "../renderer/partialGate.js";

/**
 * @param {{
 *   register: (type: string, entry: unknown) => void,
 *   has?: (type: string) => boolean,
 * }} registry
 */
export function registerFoundation(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerFoundation: registry with register() required");
  }

  registry.register("Stack", Stack);
  registry.register("Card", Card);
  registry.register("CardContent", CardContent);
  registry.register("CardSources", CardSources);
  registry.register("CardSourcesHeading", CardSourcesHeading);
  registry.register("CardSourceItem", CardSourceItem);

  // Alias used by some chat fixtures / upstream Sources strip.
  registry.register("Sources", CardSources);

  if (typeof registry.has !== "function" || !registry.has(PARTIAL_SKELETON_TYPE)) {
    registry.register(PARTIAL_SKELETON_TYPE, renderPartialSkeleton);
  }

  return registry;
}

export {
  Stack,
  Card,
  CardContent,
  CardSources,
  CardSourcesHeading,
  CardSourceItem,
};
