/**
 * A6.3 — SwitchGroup / SwitchItem.
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

/** @type {WeakMap<Element, { onChange: Function }>} */
const STATE = new WeakMap();

export const SwitchItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "SwitchItem");
    return el;
  },
  patch() {},
});

function buildAggregate(props, ctx, items) {
  const stored = resolveFieldValue(props, ctx, undefined);
  /** @type {Record<string, boolean>} */
  const out = {};
  for (const item of items) {
    if (stored && typeof stored === "object" && item.name in stored) {
      out[item.name] = !!stored[item.name];
    } else {
      out[item.name] = item.defaultChecked === true;
    }
  }
  return out;
}

export const SwitchGroup = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "SwitchGroup");
    el.setAttribute("role", "group");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const name = fieldName(props);
    const variant = asText(props.variant) || "clear";
    setClass(el, `canvas-switch-group canvas-switch-group--${variant}`);

    const items = mapItems(props.items, (p) => ({
      name: asText(p.name),
      label: asText(p.label),
      description: asText(p.description),
      defaultChecked: p.defaultChecked === true,
      disabled: p.disabled === true,
    })).filter((i) => i.name);

    const aggregate = buildAggregate(props, ctx, items);
    const disabled = resolveDisabled(props, ctx);

    clearChildren(el);
    for (const item of items) {
      const row = doc.createElement("label");
      row.setAttribute("class", "canvas-switch-item");
      row.setAttribute("data-canvas-part", "item");
      row.setAttribute("data-name", item.name);

      const input = doc.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("role", "switch");
      input.setAttribute("class", "canvas-switch-item__input");
      input.setAttribute("name", `${name}.${item.name}`);
      input.checked = !!aggregate[item.name];
      input.setAttribute("aria-checked", input.checked ? "true" : "false");
      if (input.checked) input.setAttribute("checked", "true");
      else input.removeAttribute("checked");
      setOrRemoveAttr(input, "disabled", disabled || item.disabled ? true : null);

      const body = doc.createElement("span");
      body.setAttribute("class", "canvas-switch-item__body");
      const lab = doc.createElement("span");
      lab.setAttribute("class", "canvas-switch-item__label");
      lab.textContent = item.label || item.name;
      body.appendChild(lab);
      if (item.description) {
        const desc = doc.createElement("span");
        desc.setAttribute("class", "canvas-switch-item__description");
        desc.textContent = item.description;
        body.appendChild(desc);
      }
      row.appendChild(input);
      row.appendChild(body);
      el.appendChild(row);
    }

    ensureFieldRegistration(el, props, ctx, "SwitchGroup", () => {
      /** @type {Record<string, boolean>} */
      const next = {};
      for (const row of el.childNodes) {
        if (row.nodeType !== 1) continue;
        const input = row.childNodes?.[0];
        const key = row.getAttribute?.("data-name");
        if (key && input) {
          next[key] = !!input.checked || input.getAttribute("checked") === "true";
        }
      }
      return next;
    }, aggregate);

    let state = STATE.get(el);
    if (!state) {
      state = {
        onChange: (e) => {
          const target = e?.target;
          if (!target || target.getAttribute?.("role") !== "switch") {
            if (target?.getAttribute?.("type") !== "checkbox") return;
          }
          /** @type {Record<string, boolean>} */
          const next = {};
          for (const row of el.childNodes) {
            if (row.nodeType !== 1) continue;
            const input = row.childNodes?.[0];
            const key = row.getAttribute?.("data-name");
            if (!key || !input) continue;
            if (input === target) {
              const was = input.getAttribute("checked") === "true" || !!input.checked;
              const now = typeof target.checked === "boolean" ? target.checked : !was;
              input.checked = now;
              if (now) input.setAttribute("checked", "true");
              else input.removeAttribute("checked");
              input.setAttribute("aria-checked", now ? "true" : "false");
            }
            next[key] = !!input.checked || input.getAttribute("checked") === "true";
          }
          commitFieldValue(el._canvasProps || {}, el._canvasCtx || {}, next, {});
        },
      };
      el.addEventListener("change", state.onChange);
      el.addEventListener("click", state.onChange);
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
    }
    STATE.delete(el);
    teardownField(el, ctx);
  },
});

export default SwitchGroup;
