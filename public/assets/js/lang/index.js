/**
 * Sanctum createParser / createStreamingParser wrappers.
 * Applies source limits (H hardening) then delegates to upstream-ported parser.
 */
import {
  createParser as upstreamCreateParser,
  createStreamingParser as upstreamCreateStreamingParser,
} from "./parser.js";
import { checkSourceLimits, checkStatementCount, DEFAULT_LIMITS } from "./limits.js";

function wrapResult(result, limits) {
  const chk = checkStatementCount(result.meta?.statementCount ?? 0, limits);
  if (!chk.ok) {
    result.meta.errors = [...(result.meta.errors || []), chk.error];
  }
  return result;
}

export function createParser(schema, rootName, limits = DEFAULT_LIMITS) {
  const inner = upstreamCreateParser(schema, rootName);
  return {
    parse(input) {
      const pre = checkSourceLimits(input, limits);
      if (!pre.ok) {
        return {
          root: null,
          meta: {
            incomplete: false,
            unresolved: [],
            orphaned: [],
            statementCount: 0,
            errors: [pre.error],
          },
          stateDeclarations: {},
          queryStatements: [],
          mutationStatements: [],
        };
      }
      return wrapResult(inner.parse(input), limits);
    },
  };
}

export function createStreamingParser(schema, rootName, limits = DEFAULT_LIMITS) {
  const inner = upstreamCreateStreamingParser(schema, rootName);
  return {
    push(chunk) {
      const pre = checkSourceLimits(chunk, limits);
      if (!pre.ok) {
        return {
          root: null,
          meta: {
            incomplete: true,
            unresolved: [],
            orphaned: [],
            statementCount: 0,
            errors: [pre.error],
          },
          stateDeclarations: {},
          queryStatements: [],
          mutationStatements: [],
        };
      }
      return wrapResult(inner.push(chunk), limits);
    },
    set(input) {
      return this.push(input);
    },
    getResult() {
      return wrapResult(inner.getResult(), limits);
    },
  };
}

export { libraryToJsonSchema } from "./librarySchema.js";
export { tokenize } from "./lexer.js";
export { T } from "./tokens.js";
