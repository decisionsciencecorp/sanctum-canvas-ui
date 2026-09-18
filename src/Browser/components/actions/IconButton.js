/**
 * A6.4 — IconButton (icon-only; name is accessible label).
 */

import { dispatchButtonAction } from "./actionDispatch.js";
import {
  asText,
  clearChildren,
  lifecycle,
  renderContent,
  resolveDisabled,
  resolveIsStreaming,
  setClass,
  setOrRemoveAttr,
} from "../forms/shared.js";

/** @type {WeakMap<Element, { onClick: Function, onKeyDown: Function }>} */
const STATE = new WeakMap();

export const IconButton = lifecycle({
  mount(doc) {
    const el = doc.createElement("button");
    el.setAttribute("data-canvas-component", "IconButton");
    el.setAttribute("type", "button");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const variant = asText(props.variant) || "secondary";
    const size = asText(props.size) || "medium";
    const shape = asText(props.shape) || "square";
    const name = asText(props.name) || asText(props.ariaLabel) || "Action";

    setClass(
      el,
      `canvas-icon-button canvas-icon-button--${variant} canvas-icon-button--${size} canvas-icon-button--${shape}`,
    );
    el.setAttribute("aria-label", name);
    el.setAttribute("data-variant", variant);
    el.setAttribute("data-size", size);
    el.setAttribute("data-shape", shape);

    const disabled = resolveDisabled(props, ctx) || resolveIsStreaming(props, ctx);
    setOrRemoveAttr(el, "disabled", disabled ? true : null);
    setOrRemoveAttr(el, "aria-disabled", disabled ? "true" : null);

    clearChildren(el);
    const doc = ctx.document ?? el.ownerDocument;
    const iconHost = doc.createElement("span");
    iconHost.setAttribute("class", "canvas-icon-button__icon");
    iconHost.setAttribute("aria-hidden", "true");
    if (props.icon != null) {
      if (typeof props.icon === "string") {
        iconHost.setAttribute("data-icon", props.icon);
        iconHost.textContent = props.icon;
      } else {
        renderContent(iconHost, props.icon, ctx);
      }
    } else {
      iconHost.textContent = "•";
    }
    el.appendChild(iconHost);

    let state = STATE.get(el);
    if (!state) {
      state = {
        onClick: (e) => {
          if (e && typeof e.preventDefault === "function") e.preventDefault();
          if (el.getAttribute("disabled") != null) return;
          void dispatchButtonAction(el, el._canvasProps || {}, el._canvasCtx || {}, {
            label: name,
          });
        },
        onKeyDown: (e) => {
          if (e?.key !== "Enter" && e?.key !== " ") return;
          if (typeof e.preventDefault === "function") e.preventDefault();
          state.onClick(e);
        },
      };
      el.addEventListener("click", state.onClick);
      el.addEventListener("keydown", state.onKeyDown);
      STATE.set(el, state);
    }
    el._canvasProps = props;
    el._canvasCtx = ctx;
  },
  unmount(el) {
    const state = STATE.get(el);
    if (state) {
      el.removeEventListener("click", state.onClick);
      el.removeEventListener("keydown", state.onKeyDown);
    }
    STATE.delete(el);
  },
});

export default IconButton;
