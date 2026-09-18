/**
 * Keyboard-accessible datapoints + tooltip.
 */

import { svgEl, setAttr } from "./svg.js";

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   el: Element,
 * }} Datapoint
 */

/**
 * Make an SVG shape a keyboard datapoint.
 * @param {Element} shape
 * @param {{ id: string, label: string }} meta
 */
export function markDatapoint(shape, meta) {
  setAttr(shape, "tabindex", "0");
  setAttr(shape, "role", "img");
  setAttr(shape, "aria-label", meta.label);
  setAttr(shape, "data-canvas-datapoint", meta.id);
  setAttr(shape, "focusable", "true");
}

/**
 * Attach keyboard/focus tooltip behavior to a chart host.
 * @param {Element} host
 * @param {Element} tooltipEl
 * @returns {{ destroy: () => void, setActive: (id: string | null, text?: string) => void }}
 */
export function attachDatapointKeyboard(host, tooltipEl) {
  /** @type {string | null} */
  let activeId = null;

  const setActive = (id, text) => {
    activeId = id;
    if (id == null) {
      tooltipEl.setAttribute("hidden", "");
      tooltipEl.textContent = "";
      tooltipEl.removeAttribute("data-active-id");
      return;
    }
    tooltipEl.removeAttribute("hidden");
    tooltipEl.setAttribute("data-active-id", id);
    if (text != null) tooltipEl.textContent = text;
  };

  /** @param {Event} ev */
  const onFocusIn = (ev) => {
    const t = /** @type {Element} */ (ev.target);
    const id = t?.getAttribute?.("data-canvas-datapoint");
    if (!id) return;
    setActive(id, t.getAttribute("aria-label") || "");
  };

  /** @param {Event} ev */
  const onFocusOut = (ev) => {
    const t = /** @type {Element} */ (ev.target);
    const id = t?.getAttribute?.("data-canvas-datapoint");
    if (id && activeId === id) setActive(null);
  };

  /** @param {KeyboardEvent} ev */
  const onKeyDown = (ev) => {
    const t = /** @type {Element} */ (ev.target);
    if (!t?.getAttribute?.("data-canvas-datapoint")) return;
    const points = collectDatapoints(host);
    if (!points.length) return;
    const idx = points.findIndex((p) => p === t);
    if (idx < 0) return;
    let next = idx;
    if (ev.key === "ArrowRight" || ev.key === "ArrowDown") next = (idx + 1) % points.length;
    else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp")
      next = (idx - 1 + points.length) % points.length;
    else if (ev.key === "Home") next = 0;
    else if (ev.key === "End") next = points.length - 1;
    else if (ev.key === "Escape") {
      setActive(null);
      /** @type {any} */ (t).blur?.();
      return;
    } else return;
    ev.preventDefault?.();
    const el = points[next];
    /** @type {any} */ (el).focus?.();
    setActive(
      el.getAttribute("data-canvas-datapoint"),
      el.getAttribute("aria-label") || "",
    );
  };

  host.addEventListener("focusin", onFocusIn);
  host.addEventListener("focusout", onFocusOut);
  host.addEventListener("keydown", onKeyDown);

  return {
    setActive,
    destroy() {
      host.removeEventListener("focusin", onFocusIn);
      host.removeEventListener("focusout", onFocusOut);
      host.removeEventListener("keydown", onKeyDown);
      setActive(null);
    },
  };
}

/**
 * @param {Element} host
 * @returns {Element[]}
 */
export function collectDatapoints(host) {
  /** @type {Element[]} */
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 1) {
      if (n.getAttribute?.("data-canvas-datapoint") != null) out.push(n);
      for (const c of n.childNodes ?? []) walk(c);
    }
  };
  walk(host);
  return out;
}

/**
 * Create a live tooltip region.
 * @param {Document} doc
 * @returns {HTMLElement}
 */
export function createTooltip(doc) {
  const el = doc.createElement("div");
  el.setAttribute("class", "canvas-chart__tooltip");
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.setAttribute("hidden", "");
  return el;
}

/**
 * Optional focus ring circle for scatter/line points.
 * @param {Document} doc
 * @param {number} cx
 * @param {number} cy
 * @param {number} [r]
 */
export function focusDot(doc, cx, cy, r = 4) {
  return svgEl(doc, "circle", {
    class: "canvas-chart__point",
    cx,
    cy,
    r,
  });
}
