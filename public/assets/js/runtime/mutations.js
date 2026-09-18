/**
 * Mutation registration and safe execution (Doc #1379 §5.3, A3.6).
 * Never execute on render — only via explicit runMutation().
 */

/**
 * @typedef {{ callTool: (name: string, args: object, opts?: { signal?: AbortSignal, idempotencyKey?: string }) => Promise<unknown> }} ToolProvider
 * @typedef {'idle'|'loading'|'success'|'error'} MutationStatus
 * @typedef {{ status: MutationStatus, data?: unknown, error?: unknown, idempotencyKey?: string }} MutationResult
 */

/**
 * @param {ToolProvider} toolProvider
 * @param {{ refreshQueries?: (names: string[]) => Promise<void>|void }} [hooks]
 */
export function createMutationManager(toolProvider, hooks = {}) {
  /** @type {Map<string, { statementId: string, toolName: string, args: object, refreshQueries?: string[] }>} */
  const registry = new Map();
  /** @type {Map<string, MutationResult>} */
  const results = new Map();
  /** @type {Map<string, AbortController>} */
  const inflight = new Map();
  let disposed = false;
  let keySeq = 0;

  function validateArgs(args) {
    if (args === null || typeof args !== "object" || Array.isArray(args)) {
      throw new Error("mutation-invalid-args");
    }
  }

  function getResult(statementId) {
    return results.get(statementId) ?? { status: "idle" };
  }

  function register(node) {
    if (disposed) return;
    registry.set(node.statementId, {
      statementId: node.statementId,
      toolName: node.toolName,
      args: node.args ?? {},
      refreshQueries: node.refreshQueries ?? [],
    });
    if (!results.has(node.statementId)) {
      results.set(node.statementId, { status: "idle" });
    }
  }

  function unregister(statementId) {
    const ctl = inflight.get(statementId);
    if (ctl) {
      ctl.abort();
      inflight.delete(statementId);
    }
    registry.delete(statementId);
    results.delete(statementId);
  }

  /**
   * @param {string} statementId
   * @param {object} [argOverrides]
   */
  async function runMutation(statementId, argOverrides) {
    if (disposed) {
      throw new Error("mutation-manager-disposed");
    }
    const def = registry.get(statementId);
    if (!def) {
      throw new Error(`unknown-mutation:${statementId}`);
    }
    if (inflight.has(statementId)) {
      throw new Error(`mutation-in-flight:${statementId}`);
    }

    const overrides = argOverrides === undefined ? {} : argOverrides;
    validateArgs(def.args);
    validateArgs(overrides);
    const args = { ...def.args, ...overrides };
    if (typeof def.toolName !== "string" || !def.toolName.trim()) {
      throw new Error("mutation-invalid-tool");
    }
    const idempotencyKey = `mut-${statementId}-${++keySeq}`;
    const ctl = new AbortController();
    inflight.set(statementId, ctl);
    results.set(statementId, { status: "loading", idempotencyKey });

    try {
      const data = await toolProvider.callTool(def.toolName, args, {
        signal: ctl.signal,
        idempotencyKey,
      });
      if (disposed || ctl.signal.aborted) {
        return getResult(statementId);
      }
      results.set(statementId, { status: "success", data, idempotencyKey });
      if (def.refreshQueries?.length && hooks.refreshQueries) {
        await hooks.refreshQueries(def.refreshQueries);
      }
      return getResult(statementId);
    } catch (error) {
      if (ctl.signal.aborted || disposed) {
        results.set(statementId, { status: "idle" });
        return getResult(statementId);
      }
      results.set(statementId, { status: "error", error, idempotencyKey });
      return getResult(statementId);
    } finally {
      inflight.delete(statementId);
    }
  }

  function dispose() {
    disposed = true;
    for (const ctl of inflight.values()) ctl.abort();
    inflight.clear();
    registry.clear();
    results.clear();
  }

  return {
    register,
    unregister,
    runMutation,
    getResult,
    dispose,
    /** @internal */
    _registrySize: () => registry.size,
    _inflightSize: () => inflight.size,
  };
}
