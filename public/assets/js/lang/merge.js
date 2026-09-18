import { walkAST } from "./ast.js";
import { parseExpression } from "./expressions.js";
import { tokenize } from "./lexer.js";
import { stripFences } from "./parser.js";
import { split } from "./statements.js";
function splitStatementSource(input) {
  const stmts = [];
  let depth = 0;
  let inStr = false;
  let esc = false;
  let start = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === "\\" && inStr) {
      esc = true;
      continue;
    }
    if (inStr) {
      if (c === inStr) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth = Math.max(0, depth - 1);
    else if (c === "\n" && depth <= 0) {
      const stmt = input.slice(start, i).trim();
      if (stmt) stmts.push(stmt);
      start = i + 1;
    }
  }
  const tail = input.slice(start).trim();
  if (tail) stmts.push(tail);
  return stmts;
}
function parseStatements(input) {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const result = [];
  for (const raw of splitStatementSource(trimmed)) {
    const stmt = split(tokenize(raw))[0];
    if (!stmt) continue;
    result.push({
      id: stmt.id,
      ast: parseExpression(stmt.tokens),
      raw
    });
  }
  return result;
}
function collectRefs(node, out) {
  walkAST(node, (current) => {
    if (current.k === "Ref") out.add(current.n);
    if (current.k === "RuntimeRef") out.add(current.n);
  });
}
function gcUnreachable(order, merged, asts, rootId = "root") {
  const rootAst = asts.get(rootId);
  if (!rootAst) return;
  const reachable = /* @__PURE__ */ new Set([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.pop();
    const ast = asts.get(id);
    if (!ast) continue;
    const refs = /* @__PURE__ */ new Set();
    collectRefs(ast, refs);
    for (const ref of refs) {
      if (!reachable.has(ref) && asts.has(ref)) {
        reachable.add(ref);
        queue.push(ref);
      }
    }
  }
  for (const id of order) {
    if (id.startsWith("$")) reachable.add(id);
  }
  for (let i = order.length - 1; i >= 0; i--) {
    if (!reachable.has(order[i])) {
      merged.delete(order[i]);
      order.splice(i, 1);
    }
  }
}
function mergeStatements(existing, patch, rootId = "root") {
  const existingStmts = parseStatements(existing);
  const patchStmts = parseStatements(stripFences(patch));
  if (!existingStmts.length) {
    return patchStmts.map((stmt) => stmt.raw).join("\n");
  }
  if (!patchStmts.length) return existing;
  const merged = /* @__PURE__ */ new Map();
  const asts = /* @__PURE__ */ new Map();
  const order = [];
  for (const stmt of existingStmts) {
    merged.set(stmt.id, stmt.raw);
    asts.set(stmt.id, stmt.ast);
    order.push(stmt.id);
  }
  for (const stmt of patchStmts) {
    if (stmt.ast.k === "Null") {
      merged.delete(stmt.id);
      asts.delete(stmt.id);
      const idx = order.indexOf(stmt.id);
      if (idx !== -1) order.splice(idx, 1);
      continue;
    }
    if (!merged.has(stmt.id)) {
      order.push(stmt.id);
    }
    merged.set(stmt.id, stmt.raw);
    asts.set(stmt.id, stmt.ast);
  }
  gcUnreachable(order, merged, asts, rootId);
  return order.filter((id) => merged.has(id)).map((id) => merged.get(id)).join("\n");
}
export {
  mergeStatements
};
