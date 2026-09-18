import {
  captureParserParseException,
  captureParserParseResult,
  prepareParserParseTelemetry
} from "../telemetry/runtime.js";
import { isASTNode, walkAST } from "./ast.js";
import { isBuiltin, RESERVED_CALLS } from "./builtins.js";
import { parseExpression } from "./expressions.js";
import { tokenize } from "./lexer.js";
import { materializeValue } from "./materialize.js";
import { autoClose, split } from "./statements.js";
import { T } from "./tokens.js";
import {
  isElementNode
} from "./types.js";
import { getSchemaDefaultValue } from "./validation.js";
function emptyResult(incomplete = true) {
  return {
    root: null,
    meta: {
      incomplete,
      unresolved: [],
      orphaned: [],
      statementCount: 0,
      errors: []
    },
    stateDeclarations: {},
    queryStatements: [],
    mutationStatements: []
  };
}
function collectQueryDeps(node) {
  if (!isASTNode(node)) return [];
  const refs = /* @__PURE__ */ new Set();
  walkAST(node, (current) => {
    if (current.k === "StateRef") refs.add(current.n);
  });
  return [...refs];
}
function classifyStatement(raw, expr) {
  if (expr.k === "Comp" && expr.name === RESERVED_CALLS.Query) {
    const deps = collectQueryDeps(expr.args[1]);
    return {
      kind: "query",
      id: raw.id,
      call: { callee: RESERVED_CALLS.Query, args: expr.args },
      expr,
      deps: deps.length > 0 ? deps : void 0
    };
  }
  if (expr.k === "Comp" && expr.name === RESERVED_CALLS.Mutation) {
    return {
      kind: "mutation",
      id: raw.id,
      call: { callee: RESERVED_CALLS.Mutation, args: expr.args },
      expr
    };
  }
  if (raw.idTokenType === T.StateVar) {
    return { kind: "state", id: raw.id, init: expr };
  }
  return { kind: "value", id: raw.id, expr };
}
function extractStatements(stmts, ctx) {
  const stateDeclarations = {};
  const queryStatements = [];
  const mutationStatements = [];
  for (const stmt of stmts) {
    switch (stmt.kind) {
      case "state":
        stateDeclarations[stmt.id] = materializeValue(stmt.init, ctx);
        break;
      case "query":
        queryStatements.push({
          statementId: stmt.id,
          toolAST: stmt.call.args[0] ?? null,
          argsAST: stmt.call.args[1] ?? null,
          defaultsAST: stmt.call.args[2] ?? null,
          refreshAST: stmt.call.args[3] ?? null,
          deps: stmt.deps,
          complete: true
        });
        break;
      case "mutation":
        mutationStatements.push({
          statementId: stmt.id,
          toolAST: stmt.call.args[0] ?? null,
          argsAST: stmt.call.args[1] ?? null
        });
        break;
    }
  }
  for (const stmt of stmts) {
    const nodes = stmt.kind === "state" ? [stmt.init] : stmt.kind === "value" ? [stmt.expr] : stmt.kind === "query" || stmt.kind === "mutation" ? stmt.call.args : [];
    for (const node of nodes) {
      for (const dep of collectQueryDeps(node)) {
        if (!(dep in stateDeclarations)) {
          stateDeclarations[dep] = null;
        }
      }
    }
  }
  return { stateDeclarations, queryStatements, mutationStatements };
}
const DEFAULT_ROOT_STATEMENT_ID = "root";
function isComponentStatement(stmt) {
  return stmt.kind === "value" && stmt.expr.k === "Comp" && !isBuiltin(stmt.expr.name) && stmt.expr.name !== RESERVED_CALLS.Query && stmt.expr.name !== RESERVED_CALLS.Mutation;
}
function pickEntryId(stmtMap, typedStmts, firstId, rootName) {
  if (stmtMap.has(DEFAULT_ROOT_STATEMENT_ID)) return DEFAULT_ROOT_STATEMENT_ID;
  if (rootName && stmtMap.has(rootName)) return rootName;
  const preferredComponent = rootName ? typedStmts.find((stmt) => isComponentStatement(stmt) && stmt.expr.name === rootName) : void 0;
  if (preferredComponent) return preferredComponent.id;
  const firstComponent = typedStmts.find(isComponentStatement);
  return firstComponent?.id ?? firstId;
}
function buildResult(stmtMap, typedStmts, firstId, wasIncomplete, stmtCount, cat, rootName) {
  const entryId = pickEntryId(stmtMap, typedStmts, firstId, rootName);
  if (!stmtMap.has(entryId)) return emptyResult(wasIncomplete);
  const syms = /* @__PURE__ */ new Map();
  for (const [id, stmt] of stmtMap) {
    syms.set(id, stmt.kind === "state" ? stmt.init : stmt.expr);
  }
  const unres = [];
  const errors = [];
  const unreached = /* @__PURE__ */ new Set();
  for (const [id, stmt] of stmtMap) {
    if (id === entryId) continue;
    if (stmt.kind === "state" || stmt.kind === "query" || stmt.kind === "mutation") continue;
    unreached.add(id);
  }
  const ctx = {
    syms,
    cat,
    errors,
    unres,
    visited: /* @__PURE__ */ new Set(),
    partial: wasIncomplete,
    currentStatementId: entryId,
    unreached
  };
  const materialized = materializeValue(syms.get(entryId), ctx);
  const root = isElementNode(materialized) ? materialized : null;
  if (root) root.statementId = entryId;
  const { stateDeclarations, queryStatements, mutationStatements } = extractStatements(
    typedStmts,
    ctx
  );
  const orphaned = [...unreached];
  return {
    root,
    meta: {
      incomplete: wasIncomplete,
      unresolved: unres,
      orphaned,
      statementCount: stmtCount,
      errors
    },
    stateDeclarations,
    queryStatements,
    mutationStatements
  };
}
function skipString(input, start) {
  if (input[start] !== '"') return start;
  let i = start + 1;
  while (i < input.length) {
    const c = input[i];
    if (c === "\\") {
      i += 2;
    } else if (c === '"') {
      return i + 1;
    } else {
      i++;
    }
  }
  return i;
}
function stripFences(input) {
  const blocks = [];
  let i = 0;
  while (i < input.length) {
    let fenceStart = -1;
    while (i < input.length) {
      const nextI = skipString(input, i);
      if (nextI > i) {
        i = nextI;
        continue;
      }
      const c = input[i];
      if (c === "`" && i + 1 < input.length && input[i + 1] === "`" && i + 2 < input.length && input[i + 2] === "`") {
        fenceStart = i;
        break;
      }
      i++;
    }
    if (fenceStart === -1) break;
    let j = fenceStart + 3;
    while (j < input.length && input[j] !== "\n") j++;
    if (j >= input.length) {
      blocks.push(input.slice(fenceStart + 3).replace(/^[^\n]*\n?/, ""));
      i = input.length;
      break;
    }
    j++;
    let closePos = -1;
    let k = j;
    while (k < input.length) {
      const nextK = skipString(input, k);
      if (nextK > k) {
        k = nextK;
        continue;
      }
      const c = input[k];
      if (c === "`" && k + 1 < input.length && input[k + 1] === "`" && k + 2 < input.length && input[k + 2] === "`") {
        closePos = k;
        break;
      }
      k++;
    }
    if (closePos !== -1) {
      blocks.push(input.slice(j, closePos));
      i = closePos + 3;
    } else {
      blocks.push(input.slice(j));
      i = input.length;
    }
  }
  if (blocks.length > 0) return blocks.join("\n");
  // Main scan above already handles ``` open/close (including unclosed).
  // No secondary fallback — keeps stripFences single-path and fully tested.
  return input;
}
function stripComments(input) {
  let inStr = false;
  return input.split("\n").map((line) => {
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inStr) {
        if (c === "\\" && i + 1 < line.length) {
          i++;
          continue;
        }
        if (c === inStr) inStr = false;
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = c;
        continue;
      }
      if (c === "/" && line[i + 1] === "/") {
        return line.substring(0, i).trimEnd();
      }
      if (c === "#") {
        return line.substring(0, i).trimEnd();
      }
    }
    return line;
  }).join("\n");
}
function preprocess(input) {
  return stripComments(stripFences(input.trim())).trim();
}
function parse(input, cat, rootName) {
  const trimmed = preprocess(input);
  if (!trimmed) return emptyResult();
  const { text, wasIncomplete } = autoClose(trimmed);
  const stmts = split(tokenize(text));
  if (!stmts.length) return emptyResult(wasIncomplete);
  const stmtMap = /* @__PURE__ */ new Map();
  let firstId = "";
  for (const s of stmts) {
    const expr = parseExpression(s.tokens);
    const stmt = classifyStatement(s, expr);
    stmtMap.set(s.id, stmt);
    if (!firstId) firstId = s.id;
  }
  const typedStmts = [...stmtMap.values()];
  return buildResult(stmtMap, typedStmts, firstId, wasIncomplete, stmtMap.size, cat, rootName);
}
function createStreamParser(cat, rootName) {
  let buf = "";
  let cleaned = "";
  let completedEnd = 0;
  const completedStmtMap = /* @__PURE__ */ new Map();
  let completedCount = 0;
  let firstId = "";
  function addStmt(text) {
    const t = text.trim();
    if (!t) return;
    for (const s of split(tokenize(t))) {
      const expr = parseExpression(s.tokens);
      const stmt = classifyStatement(s, expr);
      completedStmtMap.set(s.id, stmt);
      completedCount++;
      if (!firstId) firstId = s.id;
    }
  }
  function refreshCleaned() {
    const next = preprocess(buf);
    if (!next.startsWith(cleaned.slice(0, completedEnd))) {
      completedEnd = 0;
      completedStmtMap.clear();
      completedCount = 0;
      firstId = "";
    }
    cleaned = next;
  }
  function scanNewCompleted() {
    let depth = 0, ternaryDepth = 0, inStr = false, esc = false;
    let stmtStart = completedEnd;
    for (let i = completedEnd; i < cleaned.length; i++) {
      const c = cleaned[i];
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
      else if (c === "?" && depth === 0) ternaryDepth++;
      else if (c === ":" && depth === 0 && ternaryDepth > 0) ternaryDepth--;
      else if (c === "\n" && depth <= 0 && ternaryDepth <= 0) {
        let peek = i + 1;
        while (peek < cleaned.length && (cleaned[peek] === " " || cleaned[peek] === "	" || cleaned[peek] === "\r" || cleaned[peek] === "\n"))
          peek++;
        if (peek < cleaned.length && (cleaned[peek] === "?" || cleaned[peek] === ":" && ternaryDepth > 0)) {
          continue;
        }
        const t = cleaned.slice(stmtStart, i).trim();
        if (t) addStmt(t);
        stmtStart = i + 1;
        completedEnd = i + 1;
      }
    }
    return stmtStart;
  }
  function currentResult() {
    refreshCleaned();
    const pendingStart = scanNewCompleted();
    const pendingText = cleaned.slice(pendingStart).trim();
    if (!pendingText) {
      if (completedCount === 0) return emptyResult();
      return buildResult(
        completedStmtMap,
        [...completedStmtMap.values()],
        firstId,
        false,
        completedCount,
        cat,
        rootName
      );
    }
    const { text: closed, wasIncomplete } = autoClose(pendingText);
    const stmts = split(tokenize(closed));
    if (!stmts.length) {
      if (completedCount === 0) return emptyResult(wasIncomplete);
      return buildResult(
        completedStmtMap,
        [...completedStmtMap.values()],
        firstId,
        wasIncomplete,
        completedCount,
        cat,
        rootName
      );
    }
    const allStmtMap = new Map(completedStmtMap);
    for (const s of stmts) {
      if (completedStmtMap.has(s.id)) continue;
      const expr = parseExpression(s.tokens);
      const stmt = classifyStatement(s, expr);
      allStmtMap.set(s.id, stmt);
    }
    const allTypedStmts = [...allStmtMap.values()];
    const fid = firstId || stmts[0].id;
    return buildResult(
      allStmtMap,
      allTypedStmts,
      fid,
      wasIncomplete,
      completedCount + stmts.length,
      cat,
      rootName
    );
  }
  function reset() {
    buf = "";
    cleaned = "";
    completedEnd = 0;
    completedStmtMap.clear();
    completedCount = 0;
    firstId = "";
  }
  return {
    push(chunk) {
      buf += chunk;
      return currentResult();
    },
    set(fullText) {
      if (fullText.length < buf.length || !fullText.startsWith(buf)) {
        reset();
      }
      const delta = fullText.slice(buf.length);
      if (delta) buf += delta;
      return currentResult();
    },
    getResult: currentResult
  };
}
function compileSchema(schema) {
  const map = /* @__PURE__ */ new Map();
  const defs = schema.$defs ?? {};
  for (const [name, def] of Object.entries(defs)) {
    const properties = def.properties ?? {};
    const required = def.required ?? [];
    const params = Object.keys(properties).map((key) => ({
      name: key,
      required: required.includes(key),
      defaultValue: getSchemaDefaultValue(properties[key]),
      schema: properties[key]
    }));
    map.set(name, { params });
  }
  return map;
}
function createParser(schema, rootName) {
  const paramMap = compileSchema(schema);
  return {
    parse(input) {
      const telemetry = prepareParserParseTelemetry();
      try {
        const result = parse(input, paramMap, rootName);
        captureParserParseResult(telemetry, result);
        return result;
      } catch (error) {
        captureParserParseException(telemetry);
        throw error;
      }
    }
  };
}
function createStreamingParser(schema, rootName) {
  return createStreamParser(compileSchema(schema), rootName);
}
export {
  collectQueryDeps,
  compileSchema,
  createParser,
  createStreamParser,
  createStreamingParser,
  parse,
  stripFences
};
