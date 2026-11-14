/**
 * On-demand component packs — shell mount stays small; charts/tables/tools
 * load only when the OpenUI program actually names those types.
 *
 * Dynamic imports so esbuild code-splitting emits separate chunks.
 */

/** @type {Record<string, string>} typeName → pack id */
export const TYPE_TO_PACK = Object.freeze({
  // charts
  BarChart: "charts",
  LineChart: "charts",
  AreaChart: "charts",
  HorizontalBarChart: "charts",
  PieChart: "charts",
  SingleStackedBarChart: "charts",
  RadarChart: "charts",
  RadialChart: "charts",
  ScatterChart: "charts",
  Series: "charts",
  Slice: "charts",
  ScatterSeries: "charts",
  Point: "charts",
  // table
  Table: "table",
  EditableTable: "table",
  Col: "table",
  // tools
  ToolActivity: "tools",
  RunStatus: "tools",
  ToolCall: "tools",
  ToolResult: "tools",
  // chat-only (FollowUp / Citation — List/Code/Image already on shell via content)
  FollowUpBlock: "chat",
  FollowUpItem: "chat",
  CitationRef: "chat",
  Citation: "chat",
  // section / steps
  SectionBlock: "sectionSteps",
  SectionItem: "sectionSteps",
  Steps: "sectionSteps",
  StepsItem: "sectionSteps",
  // carousel / modal
  Carousel: "carouselModal",
  Modal: "carouselModal",
});

/** Optional CSS to inject once when a pack loads (product may already link some). */
/** Relative to this module when served from `…/js/host/` (lab + vendor). */
const PACK_CSS = Object.freeze({
  charts: ["../../css/components/charts.css"],
  table: ["../../css/components/table.css"],
  tools: ["../../css/components/tool-activity.css"],
  sectionSteps: [
    "../../css/components/section-block.css",
    "../../css/components/steps.css",
  ],
  carouselModal: [
    "../../css/components/carousel.css",
    "../../css/components/modal.css",
  ],
});

/** @type {Map<string, Promise<void>>} */
const loaded = new Map();

/**
 * Walk a lang AST or vnode tree and collect component type names.
 * @param {unknown} node
 * @param {Set<string>} [out]
 * @returns {Set<string>}
 */
export function collectTypeNames(node, out = new Set()) {
  if (node == null || node === false) return out;
  if (Array.isArray(node)) {
    for (const c of node) collectTypeNames(c, out);
    return out;
  }
  if (typeof node !== "object") return out;
  const obj = /** @type {Record<string, unknown>} */ (node);
  if (typeof obj.typeName === "string") out.add(obj.typeName);
  if (typeof obj.type === "string" && obj.type !== "element") out.add(obj.type);
  if (obj.props && typeof obj.props === "object") {
    const props = /** @type {Record<string, unknown>} */ (obj.props);
    for (const v of Object.values(props)) collectTypeNames(v, out);
  }
  if (Array.isArray(obj.children)) collectTypeNames(obj.children, out);
  return out;
}

/**
 * @param {string} packId
 * @param {string} importMetaUrl
 */
function injectPackCss(packId, importMetaUrl) {
  const hrefs = PACK_CSS[packId];
  if (!hrefs || typeof document === "undefined") return;
  for (const rel of hrefs) {
    const href = new URL(rel, importMetaUrl).href;
    // Prefer product/lab absolute CSS under /vendor or /assets when present
    const candidates = [href];
    try {
      const u = new URL(importMetaUrl);
      // host/mount.shell.bundle.js → ../../css/... from js/host is wrong;
      // packs resolve relative to this module's URL (host/lazyPacks or chunk).
      // Also try sibling css tree used by canvas-lab / vendor layout:
      //   .../js/host/x → .../css/components/y.css  is ../css from js/, not host/
      if (u.pathname.includes("/js/")) {
        const cssRoot = u.pathname.replace(/\/js\/.*$/, "/css/");
        const name = rel.split("/").pop();
        candidates.push(`${u.origin}${cssRoot}components/${name}`);
      }
    } catch {
      /* ignore */
    }
    for (const h of candidates) {
      if (document.querySelector(`link[data-canvas-pack-css="${h}"]`)) continue;
      if (document.querySelector(`link[href="${h}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = h;
      link.dataset.canvasPackCss = h;
      document.head.appendChild(link);
      break; // one candidate is enough; browser 404s are ok for the rest
    }
  }
}

/**
 * @param {string} packId
 * @returns {Promise<(registry: { register: Function }) => unknown>}
 */
async function importPackRegistrar(packId) {
  switch (packId) {
    case "charts":
      return (await import("../components/charts/registerCharts.js")).registerCharts;
    case "table":
      return (await import("../components/table/registerTable.js")).registerTable;
    case "tools":
      return (await import("../components/tools/registerTools.js")).registerTools;
    case "chat":
      return (await import("../components/chat/registerChatContent.js")).registerChatContent;
    case "sectionSteps":
      return (await import("../components/containers/registerSectionSteps.js"))
        .registerSectionSteps;
    case "carouselModal":
      return (await import("../components/containers/registerCarouselModal.js"))
        .registerCarouselModal;
    default:
      throw new Error(`unknown canvas pack: ${packId}`);
  }
}

/**
 * Ensure every pack needed by `types` is registered on `registry`.
 * @param {{ register: Function, has?: (t: string) => boolean }} registry
 * @param {Iterable<string>} types
 * @param {{ importMetaUrl?: string }} [opts]
 */
export async function ensureLazyPacks(registry, types, opts = {}) {
  const importMetaUrl = opts.importMetaUrl || import.meta.url;
  /** @type {Set<string>} */
  const needed = new Set();
  for (const t of types) {
    const pack = TYPE_TO_PACK[t];
    if (pack) needed.add(pack);
  }
  // Cache the pack *module* (register fn), not a one-shot registration on the
  // first mount's registry. Each mount() creates a fresh registry; remounts
  // must call register(registry) again or BarChart stays data-openui-unknown.
  for (const packId of needed) {
    if (!loaded.has(packId)) {
      loaded.set(
        packId,
        (async () => {
          const register = await importPackRegistrar(packId);
          injectPackCss(packId, importMetaUrl);
          return register;
        })(),
      );
    }
    const register = await loaded.get(packId);
    if (typeof register === "function") {
      register(registry);
    }
  }
}
