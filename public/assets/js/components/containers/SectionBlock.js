/**
 * A5.5 — SectionBlock (plain DOM).
 *
 * Foldable accordion that auto-reveals newly streamed sections and collapses
 * to the first section when streaming ends — only if the user has not
 * intervened. Manual open/close is never overridden by later chunks.
 */

import {
  asText,
  clearChildren,
  lifecycle,
  normalizeSections,
  renderPanelContent,
  requireDocument,
  resolveIsStreaming,
  setClass,
} from "./shared.js";
import {
  applySectionStreamTick,
  applySectionUserChange,
  createSectionOpenState,
  toggleSectionValue,
} from "./sectionOpenState.js";

/** @type {WeakMap<Element, import('./sectionOpenState.js').SectionOpenState>} */
const openStateByHost = new WeakMap();

/** @type {WeakMap<Element, Map<string, Element>>} */
const itemElsByHost = new WeakMap();

/**
 * @param {Element} host
 * @returns {import('./sectionOpenState.js').SectionOpenState}
 */
function getOpenState(host) {
  let s = openStateByHost.get(host);
  if (!s) {
    s = createSectionOpenState();
    openStateByHost.set(host, s);
  }
  return s;
}

/**
 * @param {Element} host
 * @returns {Map<string, Element>}
 */
function getItemMap(host) {
  let m = itemElsByHost.get(host);
  if (!m) {
    m = new Map();
    itemElsByHost.set(host, m);
  }
  return m;
}

/**
 * @param {Element} host
 * @param {string[]} openItems
 */
function syncOpenDom(host, openItems) {
  const open = new Set(openItems);
  host.setAttribute("data-open-values", openItems.join(","));
  const map = getItemMap(host);
  for (const [value, itemEl] of map) {
    const isOpen = open.has(value);
    itemEl.setAttribute("data-state", isOpen ? "open" : "closed");
    const trigger = itemEl._canvasTrigger;
    const panel = itemEl._canvasPanel;
    if (trigger) {
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      trigger.setAttribute("data-state", isOpen ? "open" : "closed");
    }
    if (panel) {
      panel.setAttribute("data-state", isOpen ? "open" : "closed");
      if (isOpen) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "true");
    }
  }
}

/**
 * @param {Document} doc
 * @param {{ value: string, trigger: string, content: unknown }} section
 * @param {Element} host
 * @param {Record<string, unknown>} ctx
 * @param {boolean} foldable
 * @returns {Element}
 */
function buildItem(doc, section, host, ctx, foldable) {
  const item = doc.createElement("div");
  item.setAttribute("data-canvas-component", "SectionItem");
  item.setAttribute("data-section-value", section.value);
  setClass(
    item,
    foldable ? "canvas-section-block__item" : "canvas-section-v2",
  );

  if (foldable) {
    const header = doc.createElement("h3");
    setClass(header, "canvas-section-block__header");

    const trigger = doc.createElement("button");
    trigger.setAttribute("type", "button");
    setClass(trigger, "canvas-section-block__trigger");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("data-state", "closed");
    trigger.setAttribute("id", `canvas-section-trigger-${section.value}`);

    const icon = doc.createElement("span");
    setClass(icon, "canvas-section-block__icon");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "›";

    const label = doc.createElement("span");
    setClass(label, "canvas-section-block__trigger-text");
    label.textContent = section.trigger;

    trigger.appendChild(icon);
    trigger.appendChild(label);

    const panel = doc.createElement("div");
    setClass(panel, "canvas-section-block__content");
    panel.setAttribute("role", "region");
    panel.setAttribute("data-state", "closed");
    panel.setAttribute("hidden", "true");
    panel.setAttribute(
      "aria-labelledby",
      `canvas-section-trigger-${section.value}`,
    );
    trigger.setAttribute(
      "aria-controls",
      `canvas-section-panel-${section.value}`,
    );
    panel.setAttribute("id", `canvas-section-panel-${section.value}`);

    trigger.onclick = () => {
      const state = getOpenState(host);
      const next = toggleSectionValue(state, section.value);
      syncOpenDom(host, next);
    };

    header.appendChild(trigger);
    item.appendChild(header);
    item.appendChild(panel);
    item._canvasTrigger = trigger;
    item._canvasPanel = panel;
    renderPanelContent(panel, section.content, ctx);
  } else {
    const head = doc.createElement("div");
    setClass(head, "canvas-section-v2__header");
    const t = doc.createElement("div");
    setClass(t, "canvas-section-v2__trigger");
    t.textContent = section.trigger;
    head.appendChild(t);
    const panel = doc.createElement("div");
    setClass(panel, "canvas-section-v2__content");
    item.appendChild(head);
    item.appendChild(panel);
    item._canvasPanel = panel;
    item.setAttribute("data-state", "open");
    renderPanelContent(panel, section.content, ctx);
  }

  return item;
}

/**
 * Public test/helper: simulate user selecting open values (marks intervened).
 * @param {Element} host
 * @param {string[] | string} values
 */
export function sectionUserSelect(host, values) {
  const state = getOpenState(host);
  const next = applySectionUserChange(state, values);
  syncOpenDom(host, next);
  return next;
}

/**
 * @param {Element} host
 * @returns {string[]}
 */
export function getSectionOpenValues(host) {
  return getOpenState(host).openItems.slice();
}

/**
 * @param {Element} host
 * @returns {boolean}
 */
export function didSectionUserIntervene(host) {
  return getOpenState(host).userSelected === true;
}

export const SectionBlock = lifecycle({
  ownsChildren: true,
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "SectionBlock");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = requireDocument(ctx);
    const foldable = props.isFoldable !== false;
    const sections = normalizeSections(
      props.sections ?? props.items ?? props.children,
    );
    const isStreaming = resolveIsStreaming(props, ctx);

    setClass(
      el,
      foldable ? "canvas-section-block" : "canvas-section-block canvas-section-block--static",
    );
    el.setAttribute("data-foldable", foldable ? "true" : "false");
    el.setAttribute("data-streaming", isStreaming ? "true" : "false");
    el.setAttribute("data-section-count", String(sections.length));

    if (foldable) {
      el.setAttribute("role", "region");
      el.setAttribute("aria-label", asText(props["aria-label"]) || "Sections");
    } else {
      el.removeAttribute("role");
    }

    const state = getOpenState(el);
    const values = sections.map((s) => s.value);

    if (foldable) {
      applySectionStreamTick(state, {
        sectionValues: values,
        isStreaming,
      });
    } else {
      // Non-foldable: all open visually; still track values for stability.
      state.openItems = values.slice();
      state.prevLength = values.length;
      state.prevIsStreaming = isStreaming;
    }

    clearChildren(el);
    const map = new Map();
    itemElsByHost.set(el, map);

    for (const section of sections) {
      const item = buildItem(doc, section, el, ctx, foldable);
      el.appendChild(item);
      map.set(section.value, item);
    }

    if (foldable) {
      syncOpenDom(el, state.openItems);
      el.setAttribute(
        "data-user-intervened",
        state.userSelected ? "true" : "false",
      );
    } else {
      el.setAttribute("data-open-values", values.join(","));
      el.setAttribute("data-user-intervened", "false");
    }
  },
  unmount(el) {
    openStateByHost.delete(el);
    itemElsByHost.delete(el);
  },
});

export default SectionBlock;
