/**
 * A6.11 — RunStatus: run start / finish / error (lab presentation).
 */

import {
  asText,
  clearChildren,
  defaultRunLabel,
  lifecycle,
  prefersReducedMotion,
  setClass,
} from "./shared.js";

/** @type {Set<string>} */
const PHASES = new Set(["start", "finish", "error"]);

/**
 * @param {Record<string, unknown>} props
 * @returns {{ phase: string, message: string, runId: string }}
 */
export function normalizeRunStatus(props = {}) {
  let phase = asText(props.phase) || asText(props.status) || asText(props.event) || "start";
  if (phase === "started" || phase === "run_started" || phase === "RUN_STARTED") phase = "start";
  if (phase === "finished" || phase === "run_finished" || phase === "RUN_FINISHED" || phase === "complete") {
    phase = "finish";
  }
  if (phase === "run_error" || phase === "RUN_ERROR" || phase === "failed") phase = "error";
  if (!PHASES.has(phase)) phase = "start";

  const message =
    asText(props.message) ||
    asText(props.statusMessage) ||
    asText(props.error) ||
    defaultRunLabel(phase);

  return {
    phase,
    message,
    runId: asText(props.runId) || asText(props.id) || "",
  };
}

export const RunStatus = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "RunStatus");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const run = normalizeRunStatus(props);
    const reduced = prefersReducedMotion(props, ctx);

    let cls = `canvas-run-status canvas-run-status--${run.phase}`;
    if (reduced) cls += " canvas-run-status--reduced-motion";
    setClass(el, cls);
    el.setAttribute("data-phase", run.phase);
    if (run.runId) el.setAttribute("data-run-id", run.runId);
    else el.removeAttribute("data-run-id");

    clearChildren(el);

    const live = doc.createElement("div");
    live.setAttribute("class", "canvas-run-status__live");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    live.textContent = run.message;
    el.appendChild(live);

    const row = doc.createElement("div");
    row.setAttribute("class", "canvas-run-status__row");
    const icon = doc.createElement("span");
    icon.setAttribute("class", "canvas-run-status__icon");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent =
      run.phase === "error" ? "!" : run.phase === "finish" ? "✓" : "▶";
    row.appendChild(icon);
    const label = doc.createElement("span");
    label.setAttribute("class", "canvas-run-status__label");
    label.textContent = run.message;
    row.appendChild(label);
    el.appendChild(row);

    if (run.phase === "error" && asText(props.detail)) {
      const detail = doc.createElement("pre");
      detail.setAttribute("class", "canvas-run-status__detail");
      detail.textContent = asText(props.detail);
      el.appendChild(detail);
    }
  },
});

export default RunStatus;
