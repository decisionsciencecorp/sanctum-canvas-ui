#!/usr/bin/env node
/**
 * A8.5 prep — stream fixture micro-bench.
 *
 * Replays AG-UI event fixtures (and optional SSE chunk streams) through the
 * canonical reducer / SSE adapter. Prints JSON budgets for A8-perf-notes.md.
 *
 * Usage:
 *   node tools/perf/stream-bench.mjs
 *   node tools/perf/stream-bench.mjs --iterations 200
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  reduceEvents,
  createSseAdapter,
} from "../../src/Browser/transport/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");
const fixtureDir = join(root, "tests/fixtures/stream");

const args = process.argv.slice(2);
let iterations = 100;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--iterations" && args[i + 1]) {
    iterations = Math.max(1, Number(args[++i]) || 100);
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
  // Warmup
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

// Aggregate budget signal: p95-ish via max of per-iter means (micro-bench).
const perIters = results.map((r) => r.perIterMs).sort((a, b) => a - b);
const maxPer = perIters[perIters.length - 1] ?? 0;
const medianPer = perIters[Math.floor(perIters.length / 2)] ?? 0;

const report = {
  generatedAt: new Date().toISOString(),
  iterations,
  fixtureCount: results.length,
  results,
  budgetsSuggested: {
    note: "Soft budgets for A8.5 — tighten after named-URL soak.",
    medianPerIterMs: Number(medianPer.toFixed(4)),
    maxPerIterMs: Number(maxPer.toFixed(4)),
    // Gate: a single fixture replay iteration should stay under these in CI.
    ciWarnPerIterMs: 5,
    ciFailPerIterMs: 25,
  },
};

console.log(JSON.stringify(report, null, 2));
