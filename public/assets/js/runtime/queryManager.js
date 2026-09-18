// Query manager — reactive data fetching (port of lang-core queryManager.ts + Doc #1379 §5.2)

import { McpToolError } from "./mcp.js";
import { ToolNotFoundError } from "./toolProvider.js";

/** Minimum auto-refresh interval (seconds). */
export const MIN_REFRESH_INTERVAL_SEC = 1;
/** Maximum auto-refresh interval (seconds). */
export const MAX_REFRESH_INTERVAL_SEC = 3600;

/**
 * @typedef {Object} QueryNode
 * @property {string} statementId
 * @property {string} toolName
 * @property {unknown} args
 * @property {unknown} defaults
 * @property {unknown} deps
 * @property {number} [refreshInterval]
 * @property {boolean} complete
 */

/**
 * @typedef {Object} MutationNode
 * @property {string} statementId
 * @property {string} toolName
 */

/**
 * @typedef {{ status: 'idle' | 'loading' | 'success' | 'error', data?: unknown, error?: unknown }} MutationResult
 */

/**
 * @typedef {Record<string, unknown> & {
 *   __openui_loading: string[],
 *   __openui_refetching: string[],
 *   __openui_errors: object[],
 * }} QuerySnapshot
 */

/**
 * Injectable tool backend (MCP, REST, fake registry, etc.).
 * @typedef {{ callTool: (toolName: string, args: Record<string, unknown>, opts?: { signal?: AbortSignal }) => Promise<unknown> }} ToolProvider
 */

/** JSON.stringify with stable key ordering at all nesting levels. */
export function stableStringify(value) {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const sorted = {};
      for (const k of Object.keys(val).sort()) {
        sorted[k] = val[k];
      }
      return sorted;
    }
    if (val === undefined) return "__undefined__";
    if (typeof val === "number") {
      if (Number.isNaN(val)) return "__NaN__";
      if (val === Infinity) return "__Inf__";
      if (val === -Infinity) return "__-Inf__";
    }
    return val;
  });
}

export function buildCacheKey(toolName, args, deps) {
  const depsKey = deps != null ? "::" + stableStringify(deps) : "";
  return toolName + "::" + stableStringify(args) + depsKey;
}

export function clampRefreshInterval(seconds) {
  if (seconds <= 0) return 0;
  return Math.min(MAX_REFRESH_INTERVAL_SEC, Math.max(MIN_REFRESH_INTERVAL_SEC, seconds));
}

/**
 * @param {ToolProvider | null} toolProvider
 * @returns {import('./queryManager.js').QueryManager}
 */
export function createQueryManager(toolProvider) {
  /** @type {Map<string, QueryEntry>} */
  const queries = new Map();
  /** @type {Map<string, MutationEntry>} */
  const mutations = new Map();
  /** @type {Map<string, CacheEntry>} */
  const cache = new Map();
  /** @type {Map<string, FlightEntry>} */
  const flights = new Map();
  const listeners = new Set();

  let snapshot = {
    __openui_loading: [],
    __openui_refetching: [],
    __openui_errors: [],
  };
  let snapshotJson = JSON.stringify(snapshot);
  let disposed = false;
  let generation = 0;

  function rebuildSnapshot() {
    const out = {
      __openui_loading: [],
      __openui_refetching: [],
      __openui_errors: [],
    };

    for (const [sid, q] of queries) {
      const entry = cache.get(q.cacheKey);
      if (entry && entry.data !== undefined) {
        out[sid] = entry.data;
      } else if (q.prevCacheKey) {
        const prev = cache.get(q.prevCacheKey);
        if (prev && prev.data !== undefined) {
          out[sid] = prev.data;
        } else {
          out[sid] = q.defaults;
        }
      } else {
        out[sid] = q.defaults;
      }
      if (q.loading) {
        out.__openui_loading.push(sid);
        if (q.everFetched) out.__openui_refetching.push(sid);
      }
      if (q.error) out.__openui_errors.push(q.error);
    }

    for (const [sid, m] of mutations) {
      out[sid] = m.result;
      if (m.error) out.__openui_errors.push(m.error);
    }

    try {
      const outJson = JSON.stringify(out);
      if (outJson === snapshotJson) return false;
      snapshot = out;
      snapshotJson = outJson;
    } catch {
      snapshot = out;
      snapshotJson = "";
    }
    return true;
  }

  function notify() {
    for (const listener of [...listeners]) {
      listener();
    }
  }

  function abortFlight(cacheKey) {
    const flight = flights.get(cacheKey);
    if (flight) {
      flight.controller.abort();
      flights.delete(cacheKey);
    }
    const entry = cache.get(cacheKey);
    if (entry) entry.inFlight = false;
  }

  function abortOrphanFlights() {
    for (const cacheKey of [...flights.keys()]) {
      let referenced = false;
      for (const q of queries.values()) {
        if (q.cacheKey === cacheKey || q.prevCacheKey === cacheKey) {
          referenced = true;
          break;
        }
      }
      if (!referenced) abortFlight(cacheKey);
    }
  }

  async function sharedCallTool(cacheKey, toolName, args) {
    const existing = flights.get(cacheKey);
    if (existing) return existing.promise;

    const controller = new AbortController();
    const promise = toolProvider
      .callTool(toolName, args ?? {}, { signal: controller.signal })
      .finally(() => {
        if (flights.get(cacheKey)?.controller === controller) {
          flights.delete(cacheKey);
        }
      });

    flights.set(cacheKey, { controller, promise });
    return promise;
  }

  async function executeFetch(cacheKey, statementId) {
    if (!toolProvider) return;

    const q = queries.get(statementId);
    if (!q) return;

    const fetchKey = cacheKey;
    const toolName = q.toolName;
    const args = q.args;

    let entry = cache.get(fetchKey);
    if (!entry) {
      entry = { data: undefined, inFlight: true };
      cache.set(fetchKey, entry);
    } else {
      entry.inFlight = true;
    }
    q.loading = true;
    rebuildSnapshot();
    notify();

    try {
      const data = await sharedCallTool(fetchKey, toolName, args);
      if (disposed) return;
      const current = queries.get(statementId);
      if (!current || current.cacheKey !== fetchKey) {
        entry.inFlight = false;
        return;
      }

      entry.data = data ?? null;
      current.everFetched = true;
      current.error = undefined;

      if (current.prevCacheKey && current.prevCacheKey !== fetchKey) {
        const prevKey = current.prevCacheKey;
        current.prevCacheKey = undefined;
        cleanupCacheEntry(prevKey);
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        entry.inFlight = false;
        return;
      }
      const current = queries.get(statementId);
      if (current && current.cacheKey === fetchKey) {
        if (err instanceof ToolNotFoundError) {
          current.error = {
            source: "query",
            code: "tool-not-found",
            message: `Query tool "${toolName}" not found`,
            statementId,
            component: "Query",
            toolName,
            hint: err.availableTools.length
              ? `Available tools: ${err.availableTools.join(", ")}`
              : undefined,
          };
        } else if (err instanceof McpToolError) {
          current.error = {
            source: "query",
            code: "mcp-error",
            message: `Query "${toolName}" returned an error: ${err.toolErrorText}`,
            statementId,
            component: "Query",
            toolName,
          };
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          current.error = {
            source: "query",
            code: "tool-error",
            message: `Query "${toolName}" failed: ${msg}`,
            statementId,
            component: "Query",
            toolName,
          };
        }
      }
      console.error(`Query "${toolName}" failed:`, err);
    } finally {
      entry.inFlight = false;
      const current = queries.get(statementId);
      if (current && current.cacheKey === fetchKey) {
        current.loading = false;
        if (rebuildSnapshot()) notify();
        if (current.needsRefetch) {
          current.needsRefetch = false;
          executeFetch(current.cacheKey, statementId);
        }
      } else {
        if (rebuildSnapshot()) notify();
      }
    }
  }

  function cleanupCacheEntry(cacheKey) {
    for (const q of queries.values()) {
      if (q.cacheKey === cacheKey || q.prevCacheKey === cacheKey) return;
    }
    abortFlight(cacheKey);
    cache.delete(cacheKey);
  }

  function evaluateQueries(queryNodes) {
    if (disposed) return;

    const activeIds = new Set(queryNodes.map((n) => n.statementId));

    for (const [sid, q] of queries) {
      if (!activeIds.has(sid)) {
        if (q.timer) clearInterval(q.timer);
        queries.delete(sid);
        cleanupCacheEntry(q.cacheKey);
        if (q.prevCacheKey) cleanupCacheEntry(q.prevCacheKey);
      }
    }
    abortOrphanFlights();

    for (const node of queryNodes) {
      if (!node.complete) continue;

      const cacheKey = buildCacheKey(node.toolName, node.args, node.deps);
      const existing = queries.get(node.statementId);

      if (existing) {
        if (existing.cacheKey !== cacheKey) {
          existing.prevCacheKey = existing.cacheKey;
          abortFlight(existing.cacheKey);
        }
        existing.toolName = node.toolName;
        existing.args = node.args;
        existing.defaults = node.defaults;
        existing.cacheKey = cacheKey;
      } else {
        queries.set(node.statementId, {
          toolName: node.toolName,
          args: node.args,
          defaults: node.defaults,
          cacheKey,
          loading: false,
          everFetched: false,
          refreshInterval: 0,
          needsRefetch: false,
        });
      }

      const q = queries.get(node.statementId);

      const entry = cache.get(cacheKey);
      const hasSettledData = entry && entry.data !== undefined && !entry.inFlight;
      if (toolProvider && !hasSettledData && !entry?.inFlight && !flights.has(cacheKey)) {
        executeFetch(cacheKey, node.statementId);
      } else if (entry?.inFlight || flights.has(cacheKey)) {
        q.loading = true;
      }

      const newInterval = clampRefreshInterval(node.refreshInterval ?? 0);
      if (newInterval !== q.refreshInterval) {
        if (q.timer) {
          clearInterval(q.timer);
          q.timer = undefined;
        }
        if (newInterval > 0) {
          q.timer = setInterval(() => {
            if (disposed || !toolProvider) return;
            const e = cache.get(q.cacheKey);
            if (!e?.inFlight && !flights.has(q.cacheKey)) {
              executeFetch(q.cacheKey, node.statementId);
            }
          }, newInterval * 1000);
        }
        q.refreshInterval = newInterval;
      }
    }

    if (rebuildSnapshot()) notify();
  }

  function getResult(statementId) {
    const q = queries.get(statementId);
    if (!q) return null;
    const entry = cache.get(q.cacheKey);
    if (entry && entry.data !== undefined) return entry.data;
    if (q.prevCacheKey) {
      const prev = cache.get(q.prevCacheKey);
      if (prev && prev.data !== undefined) return prev.data;
    }
    return q.defaults;
  }

  function isLoading(statementId) {
    return queries.get(statementId)?.loading ?? false;
  }

  function isAnyLoading() {
    for (const q of queries.values()) {
      if (q.loading) return true;
    }
    return false;
  }

  function invalidate(statementIds) {
    if (disposed || !toolProvider) return;

    const targets = statementIds?.length
      ? statementIds.filter((sid) => queries.has(sid))
      : [...queries.keys()];

    for (const sid of targets) {
      const q = queries.get(sid);
      if (!q) continue;
      const entry = cache.get(q.cacheKey);
      if (entry?.inFlight || flights.has(q.cacheKey)) {
        q.needsRefetch = true;
      } else {
        executeFetch(q.cacheKey, sid);
      }
    }
  }

  function registerMutations(nodes) {
    const activeIds = new Set(nodes.map((n) => n.statementId));

    for (const sid of mutations.keys()) {
      if (!activeIds.has(sid)) mutations.delete(sid);
    }

    for (const node of nodes) {
      const existing = mutations.get(node.statementId);
      if (existing) {
        if (existing.toolName !== node.toolName) {
          existing.toolName = node.toolName;
          existing.result = { status: "idle", data: null, error: null };
          existing.error = undefined;
        }
      } else {
        mutations.set(node.statementId, {
          toolName: node.toolName,
          result: { status: "idle" },
        });
      }
    }

    if (rebuildSnapshot()) notify();
  }

  async function fireMutation(statementId, evaluatedArgs, refreshQueryIds) {
    if (disposed || !toolProvider) return false;
    const m = mutations.get(statementId);
    if (!m) return false;

    if (m.result.status === "loading") return false;

    const gen = generation;

    m.result = { status: "loading" };
    rebuildSnapshot();
    notify();

    let success = false;
    try {
      const data = await toolProvider.callTool(m.toolName, evaluatedArgs);
      if (disposed || gen !== generation) return false;
      m.result = { status: "success", data };
      m.error = undefined;
      success = true;
    } catch (err) {
      if (disposed || gen !== generation) return false;
      const msg = err instanceof Error ? err.message : String(err);
      m.result = { status: "error", error: msg };
      if (err instanceof ToolNotFoundError) {
        m.error = {
          source: "mutation",
          code: "tool-not-found",
          message: `Mutation tool "${m.toolName}" not found`,
          statementId,
          component: "Mutation",
          toolName: m.toolName,
          hint: err.availableTools.length
            ? `Available tools: ${err.availableTools.join(", ")}`
            : undefined,
        };
      } else if (err instanceof McpToolError) {
        m.error = {
          source: "mutation",
          code: "mcp-error",
          message: `Mutation "${m.toolName}" returned an error: ${err.toolErrorText}`,
          statementId,
          component: "Mutation",
          toolName: m.toolName,
        };
      } else {
        m.error = {
          source: "mutation",
          code: "tool-error",
          message: `Mutation "${m.toolName}" failed: ${msg}`,
          statementId,
          component: "Mutation",
          toolName: m.toolName,
        };
      }
    }

    rebuildSnapshot();
    notify();

    if (success && refreshQueryIds?.length) {
      invalidate(refreshQueryIds);
    }

    return success;
  }

  function getMutationResult(statementId) {
    return mutations.get(statementId)?.result ?? null;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getSnapshot() {
    return snapshot;
  }

  function activate() {
    disposed = false;
  }

  function dispose() {
    disposed = true;
    generation++;
    listeners.clear();
    for (const cacheKey of [...flights.keys()]) {
      abortFlight(cacheKey);
    }
    for (const q of queries.values()) {
      if (q.timer) {
        clearInterval(q.timer);
        q.timer = undefined;
      }
      q.refreshInterval = 0;
      q.loading = false;
      q.needsRefetch = false;
    }
    mutations.clear();
  }

  return {
    evaluateQueries,
    getResult,
    isLoading,
    isAnyLoading,
    invalidate,
    registerMutations,
    fireMutation,
    getMutationResult,
    subscribe,
    getSnapshot,
    activate,
    dispose,
  };
}

/**
 * @typedef {ReturnType<typeof createQueryManager>} QueryManager
 */

/** @typedef {{ toolName: string, args: unknown, defaults: unknown, cacheKey: string, prevCacheKey?: string, loading: boolean, everFetched: boolean, refreshInterval: number, timer?: ReturnType<typeof setInterval>, needsRefetch: boolean, error?: object }} QueryEntry */
/** @typedef {{ toolName: string, result: MutationResult, error?: object }} MutationEntry */
/** @typedef {{ data: unknown, inFlight: boolean }} CacheEntry */
/** @typedef {{ controller: AbortController, promise: Promise<unknown> }} FlightEntry */
