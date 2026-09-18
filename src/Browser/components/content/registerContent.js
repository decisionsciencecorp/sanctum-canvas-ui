/**
 * Register A5.2 content primitives on a createComponentRegistry instance.
 * Path-isolated under components/content/ so A5.1 Stack/Card can own layout/.
 */

import { TextContent } from "./TextContent.js";
import { TextCallout } from "./TextCallout.js";
import { Callout } from "./Callout.js";
import { Separator } from "./Separator.js";
import { Tag } from "./Tag.js";
import { TagBlock } from "./TagBlock.js";
import { EntityList } from "./EntityList.js";
import { InlineHeader } from "./InlineHeader.js";
import { CardHeader } from "./CardHeader.js";
import {
  MetricIndicator,
  MetricIndicatorInline,
  MetricIndicatorWithStrikethrough,
} from "./MetricIndicator.js";

/** @type {Record<string, import("../../renderer/registry.js").ComponentEntry>} */
export const CONTENT_COMPONENTS = {
  TextContent,
  TextCallout,
  Callout,
  Separator,
  Tag,
  TagBlock,
  EntityList,
  InlineHeader,
  CardHeader,
  MetricIndicator,
  MetricIndicatorWithStrikethrough,
  MetricIndicatorInline,
};

/**
 * @param {{ register: (type: string, entry: unknown) => void }} registry
 * @returns {typeof registry}
 */
export function registerContent(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerContent: registry with register() required");
  }
  for (const [type, entry] of Object.entries(CONTENT_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}

export {
  TextContent,
  TextCallout,
  Callout,
  Separator,
  Tag,
  TagBlock,
  EntityList,
  InlineHeader,
  CardHeader,
  MetricIndicator,
  MetricIndicatorWithStrikethrough,
  MetricIndicatorInline,
};

export default registerContent;
