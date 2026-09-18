import { isASTNode } from "../lang/ast.js";
import { isElementNode } from "../lang/types.js";
import { isReactiveSchema } from "../lang/reactive.js";
import { evaluate, isReactiveAssign } from "./evaluator.js";

/**
 * Evaluate a single prop value with schema awareness.
 * @param {import("./evaluator.js").EvaluationContext} context
 * @param {import("./evaluator.js").SchemaContext} schemaCtx
 * @param {import("./evaluate-prop.js").PropEvalCallbacks} callbacks
 */
export function evaluatePropCore(value, context, schemaCtx, reactiveSchema, callbacks) {
  if (value == null) return value;
  if (typeof value !== "object") return value;

  if (isASTNode(value)) {
    if (value.k === "StateRef" && reactiveSchema && isReactiveSchema(reactiveSchema)) {
      return {
        __reactive: "assign",
        target: value.n,
        expr: { k: "StateRef", n: "$value" },
      };
    }
    const result = evaluate(value, context, schemaCtx);
    if (isElementNode(result)) {
      return callbacks.recurseElement(result);
    }
    if (Array.isArray(result)) {
      return result.map((item) =>
        isElementNode(item) ? callbacks.recurseElement(item) : item,
      );
    }
    if (isReactiveAssign(result) && !(reactiveSchema && isReactiveSchema(reactiveSchema))) {
      return context.getState(result.target) ?? null;
    }
    return result;
  }

  if (typeof value === "string" && reactiveSchema && isReactiveSchema(reactiveSchema)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => callbacks.recurse(v, reactiveSchema));
  }

  if (isElementNode(value)) {
    return callbacks.recurseElement(value);
  }

  const obj = value;
  if ("steps" in obj && Array.isArray(obj.steps)) return value;
  if ("type" in obj && "valueAST" in obj) return value;

  let needsEval = false;
  for (const val of Object.values(obj)) {
    if (typeof val === "object" && val !== null) {
      needsEval = true;
      break;
    }
  }
  if (needsEval) {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = callbacks.recurse(v, reactiveSchema);
    }
    return result;
  }

  return value;
}

/** @typedef {{ recurseElement: (el: import("../lang/types.js").ElementNode) => import("../lang/types.js").ElementNode, recurse: (value: unknown, reactiveSchema?: unknown) => unknown }} PropEvalCallbacks */
