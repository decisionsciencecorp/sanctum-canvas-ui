/**
 * A7.7 standalone laboratory controller.
 *
 * Lives under /lab/ — never imported by Track B. Canvas output mounts only into
 * #sanctum-canvas-root. Debug panes + controls stay siblings of that root.
 */
import { createComponentRegistry } from "/assets/js/renderer/registry.js";
import { createRenderContext } from "/assets/js/renderer/context.js";
import { safeRender } from "/assets/js/renderer/safeRender.js";
import { createStore } from "/assets/js/runtime/store.js";
import { createBindingManager } from "/assets/js/runtime/bindings.js";
import { registerFoundation } from "/assets/js/components/registerFoundation.js";
import { registerContent } from "/assets/js/components/content/registerContent.js";
import { registerContainers } from "/assets/js/components/containers/registerContainers.js";
import { registerSectionSteps } from "/assets/js/components/containers/registerSectionSteps.js";
import { registerCarouselModal } from "/assets/js/components/containers/registerCarouselModal.js";
import { registerForms } from "/assets/js/components/forms/registerForms.js";
import { registerActions } from "/assets/js/components/actions/registerActions.js";
import { registerTable } from "/assets/js/components/table/registerTable.js";
import { registerCharts } from "/assets/js/components/charts/registerCharts.js";
import { registerCards } from "/assets/js/components/cards/index.js";
import { registerTools } from "/assets/js/components/tools/registerTools.js";
import * as urlPolicy from "/assets/js/security/urlPolicy.js";
import {
  createStreamingParser,
  libraryToJsonSchema,
} from "/assets/js/lang/index.js";
import { loadLibraryJson } from "/assets/js/lang/contractLoader.js";
import { mergeStatements } from "/assets/js/lang/merge.js";
import {
  EventType,
  createEventReducer,
  summarizeState,
  reduceEvents,
  createSseAdapter,
  createNdjsonAdapter,
  consumeSseResponse,
  consumeNdjsonResponse,
  buildNdjsonReplay,
} from "/assets/js/transport/index.js";

const LAB_AUTH = "canvas-lab-dev";
const LIBRARY_URL = "/assets/libraries/dashboard/library.v1.json";
const FIXTURE_DIR = "/fixtures/stream";

/** Known fixtures (offline-capable). Prefer lab-canvas-textcontent for canvas smoke. */
const FIXTURE_IDS = [
  "lab-canvas-textcontent",
  "text-message-basic",
  "tool-call-lifecycle",
  "malformed-line-skip",
  "interrupted-run-error",
  "sse-chunk-split-text",
  "ndjson-text-parity",
  "ndjson-tool-parity",
];

const els = {
  fixture: document.getElementById("lab-fixture"),
  replay: document.getElementById("lab-replay"),
  cancel: document.getElementById("lab-cancel"),
  reset: document.getElementById("lab-reset"),
  prompt: document.getElementById("lab-prompt"),
  format: document.getElementById("lab-format"),
  provider: document.getElementById("lab-provider"),
  start: document.getElementById("lab-start"),
  patch: document.getElementById("lab-patch"),
  patchSource: document.getElementById("lab-patch-source"),
  status: document.getElementById("lab-status"),
  canvas: document.getElementById("sanctum-canvas-root"),
  toolOut: document.getElementById("lab-tool-out"),
  debugLang: document.getElementById("debug-lang"),
  debugAst: document.getElementById("debug-ast"),
  debugState: document.getElementById("debug-state"),
  debugQuery: document.getElementById("debug-query"),
  debugErrors: document.getElementById("debug-errors"),
};

/** @type {AbortController | null} */
let abortCtl = null;
/** @type {string} */
let programSource = "";
/** @type {string | null} */
let programId = null;
/** @type {string | null} */
let csrfToken = null;
/** @type {ReturnType<typeof createEventReducer>} */
let reducer = createEventReducer();
/** @type {any} */
let library = null;
/** @type {any} */
let schema = null;
/** @type {ReturnType<typeof createStreamingParser> | null} */
let streamingParser = null;
/** @type {any[]} */
let labErrors = [];
/** @type {object} */
let lastQuerySnapshot = { tools: [], notes: null };

const registry = createComponentRegistry();
registerFoundation(registry);
registerContent(registry);
registerContainers(registry);
registerSectionSteps(registry);
registerCarouselModal(registry);
registerForms(registry);
registerActions(registry);
registerTable(registry);
registerCharts(registry);
registerCards(registry);
registerTools(registry);

const store = createStore({});
const bindings = createBindingManager(store);

const ctx = createRenderContext({
  document,
  registry,
  urlPolicy,
  bindings,
  state: store,
  stream: { isStreaming: false },
  development: true,
  reportError(err) {
    labErrors.push(sanitize(err));
    paintDebug();
  },
});

function sanitize(err) {
  if (err == null) return "unknown";
  if (typeof err === "string") return err;
  if (typeof err === "object" && "message" in err) return String(err.message);
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function setStatus(msg, { ready = false, error = false } = {}) {
  if (!els.status) return;
  els.status.textContent = msg;
  els.status.setAttribute("data-lab-ready", ready ? "1" : "0");
  els.status.setAttribute("data-lab-error", error ? "1" : "0");
}

function setBusy(busy) {
  if (els.cancel) els.cancel.disabled = !busy;
  if (els.replay) els.replay.disabled = busy;
  if (els.start) els.start.disabled = busy;
}

/**
 * Convert lang ElementNode → reconciler vnode.
 * @param {unknown} node
 * @returns {unknown}
 */
function elementToVnode(node) {
  if (node == null || node === false) return null;
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(elementToVnode).filter((x) => x != null);
  }
  if (typeof node !== "object") return null;

  const obj = /** @type {Record<string, unknown>} */ (node);

  // Already a reconciler vnode
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

function paintDebug() {
  const state = reducer.getState();
  if (els.debugLang) els.debugLang.textContent = programSource || "(empty)";
  if (els.debugState) {
    els.debugState.textContent = JSON.stringify(
      { summary: summarizeState(state), full: state },
      null,
      2,
    );
  }
  if (els.debugQuery) {
    els.debugQuery.textContent = JSON.stringify(lastQuerySnapshot, null, 2);
  }
  if (els.debugErrors) {
    const parseErrs = streamingParser?.getResult?.()?.meta?.errors || [];
    els.debugErrors.textContent = JSON.stringify(
      { lab: labErrors, parse: parseErrs },
      null,
      2,
    );
  }
}

function paintAst(result) {
  if (!els.debugAst) return;
  if (!result) {
    els.debugAst.textContent = "(no tree)";
    return;
  }
  try {
    els.debugAst.textContent = JSON.stringify(
      {
        rootType: result.root?.typeName ?? null,
        statementId: result.root?.statementId ?? null,
        meta: result.meta,
        root: result.root,
      },
      null,
      2,
    );
  } catch {
    els.debugAst.textContent = "(unserializable tree)";
  }
}

function renderFromSource(source, { streaming = false } = {}) {
  programSource = source || "";
  ctx.stream = { isStreaming: streaming };
  if (!streamingParser || !schema) {
    paintDebug();
    return;
  }

  // Streaming parser accumulates; recreate for absolute set semantics.
  streamingParser = createStreamingParser(schema, library.root || "Stack");
  const result = streamingParser.push(programSource);
  paintAst(result);

  if (result.root) {
    const vnode = elementToVnode(result.root);
    if (vnode && els.canvas) {
      safeRender(els.canvas, vnode, ctx);
    }
  } else if (els.canvas && !streaming) {
    // Clear on terminal empty / failed parse (keep last-good during stream).
    if (!programSource.trim()) {
      while (els.canvas.firstChild) els.canvas.removeChild(els.canvas.firstChild);
    }
  }
  paintDebug();
}

/**
 * Apply assistant text deltas from reducer messages into the Lang pipeline.
 */
function syncLangFromReducer() {
  const state = reducer.getState();
  const assistant = state.messages
    .filter((m) => m.role === "assistant" || !m.role)
    .map((m) => m.content || "")
    .join("");
  const streaming = state.isStreaming === true && state.runStatus === "running";
  renderFromSource(assistant, { streaming });
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

/** Direct AG-UI events (fixture.events) — dispatch then sync. */
function onDirectEvent(event) {
  reducer.dispatch(event);
  if (eventNeedsLangSync(event)) syncLangFromReducer();
  else paintDebug();
}

/**
 * Adapter already dispatched into `reducer` — only sync UI / debug.
 * Do not dispatch again (would double-apply deltas).
 */
function onAdapterEvent(event) {
  if (eventNeedsLangSync(event)) syncLangFromReducer();
  else paintDebug();
}

async function authHeaders(extra = {}) {
  const headers = {
    Accept: "application/json",
    "X-Canvas-Auth": LAB_AUTH,
    ...extra,
  };
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  return headers;
}

async function ensureCsrf() {
  if (csrfToken) return csrfToken;
  const res = await fetch("/api/csrf.php", {
    method: "GET",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`csrf failed: ${res.status} ${detail.slice(0, 180)}`);
  }
  const data = await res.json();
  csrfToken = data.csrfToken || data.token || null;
  return csrfToken;
}

function resetLab() {
  if (abortCtl) {
    abortCtl.abort();
    abortCtl = null;
  }
  reducer = createEventReducer();
  programSource = "";
  programId = null;
  labErrors = [];
  lastQuerySnapshot = { tools: [], notes: null };
  if (schema) {
    streamingParser = createStreamingParser(schema, library.root || "Stack");
  }
  if (els.canvas) {
    while (els.canvas.firstChild) els.canvas.removeChild(els.canvas.firstChild);
  }
  if (els.toolOut) els.toolOut.textContent = "";
  setBusy(false);
  setStatus("Reset.", { ready: true });
  paintAst(null);
  paintDebug();
}

/**
 * Offline fixture replay — no Venice; uses transport adapters + eventReducer.
 * @param {string} fixtureId
 */
async function replayFixture(fixtureId) {
  resetLab();
  setBusy(true);
  setStatus(`Replaying ${fixtureId}…`);
  abortCtl = new AbortController();

  try {
    const res = await fetch(`${FIXTURE_DIR}/${encodeURIComponent(fixtureId)}.json`, {
      signal: abortCtl.signal,
    });
    if (!res.ok) throw new Error(`fixture HTTP ${res.status}`);
    const fixture = await res.json();

    if (Array.isArray(fixture.events)) {
      // Deterministic AG-UI event sequence (optionally paced).
      for (const event of fixture.events) {
        if (abortCtl.signal.aborted) break;
        onDirectEvent(event);
        await new Promise((r) => setTimeout(r, 0));
      }
    } else if (Array.isArray(fixture.chunks) && fixture.format === "sse") {
      const adapter = createSseAdapter({
        reducer,
        onEvent: onAdapterEvent,
      });
      for (const chunk of fixture.chunks) {
        if (abortCtl.signal.aborted) break;
        adapter.push(typeof chunk === "string" ? chunk : String(chunk));
      }
      adapter.flush();
      syncLangFromReducer();
    } else if (fixture.format === "ndjson") {
      const body =
        typeof fixture.raw === "string"
          ? fixture.raw
          : buildNdjsonReplay({
              runId: fixture.runId || "r1",
              messageId: fixture.messageId || "m1",
              content: fixture.content || "",
              tools: fixture.tools,
            });
      const adapter = createNdjsonAdapter({
        reducer,
        onEvent: onAdapterEvent,
        runId: fixture.runId || "r1",
        messageId: fixture.messageId || "m1",
      });
      adapter.push(body);
      adapter.flush();
      syncLangFromReducer();
    } else {
      throw new Error("unsupported fixture shape");
    }

    const summary = summarizeState(reducer.getState());
    setStatus(
      `Fixture ${fixtureId} done — runStatus=${summary.runStatus}, messages=${summary.messages}`,
      { ready: true },
    );
  } catch (err) {
    if (err && /** @type {any} */ (err).name === "AbortError") {
      setStatus("Cancelled.", { ready: true });
    } else {
      labErrors.push(sanitize(err));
      setStatus(`Replay failed: ${sanitize(err)}`, { error: true });
      paintDebug();
    }
  } finally {
    setBusy(false);
    abortCtl = null;
  }
}

async function startLive() {
  resetLab();
  setBusy(true);
  setStatus("Starting live stream…");
  abortCtl = new AbortController();

  const format = els.format?.value === "sse" ? "sse" : "ndjson";
  const provider = els.provider?.value || "fake";
  const prompt = (els.prompt?.value || "").trim() || "Show a hello TextContent";
  const runId = `lab-${Date.now()}`;

  /** @type {Record<string, unknown>} */
  const body = {
    runId,
    messages: [{ role: "user", content: prompt }],
    libraryId: "dashboard",
    libraryVersion: "1",
    format,
    provider,
  };
  if (provider === "fixture") {
    body.fixtureId = els.fixture?.value || "lab-canvas-textcontent";
  }
  if (programSource) {
    body.existingProgram = programSource;
  }

  try {
    await ensureCsrf();
    const res = await fetch("/api/chat.php", {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
      signal: abortCtl.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`chat HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const consumeOpts = {
      reducer,
      onEvent: onAdapterEvent,
      runId,
    };

    if (format === "sse") {
      await consumeSseResponse(res, consumeOpts);
    } else {
      await consumeNdjsonResponse(res, consumeOpts);
    }
    syncLangFromReducer();
    setStatus(`Live stream finished (${provider}/${format}).`, { ready: true });
  } catch (err) {
    if (err && /** @type {any} */ (err).name === "AbortError") {
      reducer.dispatch({ type: EventType.RUN_CANCELLED });
      setStatus("Cancelled.", { ready: true });
    } else {
      labErrors.push(sanitize(err));
      setStatus(`Live failed: ${sanitize(err)}`, { error: true });
      paintDebug();
    }
  } finally {
    setBusy(false);
    abortCtl = null;
  }
}

async function applyPatch() {
  const patch = (els.patchSource?.value || "").trim();
  if (!patch) {
    setStatus("Patch source is empty.", { error: true });
    return;
  }
  try {
    const merged = mergeStatements(programSource || "", patch, "root");
    renderFromSource(merged, { streaming: false });

    // Optional persistence round-trip when we already have a program id, else save first.
    await ensureCsrf();
    if (!programId) {
      const saveRes = await fetch("/api/programs/save.php", {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          source: merged,
          libraryId: "dashboard",
          libraryVersion: "1",
        }),
      });
      if (saveRes.ok) {
        const data = await saveRes.json();
        programId = data.program?.id || data.id || null;
      }
    } else {
      await fetch("/api/programs/patch.php", {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ id: programId, source: patch }),
      });
    }
    setStatus(`Patch applied${programId ? ` (program ${programId})` : ""}.`, {
      ready: true,
    });
  } catch (err) {
    labErrors.push(sanitize(err));
    setStatus(`Patch failed: ${sanitize(err)}`, { error: true });
    paintDebug();
  }
}

async function callTool(tool, args) {
  try {
    await ensureCsrf();
    const res = await fetch("/api/tools.php", {
      method: "POST",
      headers: await authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        tool,
        arguments: args,
        idempotencyKey: `lab-${tool}-${Date.now()}`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    lastQuerySnapshot = {
      ...lastQuerySnapshot,
      lastTool: { tool, status: res.status, data },
    };
    if (els.toolOut) {
      els.toolOut.textContent = JSON.stringify(data, null, 2);
    }
    paintDebug();
    setStatus(`Tool ${tool}: HTTP ${res.status}`, { ready: res.ok, error: !res.ok });
  } catch (err) {
    labErrors.push(sanitize(err));
    setStatus(`Tool failed: ${sanitize(err)}`, { error: true });
    paintDebug();
  }
}

function fillFixtureSelect() {
  if (!els.fixture) return;
  els.fixture.innerHTML = "";
  for (const id of FIXTURE_IDS) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    if (id === "lab-canvas-textcontent") opt.selected = true;
    els.fixture.appendChild(opt);
  }
}

async function boot() {
  fillFixtureSelect();
  setStatus("Loading library…");

  try {
    const libRes = await fetch(LIBRARY_URL);
    if (!libRes.ok) throw new Error(`library HTTP ${libRes.status}`);
    const libText = await libRes.text();
    library = loadLibraryJson(libText);
    schema = libraryToJsonSchema(library);
    // Ensure TextContent is usable as root for FakeProvider / lab fixtures.
    if (schema.$defs && !schema.$defs.TextContent && library.components?.TextContent) {
      /* libraryToJsonSchema already maps components */
    }
    streamingParser = createStreamingParser(schema, library.root || "Stack");

    els.replay?.addEventListener("click", () => {
      const id = els.fixture?.value || "lab-canvas-textcontent";
      void replayFixture(id);
    });
    els.cancel?.addEventListener("click", () => {
      if (abortCtl) abortCtl.abort();
      reducer.dispatch({ type: EventType.RUN_CANCELLED });
      setBusy(false);
      setStatus("Cancel requested.", { ready: true });
      paintDebug();
    });
    els.reset?.addEventListener("click", () => resetLab());
    els.start?.addEventListener("click", () => void startLive());
    els.patch?.addEventListener("click", () => void applyPatch());

    document.getElementById("lab-tool-echo")?.addEventListener("click", () => {
      void callTool("echo_read", { message: "lab-echo" });
    });
    document.getElementById("lab-tool-note-get")?.addEventListener("click", () => {
      void callTool("note_get", { key: "lab" });
    });
    document.getElementById("lab-tool-note-set")?.addEventListener("click", () => {
      void callTool("note_set", { key: "lab", value: "from-a7-lab" });
    });

    // Prove reducer import is live (offline unit of work without stream).
    reduceEvents([]);

    setStatus("Ready — pick a fixture or start a live stream.", { ready: true });
    paintDebug();
  } catch (err) {
    setStatus(`Boot failed: ${sanitize(err)}`, { error: true });
    labErrors.push(sanitize(err));
    paintDebug();
  }
}

void boot();
