import { isASTNode } from "../lang/ast.js";
import { ACTION_NAMES, ACTION_STEPS, BUILTINS, LAZY_BUILTINS, toNumber } from "../lang/builtins.js";
import { isElementNode } from "../lang/types.js";
import { isReactiveSchema } from "../lang/reactive.js";
import { evaluatePropCore } from "./evaluate-prop.js";

/**
 * @typedef {{ getState: (name: string) => unknown, resolveRef: (name: string) => unknown, extraScope?: Record<string, unknown> }} EvaluationContext
 * @typedef {{ library: { components: Record<string, { props?: { shape?: Record<string, unknown> } }> } }} SchemaContext
 * @typedef {{ __reactive: "assign", target: string, expr: import("../lang/ast.js").ASTNode }} ReactiveAssign
 */

export function isReactiveAssign(value) {
  return typeof value === "object" && value !== null && value.__reactive === "assign";
}

/**
 * @param {import("../lang/ast.js").ASTNode} node
 * @param {EvaluationContext} context
 * @param {SchemaContext} [schemaCtx]
 */
export function evaluate(node, context, schemaCtx) {
  switch (node.k) {
    case "Str":
      return node.v;
    case "Num":
      return node.v;
    case "Bool":
      return node.v;
    case "Null":
      return null;
    case "Ph":
      return null;

    case "StateRef":
      return context.extraScope?.[node.n] ?? context.getState(node.n);

    case "Ref":
    case "RuntimeRef":
      return context.resolveRef(node.n);

    case "Arr":
      return node.els.map((el) => evaluate(el, context, schemaCtx));
    case "Obj":
      return Object.fromEntries(node.entries.map(([k, v]) => [k, evaluate(v, context, schemaCtx)]));

    case "Comp": {
      if (LAZY_BUILTINS.has(node.name)) {
        return evaluateLazyBuiltin(node.name, node.args, context, schemaCtx);
      }
      const builtin = BUILTINS[node.name];
      if (builtin) {
        const args = node.args.map((a) => evaluate(a, context, schemaCtx));
        return builtin.fn(...args);
      }
      if (ACTION_NAMES.has(node.name)) {
        return evaluateActionCall(node.name, node.args, context);
      }
      if (node.mappedProps) {
        const def = schemaCtx?.library.components[node.name];
        const props = {};
        for (const [key, val] of Object.entries(node.mappedProps)) {
          const propSchema = def?.props?.shape?.[key];
          if (val.k === "StateRef" && propSchema && isReactiveSchema(propSchema)) {
            props[key] = {
              __reactive: "assign",
              target: val.n,
              expr: { k: "StateRef", n: "$value" },
            };
          } else if (val.k === "StateRef") {
            props[key] = schemaCtx ? context.getState(val.n) : val;
          } else {
            props[key] = evaluate(val, context, schemaCtx);
          }
        }
        const result = {
          type: "element",
          typeName: node.name,
          props,
          partial: false,
          hasDynamicProps: true,
        };
        if (schemaCtx) {
          for (const [key, val] of Object.entries(props)) {
            if (isElementNode(val)) {
              props[key] = evaluateElementInline(val, context, schemaCtx);
            } else if (Array.isArray(val)) {
              props[key] = val.map((item) =>
                isElementNode(item) ? evaluateElementInline(item, context, schemaCtx) : item,
              );
            }
          }
        }
        return result;
      }
      console.warn(`[openui] Unexpected unmapped Comp node: ${node.name}`);
      return null;
    }

    case "BinOp": {
      if (node.op === "&&") {
        const left = evaluate(node.left, context, schemaCtx);
        return left ? evaluate(node.right, context, schemaCtx) : left;
      }
      if (node.op === "||") {
        const left = evaluate(node.left, context, schemaCtx);
        return left ? left : evaluate(node.right, context, schemaCtx);
      }

      const left = evaluate(node.left, context, schemaCtx);
      const right = evaluate(node.right, context, schemaCtx);

      switch (node.op) {
        case "+":
          if (typeof left === "string" || typeof right === "string") {
            return String(left ?? "") + String(right ?? "");
          }
          return toNumber(left) + toNumber(right);
        case "-":
          return toNumber(left) - toNumber(right);
        case "*":
          return toNumber(left) * toNumber(right);
        case "/":
          return toNumber(right) === 0 ? 0 : toNumber(left) / toNumber(right);
        case "%":
          return toNumber(right) === 0 ? 0 : toNumber(left) % toNumber(right);
        case "==":
          return left == right;
        case "!=":
          return left != right;
        case ">":
          return toNumber(left) > toNumber(right);
        case "<":
          return toNumber(left) < toNumber(right);
        case ">=":
          return toNumber(left) >= toNumber(right);
        case "<=":
          return toNumber(left) <= toNumber(right);
        default:
          return null;
      }
    }

    case "UnaryOp":
      if (node.op === "!") {
        return !evaluate(node.operand, context, schemaCtx);
      }
      if (node.op === "-") {
        return -toNumber(evaluate(node.operand, context, schemaCtx));
      }
      return null;

    case "Ternary": {
      const cond = evaluate(node.cond, context, schemaCtx);
      return cond ? evaluate(node.then, context, schemaCtx) : evaluate(node.else, context, schemaCtx);
    }

    case "Member": {
      const obj = evaluate(node.obj, context, schemaCtx);
      if (obj == null) return null;
      if (Array.isArray(obj)) {
        if (node.field === "length") return obj.length;
        return obj.map((item) => item?.[node.field] ?? null);
      }
      return obj[node.field];
    }

    case "Index": {
      const obj = evaluate(node.obj, context, schemaCtx);
      const idx = evaluate(node.index, context, schemaCtx);
      if (obj == null || idx == null) return null;
      if (Array.isArray(obj)) {
        return obj[toNumber(idx)];
      }
      return obj[String(idx)];
    }

    case "Assign":
      return {
        __reactive: "assign",
        target: node.target,
        expr: node.value,
      };
  }
}

export function stripReactiveAssign(value, context) {
  if (!isReactiveAssign(value)) return value;
  return context.getState(value.target) ?? null;
}

function evaluateElementInline(el, context, schemaCtx) {
  if (el.hasDynamicProps === false) return el;
  const def = schemaCtx.library.components[el.typeName];
  const evaluated = {};

  for (const [key, value] of Object.entries(el.props)) {
    const propSchema = def?.props?.shape?.[key];
    evaluated[key] = evaluatePropInline(value, context, schemaCtx, propSchema);
  }
  return { ...el, props: evaluated };
}

function evaluatePropInline(value, context, schemaCtx, reactiveSchema) {
  return evaluatePropCore(value, context, schemaCtx, reactiveSchema, {
    recurseElement: (el) => evaluateElementInline(el, context, schemaCtx),
    recurse: (v, rs) => evaluatePropInline(v, context, schemaCtx, rs),
  });
}

function toLiteralAST(value) {
  if (value === null || value === undefined) return { k: "Null" };
  if (typeof value === "string") return { k: "Str", v: value };
  if (typeof value === "number") return { k: "Num", v: value };
  if (typeof value === "boolean") return { k: "Bool", v: value };
  if (Array.isArray(value)) return { k: "Arr", els: value.map(toLiteralAST) };
  if (typeof value === "object") {
    return {
      k: "Obj",
      entries: Object.entries(value).map(([k, v]) => [k, toLiteralAST(v)]),
    };
  }
  return { k: "Null" };
}

function evaluateActionCall(name, args, context) {
  switch (name) {
    case "Action": {
      const stepsArg = args.length > 0 ? evaluate(args[0], context) : [];
      const rawSteps = Array.isArray(stepsArg) ? stepsArg : [];
      const steps = rawSteps.filter((s) => s != null && typeof s === "object" && "type" in s);
      return { steps };
    }
    case "Run": {
      if (args.length === 0) return null;
      const refNode = args[0];
      if (refNode.k === "RuntimeRef") {
        return { type: ACTION_STEPS.Run, statementId: refNode.n, refType: refNode.refType };
      }
      return null;
    }
    case "ToAssistant": {
      const message = args.length > 0 ? String(evaluate(args[0], context) ?? "") : "";
      const ctx = args.length > 1 ? String(evaluate(args[1], context) ?? "") : undefined;
      return { type: ACTION_STEPS.ToAssistant, message, context: ctx };
    }
    case "OpenUrl": {
      const url = args.length > 0 ? String(evaluate(args[0], context) ?? "") : "";
      return { type: ACTION_STEPS.OpenUrl, url };
    }
    case "Set": {
      if (args.length < 2) return null;
      const targetNode = args[0];
      if (targetNode.k !== "StateRef") return null;
      return { type: ACTION_STEPS.Set, target: targetNode.n, valueAST: args[1] };
    }
    case "Reset": {
      const targets = args.filter((a) => a.k === "StateRef").map((a) => a.n);
      if (targets.length === 0) return null;
      return { type: ACTION_STEPS.Reset, targets };
    }
    default:
      return null;
  }
}

function substituteRef(node, varName, value) {
  switch (node.k) {
    case "Ref":
      return node.n === varName ? toLiteralAST(value) : node;
    case "Member": {
      if (isASTNode(node.obj)) {
        const subObj = substituteRef(node.obj, varName, value);
        if (subObj.k === "Obj") {
          const entry = subObj.entries.find(([k]) => k === node.field);
          if (entry) return entry[1];
        }
        return { ...node, obj: subObj };
      }
      return node;
    }
    case "Index":
      return {
        ...node,
        obj: isASTNode(node.obj) ? substituteRef(node.obj, varName, value) : node.obj,
        index: isASTNode(node.index) ? substituteRef(node.index, varName, value) : node.index,
      };
    case "BinOp":
      return {
        ...node,
        left: substituteRef(node.left, varName, value),
        right: substituteRef(node.right, varName, value),
      };
    case "UnaryOp":
      return { ...node, operand: substituteRef(node.operand, varName, value) };
    case "Ternary":
      return {
        ...node,
        cond: substituteRef(node.cond, varName, value),
        then: substituteRef(node.then, varName, value),
        else: substituteRef(node.else, varName, value),
      };
    case "Arr":
      return { ...node, els: node.els.map((e) => substituteRef(e, varName, value)) };
    case "Obj":
      return {
        ...node,
        entries: node.entries.map(([k, v]) => [k, substituteRef(v, varName, value)]),
      };
    case "Comp": {
      const result = {
        ...node,
        args: (node.args ?? []).map((a) => substituteRef(a, varName, value)),
      };
      if (node.mappedProps) {
        const subProps = {};
        for (const [k, v] of Object.entries(node.mappedProps)) {
          subProps[k] = substituteRef(v, varName, value);
        }
        result.mappedProps = subProps;
      }
      return result;
    }
    case "Assign":
      return { ...node, value: substituteRef(node.value, varName, value) };
    default:
      return node;
  }
}

function evaluateLazyBuiltin(name, args, context, schemaCtx) {
  if (name === "Each") {
    if (args.length < 3) return [];
    const arr = evaluate(args[0], context, schemaCtx);
    if (!Array.isArray(arr)) return [];

    const varName =
      args[1].k === "Ref" ? args[1].n : args[1].k === "Str" ? args[1].v : null;
    if (!varName) return [];
    const template = args[2];

    return arr.map((item) => {
      const substituted = substituteRef(template, varName, item);
      const childCtx = {
        ...context,
        resolveRef: (refName) => {
          if (refName === varName) return item;
          return context.resolveRef(refName);
        },
      };
      const result = evaluate(substituted, childCtx, schemaCtx);
      if (schemaCtx && isElementNode(result)) {
        return evaluateElementInline(result, childCtx, schemaCtx);
      }
      return result;
    });
  }
  return null;
}

/** @internal Test-only hooks for coverage of defensive branches. */
export const _evaluatorTestHooks = {
  evaluateActionCall,
  evaluateLazyBuiltin,
  substituteRef,
  toLiteralAST,
};
