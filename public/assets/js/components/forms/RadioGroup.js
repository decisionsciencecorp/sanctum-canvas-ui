/**
 * A6.3 — RadioGroup / RadioItem.
 */

import {
  commitFieldValue,
  ensureFieldRegistration,
  resolveFieldValue,
  teardownField,
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

/** @type {WeakMap<Element, { onChange: Function, onKeyDown: Function }>} */
const STATE = new WeakMap();

export const RadioItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "RadioItem");
    return el;
  },
  patch() {},
});

export const RadioGroup = lifecycle({
  ownsChildren: true,
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "RadioGroup");
    el.setAttribute("role", "radiogroup");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const name = fieldName(props);
    setClass(el, "canvas-radio-group");
    setOrRemoveAttr(el, "aria-labelledby", asText(props.labelledBy) || null);

    const items = mapItems(props.items, (p) => ({
      value: asText(p.value),
      label: asText(p.label) || asText(p.value),
      description: asText(p.description),
      disabled: p.disabled === true,
    })).filter((i) => i.value);

    const value = String(
      resolveFieldValue(props, ctx, props.defaultValue ?? "") ?? "",
    );
    const disabled = resolveDisabled(props, ctx);

    clearChildren(el);
    items.forEach((item, index) => {
      const row = doc.createElement("label");
      row.setAttribute("class", "canvas-radio-item");
      row.setAttribute("data-canvas-part", "item");
      row.setAttribute("data-value", item.value);

      const input = doc.createElement("input");
      input.setAttribute("type", "radio");
      input.setAttribute("class", "canvas-radio-item__input");
      input.setAttribute("name", name || "radio");
      input.setAttribute("value", item.value);
      input.checked = item.value === value;
      if (input.checked) input.setAttribute("checked", "true");
      else input.removeAttribute("checked");
      input.setAttribute("tabindex", item.value === value || (!value && index === 0) ? "0" : "-1");
      setOrRemoveAttr(input, "disabled", disabled || item.disabled ? true : null);

      const body = doc.createElement("span");
      body.setAttribute("class", "canvas-radio-item__body");
      const lab = doc.createElement("span");
      lab.setAttribute("class", "canvas-radio-item__label");
      lab.textContent = item.label;
      body.appendChild(lab);
      if (item.description) {
        const desc = doc.createElement("span");
        desc.setAttribute("class", "canvas-radio-item__description");
        desc.textContent = item.description;
        body.appendChild(desc);
      }
      row.appendChild(input);
      row.appendChild(body);
      el.appendChild(row);
    });

    ensureFieldRegistration(el, props, ctx, "RadioGroup", () => {
      for (const row of el.childNodes) {
        if (row.nodeType !== 1) continue;
        const input = row.childNodes?.[0];
        if (input && (input.checked || input.getAttribute("checked") === "true")) {
          return input.getAttribute("value") || row.getAttribute("data-value");
        }
      }
      return undefined;
    }, value || undefined);

    let state = STATE.get(el);
    if (!state) {
      state = {
        onChange: (e) => {
          const target = e?.target;
          const v =
            target?.getAttribute?.("value") ||
            target?.value ||
            e?.value;
          if (v == null) return;
          for (const row of el.childNodes) {
            if (row.nodeType !== 1) continue;
            const input = row.childNodes?.[0];
            if (!input) continue;
            const selected = input.getAttribute("value") === String(v);
            input.checked = selected;
            if (selected) input.setAttribute("checked", "true");
            else input.removeAttribute("checked");
            input.setAttribute("tabindex", selected ? "0" : "-1");
          }
          commitFieldValue(el._canvasProps || {}, el._canvasCtx || {}, String(v), {
            validate: true,
          });
        },
        onKeyDown: (e) => {
          const key = e?.key;
          if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "ArrowRight" && key !== "ArrowLeft") {
            return;
          }
          if (typeof e.preventDefault === "function") e.preventDefault();
          const radios = [...el.childNodes]
            .filter((n) => n.nodeType === 1)
            .map((n) => n.childNodes?.[0])
            .filter(Boolean);
          const idx = radios.findIndex(
            (r) => r.checked || r.getAttribute("checked") === "true",
          );
          const dir = key === "ArrowDown" || key === "ArrowRight" ? 1 : -1;
          const next = radios[(idx + dir + radios.length) % radios.length];
          if (next) {
            state.onChange({ target: next, value: next.getAttribute("value") });
            if (typeof next.focus === "function") next.focus();
          }
        },
      };
      el.addEventListener("change", state.onChange);
      el.addEventListener("click", state.onChange);
      el.addEventListener("keydown", state.onKeyDown);
      STATE.set(el, state);
    }
    el._canvasProps = props;
    el._canvasCtx = ctx;
  },
  unmount(el, ctx) {
    const state = STATE.get(el);
    if (state) {
      el.removeEventListener("change", state.onChange);
      el.removeEventListener("click", state.onChange);
      el.removeEventListener("keydown", state.onKeyDown);
    }
    STATE.delete(el);
    teardownField(el, ctx);
  },
});

export default RadioGroup;
