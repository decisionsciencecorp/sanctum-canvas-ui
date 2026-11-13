/**
 * Deep Research SMCP twin — polls lab-control and paints #sanctum-canvas-root.
 * Lab-only; Track B must not import this file.
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

const SURFACE = "deep-research";
const LAB_AUTH = "canvas-lab-dev";
const LIBRARY_URL = "/assets/libraries/dashboard/library.v1.json";
const POLL_MS = 750;

const els = {
  status: document.getElementById("lab-status"),
  canvas: document.getElementById("sanctum-canvas-root"),
  rev: document.getElementById("dr-rev"),
  action: document.getElementById("dr-action"),
  title: document.getElementById("dr-title"),
  updated: document.getElementById("dr-updated"),
  lastSubmit: document.getElementById("dr-last-submit"),
  debugLang: document.getElementById("debug-lang"),
  debugErrors: document.getElementById("debug-errors"),
};

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
/** @type {any[]} */
let labErrors = [];

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
  continueConversation(msg, meta) {
    void postSubmit({
      text: typeof msg === "string" ? msg : JSON.stringify(msg),
      form_id: meta && typeof meta === "object" ? meta.formId || meta.form_id : null,
      values: meta && typeof meta === "object" ? meta.values || {} : {},
      labels: meta && typeof meta === "object" ? meta.labels || {} : {},
    });
  },
});

/** @type {any} */
let library = null;
/** @type {any} */
let schema = null;
/** @type {ReturnType<typeof createStreamingParser> | null} */
let streamingParser = null;
let lastRev = -1;
let programSource = "";

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
  if (els.debugLang) els.debugLang.textContent = programSource || "(empty)";
  if (els.debugErrors) {
    const parseErrs = streamingParser?.getResult?.()?.meta?.errors || [];
    els.debugErrors.textContent = JSON.stringify({ lab: labErrors, parse: parseErrs }, null, 2);
  }
}

function clearCanvas() {
  programSource = "";
  labErrors = [];
  if (els.canvas) {
    while (els.canvas.firstChild) els.canvas.removeChild(els.canvas.firstChild);
    const empty = document.createElement("p");
    empty.className = "a7-lab-empty";
    empty.id = "lab-canvas-empty";
    empty.textContent = "Canvas cleared. Waiting for next SMCP paint…";
    els.canvas.appendChild(empty);
  }
  paintDebug();
}

function renderFromSource(source) {
  programSource = source || "";
  ctx.stream = { isStreaming: false };
  if (!streamingParser || !schema) {
    paintDebug();
    return;
  }
  streamingParser = createStreamingParser(schema, library.root || "Stack");
  const result = streamingParser.push(programSource);
  if (result.root && els.canvas) {
    const vnode = elementToVnode(result.root);
    if (vnode) {
      safeRender(els.canvas, vnode, ctx);
    }
  } else if (!programSource.trim()) {
    clearCanvas();
    return;
  }
  paintDebug();
}

function applyState(state) {
  if (els.rev) els.rev.textContent = String(state.rev ?? 0);
  if (els.action) els.action.textContent = String(state.action ?? "idle");
  if (els.title) els.title.textContent = state.title || "(none)";
  if (els.updated) els.updated.textContent = state.updated_at || "—";
  if (els.lastSubmit) {
    els.lastSubmit.textContent = state.last_submit
      ? JSON.stringify(state.last_submit, null, 2)
      : "(none yet)";
  }

  const rev = Number(state.rev || 0);
  if (rev === lastRev) return;
  lastRev = rev;

  if (state.action === "clear" || !state.lang_source) {
    clearCanvas();
    setStatus(`Rev ${rev}: cleared / idle.`, { ready: true });
    return;
  }

  renderFromSource(String(state.lang_source));
  setStatus(`Rev ${rev}: painted${state.title ? ` — ${state.title}` : ""}.`, { ready: true });
}

async function poll() {
  try {
    const url = `/api/lab-control.php?surface=${encodeURIComponent(SURFACE)}&since_rev=${lastRev < 0 ? 0 : lastRev}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "X-Canvas-Auth": LAB_AUTH },
    });
    if (!res.ok) {
      throw new Error(`lab-control HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data && data.state) {
      applyState(data.state);
    }
  } catch (err) {
    setStatus(`Poll error: ${sanitize(err)}`, { error: true });
  }
}

async function postSubmit(submit) {
  try {
    const res = await fetch("/api/lab-control.php", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Canvas-Auth": LAB_AUTH,
      },
      body: JSON.stringify({
        action: "record_submit",
        surface: SURFACE,
        submit,
      }),
    });
    if (!res.ok) throw new Error(`record_submit HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.state) applyState(data.state);
  } catch (err) {
    labErrors.push(sanitize(err));
    paintDebug();
  }
}

async function boot() {
  setStatus("Loading library…");
  try {
    library = await loadLibraryJson(LIBRARY_URL);
    schema = libraryToJsonSchema(library);
    streamingParser = createStreamingParser(schema, library.root || "Stack");
    setStatus("Listening for SMCP paint…", { ready: true });
    await poll();
    setInterval(poll, POLL_MS);
  } catch (err) {
    setStatus(`Boot failed: ${sanitize(err)}`, { error: true });
  }
}

boot();
