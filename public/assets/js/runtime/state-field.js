// old/packages/lang-core/src/parser/ast.ts
var AST_KINDS = /* @__PURE__ */ new Set([
  "Comp",
  "Ref",
  "StateRef",
  "RuntimeRef",
  "BinOp",
  "UnaryOp",
  "Ternary",
  "Member",
  "Index",
  "Assign",
  "Str",
  "Num",
  "Bool",
  "Null",
  "Arr",
  "Obj",
  "Ph"
]);
function isASTNode(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return AST_KINDS.has(value.k);
}

// old/packages/lang-core/src/parser/builtins.ts
function resolveField(obj, path) {
  if (!path || obj == null) return void 0;
  if (!path.includes(".")) return obj[path];
  let cur = obj;
  for (const p of path.split(".")) {
    if (cur == null) return void 0;
    cur = cur[p];
  }
  return cur;
}
function toNumber(val) {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }
  if (typeof val === "boolean") return val ? 1 : 0;
  return 0;
}
var BUILTINS = {
  Count: {
    name: "Count",
    signature: "Count(array) \u2192 number",
    description: "Returns array length",
    fn: (arr) => Array.isArray(arr) ? arr.length : 0
  },
  First: {
    name: "First",
    signature: "First(array) \u2192 element",
    description: "Returns first element of array",
    fn: (arr) => Array.isArray(arr) ? arr[0] ?? null : null
  },
  Last: {
    name: "Last",
    signature: "Last(array) \u2192 element",
    description: "Returns last element of array",
    fn: (arr) => Array.isArray(arr) ? arr[arr.length - 1] ?? null : null
  },
  Sum: {
    name: "Sum",
    signature: "Sum(numbers[]) \u2192 number",
    description: "Sum of numeric array",
    fn: (arr) => Array.isArray(arr) ? arr.reduce((a, b) => a + toNumber(b), 0) : 0
  },
  Avg: {
    name: "Avg",
    signature: "Avg(numbers[]) \u2192 number",
    description: "Average of numeric array",
    fn: (arr) => Array.isArray(arr) && arr.length ? arr.reduce((a, b) => a + toNumber(b), 0) / arr.length : 0
  },
  Min: {
    name: "Min",
    signature: "Min(numbers[]) \u2192 number",
    description: "Minimum value in array",
    fn: (arr) => Array.isArray(arr) && arr.length ? arr.reduce((acc, b) => Math.min(acc, toNumber(b)), toNumber(arr[0])) : 0
  },
  Max: {
    name: "Max",
    signature: "Max(numbers[]) \u2192 number",
    description: "Maximum value in array",
    fn: (arr) => Array.isArray(arr) && arr.length ? arr.reduce((acc, b) => Math.max(acc, toNumber(b)), toNumber(arr[0])) : 0
  },
  Sort: {
    name: "Sort",
    signature: "Sort(array, field, direction?) \u2192 sorted array",
    description: 'Sort array by field. Direction: "asc" (default) or "desc"',
    fn: (arr, field, dir) => {
      if (!Array.isArray(arr)) return arr;
      const f = String(field ?? "");
      const desc = String(dir ?? "asc") === "desc";
      return [...arr].sort((a, b) => {
        const av = f ? resolveField(a, f) : a;
        const bv = f ? resolveField(b, f) : b;
        const aIsNumeric = typeof av === "number" || typeof av === "string" && !isNaN(Number(av)) && av !== "";
        const bIsNumeric = typeof bv === "number" || typeof bv === "string" && !isNaN(Number(bv)) && bv !== "";
        if (aIsNumeric && bIsNumeric) {
          const diff = toNumber(av) - toNumber(bv);
          return desc ? -diff : diff;
        }
        const cmp = String(av ?? "").localeCompare(String(bv ?? ""));
        return desc ? -cmp : cmp;
      });
    }
  },
  Filter: {
    name: "Filter",
    signature: 'Filter(array, field, operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "contains", value) \u2192 filtered array',
    description: "Filter array by field value",
    fn: (arr, field, op, value) => {
      if (!Array.isArray(arr)) return [];
      const f = String(field ?? "");
      const o = String(op ?? "==");
      return arr.filter((item) => {
        const v = f ? resolveField(item, f) : item;
        switch (o) {
          case "==":
            return v == value;
          case "!=":
            return v != value;
          case ">":
            return toNumber(v) > toNumber(value);
          case "<":
            return toNumber(v) < toNumber(value);
          case ">=":
            return toNumber(v) >= toNumber(value);
          case "<=":
            return toNumber(v) <= toNumber(value);
          case "contains":
            return String(v ?? "").includes(String(value ?? ""));
          default:
            return false;
        }
      });
    }
  },
  Round: {
    name: "Round",
    signature: "Round(number, decimals?) \u2192 number",
    description: "Round to N decimal places (default 0)",
    fn: (n, decimals) => {
      const num = toNumber(n);
      const d = decimals != null ? toNumber(decimals) : 0;
      const factor = Math.pow(10, d);
      return Math.round(num * factor) / factor;
    }
  },
  Abs: {
    name: "Abs",
    signature: "Abs(number) \u2192 number",
    description: "Absolute value",
    fn: (n) => Math.abs(toNumber(n))
  },
  Floor: {
    name: "Floor",
    signature: "Floor(number) \u2192 number",
    description: "Round down to nearest integer",
    fn: (n) => Math.floor(toNumber(n))
  },
  Ceil: {
    name: "Ceil",
    signature: "Ceil(number) \u2192 number",
    description: "Round up to nearest integer",
    fn: (n) => Math.ceil(toNumber(n))
  }
};
var LAZY_BUILTINS = /* @__PURE__ */ new Set(["Each"]);
var ACTION_STEPS = {
  Run: "run",
  ToAssistant: "continue_conversation",
  OpenUrl: "open_url",
  Set: "set",
  Reset: "reset"
};
var ACTION_NAMES = /* @__PURE__ */ new Set(["Action", ...Object.keys(ACTION_STEPS)]);
var BUILTIN_NAMES = /* @__PURE__ */ new Set([
  ...Object.keys(BUILTINS),
  ...LAZY_BUILTINS,
  ...ACTION_NAMES
]);

// old/packages/lang-core/src/parser/types.ts
function isElementNode(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const node = value;
  return node.type === "element" && typeof node.typeName === "string" && typeof node.props === "object" && node.props !== null && typeof node.partial === "boolean";
}

// old/packages/lang-core/src/reactive.ts
var reactiveSchemas = /* @__PURE__ */ new WeakSet();
function isReactiveSchema(schema) {
  return typeof schema === "object" && schema !== null && reactiveSchemas.has(schema);
}

// old/packages/lang-core/src/runtime/evaluate-prop.ts
function evaluatePropCore(value, context, schemaCtx, reactiveSchema, callbacks) {
  if (value == null) return value;
  if (typeof value !== "object") return value;
  if (isASTNode(value)) {
    if (value.k === "StateRef" && reactiveSchema && isReactiveSchema(reactiveSchema)) {
      return {
        __reactive: "assign",
        target: value.n,
        expr: { k: "StateRef", n: "$value" }
      };
    }
    const result = evaluate(value, context, schemaCtx);
    if (isElementNode(result)) {
      return callbacks.recurseElement(result);
    }
    if (Array.isArray(result)) {
      return result.map(
        (item) => isElementNode(item) ? callbacks.recurseElement(item) : item
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

// old/packages/lang-core/src/runtime/evaluator.ts
function isReactiveAssign(value) {
  return typeof value === "object" && value !== null && value.__reactive === "assign";
}
function evaluate(node, context, schemaCtx) {
  switch (node.k) {
    // ── Literals ──────────────────────────────────────────────────────────
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
    // ── State references ──────────────────────────────────────────────────
    case "StateRef":
      return context.extraScope?.[node.n] ?? context.getState(node.n);
    // ── References ────────────────────────────────────────────────────────
    case "Ref":
    case "RuntimeRef":
      return context.resolveRef(node.n);
    // ── Collections ───────────────────────────────────────────────────────
    case "Arr":
      return node.els.map((el) => evaluate(el, context));
    case "Obj":
      return Object.fromEntries(node.entries.map(([k, v]) => [k, evaluate(v, context)]));
    // ── Component ─────────────────────────────────────────────────────────
    case "Comp": {
      if (LAZY_BUILTINS.has(node.name)) {
        return evaluateLazyBuiltin(node.name, node.args, context, schemaCtx);
      }
      const builtin = BUILTINS[node.name];
      if (builtin) {
        const args = node.args.map((a) => evaluate(a, context));
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
              expr: { k: "StateRef", n: "$value" }
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
          hasDynamicProps: true
        };
        if (schemaCtx) {
          for (const [key, val] of Object.entries(props)) {
            if (isElementNode(val)) {
              props[key] = evaluateElementInline(val, context, schemaCtx);
            } else if (Array.isArray(val)) {
              props[key] = val.map(
                (item) => isElementNode(item) ? evaluateElementInline(item, context, schemaCtx) : item
              );
            }
          }
        }
        return result;
      }
      console.warn(`[openui] Unexpected unmapped Comp node: ${node.name}`);
      return null;
    }
    // ── Binary operators ──────────────────────────────────────────────────
    case "BinOp": {
      if (node.op === "&&") {
        const left2 = evaluate(node.left, context);
        return left2 ? evaluate(node.right, context) : left2;
      }
      if (node.op === "||") {
        const left2 = evaluate(node.left, context);
        return left2 ? left2 : evaluate(node.right, context);
      }
      const left = evaluate(node.left, context);
      const right = evaluate(node.right, context);
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
    // ── Unary operators ───────────────────────────────────────────────────
    case "UnaryOp":
      if (node.op === "!") {
        return !evaluate(node.operand, context);
      }
      if (node.op === "-") {
        return -toNumber(evaluate(node.operand, context));
      }
      return null;
    // ── Ternary ───────────────────────────────────────────────────────────
    case "Ternary": {
      const cond = evaluate(node.cond, context);
      return cond ? evaluate(node.then, context) : evaluate(node.else, context);
    }
    // ── Member access ─────────────────────────────────────────────────────
    case "Member": {
      const obj = evaluate(node.obj, context);
      if (obj == null) return null;
      if (Array.isArray(obj)) {
        if (node.field === "length") return obj.length;
        return obj.map((item) => item?.[node.field] ?? null);
      }
      return obj[node.field];
    }
    // ── Index access ──────────────────────────────────────────────────────
    case "Index": {
      const obj = evaluate(node.obj, context);
      const idx = evaluate(node.index, context);
      if (obj == null || idx == null) return null;
      if (Array.isArray(obj)) {
        return obj[toNumber(idx)];
      }
      return obj[String(idx)];
    }
    // ── Assignment ────────────────────────────────────────────────────────
    case "Assign":
      return {
        __reactive: "assign",
        target: node.target,
        expr: node.value
      };
  }
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
    recurse: (v, rs) => evaluatePropInline(v, context, schemaCtx, rs)
  });
}
function toLiteralAST(value) {
  if (value === null || value === void 0) return { k: "Null" };
  if (typeof value === "string") return { k: "Str", v: value };
  if (typeof value === "number") return { k: "Num", v: value };
  if (typeof value === "boolean") return { k: "Bool", v: value };
  if (Array.isArray(value)) return { k: "Arr", els: value.map(toLiteralAST) };
  if (typeof value === "object") {
    return {
      k: "Obj",
      entries: Object.entries(value).map(([k, v]) => [k, toLiteralAST(v)])
    };
  }
  return { k: "Null" };
}
function evaluateActionCall(name, args, context) {
  switch (name) {
    case "Action": {
      const stepsArg = args.length > 0 ? evaluate(args[0], context) : [];
      const rawSteps = Array.isArray(stepsArg) ? stepsArg : [];
      const steps = rawSteps.filter(
        (s) => s != null && typeof s === "object" && "type" in s
      );
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
      const ctx = args.length > 1 ? String(evaluate(args[1], context) ?? "") : void 0;
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
        index: isASTNode(node.index) ? substituteRef(node.index, varName, value) : node.index
      };
    case "BinOp":
      return {
        ...node,
        left: substituteRef(node.left, varName, value),
        right: substituteRef(node.right, varName, value)
      };
    case "UnaryOp":
      return { ...node, operand: substituteRef(node.operand, varName, value) };
    case "Ternary":
      return {
        ...node,
        cond: substituteRef(node.cond, varName, value),
        then: substituteRef(node.then, varName, value),
        else: substituteRef(node.else, varName, value)
      };
    case "Arr":
      return { ...node, els: node.els.map((e) => substituteRef(e, varName, value)) };
    case "Obj":
      return {
        ...node,
        entries: node.entries.map(
          ([k, v]) => [k, substituteRef(v, varName, value)]
        )
      };
    case "Comp": {
      const result = { ...node, args: node.args.map((a) => substituteRef(a, varName, value)) };
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
    const arr = evaluate(args[0], context);
    if (!Array.isArray(arr)) return [];
    const varName = args[1].k === "Ref" ? args[1].n : args[1].k === "Str" ? args[1].v : null;
    if (!varName) return [];
    const template = args[2];
    return arr.map((item, _idx) => {
      const substituted = substituteRef(template, varName, item);
      const childCtx = {
        ...context,
        resolveRef: (refName) => {
          if (refName === varName) return item;
          return context.resolveRef(refName);
        }
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

// old/packages/lang-core/src/runtime/state-field.ts
function resolveStateField(name, bindingValue, store, evaluationContext, fieldGetter, fieldSetter) {
  if (isReactiveAssign(bindingValue) && store && evaluationContext) {
    const { target, expr } = bindingValue;
    return {
      name,
      value: store.get(target),
      setValue: (value) => {
        const extraScope = { $value: value };
        const nextValue = evaluate(expr, { ...evaluationContext, extraScope });
        store.set(target, nextValue);
      },
      isReactive: true
    };
  }
  return {
    name,
    value: fieldGetter(name) ?? bindingValue,
    setValue: (value) => fieldSetter(name, value),
    isReactive: false
  };
}
export {
  resolveStateField
};
