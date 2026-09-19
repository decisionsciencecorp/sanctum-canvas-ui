/**
 * MarkDownRenderer — OpenUI markdown block. HTML is allowlisted
 * (security/markdown.js). Not a free-form HTML slot.
 */

import { markdownToSafeDom } from "../../security/markdown.js";
import { asText, clearChildren, lifecycle, setClass } from "./shared.js";

const VARIANTS = new Set(["clear", "card", "sunk"]);

export const MarkDownRenderer = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "MarkDownRenderer");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const variant = VARIANTS.has(asText(props.variant)) ? asText(props.variant) : "clear";
    setClass(el, `canvas-markdown canvas-markdown--${variant}`);
    el.setAttribute("data-variant", variant);
    clearChildren(el);
    const text = asText(props.textMarkdown ?? props.text ?? props.content);
    const rendered = markdownToSafeDom(text, doc);
    el.appendChild(rendered);
  },
});

export default MarkDownRenderer;
