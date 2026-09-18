/**
 * Renderer resource limits (Doc #1379 §9 / A4.7).
 * Hostile or oversized trees must stop cleanly — no browser freeze.
 */

/** @typedef {{
 *   maxNodes: number,
 *   maxDepth: number,
 *   maxActions: number,
 *   maxQueries: number,
 *   maxImages: number,
 *   maxUpdatesPerTick: number,
 * }} RendererLimits */

/** @typedef {{
 *   nodes?: number,
 *   depth?: number,
 *   actions?: number,
 *   queries?: number,
 *   images?: number,
 *   updatesPerTick?: number,
 * }} RendererStats */

/** @type {Readonly<RendererLimits>} */
export const DEFAULT_LIMITS = Object.freeze({
  maxNodes: 2_000,
  maxDepth: 64,
  maxActions: 64,
  maxQueries: 32,
  maxImages: 64,
  maxUpdatesPerTick: 256,
});

/**
 * @param {string} code
 * @param {string} message
 * @param {Record<string, unknown>} [details]
 */
export function limitError(code, message, details = {}) {
  return { code, message, ...details };
}

/**
 * Compare collected render stats against limits.
 * Stats keys are short (`nodes`, `depth`, …); limit keys use `max*` names.
 *
 * @param {RendererStats} stats
 * @param {Partial<RendererLimits>} [limits]
 * @returns {{ ok: true } | { ok: false, error: { code: string, message: string, limit: number, actual: number } }}
 */
export function checkLimits(stats, limits = DEFAULT_LIMITS) {
  const L = { ...DEFAULT_LIMITS, ...limits };
  const s = stats && typeof stats === "object" ? stats : {};

  /** @type {Array<[keyof RendererStats, keyof RendererLimits, string, string]>} */
  const checks = [
    ["nodes", "maxNodes", "too-many-nodes", "Render tree exceeds maxNodes"],
    ["depth", "maxDepth", "max-depth-exceeded", "Render tree exceeds maxDepth"],
    ["actions", "maxActions", "too-many-actions", "Action steps exceed maxActions"],
    ["queries", "maxQueries", "too-many-queries", "Queries exceed maxQueries"],
    ["images", "maxImages", "too-many-images", "Images exceed maxImages"],
    [
      "updatesPerTick",
      "maxUpdatesPerTick",
      "too-many-updates",
      "Updates this tick exceed maxUpdatesPerTick",
    ],
  ];

  for (const [statKey, limitKey, code, label] of checks) {
    const actual = Number(s[statKey] ?? 0);
    if (!Number.isFinite(actual) || actual < 0) {
      return {
        ok: false,
        error: limitError("invalid-stats", `Invalid stats.${String(statKey)}`, {
          limit: L[limitKey],
          actual,
        }),
      };
    }
    const limit = L[limitKey];
    if (actual > limit) {
      return {
        ok: false,
        error: limitError(code, `${label} (${actual} > ${limit})`, {
          limit,
          actual,
          field: statKey,
        }),
      };
    }
  }

  return { ok: true };
}

/**
 * Walk a vnode-like tree and collect node/depth/image counts.
 * Recognizes `type === "Image"` / `"ImageBlock"` (case-insensitive) as images.
 * When `limits` is provided, stops as soon as any budget is exceeded (hostile trees).
 *
 * @param {unknown} tree
 * @param {Partial<RendererLimits>} [limits]
 * @returns {RendererStats & { truncated?: boolean }}
 */
export function collectTreeStats(tree, limits) {
  let nodes = 0;
  let depth = 0;
  let images = 0;
  let actions = 0;
  let queries = 0;
  let truncated = false;
  const L = limits ? { ...DEFAULT_LIMITS, ...limits } : null;

  /**
   * @param {unknown} node
   * @param {number} d
   * @returns {boolean} continue walking
   */
  function walk(node, d) {
    if (node == null || typeof node !== "object") return true;
    nodes += 1;
    if (d > depth) depth = d;

    const type = String(/** @type {{ type?: unknown }} */ (node).type ?? "");
    const lower = type.toLowerCase();
    if (lower === "image" || lower === "imageblock") images += 1;
    if (lower === "query") queries += 1;
    if (type.startsWith("@") || lower === "action" || lower === "mutation") actions += 1;

    if (L) {
      const snap = { nodes, depth, images, actions, queries, updatesPerTick: 0 };
      if (!checkLimits(snap, L).ok) {
        truncated = true;
        return false;
      }
    }

    const children = /** @type {{ children?: unknown }} */ (node).children;
    if (Array.isArray(children)) {
      for (const child of children) {
        if (!walk(child, d + 1)) return false;
      }
    }
    return true;
  }

  walk(tree, 1);
  const out = { nodes, depth, images, actions, queries, updatesPerTick: 0 };
  if (truncated) out.truncated = true;
  return out;
}

/**
 * Run `fn` under a limits budget. `fn` receives a tracker:
 *   bump(field, n?) — increment a counter; returns checkLimits result
 *   check() — check current stats
 *   stats — live counters
 *
 * If `fn` returns an object with `.stats`, those are checked after the call.
 * On failure, returns `{ ok: false, error }` without throwing (unless `throwOnLimit`).
 *
 * @template T
 * @param {(tracker: {
 *   stats: Required<RendererStats>,
 *   bump: (field: keyof RendererStats, n?: number) => ReturnType<typeof checkLimits>,
 *   check: () => ReturnType<typeof checkLimits>,
 * }) => T} fn
 * @param {Partial<RendererLimits> & { throwOnLimit?: boolean }} [options]
 * @returns {T | { ok: false, error: object }}
 */
export function withLimits(fn, options = {}) {
  const { throwOnLimit = false, ...limitOverrides } = options;
  const limits = { ...DEFAULT_LIMITS, ...limitOverrides };

  /** @type {Required<RendererStats>} */
  const stats = {
    nodes: 0,
    depth: 0,
    actions: 0,
    queries: 0,
    images: 0,
    updatesPerTick: 0,
  };

  const check = () => checkLimits(stats, limits);

  /**
   * @param {keyof RendererStats} field
   * @param {number} [n]
   */
  const bump = (field, n = 1) => {
    if (field in stats) {
      stats[field] = (stats[field] ?? 0) + n;
    }
    return check();
  };

  const tracker = { stats, bump, check };

  let result;
  try {
    result = fn(tracker);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err) throw err;
    throw err;
  }

  if (result && typeof result === "object" && "stats" in result && result.stats) {
    const merged = { ...stats, .../** @type {RendererStats} */ (result.stats) };
    const after = checkLimits(merged, limits);
    if (!after.ok) {
      if (throwOnLimit) {
        const e = new Error(after.error.message);
        Object.assign(e, after.error);
        throw e;
      }
      return after;
    }
  }

  const final = check();
  if (!final.ok) {
    if (throwOnLimit) {
      const e = new Error(final.error.message);
      Object.assign(e, final.error);
      throw e;
    }
    return final;
  }

  return result;
}
