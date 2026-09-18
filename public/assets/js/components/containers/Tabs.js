/**
 * A5.4 — Tabs with roving tabindex, Arrow/Home/End, aria-controls,
 * selected state, and persistent panels.
 *
 * Upstream: old/packages/react-ui Tabs + genui-lib TabsRenderer (stream
 * auto-follow until user interacts). Plain DOM — no Radix.
 */

import { isPartial, markPartial } from "../../renderer/partialGate.js";
import {
  asText,
  contentSize,
  findDescendantsByAttr,
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

/** @typedef {{ selected: string, userHasInteracted: boolean, prevContentSizes: Record<string, number>, uid: string, onKeyDown: (e: any) => void, onClick: (e: any) => void }} TabsState */

/** @type {WeakMap<Element, TabsState>} */
const STATE = new WeakMap();

/**
 * @param {Element} el
 * @returns {TabsState}
 */
function getState(el) {
  let s = STATE.get(el);
  if (!s) {
    s = {
      selected: "",
      userHasInteracted: false,
      prevContentSizes: {},
      uid: nextUid(),
      onKeyDown: () => {},
      onClick: () => {},
    };
    STATE.set(el, s);
  }
  return s;
}

/**
 * @param {Element} root
 * @returns {Element[]}
 */
function getTriggers(root) {
  const list = findDirectByAttr(root, "data-canvas-part", "tablist")[0];
  if (!list) return [];
  return findDirectByAttr(list, "role", "tab");
}

/**
 * @param {Element} root
 * @returns {Element[]}
 */
function getPanels(root) {
  const panels = findDirectByAttr(root, "data-canvas-part", "panels")[0];
  if (!panels) return [];
  return findDirectByAttr(panels, "role", "tabpanel");
}

/**
 * @param {Element} root
 * @param {string} value
 */
function applySelection(root, value) {
  const state = getState(root);
  state.selected = value;
  root.setAttribute("data-selected", value);

  for (const tab of getTriggers(root)) {
    const v = tab.getAttribute("data-value") || "";
    const selected = v === value;
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.setAttribute("tabindex", selected ? "0" : "-1");
    tab.setAttribute("data-state", selected ? "active" : "inactive");
  }

  for (const panel of getPanels(root)) {
    const v = panel.getAttribute("data-value") || "";
    const selected = v === value;
    setOrRemoveAttr(panel, "hidden", selected ? null : "true");
    panel.setAttribute("data-state", selected ? "active" : "inactive");
    setOrRemoveAttr(panel, "aria-hidden", selected ? null : "true");
  }
}

/**
 * @param {Element} root
 * @param {string} value
 * @param {{ focus?: boolean, user?: boolean }} [opts]
 */
function selectTab(root, value, opts = {}) {
  if (!value) return;
  const state = getState(root);
  if (opts.user) state.userHasInteracted = true;
  applySelection(root, value);
  if (opts.focus) {
    const tab = getTriggers(root).find((t) => t.getAttribute("data-value") === value);
    if (tab && typeof tab.focus === "function") tab.focus();
  }
}

/**
 * @param {Element} root
 * @param {number} delta
 */
function moveRovingFocus(root, delta) {
  const tabs = getTriggers(root).filter((t) => !t.disabled && t.getAttribute("disabled") == null);
  if (!tabs.length) return;
  const doc = root.ownerDocument;
  const active = doc && "activeElement" in doc ? doc.activeElement : null;
  let idx = tabs.findIndex((t) => t === active);
  if (idx < 0) {
    idx = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
  }
  if (idx < 0) idx = 0;
  const next = tabs[(idx + delta + tabs.length * 10) % tabs.length];
  const value = next.getAttribute("data-value") || "";
  selectTab(root, value, { focus: true, user: true });
}

/**
 * @param {Element} root
 * @param {"start"|"end"} which
 */
function jumpRovingFocus(root, which) {
  const tabs = getTriggers(root).filter((t) => !t.disabled && t.getAttribute("disabled") == null);
  if (!tabs.length) return;
  const target = which === "start" ? tabs[0] : tabs[tabs.length - 1];
  selectTab(root, target.getAttribute("data-value") || "", { focus: true, user: true });
}

/**
 * Stream auto-follow: select tab whose content grew (upstream TabsRenderer).
 * @param {TabsState} state
 * @param {ReturnType<typeof normalizeItems>} items
 */
function autoFollowSelection(state, items) {
  if (state.userHasInteracted) {
    if (state.selected && !items.some((i) => i.value === state.selected)) {
      return items[0]?.value || "";
    }
    return state.selected;
  }

  if (!state.selected && items[0]) {
    return items[0].value;
  }

  let candidate = null;
  /** @type {Record<string, number>} */
  const nextSizes = {};
  for (const item of items) {
    const size = contentSize(item.content);
    const prev = state.prevContentSizes[item.value] ?? 0;
    nextSizes[item.value] = size;
    if (size > prev) candidate = item.value;
  }
  state.prevContentSizes = nextSizes;

  if (candidate) return candidate;

  // Dropped selected tab — fall back to first still present.
  if (state.selected && !items.some((i) => i.value === state.selected)) {
    return items[0]?.value || "";
  }
  return state.selected;
}

/**
 * Ensure shell: list + panels containers.
 * @param {Document} doc
 * @param {Element} root
 */
function ensureShell(doc, root) {
  let list = findDirectByAttr(root, "data-canvas-part", "tablist")[0];
  if (!list) {
    list = doc.createElement("div");
    list.setAttribute("data-canvas-part", "tablist");
    list.setAttribute("role", "tablist");
    list.setAttribute("class", "canvas-tabs__list");
    root.appendChild(list);
  }
  let panels = findDirectByAttr(root, "data-canvas-part", "panels")[0];
  if (!panels) {
    panels = doc.createElement("div");
    panels.setAttribute("data-canvas-part", "panels");
    panels.setAttribute("class", "canvas-tabs__panels");
    root.appendChild(panels);
  }
  return { list, panels };
}

/**
 * Reconcile triggers + panels by item value (statement id keys on vnodes
 * feed the outer reconciler; value keys keep panels persistent here).
 * @param {Element} root
 * @param {ReturnType<typeof normalizeItems>} items
 * @param {Record<string, unknown>} ctx
 */
function syncItems(root, items, ctx) {
  const doc = requireDocument(ctx);
  const state = getState(root);
  const { list, panels } = ensureShell(doc, root);

  /** @type {Map<string, Element>} */
  const existingTabs = new Map();
  for (const t of getTriggers(root)) {
    existingTabs.set(t.getAttribute("data-value") || "", t);
  }
  /** @type {Map<string, Element>} */
  const existingPanels = new Map();
  for (const p of getPanels(root)) {
    existingPanels.set(p.getAttribute("data-value") || "", p);
  }

  const keepValues = new Set(items.map((i) => i.value));

  // Remove stale
  for (const [v, el] of existingTabs) {
    if (!keepValues.has(v) && el.parentNode) el.parentNode.removeChild(el);
  }
  for (const [v, el] of existingPanels) {
    if (!keepValues.has(v) && el.parentNode) el.parentNode.removeChild(el);
  }

  items.forEach((item, index) => {
    const key = itemKey(item, index);
    const tabId = `canvas-tab-${state.uid}-${item.value}`;
    const panelId = `canvas-panel-${state.uid}-${item.value}`;

    let tab = existingTabs.get(item.value);
    if (!tab) {
      tab = doc.createElement("button");
      tab.setAttribute("type", "button");
      tab.setAttribute("role", "tab");
      tab.setAttribute("data-value", item.value);
      tab.setAttribute("data-item-key", key);
    }
    // appendChild moves existing nodes — keeps trigger order = items order
    list.appendChild(tab);

    tab.setAttribute("id", tabId);
    tab.setAttribute("aria-controls", panelId);
    tab.setAttribute("class", "canvas-tabs__trigger");
    tab.setAttribute("data-item-key", key);
    // Label text only (replace text nodes; keep no nested interactive)
    while (tab.firstChild) tab.removeChild(tab.firstChild);
    tab.appendChild(doc.createTextNode(item.trigger || item.value));

    let panel = existingPanels.get(item.value);
    if (!panel) {
      panel = doc.createElement("div");
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("data-value", item.value);
      panel.setAttribute("data-item-key", key);
    }
    panels.appendChild(panel);

    panel.setAttribute("id", panelId);
    panel.setAttribute("aria-labelledby", tabId);
    panel.setAttribute("class", "canvas-tabs__panel");
    panel.setAttribute("data-item-key", key);
    panel.setAttribute("tabindex", "0");

    const body = findDirectByAttr(panel, "data-canvas-part", "panel-body")[0];
    let bodyEl = body;
    if (!bodyEl) {
      bodyEl = doc.createElement("div");
      bodyEl.setAttribute("data-canvas-part", "panel-body");
      bodyEl.setAttribute("class", "canvas-tabs__panel-inner");
      panel.appendChild(bodyEl);
    }
    renderItemContent(bodyEl, item.content, ctx);
  });

  const nextSelected = autoFollowSelection(state, items);
  if (nextSelected) {
    applySelection(root, nextSelected);
  } else if (!items.length) {
    state.selected = "";
    root.removeAttribute("data-selected");
  }
}

/**
 * Bind keyboard + click once per root element.
 * @param {Element} root
 */
function bindOnce(root) {
  const state = getState(root);
  if (/** @type {any} */ (root)._canvasTabsBound) return;

  state.onKeyDown = (e) => {
    if (isPartial(root)) return;
    const key = e?.key;
    if (key === "ArrowRight" || key === "ArrowDown") {
      e.preventDefault?.();
      moveRovingFocus(root, 1);
    } else if (key === "ArrowLeft" || key === "ArrowUp") {
      e.preventDefault?.();
      moveRovingFocus(root, -1);
    } else if (key === "Home") {
      e.preventDefault?.();
      jumpRovingFocus(root, "start");
    } else if (key === "End") {
      e.preventDefault?.();
      jumpRovingFocus(root, "end");
    }
  };

  state.onClick = (e) => {
    if (isPartial(root)) return;
    let node = e?.target;
    while (node && node !== root) {
      if (
        node.nodeType === 1 &&
        /** @type {Element} */ (node).getAttribute?.("role") === "tab"
      ) {
        const value = /** @type {Element} */ (node).getAttribute("data-value") || "";
        selectTab(root, value, { user: true, focus: true });
        return;
      }
      node = node.parentNode;
    }
  };

  root.addEventListener("keydown", state.onKeyDown);
  root.addEventListener("click", state.onClick);
  /** @type {any} */ (root)._canvasTabsBound = true;
}

/**
 * @param {Element} root
 */
function unbind(root) {
  const state = STATE.get(root);
  if (!state) return;
  if (typeof root.removeEventListener === "function") {
    root.removeEventListener("keydown", state.onKeyDown);
    root.removeEventListener("click", state.onClick);
  }
  /** @type {any} */ (root)._canvasTabsBound = false;
  STATE.delete(root);
}

export const Tabs = lifecycle({
  ownsChildren: true,
  mount(doc, _props, _ctx) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Tabs");
    setClass(el, "canvas-tabs canvas-tabs--clear");
    getState(el);
    bindOnce(el);
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const variant = asText(props.variant) || "clear";
    setClass(el, `canvas-tabs canvas-tabs--${variant}`);
    el.setAttribute("data-variant", variant);

    const partial = props.partial === true || isPartial(props);
    markPartial(el, partial);
    setOrRemoveAttr(el, "aria-disabled", partial ? "true" : null);

    // Controlled override (tests / host)
    const state = getState(el);
    if (typeof props.value === "string" && props.value) {
      state.userHasInteracted = true;
      state.selected = props.value;
    }

    const items = normalizeItems(props, "TabItem");
    el.setAttribute("data-item-count", String(items.length));
    syncItems(el, items, ctx);
    bindOnce(el);
  },
  unmount(el) {
    unbind(el);
  },
});

/**
 * TabItem is a library contract / data carrier. When mounted alone it renders
 * a non-interactive marker; Tabs consumes items/children props.
 */
export const TabItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "TabItem");
    el.setAttribute("hidden", "true");
    return el;
  },
  patch(el, props = {}) {
    const value = asText(props.value);
    setOrRemoveAttr(el, "data-value", value || null);
    setOrRemoveAttr(el, "data-trigger", asText(props.trigger) || null);
  },
});

export function __tabsTestUtils() {
  return {
    getState,
    selectTab,
    getTriggers,
    getPanels,
    findDescendantsByAttr,
  };
}

export default Tabs;
