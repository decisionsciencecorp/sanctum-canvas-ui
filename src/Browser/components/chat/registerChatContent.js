/**
 * A5.3 — Register chat-oriented content: FollowUp, Source/Citation, plus
 * shared List/Code/Image family (also safe to call after registerContent).
 */

import { ListBlock } from "../content/ListBlock.js";
import { ListItem } from "../content/ListItem.js";
import { CodeBlock } from "../content/CodeBlock.js";
import { Image } from "../content/Image.js";
import { ImageBlock } from "../content/ImageBlock.js";
import { FollowUpBlock } from "./FollowUpBlock.js";
import { FollowUpItem } from "./FollowUpItem.js";
import { CitationRef } from "./SourceContext.js";

/** @type {Record<string, import("../../renderer/registry.js").ComponentEntry>} */
export const CHAT_CONTENT_COMPONENTS = {
  ListBlock,
  ListItem,
  CodeBlock,
  Image,
  ImageBlock,
  FollowUpBlock,
  FollowUpItem,
  CitationRef,
  // Alias for markdown / cite wiring
  Citation: CitationRef,
};

/**
 * @param {{ register: (type: string, entry: unknown) => void, has?: (type: string) => boolean }} registry
 * @returns {typeof registry}
 */
export function registerChatContent(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerChatContent: registry with register() required");
  }
  for (const [type, entry] of Object.entries(CHAT_CONTENT_COMPONENTS)) {
    // Shared List/Code/Image may already be on the registry via registerContent;
    // still register chat-only names. Re-registering the same entry is harmless.
    registry.register(type, entry);
  }
  return registry;
}

export {
  ListBlock,
  ListItem,
  CodeBlock,
  Image,
  ImageBlock,
  FollowUpBlock,
  FollowUpItem,
  CitationRef,
};

export default registerChatContent;
