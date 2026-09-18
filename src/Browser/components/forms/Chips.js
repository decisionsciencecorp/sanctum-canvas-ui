/**
 * A6.3 — Chips (single / multiple selection).
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
  resolveDisabled,
  setClass,
  setOrRemoveAttr,
} from "./shared.js";

/** @type {WeakMap<Element, { onClick: Function, onKeyDown: Function }>} */
const STATE = new WeakMap();

export const ChipItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("button");
    el.setAttribute("data-canvas-component", "ChipItem");
    return el;
  },
  patch() {},
});

export const Chips = lifecycle({
  ownsChildren: true,
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Chips");
    el.setAttribute("role", "group");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const name = fieldName(props);
    const type = asText(props.type) === "single" ? "single" : "multiple";
    setClass(el, `canvas-chips canvas-chips--${type}`);
    el.setAttribute("data-type", type);

    const items = mapItems(props.items, (p) => ({
      value: asText(p.value),
      label: asText(p.label) || asText(p.value),
      disabled: p.disabled === true,
    })).filter((i) => i.value);

    const existing = resolveFieldValue(props, ctx, undefined);
    const selection = normalizeSelection(type, existing, props.defaultValue);
    const disabled = resolveDisabled(props, ctx);

    clearChildren(el);
    for (const item of items) {
      const btn = doc.createElement("button");
      btn.setAttribute("type", "button");
      btn.setAttribute("class", "canvas-chip");
      btn.setAttribute("data-canvas-part", "chip");
      btn.setAttribute("data-value", item.value);
      btn.setAttribute("aria-pressed", selection.includes(item.value) ? "true" : "false");
      if (selection.includes(item.value)) btn.setAttribute("data-selected", "1");
      else btn.removeAttribute("data-selected");
      setOrRemoveAttr(btn, "disabled", disabled || item.disabled ? true : null);
      btn.textContent = item.label;
      el.appendChild(btn);
    }

    ensureFieldRegistration(
      el,
      props,
      ctx,
      "Chips",
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
          const btn = e?.target;
          if (!btn || btn.getAttribute?.("data-canvas-part") !== "chip") return;
          if (btn.getAttribute("disabled") != null) return;
          const p = el._canvasProps || {};
          const c = el._canvasCtx || {};
          const t = asText(p.type) === "single" ? "single" : "multiple";
          const current = [...el.childNodes]
            .filter((n) => n.nodeType === 1 && n.getAttribute("data-selected") === "1")
            .map((n) => n.getAttribute("data-value"));
          const next = toggleSelection(t, current, btn.getAttribute("data-value"));
          for (const node of el.childNodes) {
            if (node.nodeType !== 1) continue;
            const v = node.getAttribute("data-value");
            const on = next.includes(v);
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

export default Chips;
