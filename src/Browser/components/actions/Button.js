/**
 * A6.4 — Button.
 */

import { dispatchButtonAction } from "./actionDispatch.js";
import {
  asText,
  lifecycle,
  resolveDisabled,
  resolveIsStreaming,
  setClass,
  setOrRemoveAttr,
} from "../forms/shared.js";

const VARIANTS = new Set(["primary", "secondary", "tertiary", "ghost"]);
const SIZES = new Set(["extra-small", "small", "medium", "large", "sm", "md", "lg", "xs"]);

/** @type {WeakMap<Element, { onClick: Function, onKeyDown: Function }>} */
const STATE = new WeakMap();

function resolveVariant(props) {
  const v = asText(props.variant) || "primary";
  if (v === "ghost") return "tertiary";
  return VARIANTS.has(v) ? v : "primary";
}

function resolveSize(props) {
  const s = asText(props.size) || "medium";
  if (s === "xs") return "extra-small";
  if (s === "sm") return "small";
  if (s === "md") return "medium";
  if (s === "lg") return "large";
  return SIZES.has(s) ? s : "medium";
}

export const Button = lifecycle({
  mount(doc) {
    const el = doc.createElement("button");
    el.setAttribute("data-canvas-component", "Button");
    el.setAttribute("type", "button");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const variant = resolveVariant(props);
    const size = resolveSize(props);
    const destructive =
      props.type === "destructive" ||
      props.buttonType === "destructive" ||
      props.destructive === true;
    const label = asText(props.label ?? props.text ?? props.children);

    setClass(
      el,
      [
        "canvas-button",
        `canvas-button--${variant}`,
        `canvas-button--${size}`,
        destructive ? "canvas-button--destructive" : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
    el.setAttribute("data-variant", variant);
    el.setAttribute("data-size", size);
    setOrRemoveAttr(el, "data-destructive", destructive ? "1" : null);

    const loading = props.loading === true;
    const disabled =
      resolveDisabled(props, ctx) || resolveIsStreaming(props, ctx) || loading;
    setOrRemoveAttr(el, "disabled", disabled ? true : null);
    setOrRemoveAttr(el, "aria-disabled", disabled ? "true" : null);
    setOrRemoveAttr(el, "aria-busy", loading ? "true" : null);

    // Link-like: when href provided and safe, render as anchor semantics via role.
    const href = asText(props.href);
    if (href) {
      const policy = ctx.urlPolicy;
      const safe =
        policy && typeof policy.safeUrl === "function"
          ? policy.safeUrl(href)
          : href.startsWith("javascript:")
            ? undefined
            : href;
      if (safe) {
        el.setAttribute("data-href", safe);
        el.setAttribute("role", "link");
      } else {
        el.removeAttribute("data-href");
        el.removeAttribute("role");
      }
    } else {
      el.removeAttribute("data-href");
      if (el.getAttribute("role") === "link") el.removeAttribute("role");
    }

    el.textContent = label;
    if (!label && props.ariaLabel) {
      el.setAttribute("aria-label", asText(props.ariaLabel));
    }

    let state = STATE.get(el);
    if (!state) {
      state = {
        onClick: (e) => {
          if (e && typeof e.preventDefault === "function") e.preventDefault();
          if (el.getAttribute("disabled") != null) return;
          const p = el._canvasProps || {};
          const c = el._canvasCtx || {};
          // href-only open via urlPolicy
          const link = el.getAttribute("data-href");
          if (link && !p.action) {
            if (c.urlPolicy && typeof c.urlPolicy.safeOpenUrl === "function") {
              c.urlPolicy.safeOpenUrl(link);
            } else if (typeof c.openUrl === "function") {
              c.openUrl(link);
            }
            return;
          }
          void dispatchButtonAction(el, p, c, { label: asText(p.label) });
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

export default Button;
