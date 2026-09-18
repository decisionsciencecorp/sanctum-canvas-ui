# A8.5 prep — stream performance notes

**Status:** micro-bench only (A8.5 not closed). No named-URL soak yet.  
**Script:** `node tools/perf/stream-bench.mjs`  
**Host sample:** Termux/Otto workspace · 2026-09-18 · `--iterations 100`

## What is measured

| Mode | Path |
|------|------|
| `reduceEvents:*` | Replay `tests/fixtures/stream/*.json` AG-UI event arrays through the canonical reducer |
| `sseReplay:*` | Push SSE `chunks` through `createSseAdapter` + `flush` |

This is **CPU-only** fixture replay (no PHP, no network, no DOM). First progressive paint / DOM churn budgets land later with Playwright on the review URL.

## Sample results (100 iterations · 6 fixtures)

| Benchmark | per-iter (ms) |
|-----------|--------------:|
| `sseReplay:sse-chunk-split-text` | ~0.08 |
| `reduceEvents:interrupted-run-error` | ~0.04 |
| `reduceEvents:text-message-basic` | ~0.04 |
| Other `reduceEvents:*` fixtures | ≤ ~0.01 |

Median per-iter ≈ **0.04 ms**; max ≈ **0.08 ms** on this sample run (varies by host load).

## Soft budgets (CI / A8.5)

| Gate | Budget | Rationale |
|------|--------|-----------|
| Warn | **5 ms** / iteration | Leaves headroom vs current ~0.06 ms max |
| Fail | **25 ms** / iteration | Catches accidental O(n²) or huge fixture regressions |

Tighten after a named-URL soak records first-paint and update-tick numbers (Doc #1379 §11.2 Performance).

## How to re-run

```bash
node tools/perf/stream-bench.mjs
node tools/perf/stream-bench.mjs --iterations 500
```

Stdout is JSON (paste or redirect into evidence when A8.5 closes).

## Not yet covered (leave open)

- DOM reconcile cost under streaming partial trees
- Memory / timer disposal under query refresh
- Live Venice/fake stream on the A7.8 review URL
- Mobile vs desktop first interactive paint
