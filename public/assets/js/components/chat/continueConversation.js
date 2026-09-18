/**
 * A5.3 — ContinueConversation dispatch for list / follow-up clicks.
 * Size-bounded; never auto-sends while streaming; requires a user gesture path.
 */

import { ACTION_STEPS } from "../../lang/builtins.js";

/** Max chars for message + context combined (Doc #1379 §5.5). */
export const MAX_CONTINUE_CHARS = 4_000;

/**
 * @param {unknown} value
 * @param {number} [max]
 * @returns {string}
 */
export function boundContinueText(value, max = MAX_CONTINUE_CHARS) {
  const s = value == null ? "" : String(value);
  if (s.length <= max) return s;
  return s.slice(0, max);
}

/**
 * @param {Record<string, unknown>} [ctx]
 * @returns {boolean}
 */
export function isStreaming(ctx = {}) {
  return ctx.stream?.isStreaming === true;
}

/**
 * Resolve a continue_conversation / ToAssistant payload from item props.
 * @param {Record<string, unknown>} [props]
 * @param {{ fallbackMessage?: string }} [opts]
 * @returns {{ message: string, context?: string } | null}
 */
export function resolveContinuePayload(props = {}, opts = {}) {
  const action = props.action;
  let message = "";
  let context;

  if (action && typeof action === "object") {
    const type = String(action.type || "").toLowerCase();
    if (
      type &&
      type !== "continue_conversation" &&
      type !== ACTION_STEPS.ToAssistant &&
      type !== "toassistant"
    ) {
      // Non-continue actions are out of scope for this helper.
      return null;
    }
    if (typeof action.message === "string") message = action.message;
    else if (typeof action.context === "string" && !action.message) {
      message = action.context;
    }
    if (typeof action.context === "string") context = action.context;
    if (action.params && typeof action.params === "object") {
      const p = /** @type {Record<string, unknown>} */ (action.params);
      if (!message && typeof p.context === "string") message = p.context;
      if (!context && typeof p.context === "string") context = p.context;
      if (typeof p.message === "string") message = p.message;
    }
    if (Array.isArray(action.steps)) {
      const step = action.steps.find(
        (s) =>
          s &&
          typeof s === "object" &&
          (s.type === ACTION_STEPS.ToAssistant ||
            s.type === "continue_conversation"),
      );
      if (step) {
        if (typeof step.message === "string") message = step.message;
        if (typeof step.context === "string") context = step.context;
      }
    }
  }

  if (!message) {
    message =
      opts.fallbackMessage ||
      (typeof props.text === "string" ? props.text : "") ||
      (typeof props.title === "string" ? props.title : "") ||
      "";
  }

  message = boundContinueText(message);
  if (context != null) context = boundContinueText(context, MAX_CONTINUE_CHARS);

  if (!message && !context) return null;
  if (!message && context) message = context;

  return { message, context };
}

/**
 * Dispatch ContinueConversation only on an explicit user click path.
 * No-ops while streaming or when payload cannot be formed / is empty after bounds.
 *
 * @param {Record<string, unknown>} ctx
 * @param {Record<string, unknown>} props
 * @param {{ fallbackMessage?: string, userGesture?: boolean }} [opts]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function dispatchContinueConversation(ctx = {}, props = {}, opts = {}) {
  if (opts.userGesture === false) {
    return { ok: false, reason: "gesture-required" };
  }
  if (isStreaming(ctx)) {
    return { ok: false, reason: "streaming" };
  }

  const payload = resolveContinuePayload(props, opts);
  if (!payload || !payload.message) {
    return { ok: false, reason: "empty" };
  }

  const actions = ctx.actions;
  if (actions && typeof actions.run === "function") {
    const plan = {
      steps: [
        {
          type: ACTION_STEPS.ToAssistant,
          message: payload.message,
          context: payload.context,
        },
      ],
    };
    void actions.run(plan, { userGesture: true });
    return { ok: true };
  }

  if (actions && typeof actions.continueConversation === "function") {
    actions.continueConversation(payload.message, payload.context);
    return { ok: true };
  }

  if (typeof ctx.continueConversation === "function") {
    ctx.continueConversation(payload.message, payload.context);
    return { ok: true };
  }

  if (ctx.host && typeof ctx.host.continueConversation === "function") {
    ctx.host.continueConversation(payload.message, payload.context);
    return { ok: true };
  }

  return { ok: false, reason: "no-handler" };
}

export default {
  MAX_CONTINUE_CHARS,
  boundContinueText,
  isStreaming,
  resolveContinuePayload,
  dispatchContinueConversation,
};
