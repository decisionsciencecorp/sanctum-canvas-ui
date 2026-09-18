/**
 * CardHeader — title/subtitle header (actions are plain text labels only; no forms).
 */

import {
  applySurfaceStatus,
  asText,
  clearChildren,
  lifecycle,
  setClass,
} from "./shared.js";

export const CardHeader = lifecycle({
  mount(doc) {
    const el = doc.createElement("header");
    el.setAttribute("data-canvas-component", "CardHeader");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    setClass(el, "canvas-card-header");

    clearChildren(el);
    const { status } = applySurfaceStatus(el, doc, props, {
      emptyMessage: "No title",
    });
    if (status !== "ready") return;

    const title = asText(props.title);
    const subtitle = asText(props.subtitle);
    const icon = asText(props.icon);

    if (!title && !subtitle && !icon) {
      applySurfaceStatus(el, doc, { ...props, status: "empty" }, {
        emptyMessage: "No title",
      });
      return;
    }

    const top = doc.createElement("div");
    top.setAttribute("class", "canvas-card-header__top");

    const left = doc.createElement("div");
    left.setAttribute("class", "canvas-card-header__top-left");
    if (icon) {
      const iconEl = doc.createElement("span");
      iconEl.setAttribute("class", "canvas-card-header__icon");
      iconEl.setAttribute("aria-hidden", "true");
      iconEl.textContent = icon;
      left.appendChild(iconEl);
    }
    if (title) {
      const titleEl = doc.createElement("span");
      titleEl.setAttribute("class", "canvas-card-header__title");
      titleEl.textContent = title;
      left.appendChild(titleEl);
    }
    top.appendChild(left);

    const actions = props.actions;
    const actionLabels = Array.isArray(actions)
      ? actions.map((a) => (typeof a === "string" ? a : asText(a?.label ?? a?.text)))
      : typeof actions === "string"
        ? [actions]
        : [];
    if (actionLabels.some(Boolean)) {
      const right = doc.createElement("div");
      right.setAttribute("class", "canvas-card-header__top-right");
      right.setAttribute("data-actions", "labels");
      for (const label of actionLabels) {
        if (!label) continue;
        const a = doc.createElement("span");
        a.setAttribute("class", "canvas-card-header__action-label");
        a.textContent = label;
        right.appendChild(a);
      }
      top.appendChild(right);
    }

    el.appendChild(top);

    if (subtitle) {
      const bottom = doc.createElement("div");
      bottom.setAttribute("class", "canvas-card-header__bottom");
      bottom.textContent = subtitle;
      el.appendChild(bottom);
    }
  },
});

export default CardHeader;
