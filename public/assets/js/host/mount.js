/**
 * A8.6 — Versioned canvas host mount (`canvas-host-v1`).
 *
 * Mounts the Sanctum Canvas runtime into a host element **without** lab chrome.
 * Track B / Merge call this (or `sanctumCanvasMount`) after providing
 * `#sanctum-canvas-root`. Lab controllers and fixture pickers stay outside this module.
 */

import { createComponentRegistry } from "../renderer/registry.js";
import { createRenderContext } from "../renderer/context.js";
import { safeRender } from "../renderer/safeRender.js";
import { unmount as unmountDom } from "../renderer/reconciler.js";
import { createStore } from "../runtime/store.js";
import { createBindingManager } from "../runtime/bindings.js";
import { registerFoundation } from "../components/registerFoundation.js";
import { registerContent } from "../components/content/registerContent.js";
import { registerContainers } from "../components/containers/registerContainers.js";
import { registerSectionSteps } from "../components/containers/registerSectionSteps.js";
import { registerCarouselModal } from "../components/containers/registerCarouselModal.js";
import { registerForms } from "../components/forms/registerForms.js";
import { registerActions } from "../components/actions/registerActions.js";
import { registerTable } from "../components/table/registerTable.js";
import { registerCharts } from "../components/charts/registerCharts.js";
import { registerCards } from "../components/cards/index.js";
import { registerTools } from "../components/tools/registerTools.js";
import { registerChatContent } from "../components/chat/registerChatContent.js";
import * as urlPolicy from "../security/urlPolicy.js";
import {
  createStreamingParser,
  libraryToJsonSchema,
} from "../lang/index.js";
import { loadLibraryJson, validateLibrary } from "../lang/contractLoader.js";
import {
  EventType,
  createEventReducer,
  summarizeState,
} from "../transport/index.js";

export const CONTRACT = "canvas-host-v1";
export const RUNTIME_ID = "sanctum-canvas";
export const RUNTIME_VERSION = "0.1.0";
export const ROOT_ID = "sanctum-canvas-root";

export const CAPABILITIES = Object.freeze([
  "ag-ui-events",
  "sse",
  "ndjson",
  "continue-conversation",
  "open-url-policy",
  "tool-dispatch-host",
]);

/** @type {WeakSet<object>} */
const mounting = new WeakSet();
/** @type {WeakMap<object, CanvasMountHandle>} */
const leases = new WeakMap();

/**
 * @typedef {object} CanvasMountHandle
 * @property {string} contract
 * @property {string} runtime
 * @property {string} runtimeVersion
 * @property {Element} root
 * @property {(event: object) => object} dispatchEvent
 * @property {(source: string, opts?: { streaming?: boolean }) => void} setProgram
 * @property {() => object} getState
 * @property {() => object} getSummary
 * @property {(reason?: string) => Promise<void>} unmount
 * @property {(reason?: string) => Promise<void>} dispose
 */

/**
 * @param {unknown} hostOffer
 * @returns {{ ok: true, contract: string } | { ok: false, code: string, message: string }}
 */
export function negotiateContract(hostOffer = {}) {
  const offer =
    hostOffer && typeof hostOffer === "object"
      ? /** @type {Record<string, unknown>} */ (hostOffer)
      : {};
  const contract = offer.contract ?? offer.compatibleContract ?? CONTRACT;
  if (contract !== CONTRACT) {
    return {
      ok: false,
      code: "contract-mismatch",
      message: `expected ${CONTRACT}, got ${String(contract)}`,
    };
  }
  return { ok: true, contract: CONTRACT };
}

/**
 * Clear mount root (works with real DOM and miniDom).
 * @param {Element} el
 */
export function clearRoot(el) {
  if (!el) return;
  if (typeof el.replaceChildren === "function") {
    el.replaceChildren();
    return;
  }
  while (el.firstChild) el.removeChild(el.firstChild);
}

/**
 * Convert lang ElementNode → reconciler vnode.
 * @param {unknown} node
 * @returns {unknown}
 */
export function elementToVnode(node) {
  if (node == null || node === false) return null;
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(elementToVnode).filter((x) => x != null);
  }
  if (typeof node !== "object") return null;

  const obj = /** @type {Record<string, unknown>} */ (node);

  if (typeof obj.type === "string" && obj.type !== "element") {
    return obj;
  }

  if (obj.type === "element" && typeof obj.typeName === "string") {
    const rawProps = /** @type {Record<string, unknown>} */ (obj.props || {});
    /** @type {Record<string, unknown>} */
    const props = {};
    for (const [k, v] of Object.entries(rawProps)) {
      if (k === "children") {
        props.children = elementToVnode(v);
      } else if (Array.isArray(v)) {
        props[k] = v.map((item) =>
          item && typeof item === "object" && /** @type {any} */ (item).type === "element"
            ? elementToVnode(item)
            : item,
        );
      } else if (v && typeof v === "object" && /** @type {any} */ (v).type === "element") {
        props[k] = elementToVnode(v);
      } else {
        props[k] = v;
      }
    }
    if (obj.partial === true) props.partial = true;
    const children = Array.isArray(props.children) ? props.children : undefined;
    return {
      type: obj.typeName,
      id: typeof obj.statementId === "string" ? obj.statementId : undefined,
      props,
      children,
    };
  }

  return null;
}

/**
 * Register the full Track A component surface (no lab modules).
 * @param {ReturnType<typeof createComponentRegistry>} registry
 */
export function registerAllComponents(registry) {
  registerFoundation(registry);
  registerContent(registry);
  registerChatContent(registry);
  registerContainers(registry);
  registerSectionSteps(registry);
  registerCarouselModal(registry);
  registerForms(registry);
  registerActions(registry);
  registerTable(registry);
  registerCharts(registry);
  registerCards(registry);
  registerTools(registry);
  return registry;
}

/**
 * @param {unknown} libraryOrText
 */
function resolveLibrary(libraryOrText) {
  if (libraryOrText == null) return null;
  if (typeof libraryOrText === "string") return loadLibraryJson(libraryOrText);
  return validateLibrary(libraryOrText);
}

/**
 * @param {Element} canvasElement
 * @param {Record<string, unknown>} [options]
 * @returns {Promise<CanvasMountHandle>}
 */
export async function mount(canvasElement, options = {}) {
  if (!canvasElement || typeof canvasElement !== "object") {
    throw new Error("mount: canvasElement required");
  }

  const negotiated = negotiateContract(options);
  if (!negotiated.ok) {
    const err = new Error(negotiated.message);
    /** @type {any} */ (err).code = negotiated.code;
    throw err;
  }

  if (mounting.has(canvasElement)) {
    throw new Error("mount in progress");
  }

  const prior = leases.get(canvasElement);
  if (prior) {
    await prior.dispose("remount");
  }

  mounting.add(canvasElement);
  /** @type {(() => void) | null} */
  let abortUnsub = null;

  try {
    const doc =
      /** @type {Document} */ (options.document) ||
      canvasElement.ownerDocument ||
      (typeof document !== "undefined" ? document : null);
    if (!doc) throw new Error("mount: document required");

    let library = resolveLibrary(options.library);
    if (!library && typeof options.libraryUrl === "string") {
      const fetchFn =
        typeof options.fetch === "function"
          ? options.fetch
          : typeof fetch === "function"
            ? fetch.bind(globalThis)
            : null;
      if (!fetchFn) throw new Error("mount: fetch unavailable for libraryUrl");
      const res = await fetchFn(String(options.libraryUrl));
      if (!res.ok) throw new Error(`mount: library fetch failed (${res.status})`);
      library = loadLibraryJson(await res.text());
    }
    if (!library) {
      throw new Error("mount: options.library or options.libraryUrl required");
    }

    const schema = libraryToJsonSchema(library);
    const rootName =
      typeof options.rootName === "string" && options.rootName
        ? options.rootName
        : String(library.root || "Stack");

    clearRoot(canvasElement);
    if (
      typeof canvasElement.setAttribute === "function" &&
      !canvasElement.getAttribute?.("id")
    ) {
      // Host should set id; do not rename an existing different id.
    }

    const registry = createComponentRegistry();
    registerAllComponents(registry);

    const initiation =
      options.initiation && typeof options.initiation === "object"
        ? /** @type {Record<string, unknown>} */ (options.initiation)
        : {};
    const seed =
      initiation.seed && typeof initiation.seed === "object"
        ? /** @type {Record<string, unknown>} */ (initiation.seed)
        : {};

    const store = createStore();
    if (seed.stateHydration && typeof seed.stateHydration === "object") {
      store.initialize({}, /** @type {Record<string, unknown>} */ (seed.stateHydration));
    }
    const bindings = createBindingManager(store);
    const reducer = createEventReducer();

    /** @type {string} */
    let programSource = "";
    /** @type {ReturnType<typeof createStreamingParser>} */
    let streamingParser = createStreamingParser(schema, rootName);
    /** @type {AbortController | null} */
    let localAbort = null;
    let disposed = false;

    const hostSignal =
      options.signal && typeof options.signal === "object"
        ? /** @type {AbortSignal} */ (options.signal)
        : null;

    const continueConversation =
      typeof options.continueConversation === "function"
        ? options.continueConversation
        : typeof options.onContinueConversation === "function"
          ? options.onContinueConversation
          : () => {};

    const openUrl =
      typeof options.openUrl === "function"
        ? options.openUrl
        : (url) => urlPolicy.safeOpenUrl(url);

    const dispatchAction =
      typeof options.dispatchAction === "function"
        ? options.dispatchAction
        : async () => {
            throw new Error("unsupported-action");
          };

    const reportError =
      typeof options.onError === "function"
        ? options.onError
        : () => {};

    const onHostEvent =
      typeof options.onEvent === "function" ? options.onEvent : () => {};

    const ctx = createRenderContext({
      document: doc,
      registry,
      urlPolicy,
      bindings,
      state: store,
      stream: { isStreaming: false },
      development: options.development === true,
      reportError,
    });
    ctx.continueConversation = continueConversation;
    ctx.openUrl = openUrl;
    ctx.dispatchAction = dispatchAction;

    function renderFromSource(source, { streaming = false } = {}) {
      programSource = source || "";
      ctx.stream = { isStreaming: streaming };
      streamingParser = createStreamingParser(schema, rootName);
      const result = streamingParser.push(programSource);
      if (result.root) {
        const vnode = elementToVnode(result.root);
        if (vnode) safeRender(canvasElement, vnode, ctx);
      } else if (!streaming && !programSource.trim()) {
        clearRoot(canvasElement);
      }
      return result;
    }

    function eventNeedsLangSync(event) {
      if (!event || typeof event !== "object") return false;
      const t = event.type;
      return (
        t === EventType.TEXT_MESSAGE_CONTENT ||
        t === EventType.TEXT_MESSAGE_CHUNK ||
        t === EventType.TEXT_MESSAGE_END ||
        t === EventType.TEXT_MESSAGE_START ||
        t === EventType.RUN_FINISHED ||
        t === EventType.RUN_ERROR ||
        t === EventType.RUN_CANCELLED
      );
    }

    function syncLangFromReducer() {
      const state = reducer.getState();
      const assistant = state.messages
        .filter((m) => m.role === "assistant" || !m.role)
        .map((m) => m.content || "")
        .join("");
      const streaming = state.isStreaming === true && state.runStatus === "running";
      renderFromSource(assistant, { streaming });
    }

    /**
     * @param {object} event
     */
    function dispatchEvent(event) {
      if (disposed) return reducer.getState();
      const next = reducer.dispatch(event);
      onHostEvent(event, next);
      if (eventNeedsLangSync(event)) syncLangFromReducer();
      return next;
    }

    if (typeof seed.programSource === "string" && seed.programSource) {
      renderFromSource(seed.programSource, { streaming: false });
    }

    async function dispose(reason = "dispose") {
      if (disposed) return;
      disposed = true;
      if (abortUnsub) {
        abortUnsub();
        abortUnsub = null;
      }
      if (localAbort) {
        localAbort.abort(reason);
        localAbort = null;
      }
      try {
        unmountDom(canvasElement, ctx);
      } catch {
        /* last-resort clear */
      }
      clearRoot(canvasElement);
      leases.delete(canvasElement);
    }

    if (hostSignal) {
      if (hostSignal.aborted) {
        await dispose("signal-aborted");
        throw new Error("mount: signal already aborted");
      }
      const onAbort = () => {
        void dispose("signal-aborted");
      };
      hostSignal.addEventListener("abort", onAbort, { once: true });
      abortUnsub = () => hostSignal.removeEventListener("abort", onAbort);
    }

    /** @type {CanvasMountHandle} */
    const handle = {
      contract: CONTRACT,
      runtime: RUNTIME_ID,
      runtimeVersion: RUNTIME_VERSION,
      root: canvasElement,
      dispatchEvent,
      setProgram(source, opts) {
        renderFromSource(source, opts);
      },
      getState() {
        return reducer.getState();
      },
      getSummary() {
        return summarizeState(reducer.getState());
      },
      unmount: dispose,
      dispose,
    };

    leases.set(canvasElement, handle);
    return handle;
  } finally {
    mounting.delete(canvasElement);
  }
}

/**
 * Companion adapter entry (`canvas-host-v1`): mount into `ctx.root`.
 * @param {Record<string, unknown>} ctx
 * @returns {Promise<{ unmount: (reason?: string) => Promise<void> }>}
 */
export async function sanctumCanvasMount(ctx = {}) {
  const root = ctx.root;
  if (!root) throw new Error("sanctumCanvasMount: ctx.root required");

  const handle = await mount(/** @type {Element} */ (root), {
    document: ctx.document,
    signal: ctx.signal,
    session: ctx.session,
    initiation: ctx.initiation,
    dispatchAction: ctx.dispatchAction,
    continueConversation: ctx.continueConversation,
    openUrl: ctx.openUrl,
    library: ctx.library,
    libraryUrl: ctx.libraryUrl,
    fetch: ctx.fetch,
    development: ctx.development === true,
    onError: ctx.onError,
    onEvent: ctx.onEvent,
    contract: ctx.contract || CONTRACT,
  });

  return {
    async unmount(reason) {
      await handle.dispose(reason);
    },
    handle,
  };
}

/**
 * Descriptor Track B may advertise / register.
 */
export function createRendererAdapter(extra = {}) {
  return {
    id: RUNTIME_ID,
    version: RUNTIME_VERSION,
    contract: CONTRACT,
    capabilities: [...CAPABILITIES],
    async mount(ctx) {
      return sanctumCanvasMount({ ...extra, ...ctx });
    },
  };
}
