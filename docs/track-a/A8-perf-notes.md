# A8.5 — Progressive render / stream performance budgets

**Date:** 2026-09-18  
**Task:** [#4173](https://tasks.decisionsciencecorp.com/admin/view.php?id=4173)  
**Script:** `node tools/perf/stream-bench.mjs` (`npm run perf:stream`)  
**Host sample:** Termux/Otto workspace · 2026-09-18 · `--iterations 100 --dispose-cycles 200`

## What is measured

| Mode | Path |
|------|------|
| `reduceEvents:*` | Replay `tests/fixtures/stream/*.json` AG-UI event arrays through the canonical reducer |
| `sseReplay:*` | Push SSE `chunks` through `createSseAdapter` + `flush` |
| **Disposal soak** | Create `lifecycleOwner` + store subscribe + timeout + abort + query/mutation managers → `dispose()`; assert counters return to **0** every cycle |
| **SSE cancel soak** | Create adapters, push fixtures, `cancel()` — no accumulation across cycles |

This remains **CPU-only** fixture replay (no PHP, no network). DOM reconcile / first-paint on the named URL is still operator-judged via A8.4 screenshots; pathological stream CPU is gated here.

## Sample results (100 iterations · 6 fixtures · 200 dispose cycles)

| Benchmark | per-iter / per-cycle |
|-----------|---------------------:|
| `sseReplay:sse-chunk-split-text` | ~0.08 ms |
| `reduceEvents:interrupted-run-error` | ~0.05 ms |
| Other `reduceEvents:*` | ≤ ~0.01 ms |
| Lifecycle dispose cycle | ~0.13 ms |
| Peak mid-cycle (listeners / timers / controllers) | 3 / 1 / 1 |
| **Final counters after each dispose** | **0 / 0 / 0** |
| `leakDetected` | **false** |
| `budgetStatus` | **ok** |

## Soft budgets (CI / A8.5)

| Gate | Budget | Rationale |
|------|--------|-----------|
| Warn | **5 ms** / fixture iteration | Headroom vs ~0.08 ms max |
| Fail | **25 ms** / fixture iteration | Catches O(n²) / huge fixture regressions |
| Dispose warn | **2 ms** / cycle | Headroom vs ~0.13 ms |
| Dispose fail | **10 ms** / cycle | Pathological cleanup |
| Disposal | **must end at zero** listeners/timers/controllers | Leak gate |

## Lifecycle tests (prove disposal does not leak)

```bash
node --test tests/browser/bindings.lifecycle.test.js \
  tests/browser/renderer.lifecycle.test.js \
  tests/browser/queryManager.test.js \
  tests/browser/mutations.test.js
# → 37 pass / 0 fail (includes dispose clears listeners, abort in-flight,
#    StrictMode re-attach timer, nested destroy accounting)
```

`stream-bench.mjs` repeats the same zero-counter invariant for **200** create/dispose cycles and exits **2** on leak.

## How to re-run

```bash
node tools/perf/stream-bench.mjs
node tools/perf/stream-bench.mjs --iterations 500 --dispose-cycles 500
npm run perf:stream
```

Stdout is JSON (`budgetStatus`: `ok` | `warn` | `fail`).

## Still out of scope (acceptable for A8.5 close)

- Live Venice stream soak on production inference
- DOM node churn counters under Playwright (operator visual via A8.4)
- Heap snapshots across browser navigations

Those can tighten budgets later without reopening the disposal / fixture CPU gates above.
