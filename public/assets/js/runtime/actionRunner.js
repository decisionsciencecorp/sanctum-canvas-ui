/**
 * Ordered action-plan execution (Doc #1379 §5.5 / A3.7).
 * Set values evaluate at click time; failed mutation stops later steps.
 */

import { evaluate } from "./evaluator.js";
import { ACTION_STEPS } from "../lang/builtins.js";

/**
 * @param {object} deps
 * @param {import('./store.js').Store} deps.store
 * @param {{ runMutation: (id: string, args?: object) => Promise<{ status: string }> }} [deps.mutations]
 * @param {{ openUrl?: (url: string) => void, continueConversation?: (msg: string, ctx?: string) => void }} [deps.host]
 * @param {() => boolean} [deps.isProgramComplete] — side effects blocked while incomplete
 */
export function createActionRunner(deps) {
  const {
    store,
    mutations,
    host = {},
    isProgramComplete = () => true,
  } = deps;

  /**
   * @param {{ steps?: object[] } | object[]} plan
   * @param {{ userGesture?: boolean }} [opts]
   */
  async function run(plan, opts = {}) {
    if (!isProgramComplete()) {
      return { ok: false, reason: "incomplete-program" };
    }
    const steps = Array.isArray(plan) ? plan : plan?.steps ?? [];
    for (const step of steps) {
      if (!step || typeof step !== "object") continue;
      switch (step.type) {
        case ACTION_STEPS.Set: {
          const ctx = {
            getState: (n) => store.get(n),
            resolveRef: () => undefined,
          };
          const value = evaluate(step.valueAST, ctx);
          store.set(step.target, value);
          break;
        }
        case ACTION_STEPS.Reset: {
          store.reset(step.targets);
          break;
        }
        case ACTION_STEPS.Run: {
          if (!mutations) throw new Error("mutations-required");
          const result = await mutations.runMutation(step.statementId);
          if (result.status === "error") {
            return { ok: false, reason: "mutation-failed", step, result };
          }
          break;
        }
        case ACTION_STEPS.OpenUrl: {
          if (!opts.userGesture) {
            return { ok: false, reason: "gesture-required" };
          }
          host.openUrl?.(step.url);
          break;
        }
        case ACTION_STEPS.ToAssistant: {
          if (!opts.userGesture) {
            return { ok: false, reason: "gesture-required" };
          }
          host.continueConversation?.(step.message, step.context);
          break;
        }
        default:
          break;
      }
    }
    return { ok: true };
  }

  return { run };
}
