/**
 * A6.10 — Register advanced card blocks, composites, and ImageGallery.
 */

import { Text, BoldText } from "./Text.js";
import { IconText } from "./IconText.js";
import { ImageText, ImageTextLarge } from "./ImageText.js";
import { SnippetCardBlock, SnippetCardItem } from "./SnippetCardBlock.js";
import { OverviewCardBlock, OverviewCardItem } from "./OverviewCardBlock.js";
import { ContextCardBlock, ContextCardItem } from "./ContextCardBlock.js";
import { CompositeCardBlock, CompositeCardItem } from "./CompositeCardBlock.js";
import { VisualCardBlock, VisualCardItem } from "./VisualCardBlock.js";
import { ImageGallery } from "./ImageGallery.js";

/** @type {Record<string, import("../../renderer/registry.js").ComponentEntry>} */
export const CARD_COMPONENTS = {
  Text,
  BoldText,
  IconText,
  ImageText,
  ImageTextLarge,
  SnippetCardBlock,
  SnippetCardItem,
  OverviewCardBlock,
  OverviewCardItem,
  ContextCardBlock,
  ContextCardItem,
  CompositeCardBlock,
  CompositeCardItem,
  VisualCardBlock,
  VisualCardItem,
  ImageGallery,
};

/**
 * @param {{ register: (type: string, entry: unknown) => void }} registry
 * @returns {typeof registry}
 */
export function registerCards(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerCards: registry with register() required");
  }
  for (const [type, entry] of Object.entries(CARD_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}

export {
  Text,
  BoldText,
  IconText,
  ImageText,
  ImageTextLarge,
  SnippetCardBlock,
  SnippetCardItem,
  OverviewCardBlock,
  OverviewCardItem,
  ContextCardBlock,
  ContextCardItem,
  CompositeCardBlock,
  CompositeCardItem,
  VisualCardBlock,
  VisualCardItem,
  ImageGallery,
};

export default registerCards;
