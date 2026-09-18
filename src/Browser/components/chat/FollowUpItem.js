/**
 * A5.3 — FollowUpItem — clickable suggestion → ContinueConversation.
 */

import {
  asText,
  clearChildren,
  lifecycle,
  setClass,
  setOrRemoveAttr,
} from "../content/shared.js";
import { dispatchContinueConversation } from "./continueConversation.js";

export const FollowUpItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("button");
    el.setAttribute("type", "button");
    el.setAttribute("data-canvas-component", "FollowUpItem");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const text = asText(props.text);
    const streaming = ctx.stream?.isStreaming === true;

    setClass(el, "canvas-follow-up-item");
    el.setAttribute("data-streaming-blocked", streaming ? "true" : "false");
    setOrRemoveAttr(el, "disabled", streaming ? "true" : null);
    setOrRemoveAttr(el, "aria-disabled", streaming ? "true" : null);

    clearChildren(el);

    if (text) {
      const span = doc.createElement("span");
      span.setAttribute("class", "canvas-follow-up-item__text");
      span.textContent = text;
      el.appendChild(span);
    }

    if (asText(props.icon)) {
      const icon = doc.createElement("span");
      icon.setAttribute("class", "canvas-follow-up-item__icon");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = asText(props.icon);
      el.appendChild(icon);
    } else {
      const chevron = doc.createElement("span");
      chevron.setAttribute("class", "canvas-follow-up-item__icon");
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "›";
      el.appendChild(chevron);
    }

    el.onclick = () => {
      dispatchContinueConversation(
        ctx,
        {
          ...props,
          action: props.action ?? {
            type: "continue_conversation",
            context: text,
            message: text,
          },
        },
        { fallbackMessage: text, userGesture: true },
      );
    };
  },
});

export default FollowUpItem;
