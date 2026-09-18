/**
 * TextContent — plain text block (library: text/size/weight; React: clear|card|sunk).
 */

import {
  applySurfaceStatus,
  asText,
  clearChildren,
  lifecycle,
  setClass,
} from "./shared.js";

const VARIANTS = new Set(["clear", "card", "sunk"]);
const SIZES = new Set(["sm", "md", "lg"]);
const WEIGHTS = new Set(["normal", "medium", "bold"]);

function resolveVariant(props) {
  const v = asText(props.variant) || "sunk";
  return VARIANTS.has(v) ? v : "sunk";
}

function resolveSize(props) {
  const s = asText(props.size) || "md";
  return SIZES.has(s) ? s : "md";
}

function resolveWeight(props) {
  const w = asText(props.weight) || "normal";
  return WEIGHTS.has(w) ? w : "normal";
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

    const body = doc.createElement("div");
    body.setAttribute("class", "canvas-text-content__body");
    body.setAttribute("data-canvas-body", "");
    body.textContent = text;
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
