/**
 * A5.5 — Steps (plain DOM) with accessible progress.
 *
 * While streaming, newly arrived steps become current unless the user has
 * manually selected a step. Manual selection is never overridden by later
 * chunks. Exposes progressbar semantics (valuenow / valuemax / valuetext).
 */

import {
  asText,
  clearChildren,
  lifecycle,
  normalizeSteps,
  renderPanelContent,
  requireDocument,
  resolveIsStreaming,
  setClass,
} from "./shared.js";
import {
  applyStepsStreamTick,
  applyStepsUserSelect,
  createStepsProgressState,
} from "./sectionOpenState.js";

/** @type {WeakMap<Element, import('./sectionOpenState.js').StepsProgressState>} */
const progressByHost = new WeakMap();

/**
 * @param {Element} host
 * @returns {import('./sectionOpenState.js').StepsProgressState}
 */
function getProgress(host) {
  let s = progressByHost.get(host);
  if (!s) {
    s = createStepsProgressState();
    progressByHost.set(host, s);
  }
  return s;
}

/**
 * @param {Element} host
 * @param {number} currentIndex
 * @param {number} count
 */
function syncProgressDom(host, currentIndex, count) {
  const now = currentIndex < 0 ? 0 : currentIndex + 1;
  const max = Math.max(count, 0);
  host.setAttribute("data-current-index", String(currentIndex));
  host.setAttribute("aria-valuenow", String(now));
  host.setAttribute("aria-valuemin", "0");
  host.setAttribute("aria-valuemax", String(max));
  const label =
    max === 0
      ? "No steps"
      : `Step ${now} of ${max}`;
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

/**
 * Public helper: user selects a step by 0-based index.
 * @param {Element} host
 * @param {number} index
 */
export function stepsUserSelect(host, index) {
  const state = getProgress(host);
  const next = applyStepsUserSelect(state, index);
  const count = Number(host.getAttribute("data-step-count") || 0);
  syncProgressDom(host, next, count);
  host.setAttribute("data-user-intervened", "true");
  return next;
}

/**
 * @param {Element} host
 * @returns {number}
 */
export function getStepsCurrentIndex(host) {
  return getProgress(host).currentIndex;
}

/**
 * @param {Element} host
 * @returns {boolean}
 */
export function didStepsUserIntervene(host) {
  return getProgress(host).userSelected === true;
}

export const Steps = lifecycle({
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
    // Accessible progress semantics on the group.
    el.setAttribute("aria-roledescription", "progress");
    el.setAttribute("data-streaming", isStreaming ? "true" : "false");
    el.setAttribute("data-step-count", String(items.length));

    applyStepsStreamTick(state, {
      itemCount: items.length,
      isStreaming,
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
      state.userSelected ? "true" : "false",
    );
  },
  unmount(el) {
    progressByHost.delete(el);
    el._canvasList = null;
    el._canvasProgressStatus = null;
  },
});

export default Steps;
