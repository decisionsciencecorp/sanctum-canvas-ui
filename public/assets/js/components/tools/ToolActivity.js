/**
 * A6.11 — Neutral ToolActivity presentation (lab chrome).
 * States: streaming | executing | complete | result | error.
 * Partial JSON is presentation-only; never drives execution.
 */

import {
  asText,
  clearChildren,
  defaultToolLabel,
  lifecycle,
  prefersReducedMotion,
  prettyValue,
  setClass,
} from "./shared.js";
import { isPartialJsonString, partialJSONParse } from "./partialJson.js";
import { redactForDisplay, redactValue } from "./redact.js";

/** @type {Set<string>} */
const STATUSES = new Set(["streaming", "executing", "complete", "result", "error"]);

/**
 * Normalize activity props from stream events / ToolActivity shapes.
 * @param {Record<string, unknown>} props
 * @returns {{
 *   status: string,
 *   id: string,
 *   toolName: string,
 *   rawArgs: string,
 *   input: unknown,
 *   result: string,
 *   errorText: string,
 *   statusMessage: string,
 *   isError: boolean,
 *   isPartial: boolean,
 * }}
 */
export function normalizeToolActivity(props = {}) {
  const activity =
    props.activity && typeof props.activity === "object"
      ? /** @type {Record<string, unknown>} */ (props.activity)
      : props;

  let status = asText(activity.status || props.status) || "executing";
  if (status === "success") status = "complete";
  if (!STATUSES.has(status)) status = "executing";

  const toolCall =
    activity.toolCall && typeof activity.toolCall === "object"
      ? /** @type {Record<string, unknown>} */ (activity.toolCall)
      : null;
  const fn =
    toolCall?.function && typeof toolCall.function === "object"
      ? /** @type {Record<string, unknown>} */ (toolCall.function)
      : null;

  const toolName =
    asText(activity.toolName) ||
    asText(props.toolName) ||
    asText(fn?.name) ||
    asText(activity.name) ||
    "";

  const rawArgs =
    asText(props.rawArgs) ||
    asText(activity.rawArgs) ||
    asText(fn?.arguments) ||
    (typeof activity.arguments === "string" ? activity.arguments : "") ||
    "";

  let input = activity.input !== undefined ? activity.input : props.input;
  if (input === undefined) {
    input = rawArgs ? partialJSONParse(rawArgs) : {};
  }

  const isPartial =
    activity.isPartial === true ||
    props.isPartial === true ||
    status === "streaming" ||
    (rawArgs ? isPartialJsonString(rawArgs) : false);

  const result =
    asText(activity.result) ||
    asText(props.result) ||
    asText(activity.content) ||
    "";

  const errorText =
    asText(activity.errorText) ||
    asText(props.errorText) ||
    asText(activity.error) ||
    asText(props.error) ||
    "";

  const isError = activity.isError === true || status === "error" || Boolean(errorText);

  return {
    status: isError && status !== "error" ? "error" : status,
    id: asText(activity.id) || asText(props.id) || asText(toolCall?.id) || "",
    toolName,
    rawArgs,
    input,
    result,
    errorText,
    statusMessage: asText(activity.statusMessage) || asText(props.statusMessage),
    isError,
    isPartial,
  };
}

/**
 * Resolve request panel text (presentation-only).
 * @param {ReturnType<typeof normalizeToolActivity>} activity
 * @returns {string}
 */
export function resolveRequestDisplay(activity) {
  const input = activity.input;
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const obj = /** @type {Record<string, unknown>} */ (input);
    if (obj._request != null) return redactForDisplay(obj._request);
    if (Object.keys(obj).length === 0 && activity.rawArgs.trim()) {
      // Mid-stream: show raw partial text rather than empty {}
      return activity.rawArgs;
    }
  }
  if (activity.isPartial && activity.rawArgs.trim()) {
    const parsed = partialJSONParse(activity.rawArgs);
    if (parsed && typeof parsed === "object" && Object.keys(/** @type {object} */ (parsed)).length) {
      return redactForDisplay(parsed);
    }
    return activity.rawArgs;
  }
  return redactForDisplay(input);
}

export const ToolActivity = lifecycle({
  mount(doc) {
    const el = doc.createElement("div");
    el.setAttribute("data-canvas-component", "ToolActivity");
    return el;
  },
  patch(el, props = {}, ctx = {}) {
    const doc = ctx.document ?? el.ownerDocument;
    const activity = normalizeToolActivity(props);
    const reduced = prefersReducedMotion(props, ctx);
    const running = props.running !== false && ctx.running !== false;
    const isBusy =
      (activity.status === "streaming" || activity.status === "executing") && running;

    let cls = `canvas-tool-activity canvas-tool-activity--${activity.status}`;
    if (isBusy) cls += " canvas-tool-activity--busy";
    if (reduced) cls += " canvas-tool-activity--reduced-motion";
    if (activity.isPartial) cls += " canvas-tool-activity--partial";
    setClass(el, cls);

    el.setAttribute("data-status", activity.status);
    el.setAttribute("data-partial", activity.isPartial ? "1" : "0");
    el.setAttribute("data-tool-name", activity.toolName || "");
    if (activity.id) el.setAttribute("data-tool-id", activity.id);
    else el.removeAttribute("data-tool-id");

    clearChildren(el);

    const live = doc.createElement("div");
    live.setAttribute("class", "canvas-tool-activity__live");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    const label =
      activity.statusMessage || defaultToolLabel(activity.status, activity.toolName);
    live.textContent = label;
    el.appendChild(live);

    const header = doc.createElement("div");
    header.setAttribute("class", "canvas-tool-activity__header");
    const icon = doc.createElement("span");
    icon.setAttribute("class", "canvas-tool-activity__icon");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("data-spin", isBusy && !reduced ? "1" : "0");
    icon.textContent =
      activity.status === "error" ? "!" : activity.status === "complete" || activity.status === "result" ? "✓" : "◉";
    header.appendChild(icon);

    const title = doc.createElement("span");
    title.setAttribute("class", "canvas-tool-activity__title");
    title.textContent = label;
    header.appendChild(title);
    el.appendChild(header);

    const request = resolveRequestDisplay(activity);
    if (request) {
      const req = doc.createElement("pre");
      req.setAttribute("class", "canvas-tool-activity__request");
      req.setAttribute("data-role", "args");
      if (activity.isPartial) req.setAttribute("data-partial", "1");
      req.textContent = request;
      el.appendChild(req);
    }

    if (activity.status === "result" || activity.status === "complete" || activity.status === "error") {
      if (activity.result) {
        const res = doc.createElement("pre");
        res.setAttribute("class", "canvas-tool-activity__result");
        res.setAttribute("data-role", "result");
        // Redact structured result when parseable; otherwise redact string heuristics.
        let display = activity.result;
        try {
          display = redactForDisplay(JSON.parse(activity.result));
        } catch {
          display = redactForDisplay(activity.result);
        }
        res.textContent = display;
        el.appendChild(res);
      }
      if (activity.errorText) {
        const err = doc.createElement("div");
        err.setAttribute("class", "canvas-tool-activity__error");
        err.setAttribute("data-role", "error");
        err.setAttribute("role", "alert");
        err.textContent = activity.errorText;
        el.appendChild(err);
      }
    }

    // Keep a redacted input snapshot for tests / debug without leaking secrets.
    el.setAttribute("data-input-redacted", JSON.stringify(redactValue(activity.input)));
  },
});

export default ToolActivity;
