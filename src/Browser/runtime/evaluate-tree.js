import { isElementNode } from "../lang/types.js";
import { evaluatePropCore } from "./evaluate-prop.js";

/**
 * @typedef {import("./evaluator.js").EvaluationContext} EvaluationContext
 * @typedef {import("./evaluator.js").SchemaContext} SchemaContext
 * @typedef {{ ctx: EvaluationContext, library: SchemaContext["library"], store: unknown, errors?: Array<{ source: string, code: string, component: string, statementId?: string, message: string, hint: string }> }} EvalContext
 */

/**
 * Evaluate all AST nodes in an ElementNode tree's props.
 * @param {import("../lang/types.js").ElementNode} el
 * @param {EvalContext} evalCtx
 */
export function evaluateElementProps(el, evalCtx) {
  if (el.hasDynamicProps === false) return el;

  const schemaCtx = { library: evalCtx.library };
  const def = evalCtx.library.components[el.typeName];
  const evaluated = {};

  for (const [key, value] of Object.entries(el.props)) {
    const propSchema = def?.props?.shape?.[key];
    try {
      evaluated[key] = evaluatePropValue(value, evalCtx, schemaCtx, propSchema);
    } catch (e) {
      evaluated[key] = value;
      const msg = e instanceof Error ? e.message : String(e);
      evalCtx.errors?.push({
        source: "runtime",
        code: "runtime-error",
        component: el.typeName,
        statementId: el.statementId,
        message: `Evaluating prop "${key}" on ${el.typeName} failed: ${msg}`,
        hint: `Check the expression used for prop "${key}"`,
      });
    }
  }

  return { ...el, props: evaluated };
}

function evaluatePropValue(value, evalCtx, schemaCtx, reactiveSchema) {
  return evaluatePropCore(value, evalCtx.ctx, schemaCtx, reactiveSchema, {
    recurseElement: (el) => evaluateElementProps(el, evalCtx),
    recurse: (v, rs) => evaluatePropValue(v, evalCtx, schemaCtx, rs),
  });
}
