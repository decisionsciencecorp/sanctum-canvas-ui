/**
 * A9.3 — Guided walkthrough shell (wizard chrome).
 *
 * Drives the story in walkthrough-script.js through the real renderer:
 * component registry, reconciler, reactive store, bindings, and the
 * `ctx.actions.run` hook that Buttons / Forms / FollowUps call.
 * Everything in this file is lab chrome — outside #sanctum-canvas-root.
 */
import { createComponentRegistry } from "../assets/js/renderer/registry.js";
import { createRenderContext } from "../assets/js/renderer/context.js";
import { render } from "../assets/js/renderer/reconciler.js";
import { createStore } from "../assets/js/runtime/store.js";
import { createBindingManager } from "../assets/js/runtime/bindings.js";
import { registerAllComponents } from "../assets/js/host/mount.js";
import * as urlPolicy from "../assets/js/security/urlPolicy.js";
import { STEPS, composeCanvas, initialState } from "./walkthrough-script.js";

const $ = (sel) => document.querySelector(sel);

const root = $("#sanctum-canvas-root");
const chatEl = $("#wt-chat");
const els = {
  counter: $("#wt-counter"),
  actor: $("#wt-actor"),
  title: $("#wt-title"),
  says: $("#wt-says"),
  why: $("#wt-why"),
  whyWrap: $("#wt-why-wrap"),
  links: $("#wt-links"),
  linksWrap: $("#wt-links-wrap"),
  comps: $("#wt-components"),
  compsWrap: $("#wt-components-wrap"),
  program: $("#wt-program"),
  programWrap: $("#wt-program-wrap"),
  hint: $("#wt-hint"),
  progress: $("#wt-progress"),
  progressBar: $("#wt-progress-bar"),
  dots: $("#wt-dots"),
  back: $("#wt-back"),
  next: $("#wt-next"),
  auto: $("#wt-auto"),
  restart: $("#wt-restart"),
  status: $("#wt-status"),
  narration: $("#wt-narration"),
};

/* ---------- renderer wiring (same pieces the host uses) ---------- */

const registry = createComponentRegistry();
registerAllComponents(registry);
const store = createStore({});
const bindings = createBindingManager(store);

const ctx = createRenderContext({
  document,
  registry,
  urlPolicy,
  bindings,
  state: store,
  stream: { isStreaming: false },
  reportError(err) {
    console.warn("[walkthrough] renderer error", err);
  },
});

/* ---------- story state ---------- */

let state = initialState();
let idx = -1;
let autoplay = false;
let effectToken = 0;
let pendingInteraction = false;
let busy = false;

const api = {
  rerender() {
    render(root, composeCanvas(state, api), ctx);
  },
  chat(role, text) {
    const last = chatEl.lastElementChild;
    if (last && last.dataset.role === role && last.textContent === text) return;
    const b = document.createElement("div");
    b.className = `wt-bubble wt-bubble--${role}`;
    b.dataset.role = role;
    b.textContent = text;
    chatEl.appendChild(b);
    chatEl.scrollTop = chatEl.scrollHeight;
  },
  setStreaming(on) {
    ctx.stream = { isStreaming: !!on };
    els.status.textContent = on ? "streaming…" : "";
  },
  cancelled() {
    return api._token !== effectToken;
  },
  _token: 0,
};

/* Buttons / Form submit / FollowUps all land here. */
ctx.actions = {
  async run(plan, opts = {}) {
    const step = STEPS[idx];
    const first = plan?.steps?.[0];
    if (first?.type === "continue_conversation") {
      return handleContinue(String(first.message || ""));
    }
    if (step && typeof step.onAction === "function") {
      const handled = await step.onAction(state, api, plan);
      if (handled) {
        pendingInteraction = false;
        updateHint();
        return { ok: true };
      }
    }
    api.chat("assistant", `(demo) The "${first?.name ?? first?.type ?? "action"}" action is not part of this story.`);
    return { ok: true, reason: "demo-unhandled" };
  },
};
ctx.continueConversation = (message) => {
  void handleContinue(String(message || ""));
};

async function handleContinue(message) {
  const step = STEPS[idx];
  if (step && typeof step.onContinue === "function") {
    const handled = await step.onContinue(state, api, message);
    if (handled) {
      pendingInteraction = false;
      updateHint();
      return { ok: true };
    }
  }
  api.chat("user", message);
  api.chat("assistant", "(demo) That question is not scripted in this walkthrough.");
  return { ok: true, reason: "demo-unhandled" };
}

/* ---------- navigation ---------- */

function stepIndexFromQuery() {
  const q = new URLSearchParams(location.search).get("step");
  if (!q) return 0;
  const n = Number(q);
  if (Number.isInteger(n) && n >= 1 && n <= STEPS.length) return n - 1;
  const byId = STEPS.findIndex((s) => s.id === q);
  return byId >= 0 ? byId : 0;
}

function writeQuery(i) {
  const url = new URL(location.href);
  url.searchParams.set("step", STEPS[i].id);
  history.replaceState(null, "", url);
}

/** Rebuild state + transcript for step i from the beginning (Back, deep link). */
function restoreTo(i) {
  state = initialState();
  chatEl.replaceChildren();
  for (let k = 0; k <= i; k += 1) STEPS[k].apply(state, api);
  api.setStreaming(false);
  api.rerender();
}

async function enter(i, { viaNext = false } = {}) {
  if (i < 0 || i >= STEPS.length) return;
  effectToken += 1;
  api._token = effectToken;
  const myToken = effectToken;
  const step = STEPS[i];
  idx = i;
  pendingInteraction = false;

  if (viaNext) {
    step.apply(state, api);
    if (typeof step.prepareForAuto === "function") step.prepareForAuto(state);
    api.rerender();
  } else {
    restoreTo(i);
  }

  paintNarration(step, i);
  writeQuery(i);

  if (viaNext && step.waitFor && !autoplay) {
    pendingInteraction = true;
    updateHint();
    scrollCanvasToNewest();
    return;
  }

  if (viaNext && typeof step.effect === "function") {
    busy = true;
    setControls();
    try {
      await step.effect(state, api);
    } finally {
      if (myToken === effectToken) {
        busy = false;
        setControls();
      }
    }
  }
  scrollCanvasToNewest();
}

async function next() {
  if (idx >= STEPS.length - 1) {
    stopAuto();
    return;
  }
  const step = STEPS[idx];
  if (pendingInteraction && step && typeof step.effect === "function") {
    // User pressed Next instead of clicking on the canvas: do it for them.
    pendingInteraction = false;
    updateHint();
    busy = true;
    setControls();
    try {
      await step.effect(state, api);
    } finally {
      busy = false;
      setControls();
    }
    return;
  }
  await enter(idx + 1, { viaNext: true });
}

async function back() {
  stopAuto();
  if (idx <= 0) return;
  await enter(idx - 1);
}

async function restart() {
  stopAuto();
  await enter(0);
}

/* ---------- autoplay ---------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readingPause(step) {
  const words = step.says.join(" ").split(/\s+/).length;
  return Math.min(9000, 1800 + words * 55);
}

async function runAuto() {
  autoplay = true;
  setControls();
  while (autoplay && idx < STEPS.length - 1) {
    await next();
    if (!autoplay) break;
    await sleep(readingPause(STEPS[idx]));
  }
  stopAuto();
}

function stopAuto() {
  autoplay = false;
  setControls();
}

/* ---------- painting ---------- */

function paintNarration(step, i) {
  els.counter.textContent = `Step ${i + 1} of ${STEPS.length}`;
  els.actor.textContent = step.actor;
  els.actor.dataset.actor = step.actor.toLowerCase().replace(/[^a-z]+/g, "-");
  els.title.textContent = step.title;

  els.says.replaceChildren(
    ...step.says.map((t) => {
      const p = document.createElement("p");
      p.textContent = t;
      return p;
    }),
  );

  if (step.why) {
    els.why.textContent = step.why;
    els.whyWrap.hidden = false;
  } else {
    els.whyWrap.hidden = true;
  }

  if (step.links && step.links.length) {
    els.links.replaceChildren(
      ...step.links.map((l) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = l.href;
        a.textContent = l.label;
        li.appendChild(a);
        return li;
      }),
    );
    els.linksWrap.hidden = false;
  } else {
    els.linksWrap.hidden = true;
  }

  if (step.components && step.components.length) {
    els.comps.replaceChildren(
      ...step.components.map((c) => {
        const s = document.createElement("span");
        s.className = "wt-chip";
        s.textContent = c;
        return s;
      }),
    );
    els.compsWrap.hidden = false;
  } else {
    els.compsWrap.hidden = true;
  }

  if (step.program) {
    els.program.textContent = step.program;
    els.programWrap.hidden = false;
  } else {
    els.programWrap.hidden = true;
  }

  const pct = ((i + 1) / STEPS.length) * 100;
  els.progressBar.style.width = `${pct}%`;
  els.progress.setAttribute("aria-valuenow", String(i + 1));

  for (const d of els.dots.children) {
    const k = Number(d.dataset.index);
    d.classList.toggle("is-current", k === i);
    d.classList.toggle("is-done", k < i);
    d.setAttribute("aria-current", k === i ? "step" : "false");
  }

  updateHint();
  setControls();
  els.narration.scrollTop = 0;
  document.body.dataset.step = step.id;
}

function updateHint() {
  const step = STEPS[idx];
  if (pendingInteraction && step?.waitFor) {
    els.hint.textContent = step.waitFor.hint + " Or press Next and I'll do it.";
    els.hint.hidden = false;
  } else {
    els.hint.hidden = true;
    els.hint.textContent = "";
  }
}

function setControls() {
  els.back.disabled = idx <= 0 || busy;
  els.next.disabled = idx >= STEPS.length - 1 || busy;
  els.next.textContent = idx >= STEPS.length - 1 ? "Finished" : pendingInteraction ? "Do it for me" : "Next";
  els.auto.textContent = autoplay ? "Pause" : "Auto-play";
  els.auto.setAttribute("aria-pressed", autoplay ? "true" : "false");
  els.auto.disabled = idx >= STEPS.length - 1 && !autoplay;
}

function scrollCanvasToNewest() {
  // Scroll only the canvas pane. scrollIntoView walks every ancestor, including
  // the page itself, which pulls the guide column up and clips it.
  const frame = document.querySelector(".wt-canvas-frame");
  const last = root.firstElementChild?.lastElementChild;
  if (!frame || !last) return;
  const frameRect = frame.getBoundingClientRect();
  const lastRect = last.getBoundingClientRect();
  const pad = 16;
  if (lastRect.bottom > frameRect.bottom - pad) {
    frame.scrollTop += lastRect.bottom - frameRect.bottom + pad;
  } else if (lastRect.top < frameRect.top + pad) {
    frame.scrollTop += lastRect.top - frameRect.top - pad;
  }
}

function buildDots() {
  els.dots.replaceChildren(
    ...STEPS.map((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "wt-dot";
      b.dataset.index = String(i);
      b.title = `${i + 1}. ${s.title}`;
      b.setAttribute("aria-label", `Go to step ${i + 1}: ${s.title}`);
      b.addEventListener("click", () => {
        stopAuto();
        void enter(i);
      });
      return b;
    }),
  );
}

/* ---------- wiring ---------- */

els.back.addEventListener("click", () => void back());
els.next.addEventListener("click", () => {
  stopAuto();
  void next();
});
els.restart.addEventListener("click", () => void restart());
els.auto.addEventListener("click", () => {
  if (autoplay) stopAuto();
  else void runAuto();
});

document.addEventListener("keydown", (e) => {
  const t = e.target;
  const tag = t && t.tagName ? t.tagName.toLowerCase() : "";
  if (["input", "textarea", "select"].includes(tag) || t?.isContentEditable) return;
  if (root.contains(t) && tag === "button") return; // canvas buttons keep their keys
  if (e.key === "ArrowRight") {
    e.preventDefault();
    stopAuto();
    void next();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    void back();
  }
});

buildDots();
void enter(stepIndexFromQuery()).then(() => {
  const ready = $("#wt-ready");
  if (ready) ready.setAttribute("data-lab-ready", "1");
});
