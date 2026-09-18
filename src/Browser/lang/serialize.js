import { isASTNode } from "./ast.js";
import { isBuiltin } from "./builtins.js";
import { compileSchema } from "./parser.js";
import { isElementNode } from "./types.js";
const PRECEDENCE = {
  "||": 2,
  "&&": 3,
  "==": 4,
  "!=": 4,
  ">": 5,
  "<": 5,
  ">=": 5,
  "<=": 5,
  "+": 6,
  "-": 6,
  "*": 7,
  "/": 7,
  "%": 7
};
class StatementCollector {
  statements = [];
  registered = /* @__PURE__ */ new Set();
  /** Register an ElementNode as a named statement. Returns the statementId for use as a reference. */
  register(id, text) {
    if (this.registered.has(id)) return;
    this.registered.add(id);
    this.statements.push({ id, text });
  }
  has(id) {
    return this.registered.has(id);
  }
  getStatements() {
    return this.statements;
  }
}
function serializeASTNode(node) {
  switch (node.k) {
    case "Str":
      return JSON.stringify(node.v);
    case "Num":
      return String(node.v);
    case "Bool":
      return node.v ? "true" : "false";
    case "Null":
      return "null";
    case "Ph":
      return node.n;
    case "StateRef":
      return node.n;
    // already includes $ prefix
    case "RuntimeRef":
      return node.n;
    case "Arr":
      return "[" + node.els.map(serializeASTNode).join(", ") + "]";
    case "Obj":
      return "{" + node.entries.map(([k, v]) => `${k}: ${serializeASTNode(v)}`).join(", ") + "}";
    case "BinOp": {
      const left = serializeBinOpChild(node.left, node.op, "left");
      const right = serializeBinOpChild(node.right, node.op, "right");
      return `${left} ${node.op} ${right}`;
    }
    case "UnaryOp":
      return `${node.op}${serializeASTNode(node.operand)}`;
    case "Ternary":
      return `${serializeASTNode(node.cond)} ? ${serializeASTNode(node.then)} : ${serializeASTNode(node.else)}`;
    case "Member":
      return `${serializeASTNode(node.obj)}.${node.field}`;
    case "Index":
      return `${serializeASTNode(node.obj)}[${serializeASTNode(node.index)}]`;
    case "Assign":
      return `${node.target} = ${serializeASTNode(node.value)}`;
    case "Comp": {
      const args = node.args.map(serializeASTNode).join(", ");
      if (isBuiltin(node.name) && node.name !== "Action") {
        return `@${node.name}(${args})`;
      }
      return `${node.name}(${args})`;
    }
    // Ref nodes should not appear after materialization, but handle defensively
    case "Ref":
      return node.n;
    default:
      return "null";
  }
}
function serializeBinOpChild(child, parentOp, _side) {
  const inner = serializeASTNode(child);
  if (child.k !== "BinOp") return inner;
  const parentPrec = PRECEDENCE[parentOp] ?? 0;
  const childPrec = PRECEDENCE[child.op] ?? 0;
  if (childPrec < parentPrec) return `(${inner})`;
  return inner;
}
function serializeValue(value, paramMap, collector) {
  if (value === null || value === void 0) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (isElementNode(value)) {
    return serializeElementValue(value, paramMap, collector);
  }
  if (isASTNode(value)) {
    return serializeASTNode(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((el) => serializeValue(el, paramMap, collector));
    return "[" + items.join(", ") + "]";
  }
  if (typeof value === "object") {
    const obj = value;
    const entries = Object.entries(obj).map(
      ([k, v]) => `${k}: ${serializeValue(v, paramMap, collector)}`
    );
    return "{" + entries.join(", ") + "}";
  }
  return "null";
}
function serializeElementValue(node, paramMap, collector) {
  if (node.statementId) {
    if (!collector.has(node.statementId)) {
      const expr = serializeElementExpr(node, paramMap, collector);
      collector.register(node.statementId, `${node.statementId} = ${expr}`);
    }
    return node.statementId;
  }
  return serializeElementExpr(node, paramMap, collector);
}
function serializeElementExpr(node, paramMap, collector) {
  const def = paramMap.get(node.typeName);
  if (def) {
    const args = [];
    for (const param of def.params) {
      const val = node.props[param.name];
      args.push(serializeValue(val, paramMap, collector));
    }
    while (args.length > 0) {
      const last = args[args.length - 1];
      if (last !== "null") break;
      const paramIdx = args.length - 1;
      const param = def.params[paramIdx];
      if (!param) break;
      if (param.required) break;
      args.pop();
    }
    return `${node.typeName}(${args.join(", ")})`;
  }
  const fallbackArgs = Object.values(node.props).map((v) => serializeValue(v, paramMap, collector));
  return `${node.typeName}(${fallbackArgs.join(", ")})`;
}
function serializeStateDeclarations(stateDeclarations, paramMap, collector) {
  const lines = [];
  for (const [name, value] of Object.entries(stateDeclarations)) {
    if (value === null) continue;
    lines.push(`${name} = ${serializeValue(value, paramMap, collector)}`);
  }
  return lines;
}
function resolveJsonSchema(libraryOrSchema) {
  if (!libraryOrSchema) return { $defs: {} };
  if (typeof libraryOrSchema.toJSONSchema === "function") {
    return libraryOrSchema.toJSONSchema();
  }
  // Sanctum: accept raw LibraryJSONSchema ({ $defs }) directly
  if (libraryOrSchema.$defs) return libraryOrSchema;
  return { $defs: libraryOrSchema };
}

function jsonToOpenUI(json, library, options) {
  const paramMap = compileSchema(resolveJsonSchema(library));
  const collector = new StatementCollector();
  const rootExpr = serializeElementExpr(json, paramMap, collector);
  const rootId = json.statementId || "root";
  const lines = [];
  lines.push(`${rootId} = ${rootExpr}`);
  for (const stmt of collector.getStatements()) {
    if (stmt.id === rootId) continue;
    lines.push(stmt.text);
  }
  if (options?.stateDeclarations) {
    const stateLines = serializeStateDeclarations(options.stateDeclarations, paramMap, collector);
    lines.push(...stateLines);
  }
  return lines.join("\n");
}
export {
  jsonToOpenUI
};
