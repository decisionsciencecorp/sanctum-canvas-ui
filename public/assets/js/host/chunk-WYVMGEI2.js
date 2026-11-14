import {
  asText,
  clearChildren,
  lifecycle,
  normalizeSectionEntry,
  normalizeSections,
  normalizeStepEntry,
  normalizeSteps,
  renderPanelContent,
  requireDocument,
  resolveIsStreaming,
  setClass
} from "./chunk-23WAPPGV.js";
import "./chunk-MLKGABMK.js";

// src/Browser/components/containers/sectionOpenState.js
function createSectionOpenState() {
  return {
    openItems: [],
    userSelected: false,
    prevLength: 0,
    prevIsStreaming: false
  };
}
function ensureIncludes(open, value) {
  if (!value) return open.slice();
  return open.includes(value) ? open.slice() : [...open, value];
}
function applySectionStreamTick(state, input) {
  const values = Array.isArray(input.sectionValues) ? input.sectionValues : [];
  const isStreaming = input.isStreaming === true;
  const first = values[0];
  const len = values.length;
  if (state.prevIsStreaming && !isStreaming && !state.userSelected && len > 0) {
    state.openItems = first ? [first] : [];
  } else if (isStreaming && len > state.prevLength && !state.userSelected) {
    const last = values[len - 1];
    if (last) {
      state.openItems = ensureIncludes(state.openItems, last);
    }
  } else if (!state.userSelected) {
    if (state.openItems.length === 0 && first) {
      state.openItems = [first];
    }
  }
  if (values.length > 0) {
    const allowed = new Set(values);
    state.openItems = state.openItems.filter((v) => allowed.has(v));
    if (!state.userSelected && state.openItems.length === 0 && first) {
      state.openItems = [first];
    }
  } else if (!state.userSelected) {
    state.openItems = [];
  }
  state.prevLength = len;
  state.prevIsStreaming = isStreaming;
  return state.openItems.slice();
}
function applySectionUserChange(state, next) {
  state.userSelected = true;
  if (Array.isArray(next)) {
    state.openItems = next.map(String);
  } else if (next == null || next === "") {
    state.openItems = [];
  } else {
    state.openItems = [String(next)];
  }
  return state.openItems.slice();
}
function toggleSectionValue(state, value) {
  const v = String(value);
  const cur = state.openItems.slice();
  const idx = cur.indexOf(v);
  if (idx >= 0) cur.splice(idx, 1);
  else cur.push(v);
  return applySectionUserChange(state, cur);
}
function createStepsProgressState() {
  return {
    currentIndex: -1,
    userSelected: false,
    prevLength: 0,
    prevIsStreaming: false
  };
}
function applyStepsStreamTick(state, input) {
  const count = Math.max(0, Number(input.itemCount) || 0);
  const isStreaming = input.isStreaming === true;
  if (count === 0) {
    if (!state.userSelected) state.currentIndex = -1;
    state.prevLength = 0;
    state.prevIsStreaming = isStreaming;
    return state.currentIndex;
  }
  if (!state.userSelected) {
    if (isStreaming && count > state.prevLength) {
      state.currentIndex = count - 1;
    } else if (state.currentIndex < 0 || state.currentIndex >= count) {
      state.currentIndex = 0;
    }
  } else if (state.currentIndex >= count) {
    state.currentIndex = count - 1;
  }
  state.prevLength = count;
  state.prevIsStreaming = isStreaming;
  return state.currentIndex;
}
function applyStepsUserSelect(state, index) {
  state.userSelected = true;
  state.currentIndex = Math.max(0, Number(index) || 0);
  return state.currentIndex;
}

// src/Browser/components/containers/SectionBlock.js
var openStateByHost = /* @__PURE__ */ new WeakMap();
var itemElsByHost = /* @__PURE__ */ new WeakMap();
function getOpenState(host) {
  let s = openStateByHost.get(host);
  if (!s) {
    s = createSectionOpenState();
    openStateByHost.set(host, s);
  }
  return s;
}
function getItemMap(host) {
  let m = itemElsByHost.get(host);
  if (!m) {
    m = /* @__PURE__ */ new Map();
    itemElsByHost.set(host, m);
  }
  return m;
}
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
function buildItem(doc, section, host, ctx, foldable) {
  const item = doc.createElement("div");
  item.setAttribute("data-canvas-component", "SectionItem");
  item.setAttribute("data-section-value", section.value);
  setClass(
    item,
    foldable ? "canvas-section-block__item" : "canvas-section-v2"
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
    icon.textContent = "\u203A";
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
      `canvas-section-trigger-${section.value}`
    );
    trigger.setAttribute(
      "aria-controls",
      `canvas-section-panel-${section.value}`
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
var SectionBlock = lifecycle({
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
      props.sections ?? props.items ?? props.children
    );
    const isStreaming = resolveIsStreaming(props, ctx);
    setClass(
      el,
      foldable ? "canvas-section-block" : "canvas-section-block canvas-section-block--static"
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
        isStreaming
      });
    } else {
      state.openItems = values.slice();
      state.prevLength = values.length;
      state.prevIsStreaming = isStreaming;
    }
    clearChildren(el);
    const map = /* @__PURE__ */ new Map();
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
        state.userSelected ? "true" : "false"
      );
    } else {
      el.setAttribute("data-open-values", values.join(","));
      el.setAttribute("data-user-intervened", "false");
    }
  },
  unmount(el) {
    openStateByHost.delete(el);
    itemElsByHost.delete(el);
  }
});

// src/Browser/components/containers/SectionItem.js
var SectionItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "SectionItem");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = requireDocument(ctx);
    const section = normalizeSectionEntry(props, 0);
    setClass(el, "canvas-section-item canvas-section-v2");
    el.setAttribute("data-section-value", section.value);
    el.setAttribute("data-state", "open");
    clearChildren(el);
    const head = doc.createElement("div");
    setClass(head, "canvas-section-v2__header");
    const trigger = doc.createElement("div");
    setClass(trigger, "canvas-section-v2__trigger");
    trigger.textContent = section.trigger || asText(props.trigger);
    head.appendChild(trigger);
    const panel = doc.createElement("div");
    setClass(panel, "canvas-section-v2__content");
    renderPanelContent(panel, section.content, ctx);
    el.appendChild(head);
    el.appendChild(panel);
  }
});

// src/Browser/components/containers/Steps.js
var progressByHost = /* @__PURE__ */ new WeakMap();
function getProgress(host) {
  let s = progressByHost.get(host);
  if (!s) {
    s = createStepsProgressState();
    progressByHost.set(host, s);
  }
  return s;
}
function syncProgressDom(host, currentIndex, count) {
  const now = currentIndex < 0 ? 0 : currentIndex + 1;
  const max = Math.max(count, 0);
  host.setAttribute("data-current-index", String(currentIndex));
  host.setAttribute("aria-valuenow", String(now));
  host.setAttribute("aria-valuemin", "0");
  host.setAttribute("aria-valuemax", String(max));
  const label = max === 0 ? "No steps" : `Step ${now} of ${max}`;
  host.setAttribute("aria-valuetext", label);
  const status = host._canvasProgressStatus;
  if (status) {
    status.textContent = label;
  }
  const list = host._canvasList;
  if (!list) return;
  for (const child of list.childNodes ?? []) {
    if (child.nodeType !== 1) continue;
    const idx = Number(child.getAttribute("data-step-index"));
    const isCurrent = idx === currentIndex;
    child.setAttribute("data-current", isCurrent ? "true" : "false");
    if (isCurrent) child.setAttribute("aria-current", "step");
    else child.removeAttribute("aria-current");
  }
}
function stepsUserSelect(host, index) {
  const state = getProgress(host);
  const next = applyStepsUserSelect(state, index);
  const count = Number(host.getAttribute("data-step-count") || 0);
  syncProgressDom(host, next, count);
  host.setAttribute("data-user-intervened", "true");
  return next;
}
var Steps = lifecycle({
  ownsChildren: true,
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "Steps");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = requireDocument(ctx);
    const items = normalizeSteps(props.items ?? props.steps ?? props.children);
    const isStreaming = resolveIsStreaming(props, ctx);
    const state = getProgress(el);
    setClass(el, "canvas-steps");
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", asText(props["aria-label"]) || "Steps");
    el.setAttribute("aria-roledescription", "progress");
    el.setAttribute("data-streaming", isStreaming ? "true" : "false");
    el.setAttribute("data-step-count", String(items.length));
    applyStepsStreamTick(state, {
      itemCount: items.length,
      isStreaming
    });
    clearChildren(el);
    const status = doc.createElement("span");
    setClass(status, "canvas-steps__progress-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("data-canvas-steps-status", "");
    el._canvasProgressStatus = status;
    el.appendChild(status);
    const list = doc.createElement("ol");
    setClass(list, "canvas-steps__list");
    list.setAttribute("role", "list");
    el._canvasList = list;
    items.forEach((step, index) => {
      const li = doc.createElement("li");
      setClass(li, "canvas-steps__item");
      li.setAttribute("data-canvas-component", "StepsItem");
      li.setAttribute("data-step-index", String(index));
      li.setAttribute("data-step-number", String(step.number));
      li.setAttribute("role", "listitem");
      const connector = doc.createElement("div");
      setClass(connector, "canvas-steps__connector");
      const num = doc.createElement("div");
      setClass(num, "canvas-steps__number");
      const numInner = doc.createElement("span");
      setClass(numInner, "canvas-steps__number-inner");
      numInner.textContent = String(step.number);
      num.appendChild(numInner);
      const line = doc.createElement("div");
      setClass(line, "canvas-steps__line");
      line.setAttribute("aria-hidden", "true");
      connector.appendChild(num);
      connector.appendChild(line);
      const body = doc.createElement("div");
      setClass(body, "canvas-steps__content");
      const titleBtn = doc.createElement("button");
      titleBtn.setAttribute("type", "button");
      setClass(titleBtn, "canvas-steps__title");
      titleBtn.textContent = step.title;
      titleBtn.onclick = () => {
        stepsUserSelect(el, index);
      };
      const details = doc.createElement("div");
      setClass(details, "canvas-steps__details");
      renderPanelContent(details, step.details, ctx);
      body.appendChild(titleBtn);
      body.appendChild(details);
      li.appendChild(connector);
      li.appendChild(body);
      list.appendChild(li);
    });
    el.appendChild(list);
    syncProgressDom(el, state.currentIndex, items.length);
    el.setAttribute(
      "data-user-intervened",
      state.userSelected ? "true" : "false"
    );
  },
  unmount(el) {
    progressByHost.delete(el);
    el._canvasList = null;
    el._canvasProgressStatus = null;
  }
});

// src/Browser/components/containers/StepsItem.js
var StepsItem = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "StepsItem");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = requireDocument(ctx);
    const step = normalizeStepEntry(props, Number(props.index) || 0);
    setClass(el, "canvas-steps__item canvas-steps-item--standalone");
    el.setAttribute("data-step-number", String(step.number));
    clearChildren(el);
    const num = doc.createElement("span");
    setClass(num, "canvas-steps__number-inner");
    num.textContent = String(step.number);
    const title = doc.createElement("span");
    setClass(title, "canvas-steps__title");
    title.textContent = step.title || asText(props.title);
    const details = doc.createElement("div");
    setClass(details, "canvas-steps__details");
    renderPanelContent(details, step.details, ctx);
    el.appendChild(num);
    el.appendChild(title);
    el.appendChild(details);
  }
});

// src/Browser/components/containers/registerSectionSteps.js
var SECTION_STEPS_COMPONENTS = {
  SectionBlock,
  SectionItem,
  Steps,
  StepsItem
};
function registerSectionSteps(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerSectionSteps: registry with register() required");
  }
  for (const [type, entry] of Object.entries(SECTION_STEPS_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}
var registerSectionSteps_default = registerSectionSteps;
export {
  SECTION_STEPS_COMPONENTS,
  SectionBlock,
  SectionItem,
  Steps,
  StepsItem,
  registerSectionSteps_default as default,
  registerSectionSteps
};
