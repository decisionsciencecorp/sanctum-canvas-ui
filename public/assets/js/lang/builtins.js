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
const BUILTINS = {
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
const LAZY_BUILTINS = /* @__PURE__ */ new Set(["Each"]);
const LAZY_BUILTIN_DEFS = {
  Each: {
    signature: "Each(array, varName, template)",
    description: "Evaluate template for each element. varName is the loop variable \u2014 use it ONLY inside the template expression (inline). Do NOT create a separate statement for the template."
  }
};
const ACTION_STEPS = {
  Run: "run",
  ToAssistant: "continue_conversation",
  OpenUrl: "open_url",
  Set: "set",
  Reset: "reset"
};
const ACTION_NAMES = /* @__PURE__ */ new Set(["Action", ...Object.keys(ACTION_STEPS)]);
const BUILTIN_NAMES = /* @__PURE__ */ new Set([
  ...Object.keys(BUILTINS),
  ...LAZY_BUILTINS,
  ...ACTION_NAMES
]);
function isBuiltin(name) {
  return BUILTIN_NAMES.has(name);
}
const RESERVED_CALLS = { Query: "Query", Mutation: "Mutation" };
function isReservedCall(name) {
  return name in RESERVED_CALLS;
}
export {
  ACTION_NAMES,
  ACTION_STEPS,
  BUILTINS,
  BUILTIN_NAMES,
  LAZY_BUILTINS,
  LAZY_BUILTIN_DEFS,
  RESERVED_CALLS,
  isBuiltin,
  isReservedCall,
  toNumber
};
