#!/usr/bin/env node
/**
 * A8.5 — stream fixture micro-bench + disposal soak.
 *
 * Replays AG-UI event fixtures (and optional SSE chunk streams) through the
 * canonical reducer / SSE adapter. Also proves create→dispose cycles do not
 * accumulate tracked listeners/timers/controllers.
 *
 * Usage:
 *   node tools/perf/stream-bench.mjs
 *   node tools/perf/stream-bench.mjs --iterations 200
 *   node tools/perf/stream-bench.mjs --dispose-cycles 500
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  reduceEvents,
  createSseAdapter,
} from "../../src/Browser/transport/index.js";
import { createLifecycleOwner } from "../../public/assets/js/runtime/lifecycle.js";
import { createStore } from "../../public/assets/js/runtime/store.js";
import { createQueryManager } from "../../public/assets/js/runtime/queryManager.js";
import { createMutationManager } from "../../public/assets/js/runtime/mutations.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");
const fixtureDir = join(root, "tests/fixtures/stream");

const args = process.argv.slice(2);
let iterations = 100;
let disposeCycles = 200;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--iterations" && args[i + 1]) {
    iterations = Math.max(1, Number(args[++i]) || 100);
  }
  if (args[i] === "--dispose-cycles" && args[i + 1]) {
    disposeCycles = Math.max(1, Number(args[++i]) || 200);
  }
}

function loadFixtures() {
  return readdirSync(fixtureDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const data = JSON.parse(readFileSync(join(fixtureDir, f), "utf8"));
      return { file: f, ...data };
    });
}

function bench(name, fn, n) {
  for (let i = 0; i < Math.min(5, n); i++) fn();
  const t0 = performance.now();
  for (let i = 0; i < n; i++) fn();
  const ms = performance.now() - t0;
  return {
    name,
    iterations: n,
    totalMs: Number(ms.toFixed(3)),
    perIterMs: Number((ms / n).toFixed(4)),
  };
}

const fixtures = loadFixtures();
const eventFixtures = fixtures.filter((f) => Array.isArray(f.events));
const sseFixtures = fixtures.filter((f) => Array.isArray(f.chunks));

const results = [];

for (const fix of eventFixtures) {
  results.push(
    bench(
      `reduceEvents:${fix.id || fix.file}`,
      () => reduceEvents(fix.events),
      iterations,
    ),
  );
}

for (const fix of sseFixtures) {
  results.push(
    bench(
      `sseReplay:${fix.id || fix.file}`,
      () => {
        const adapter = createSseAdapter({ maxBufferBytes: 256 * 1024 });
        for (const chunk of fix.chunks) adapter.push(chunk);
        adapter.flush();
      },
      iterations,
    ),
  );
}

// Disposal soak — lifecycle + query/mutation managers must return to zero.
let peakListeners = 0;
let peakTimers = 0;
let peakControllers = 0;
const disposeT0 = performance.now();
for (let i = 0; i < disposeCycles; i++) {
  const life = createLifecycleOwner();
  const store = createStore();
  store.initialize({ $n: i }, {});
  life.track(store.subscribe(() => {}));
  life.setTimeoutTracked(() => {}, 60_000);
  life.trackAbortController();
  const qm = createQueryManager({ callTool: async () => ({ ok: true }) });
  const mm = createMutationManager({ callTool: async () => ({ ok: true }) });
  life.track(() => qm.dispose?.());
  life.track(() => mm.dispose());
  const mid = life.snapshot();
  peakListeners = Math.max(peakListeners, mid.listeners);
  peakTimers = Math.max(peakTimers, mid.timers);
  peakControllers = Math.max(peakControllers, mid.controllers);
  life.dispose();
  store.dispose?.();
  const after = life.snapshot();
  if (after.listeners !== 0 || after.timers !== 0 || after.controllers !== 0) {
    console.error(
      JSON.stringify({
        error: "disposal_leak",
        cycle: i,
        after,
      }),
    );
    process.exit(2);
  }
}
const disposeMs = performance.now() - disposeT0;

const sseDisposeT0 = performance.now();
for (let i = 0; i < disposeCycles; i++) {
  const adapter = createSseAdapter({ maxBufferBytes: 64 * 1024 });
  for (const fix of sseFixtures) {
    for (const chunk of fix.chunks) adapter.push(chunk);
  }
  if (typeof adapter.cancel === "function") adapter.cancel();
  else if (typeof adapter.close === "function") adapter.close();
}
const sseDisposeMs = performance.now() - sseDisposeT0;

const perIters = results.map((r) => r.perIterMs).sort((a, b) => a - b);
const maxPer = perIters[perIters.length - 1] ?? 0;
const medianPer = perIters[Math.floor(perIters.length / 2)] ?? 0;

const report = {
  generatedAt: new Date().toISOString(),
  iterations,
  fixtureCount: results.length,
  results,
  disposal: {
    cycles: disposeCycles,
    lifecycleOwnerMs: Number(disposeMs.toFixed(3)),
    perCycleMs: Number((disposeMs / disposeCycles).toFixed(4)),
    peakDuringCycle: {
      listeners: peakListeners,
      timers: peakTimers,
      controllers: peakControllers,
    },
    finalCounters: { listeners: 0, timers: 0, controllers: 0 },
    leakDetected: false,
    sseReplayCycles: disposeCycles,
    sseReplayDisposeMs: Number(sseDisposeMs.toFixed(3)),
  },
  budgets: {
    note: "A8.5 soft budgets — CI gates for fixture replay + disposal soak.",
    medianPerIterMs: Number(medianPer.toFixed(4)),
    maxPerIterMs: Number(maxPer.toFixed(4)),
    ciWarnPerIterMs: 5,
    ciFailPerIterMs: 25,
    disposeCycleWarnMs: 2,
    disposeCycleFailMs: 10,
    disposeMustEndAtZero: true,
  },
};

const disposePer = report.disposal.perCycleMs;
if (disposePer > report.budgets.disposeCycleFailMs || maxPer > report.budgets.ciFailPerIterMs) {
  report.budgetStatus = "fail";
} else if (
  disposePer > report.budgets.disposeCycleWarnMs ||
  maxPer > report.budgets.ciWarnPerIterMs
) {
  report.budgetStatus = "warn";
} else {
  report.budgetStatus = "ok";
}

console.log(JSON.stringify(report, null, 2));
if (report.budgetStatus === "fail") process.exit(1);
