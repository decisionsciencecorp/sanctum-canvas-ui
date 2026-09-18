import { isASTNode, isRuntimeExpr } from "./ast.js";
import { isBuiltin, isReservedCall, LAZY_BUILTINS, RESERVED_CALLS } from "./builtins.js";
import { isElementNode } from "./types.js";
import {
  buildParamsSignature,
  pushValidationIssue,
  resolveInvalidValue,
  validateSchemaValue
} from "./validation.js";
function containsDynamicValue(v) {
  if (v == null || typeof v !== "object") return false;
  if (isASTNode(v)) return true;
  if (Array.isArray(v)) return v.some(containsDynamicValue);
  if (isElementNode(v)) {
    return Object.values(v.props).some(containsDynamicValue);
  }
  const obj = v;
  return Object.values(obj).some(containsDynamicValue);
}
function resolveRef(name, ctx, mode) {
  if (ctx.visited.has(name)) {
    ctx.unres.push(name);
    return mode === "expr" ? { k: "Ph", n: name } : null;
  }
  if (!ctx.syms.has(name)) {
    ctx.unres.push(name);
    return mode === "expr" ? { k: "Ph", n: name } : null;
  }
  const target = ctx.syms.get(name);
  ctx.unreached?.delete(name);
  if (target.k === "Comp" && isReservedCall(target.name)) {
    const refType = target.name === RESERVED_CALLS.Mutation ? "mutation" : "query";
    return { k: "RuntimeRef", n: name, refType };
  }
  ctx.visited.add(name);
  const prevStatementId = ctx.currentStatementId;
  ctx.currentStatementId = name;
  try {
    const result = mode === "value" ? materializeValue(target, ctx) : materializeExpr(target, ctx);
    if (mode === "value" && isElementNode(result)) {
      result.statementId = name;
    }
    return result;
  } finally {
    ctx.currentStatementId = prevStatementId;
    ctx.visited.delete(name);
  }
}
function materializeLazyBuiltin(node, ctx, scopedRefs) {
  if (!LAZY_BUILTINS.has(node.name) || node.args.length < 3) return null;
  const varArg = node.args[1];
  const varName = varArg.k === "Ref" ? varArg.n : varArg.k === "Str" ? varArg.v : null;
  if (!varName) return null;
  const nextScopedRefs = new Set(scopedRefs);
  nextScopedRefs.add(varName);
  const recursedArgs = node.args.map(
    (a, i) => i === 1 ? a : materializeExprInternal(a, ctx, nextScopedRefs)
  );
  return { ...node, args: recursedArgs };
}
function materializeExprInternal(node, ctx, scopedRefs) {
  switch (node.k) {
    case "Ref":
      return scopedRefs.has(node.n) ? node : resolveRef(node.n, ctx, "expr");
    case "Ph":
      return node;
    case "Comp": {
      const lazy = materializeLazyBuiltin(node, ctx, scopedRefs);
      if (lazy) return lazy;
      const recursedArgs = node.args.map((a) => materializeExprInternal(a, ctx, scopedRefs));
      if (isBuiltin(node.name) || isReservedCall(node.name)) {
        return { ...node, args: recursedArgs };
      }
      const def = ctx.cat?.get(node.name);
      if (def) {
        const mappedProps = {};
        for (let i = 0; i < def.params.length && i < recursedArgs.length; i++) {
          mappedProps[def.params[i].name] = recursedArgs[i];
        }
        return { ...node, args: recursedArgs, mappedProps };
      }
      pushValidationIssue(ctx, node.name, "", {
        code: "unknown-component",
        available: ctx.cat && [...ctx.cat.keys()]
      });
      return { ...node, args: recursedArgs };
    }
    case "Arr":
      return { ...node, els: node.els.map((e) => materializeExprInternal(e, ctx, scopedRefs)) };
    case "Obj":
      return {
        ...node,
        entries: node.entries.map(
          ([k, v]) => [k, materializeExprInternal(v, ctx, scopedRefs)]
        )
      };
    case "BinOp":
      return {
        ...node,
        left: materializeExprInternal(node.left, ctx, scopedRefs),
        right: materializeExprInternal(node.right, ctx, scopedRefs)
      };
    case "UnaryOp":
      return { ...node, operand: materializeExprInternal(node.operand, ctx, scopedRefs) };
    case "Ternary":
      return {
        ...node,
        cond: materializeExprInternal(node.cond, ctx, scopedRefs),
        then: materializeExprInternal(node.then, ctx, scopedRefs),
        else: materializeExprInternal(node.else, ctx, scopedRefs)
      };
    case "Member":
      return { ...node, obj: materializeExprInternal(node.obj, ctx, scopedRefs) };
    case "Index":
      return {
        ...node,
        obj: materializeExprInternal(node.obj, ctx, scopedRefs),
        index: materializeExprInternal(node.index, ctx, scopedRefs)
      };
    case "Assign":
      return { ...node, value: materializeExprInternal(node.value, ctx, scopedRefs) };
    // Literals, StateRef, RuntimeRef — pass through unchanged
    default:
      return node;
  }
}
function materializeExpr(node, ctx) {
  return materializeExprInternal(node, ctx, /* @__PURE__ */ new Set());
}
function materializeValue(node, ctx) {
  switch (node.k) {
    // ── Ref resolution ───────────────────────────────────────────────────
    case "Ref":
      return resolveRef(node.n, ctx, "value");
    // ── Literals → plain values ──────────────────────────────────────────
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
    // ── Collections ──────────────────────────────────────────────────────
    case "Arr": {
      const items = [];
      for (const e of node.els) {
        if (e.k === "Ph") continue;
        const value = materializeValue(e, ctx);
        if (value === null && (e.k === "Comp" || e.k === "Ref")) continue;
        items.push(value);
      }
      return items;
    }
    case "Obj": {
      const o = {};
      for (const [k, v] of node.entries) o[k] = materializeValue(v, ctx);
      return o;
    }
    // ── Component nodes ──────────────────────────────────────────────────
    case "Comp": {
      const { name, args } = node;
      if (isBuiltin(name)) {
        const lazy = materializeLazyBuiltin(node, ctx, /* @__PURE__ */ new Set());
        if (lazy) return lazy;
        return { ...node, args: args.map((a) => materializeExpr(a, ctx)) };
      }
      if (isReservedCall(name)) {
        pushValidationIssue(ctx, name, "", { code: "inline-reserved" });
        return null;
      }
      const def = ctx.cat?.get(name);
      const props = {};
      if (def) {
        let dropComponent = false;
        for (let i = 0; i < def.params.length && i < args.length; i++) {
          const param = def.params[i];
          const value = materializeValue(args[i], ctx);
          props[param.name] = value;
          if (param.schema !== void 0 && validateSchemaValue(value, param.schema, name, `/${param.name}`, ctx)) {
            if (resolveInvalidValue(props, param.name, param.required, param.defaultValue)) {
              dropComponent = true;
            }
          }
        }
        if (args.length > def.params.length) {
          pushValidationIssue(ctx, name, "", {
            code: "excess-args",
            declared: def.params.length,
            got: args.length
          });
        }
        const missingRequired = def.params.filter(
          (p) => p.required && (!(p.name in props) || props[p.name] === null)
        );
        if (missingRequired.length) {
          const stillInvalid = missingRequired.filter((p) => {
            if (p.defaultValue !== void 0) {
              props[p.name] = p.defaultValue;
              return false;
            }
            return true;
          });
          if (stillInvalid.length) {
            for (const p of stillInvalid) {
              pushValidationIssue(ctx, name, `/${p.name}`, {
                code: p.name in props ? "null-required" : "missing-required",
                signature: buildParamsSignature(name, def.params)
              });
            }
            return null;
          }
        }
        if (dropComponent) return null;
      } else if (!isBuiltin(name) && !isReservedCall(name)) {
        pushValidationIssue(ctx, name, "", {
          code: "unknown-component",
          available: ctx.cat && [...ctx.cat.keys()]
        });
        return null;
      }
      const hasDynamicProps = Object.values(props).some((v) => containsDynamicValue(v));
      return { type: "element", typeName: name, props, partial: ctx.partial, hasDynamicProps };
    }
    // ── Runtime expression nodes → preserve as ASTNode, normalize children ─
    default: {
      if (isRuntimeExpr(node)) {
        return materializeExpr(node, ctx);
      }
      return node;
    }
  }
}
export {
  containsDynamicValue,
  materializeExpr,
  materializeValue
};
