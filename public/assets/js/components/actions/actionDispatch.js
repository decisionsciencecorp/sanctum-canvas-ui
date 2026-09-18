/**
 * A6.4 — Shared action dispatch: gesture, double-fire guard, OpenUrl via urlPolicy.
 */

import { ACTION_STEPS } from "../../lang/builtins.js";
import { safeUrl as defaultSafeUrl } from "../../security/urlPolicy.js";

/** @type {WeakMap<Element, { inflight: boolean }>} */
const FIRE = new WeakMap();

/**
 * @param {Element} el
 */
export function beginFire(el) {
  let s = FIRE.get(el);
  if (!s) {
    s = { inflight: false };
    FIRE.set(el, s);
  }
  if (s.inflight) return false;
  s.inflight = true;
  return true;
}

/**
 * @param {Element} el
 */
export function endFire(el) {
  const s = FIRE.get(el);
  if (s) s.inflight = false;
}

/**
 * Sanitize OpenUrl steps in an action plan.
 * @param {unknown} plan
 * @param {Record<string, unknown>} ctx
 * @returns {{ plan: unknown, rejected: boolean, reason?: string }}
 */
export function sanitizeActionPlan(plan, ctx = {}) {
  if (!plan) return { plan, rejected: false };
  const steps = Array.isArray(plan) ? plan : plan.steps;
  if (!Array.isArray(steps)) return { plan, rejected: false };

  const policy = ctx.urlPolicy;
  const safe =
    policy && typeof policy.safeUrl === "function" ? policy.safeUrl : defaultSafeUrl;

  /** @type {object[]} */
  const out = [];
  for (const step of steps) {
    if (!step || typeof step !== "object") continue;
    const type = step.type;
    if (type === ACTION_STEPS.OpenUrl || type === "open_url" || type === "OpenUrl") {
      const url = step.url;
      const cleaned = typeof url === "string" ? safe(url) : undefined;
      if (!cleaned) {
        return { plan: null, rejected: true, reason: "unsafe-url" };
      }
      out.push({ ...step, type: ACTION_STEPS.OpenUrl, url: cleaned });
    } else {
      out.push(step);
    }
  }

  if (Array.isArray(plan)) return { plan: out, rejected: false };
  return { plan: { .../** @type {object} */ (plan), steps: out }, rejected: false };
}

/**
 * Whether primary button should validate the form before firing.
 * @param {unknown} plan
 * @param {string} variant
 */
export function needsFormValidation(plan, variant) {
  if (variant !== "primary") return false;
  if (!plan) return true;
  const steps = Array.isArray(plan) ? plan : plan?.steps;
  if (!Array.isArray(steps) || steps.length === 0) return true;
  return steps.some((s) => {
    if (!s || typeof s !== "object") return false;
    return (
      s.type === ACTION_STEPS.ToAssistant ||
      s.type === "continue_conversation" ||
      s.type === "ToAssistant" ||
      (s.type === ACTION_STEPS.Run || s.type === "run") && s.refType === "mutation"
    );
  });
}

/**
 * Dispatch an action plan with guards.
 * @param {Element} el
 * @param {Record<string, unknown>} props
 * @param {Record<string, unknown>} ctx
 * @param {{ label?: string }} [meta]
 */
export async function dispatchButtonAction(el, props, ctx, meta = {}) {
  if (!beginFire(el)) {
    return { ok: false, reason: "double-fire" };
  }
  el.setAttribute("data-firing", "1");
  try {
    const variant = String(props.variant || "primary");
    const plan = props.action;
    const fv = ctx.formValidation;

    if (fv && needsFormValidation(plan, variant)) {
      if (!fv.validateForm()) {
        return { ok: false, reason: "invalid" };
      }
    }

    const { plan: safePlan, rejected, reason } = sanitizeActionPlan(plan, ctx);
    if (rejected) {
      if (typeof ctx.reportError === "function") {
        ctx.reportError(new Error(`Button OpenUrl rejected: ${reason}`));
      }
      return { ok: false, reason: reason || "unsafe-url" };
    }

    const runner = ctx.actions ?? ctx.actionRunner;
    if (safePlan && runner && typeof runner.run === "function") {
      return await runner.run(safePlan, { userGesture: true });
    }
    if (typeof props.onClick === "function") {
      await /** @type {(e?: unknown) => unknown} */ (props.onClick)({
        label: meta.label,
        formName: ctx.formName,
      });
      return { ok: true };
    }
    return { ok: true, reason: "no-action" };
  } finally {
    el.removeAttribute("data-firing");
    endFire(el);
  }
}
