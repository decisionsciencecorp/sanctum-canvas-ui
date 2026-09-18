/**
 * A5.4 — Accordion with disclosure semantics (aria-expanded / aria-controls)
 * and open-state preservation across keyed stream updates.
 *
 * Upstream: old/packages/react-ui Accordion + genui-lib AccordionRenderer
 * (single collapsible; auto-open newest item while streaming until user acts).
 */

import { isPartial, markPartial } from "../../renderer/partialGate.js";
import {
  asText,
  findDirectByAttr,
  itemKey,
  lifecycle,
  nextUid,
  normalizeItems,
  renderItemContent,
  requireDocument,
  setClass,
  setOrRemoveAttr,
} from "./shared.js";

/** @typedef {{ open: string, userHasInteracted: boolean, prevItemCount: number, uid: string, onClick: (e: any) => void, onKeyDown: (e: any) => void }} AccordionState */

/** @type {WeakMap<Element, AccordionState>} */
const STATE = new WeakMap();

/**
 * @param {Element} el
 * @returns {AccordionState}
 */
function getState(el) {
  let s = STATE.get(el);
  if (!s) {
    s = {
      open: "",
      userHasInteracted: false,
      prevItemCount: 0,
      uid: nextUid(),
      onClick: () => {},
      onKeyDown: () => {},
    };
    STATE.set(el, s);
  }
  return s;
}

/**
 * @param {Element} root
 * @returns {Element[]}
 */
function getItems(root) {
  return findDirectByAttr(root, "data-canvas-part", "item");
}

/**
 * @param {Element} root
 * @param {string} value
 * @param {boolean} [expanded]
 */
function applyOpen(root, value, expanded = true) {
  const state = getState(root);
  state.open = expanded ? value : "";
  setOrRemoveAttr(root, "data-open", state.open || null);

  for (const item of getItems(root)) {
    const v = item.getAttribute("data-value") || "";
    const isOpen = expanded && v === value;
    item.setAttribute("data-state", isOpen ? "open" : "closed");

    const header = findDirectByAttr(item, "data-canvas-part", "header")[0];
    const trigger =
      (header && findDirectByAttr(header, "data-canvas-part", "trigger")[0]) ||
      findDirectByAttr(item, "data-canvas-part", "trigger")[0];
    const panel = findDirectByAttr(item, "data-canvas-part", "panel")[0];
    if (trigger) {
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      trigger.setAttribute("data-state", isOpen ? "open" : "closed");
    }
    if (panel) {
      setOrRemoveAttr(panel, "hidden", isOpen ? null : "true");
      panel.setAttribute("data-state", isOpen ? "open" : "closed");
      setOrRemoveAttr(panel, "aria-hidden", isOpen ? null : "true");
    }
  }
}

/**
 * Toggle or open a section (single collapsible, like upstream type="single").
 * @param {Element} root
 * @param {string} value
 * @param {{ user?: boolean }} [opts]
 */
function setOpen(root, value, opts = {}) {
  const state = getState(root);
  if (opts.user) state.userHasInteracted = true;
  if (!value) {
    applyOpen(root, "", false);
    return;
  }
  if (state.open === value) {
    // Collapsible: close if already open
    applyOpen(root, value, false);
  } else {
    applyOpen(root, value, true);
  }
}

/**
 * Auto-open newest item when count grows during stream (upstream).
 * @param {AccordionState} state
 * @param {ReturnType<typeof normalizeItems>} items
 */
function autoOpenSelection(state, items) {
  if (state.userHasInteracted) {
    if (state.open && !items.some((i) => i.value === state.open)) {
      return items[0]?.value || "";
    }
    return state.open;
  }
  if (items.length > state.prevItemCount) {
    const newest = items[items.length - 1];
    state.prevItemCount = items.length;
    return newest?.value || "";
  }
  state.prevItemCount = items.length;
  if (!state.open && items[0]) return items[0].value;
  if (state.open && !items.some((i) => i.value === state.open)) {
    return items[0]?.value || "";
  }
  return state.open;
}

/**
 * @param {Element} root
 * @param {ReturnType<typeof normalizeItems>} items
 * @param {Record<string, unknown>} ctx
 */
function syncItems(root, items, ctx) {
  const doc = requireDocument(ctx);
  const state = getState(root);

  /** @type {Map<string, Element>} */
  const existing = new Map();
  for (const item of getItems(root)) {
    existing.set(item.getAttribute("data-value") || "", item);
  }
  const keep = new Set(items.map((i) => i.value));
  for (const [v, el] of existing) {
    if (!keep.has(v) && el.parentNode) el.parentNode.removeChild(el);
  }

  items.forEach((item, index) => {
    const key = itemKey(item, index);
    const triggerId = `canvas-acc-trigger-${state.uid}-${item.value}`;
    const panelId = `canvas-acc-panel-${state.uid}-${item.value}`;

    let itemEl = existing.get(item.value);
    if (!itemEl) {
      itemEl = doc.createElement("div");
      itemEl.setAttribute("data-canvas-part", "item");
      itemEl.setAttribute("data-value", item.value);
      itemEl.setAttribute("class", "canvas-accordion__item");
    }
    root.appendChild(itemEl);

    itemEl.setAttribute("data-item-key", key);
    itemEl.setAttribute("data-value", item.value);
    itemEl.setAttribute("class", "canvas-accordion__item");

    let header = findDirectByAttr(itemEl, "data-canvas-part", "header")[0];
    if (!header) {
      header = doc.createElement("h3");
      header.setAttribute("data-canvas-part", "header");
      header.setAttribute("class", "canvas-accordion__header");
      itemEl.appendChild(header);
    }

    let trigger = findDirectByAttr(header, "data-canvas-part", "trigger")[0];
    if (!trigger) {
      // trigger may be direct under item when header missing kids
      trigger = findDirectByAttr(itemEl, "data-canvas-part", "trigger")[0];
    }
    if (!trigger) {
      trigger = doc.createElement("button");
      trigger.setAttribute("type", "button");
      trigger.setAttribute("data-canvas-part", "trigger");
      trigger.setAttribute("class", "canvas-accordion__trigger");
      header.appendChild(trigger);
    } else if (trigger.parentNode !== header) {
      header.appendChild(trigger);
    }

    trigger.setAttribute("id", triggerId);
    trigger.setAttribute("aria-controls", panelId);
    trigger.setAttribute("aria-expanded", "false");
    // Label
    let label = findDirectByAttr(trigger, "data-canvas-part", "trigger-label")[0];
    if (!label) {
      label = doc.createElement("span");
      label.setAttribute("data-canvas-part", "trigger-label");
      label.setAttribute("class", "canvas-accordion__trigger-label");
      trigger.appendChild(label);
    }
    label.textContent = item.trigger || item.value;

    let chevron = findDirectByAttr(trigger, "data-canvas-part", "chevron")[0];
    if (!chevron) {
      chevron = doc.createElement("span");
      chevron.setAttribute("data-canvas-part", "chevron");
      chevron.setAttribute("class", "canvas-accordion__chevron");
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "▾";
      trigger.appendChild(chevron);
    }

    let panel = findDirectByAttr(itemEl, "data-canvas-part", "panel")[0];
    if (!panel) {
      panel = doc.createElement("div");
      panel.setAttribute("data-canvas-part", "panel");
      panel.setAttribute("role", "region");
      panel.setAttribute("class", "canvas-accordion__panel");
      itemEl.appendChild(panel);
    }
    panel.setAttribute("id", panelId);
    panel.setAttribute("aria-labelledby", triggerId);
    panel.setAttribute("hidden", "true");

    let body = findDirectByAttr(panel, "data-canvas-part", "panel-body")[0];
    if (!body) {
      body = doc.createElement("div");
      body.setAttribute("data-canvas-part", "panel-body");
      body.setAttribute("class", "canvas-accordion__panel-inner");
      panel.appendChild(body);
    }
    renderItemContent(body, item.content, ctx);
  });

  const nextOpen = autoOpenSelection(state, items);
  if (nextOpen) {
    applyOpen(root, nextOpen, true);
  } else {
    applyOpen(root, "", false);
  }
}

/**
 * @param {Element} root
 */
function bindOnce(root) {
  if (/** @type {any} */ (root)._canvasAccordionBound) return;
  const state = getState(root);

  state.onClick = (e) => {
    if (isPartial(root)) return;
    let node = e?.target;
    while (node && node !== root) {
      if (
        node.nodeType === 1 &&
        /** @type {Element} */ (node).getAttribute?.("data-canvas-part") === "trigger"
      ) {
        const item = /** @type {Element} */ (node).parentNode?.parentNode;
        const value =
          (item && item.getAttribute?.("data-value")) ||
          /** @type {Element} */ (node).getAttribute("aria-controls")?.replace(/^canvas-acc-panel-[^-]+-/, "") ||
          "";
        // Prefer walking up for data-value
        let cur = node;
        let found = "";
        while (cur && cur !== root) {
          if (
            cur.nodeType === 1 &&
            /** @type {Element} */ (cur).getAttribute?.("data-canvas-part") === "item"
          ) {
            found = /** @type {Element} */ (cur).getAttribute("data-value") || "";
            break;
          }
          cur = cur.parentNode;
        }
        setOpen(root, found || value, { user: true });
        return;
      }
      node = node.parentNode;
    }
  };

  state.onKeyDown = (e) => {
    if (isPartial(root)) return;
    const key = e?.key;
    if (key !== "Enter" && key !== " ") return;
    let node = e?.target;
    while (node && node !== root) {
      if (
        node.nodeType === 1 &&
        /** @type {Element} */ (node).getAttribute?.("data-canvas-part") === "trigger"
      ) {
        e.preventDefault?.();
        let cur = node;
        while (cur && cur !== root) {
          if (
            cur.nodeType === 1 &&
            /** @type {Element} */ (cur).getAttribute?.("data-canvas-part") === "item"
          ) {
            setOpen(root, /** @type {Element} */ (cur).getAttribute("data-value") || "", {
              user: true,
            });
            return;
          }
          cur = cur.parentNode;
        }
        return;
      }
      node = node.parentNode;
    }
  };

  root.addEventListener("click", state.onClick);
  root.addEventListener("keydown", state.onKeyDown);
  /** @type {any} */ (root)._canvasAccordionBound = true;
}

/**
 * @param {Element} root
 */
function unbind(root) {
  const state = STATE.get(root);
  if (!state) return;
  if (typeof root.removeEventListener === "function") {
    root.removeEventListener("click", state.onClick);
    root.removeEventListener("keydown", state.onKeyDown);
  }
  /** @type {any} */ (root)._canvasAccordionBound = false;
  STATE.delete(root);
}

export const Accordion = lifecycle({
  ownsChildren: true,
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Accordion");
    setClass(el, "canvas-accordion canvas-accordion--clear");
    getState(el);
    bindOnce(el);
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const variant = asText(props.variant) || "clear";
    setClass(el, `canvas-accordion canvas-accordion--${variant}`);
    el.setAttribute("data-variant", variant);

    const partial = props.partial === true || isPartial(props);
    markPartial(el, partial);
    setOrRemoveAttr(el, "aria-disabled", partial ? "true" : null);

    const state = getState(el);
    if (typeof props.value === "string") {
      state.userHasInteracted = true;
      state.open = props.value;
    }

    const items = normalizeItems(props, "AccordionItem");
    el.setAttribute("data-item-count", String(items.length));
    syncItems(el, items, ctx);
    bindOnce(el);
  },
  unmount(el) {
    unbind(el);
  },
});

export const AccordionItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "AccordionItem");
    el.setAttribute("hidden", "true");
    return el;
  },
  patch(el, props = {}) {
    setOrRemoveAttr(el, "data-value", asText(props.value) || null);
    setOrRemoveAttr(el, "data-trigger", asText(props.trigger) || null);
  },
});

export function __accordionTestUtils() {
  return { getState, setOpen, getItems, applyOpen };
}

export default Accordion;
