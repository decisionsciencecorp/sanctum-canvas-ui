/**
 * A6.3 — OptionCards (single / multiple selectable cards).
 */

import {
  commitFieldValue,
  ensureFieldRegistration,
  normalizeSelection,
  resolveFieldValue,
  teardownField,
  toggleSelection,
} from "./fieldControl.js";
import {
  asText,
  clearChildren,
  fieldName,
  lifecycle,
  mapItems,
  renderContent,
  resolveDisabled,
  setClass,
  setOrRemoveAttr,
} from "./shared.js";

/** @type {WeakMap<Element, { onClick: Function, onKeyDown: Function }>} */
const STATE = new WeakMap();

export const OptionCard = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "OptionCard");
    return el;
  },
  patch() {},
});

export const OptionCards = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "OptionCards");
    el.setAttribute("role", "group");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const name = fieldName(props);
    const type = asText(props.type) === "multiple" ? "multiple" : "single";
    setClass(el, `canvas-option-cards canvas-option-cards--${type}`);
    el.setAttribute("data-type", type);

    const items = mapItems(props.items, (p, raw) => ({
      value: asText(p.value),
      title: asText(p.title) || asText(p.label) || asText(p.value),
      subtitle: asText(p.subtitle),
      topContent: p.topContent,
      disabled: p.disabled === true,
      raw,
    })).filter((i) => i.value);

    const existing = resolveFieldValue(props, ctx, undefined);
    const selection = normalizeSelection(type, existing, props.defaultValue);
    const disabled = resolveDisabled(props, ctx);

    clearChildren(el);
    for (const item of items) {
      const card = doc.createElement("button");
      card.setAttribute("type", "button");
      card.setAttribute("class", "canvas-option-card");
      card.setAttribute("data-canvas-part", "card");
      card.setAttribute("data-value", item.value);
      card.setAttribute("aria-pressed", selection.includes(item.value) ? "true" : "false");
      if (selection.includes(item.value)) card.setAttribute("data-selected", "1");
      setOrRemoveAttr(card, "disabled", disabled || item.disabled ? true : null);

      if (item.topContent != null) {
        const top = doc.createElement("div");
        top.setAttribute("class", "canvas-option-card__top");
        top.setAttribute("data-canvas-part", "top");
        renderContent(top, item.topContent, ctx);
        card.appendChild(top);
      }
      const title = doc.createElement("div");
      title.setAttribute("class", "canvas-option-card__title");
      title.textContent = item.title;
      card.appendChild(title);
      if (item.subtitle) {
        const sub = doc.createElement("div");
        sub.setAttribute("class", "canvas-option-card__subtitle");
        sub.textContent = item.subtitle;
        card.appendChild(sub);
      }
      el.appendChild(card);
    }

    ensureFieldRegistration(
      el,
      props,
      ctx,
      "OptionCards",
      () => {
        const selected = [...el.childNodes]
          .filter((n) => n.nodeType === 1 && n.getAttribute("data-selected") === "1")
          .map((n) => n.getAttribute("data-value"));
        if (type === "single") return selected[0] || undefined;
        return selected.length ? selected : undefined;
      },
      type === "single" ? selection[0] : selection,
    );

    let state = STATE.get(el);
    if (!state) {
      state = {
        onClick: (e) => {
          let btn = e?.target;
          while (btn && btn !== el && btn.getAttribute?.("data-canvas-part") !== "card") {
            btn = btn.parentNode;
          }
          if (!btn || btn === el || btn.getAttribute("disabled") != null) return;
          const p = el._canvasProps || {};
          const c = el._canvasCtx || {};
          const t = asText(p.type) === "multiple" ? "multiple" : "single";
          const current = [...el.childNodes]
            .filter((n) => n.nodeType === 1 && n.getAttribute("data-selected") === "1")
            .map((n) => n.getAttribute("data-value"));
          const next = toggleSelection(t, current, btn.getAttribute("data-value"));
          for (const node of el.childNodes) {
            if (node.nodeType !== 1) continue;
            const on = next.includes(node.getAttribute("data-value"));
            node.setAttribute("aria-pressed", on ? "true" : "false");
            if (on) node.setAttribute("data-selected", "1");
            else node.removeAttribute("data-selected");
          }
          const stored = t === "single" ? next[0] ?? undefined : next;
          commitFieldValue(p, c, stored, { validate: true });
        },
        onKeyDown: (e) => {
          if (e?.key !== " " && e?.key !== "Enter") return;
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
    void name;
  },
  unmount(el, ctx) {
    const state = STATE.get(el);
    if (state) {
      el.removeEventListener("click", state.onClick);
      el.removeEventListener("keydown", state.onKeyDown);
    }
    STATE.delete(el);
    teardownField(el, ctx);
  },
});

export default OptionCards;
