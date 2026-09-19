/**
 * TextContent — plain text block (library: text/size/weight; React: clear|card|sunk).
 */

import { markdownToSafeDom } from "../../security/markdown.js";
import {
  applySurfaceStatus,
  asText,
  clearChildren,
  lifecycle,
  setClass,
} from "./shared.js";

const VARIANTS = new Set(["clear", "card", "sunk"]);
const WEIGHTS = new Set(["normal", "medium", "bold"]);

function resolveVariant(props) {
  const v = asText(props.variant) || "sunk";
  return VARIANTS.has(v) ? v : "sunk";
}

const SIZE_ALIAS = {
  sm: "sm",
  md: "md",
  lg: "lg",
  small: "sm",
  default: "md",
  large: "lg",
  "small-heavy": "sm",
  "large-heavy": "lg",
};

function resolveSize(props) {
  const s = asText(props.size) || "default";
  return SIZE_ALIAS[s] || "md";
}

function resolveWeight(props) {
  const explicit = asText(props.weight);
  if (explicit && WEIGHTS.has(explicit)) return explicit;
  const size = asText(props.size) || "";
  if (size.endsWith("-heavy") || size === "heavy") return "bold";
  return "normal";
}

function bodyText(props) {
  return asText(props.text ?? props.content ?? props.children);
}

export const TextContent = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "TextContent");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const variant = resolveVariant(props);
    const size = resolveSize(props);
    const weight = resolveWeight(props);
    setClass(
      el,
      `canvas-text-content canvas-text-content--${variant} canvas-text-content--size-${size} canvas-text-content--weight-${weight}`,
    );
    el.setAttribute("data-variant", variant);
    el.setAttribute("data-size", size);
    el.setAttribute("data-weight", weight);

    clearChildren(el);

    const text = bodyText(props);
    const effective =
      resolveStatusFromProps(props) === "ready" && !text
        ? { ...props, status: "empty" }
        : props;

    const { status } = applySurfaceStatus(el, doc, effective, {
      emptyMessage: asText(props.emptyMessage) || "No text",
    });
    if (status !== "ready") return;

    const body = markdownToSafeDom(text, doc);
    body.setAttribute("class", "canvas-text-content__body");
    body.setAttribute("data-canvas-body", "");
    el.insertBefore(body, el.firstChild);
  },
});

function resolveStatusFromProps(props) {
  const raw = props.status ?? props.state;
  if (raw === "loading" || raw === "empty" || raw === "error" || raw === "ready") {
    return raw;
  }
  if (props.loading === true) return "loading";
  if (props.error != null && props.error !== false) return "error";
  if (props.empty === true) return "empty";
  return "ready";
}

export default TextContent;
