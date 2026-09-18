/**
 * A6.3 — CheckBoxGroup / CheckBoxItem (alias CheckboxGroup).
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

export const CheckBoxItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "CheckBoxItem");
    return el;
  },
  patch() {
    /* Rendered by parent group */
  },
});

/**
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 */
function buildAggregate(props, ctx, items) {
  const stored = resolveFieldValue(props, ctx, undefined);
  /** @type {Record<string, boolean>} */
  const out = {};
  for (const item of items) {
    const key = item.name;
    if (stored && typeof stored === "object" && !Array.isArray(stored) && key in stored) {
      out[key] = !!stored[key];
    } else {
      out[key] = item.defaultChecked === true;
    }
  }
  return out;
}

export const CheckBoxGroup = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "CheckBoxGroup");
    el.setAttribute("role", "group");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const name = fieldName(props);
    setClass(el, "canvas-checkbox-group");
    setOrRemoveAttr(el, "aria-labelledby", asText(props.labelledBy) || null);

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
      row.setAttribute("class", "canvas-checkbox-item");
      row.setAttribute("data-canvas-part", "item");
      row.setAttribute("data-name", item.name);

      const input = doc.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("class", "canvas-checkbox-item__input");
      input.setAttribute("name", `${name}.${item.name}`);
      input.checked = !!aggregate[item.name];
      if (input.checked) input.setAttribute("checked", "true");
      else input.removeAttribute("checked");
      setOrRemoveAttr(input, "disabled", disabled || item.disabled ? true : null);

      const body = doc.createElement("span");
      body.setAttribute("class", "canvas-checkbox-item__body");
      const lab = doc.createElement("span");
      lab.setAttribute("class", "canvas-checkbox-item__label");
      lab.textContent = item.label || item.name;
      body.appendChild(lab);
      if (item.description) {
        const desc = doc.createElement("span");
        desc.setAttribute("class", "canvas-checkbox-item__description");
        desc.textContent = item.description;
        body.appendChild(desc);
      }

      row.appendChild(input);
      row.appendChild(body);
      el.appendChild(row);
    }

    ensureFieldRegistration(el, props, ctx, "CheckBoxGroup", () => {
      /** @type {Record<string, boolean>} */
      const next = {};
      for (const row of el.childNodes) {
        if (row.nodeType !== 1) continue;
        const input = row.childNodes?.[0];
        const key = row.getAttribute?.("data-name");
        if (key && input) next[key] = !!input.checked || input.getAttribute?.("checked") === "true";
      }
      return next;
    }, aggregate);

    let state = STATE.get(el);
    if (!state) {
      state = {
        onChange: (e) => {
          const target = e?.target;
          if (!target || target.getAttribute?.("type") !== "checkbox") return;
          /** @type {Record<string, boolean>} */
          const next = {};
          for (const row of el.childNodes) {
            if (row.nodeType !== 1) continue;
            const input = row.childNodes?.[0];
            const key = row.getAttribute?.("data-name");
            if (!key || !input) continue;
            if (input === target) {
              input.checked = !!(target.checked ?? target.getAttribute("checked") === "true");
              // miniDom: flip checked from event or attribute toggle
              if (e && "checked" in e) input.checked = !!e.checked;
              else if (typeof target.checked === "boolean") {
                /* already set by browser */
              } else {
                const was = input.getAttribute("checked") === "true";
                input.checked = !was;
              }
              if (input.checked) input.setAttribute("checked", "true");
              else input.removeAttribute("checked");
            }
            next[key] = !!input.checked || input.getAttribute("checked") === "true";
          }
          commitFieldValue(el._canvasProps || {}, el._canvasCtx || {}, next, {
            validate: true,
          });
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

/** Alias per task wording */
export const CheckboxGroup = CheckBoxGroup;
export const CheckboxItem = CheckBoxItem;

export default CheckBoxGroup;
