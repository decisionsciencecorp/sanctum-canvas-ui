/**
 * A5.3 — ListItem (plain or action-bearing).
 * Action items dispatch ContinueConversation only on user click.
 */

import {
  asText,
  clearChildren,
  lifecycle,
  setClass,
  setOrRemoveAttr,
} from "./shared.js";
import { dispatchContinueConversation } from "../chat/continueConversation.js";
import { safeUrl as defaultSafeUrl } from "../../security/urlPolicy.js";

const VARIANTS = new Set(["number", "image", "icon"]);
const SIZES = new Set(["default", "small"]);

/**
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 * @returns {boolean}
 */
function hasAction(props) {
  return props.action != null && props.action !== false;
}

/**
 * @param {Element} el
 * @param {Document} doc
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
function renderIndicator(el, doc, props, ctx) {
  const variant = VARIANTS.has(asText(props.variant))
    ? asText(props.variant)
    : "number";
  const listHasSubtitle = props.listHasSubtitle === true || !!asText(props.subtitle);
  const index = typeof props.index === "number" ? props.index : 0;

  const indicator = doc.createElement("div");
  let indCls = "canvas-list-item__indicator";
  if (!listHasSubtitle) indCls += " canvas-list-item__indicator--no-subtitle";
  if (hasAction(props)) indCls += " canvas-list-item__indicator--clickable";
  indicator.setAttribute("class", indCls);
  indicator.setAttribute("data-variant", variant);

  if (variant === "number") {
    const num = doc.createElement("div");
    num.setAttribute("class", "canvas-list-item__indicator-number");
    num.textContent = String(index + 1);
    indicator.appendChild(num);
  } else if (variant === "image") {
    const image = props.image && typeof props.image === "object" ? props.image : null;
    const srcRaw = image && typeof image.src === "string" ? image.src : "";
    const alt = image && typeof image.alt === "string" ? image.alt : "";
    const safe =
      srcRaw &&
      (ctx.urlPolicy?.safeUrl
        ? ctx.urlPolicy.safeUrl(srcRaw)
        : defaultSafeUrl(srcRaw));
    if (safe || alt) {
      const wrap = doc.createElement("div");
      wrap.setAttribute("class", "canvas-list-item__indicator-image");
      if (safe) {
        const img = doc.createElement("img");
        img.setAttribute("src", safe);
        img.setAttribute("alt", alt);
        img.setAttribute("width", "40");
        img.setAttribute("height", "40");
        wrap.appendChild(img);
      } else {
        wrap.textContent = alt;
      }
      indicator.appendChild(wrap);
    }
  } else if (variant === "icon" && asText(props.icon)) {
    const icon = doc.createElement("span");
    icon.setAttribute("class", "canvas-list-item__indicator-icon");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = asText(props.icon);
    indicator.appendChild(icon);
  }

  el.appendChild(indicator);
}

export const ListItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "ListItem");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const size = SIZES.has(asText(props.size)) ? asText(props.size) : "default";
    const actionable = hasAction(props);
    const streaming = ctx.stream?.isStreaming === true;

    let wrapCls = "canvas-list-item-wrapper";
    if (size === "small") wrapCls += " canvas-list-item-wrapper--small";
    if (actionable) wrapCls += " canvas-list-item-wrapper--with-action";
    setClass(el, wrapCls);
    el.setAttribute("data-size", size);
    el.setAttribute("data-actionable", actionable ? "true" : "false");
    setOrRemoveAttr(el, "data-streaming-blocked", streaming && actionable ? "true" : null);

    clearChildren(el);

    const row = doc.createElement("div");
    let rowCls = "canvas-list-item";
    if (actionable) rowCls += " canvas-list-item--clickable";
    if (streaming && actionable) rowCls += " canvas-list-item--disabled";
    row.setAttribute("class", rowCls);

    if (actionable) {
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", streaming ? "-1" : "0");
      setOrRemoveAttr(row, "aria-disabled", streaming ? "true" : null);
      const activate = () => {
        dispatchContinueConversation(ctx, props, {
          fallbackMessage: asText(props.title),
          userGesture: true,
        });
      };
      row.onclick = () => activate();
      row.onkeydown = (ev) => {
        const key = ev?.key;
        if (key === "Enter" || key === " ") {
          ev?.preventDefault?.();
          activate();
        }
      };
    } else {
      row.removeAttribute("role");
      row.removeAttribute("tabindex");
      row.onclick = null;
      row.onkeydown = null;
    }

    renderIndicator(row, doc, props, ctx);

    const contentWrap = doc.createElement("div");
    contentWrap.setAttribute("class", "canvas-list-item__content-wrapper");

    const content = doc.createElement("div");
    content.setAttribute("class", "canvas-list-item__content");

    const title = asText(props.title);
    if (title) {
      const t = doc.createElement("div");
      t.setAttribute("class", "canvas-list-item__title");
      t.textContent = title;
      content.appendChild(t);
    }
    const subtitle = asText(props.subtitle);
    if (subtitle) {
      const s = doc.createElement("div");
      s.setAttribute("class", "canvas-list-item__subtitle");
      s.textContent = subtitle;
      content.appendChild(s);
    }
    contentWrap.appendChild(content);

    if (actionable) {
      const actionLabel = asText(props.actionLabel);
      if (actionLabel) {
        const act = doc.createElement("div");
        act.setAttribute("class", "canvas-list-item__action");
        const lab = doc.createElement("div");
        lab.setAttribute("class", "canvas-list-item__action-label");
        lab.textContent = actionLabel;
        act.appendChild(lab);
        const chevron = doc.createElement("span");
        chevron.setAttribute("class", "canvas-list-item__action-icon");
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = "›";
        act.appendChild(chevron);
        contentWrap.appendChild(act);
      }
    }

    row.appendChild(contentWrap);
    el.appendChild(row);
  },
});

export default ListItem;
