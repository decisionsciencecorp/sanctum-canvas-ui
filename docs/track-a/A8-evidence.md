# A8 evidence — Track A stop line (parity + Track B handoff)

**Date:** 2026-09-18  
**Phase parent:** [#4090](https://tasks.decisionsciencecorp.com/admin/view.php?id=4090)  
**Epic:** [#4081](https://tasks.decisionsciencecorp.com/admin/view.php?id=4081)  
**Repo:** `decisionsciencecorp/sanctum-canvas-ui`  
**Commit:** *A8: freeze Track B mount contract and publish handoff* (see `git log -1` on `main`)

## Named URL (what a human can review)

| | |
|--|--|
| **Review URL** | **https://canvas-lab.decisionsciencecorp.com/stream.php** |
| What you see | Standalone Sanctum Canvas laboratory: fixture replay, live prompt, tools, debug panes **outside** `#sanctum-canvas-root`. |
| Track B mount | Empty root lease + `src/Browser/host/mount.js` (`canvas-host-v1`) — no lab chrome imported. |

## Slice results

| Slice | Task | Result | Evidence |
|-------|------|--------|----------|
| A8.1 | #4169 | **GREEN** | `docs/track-a/A8.1-evidence.md` — browser suite + core 100% |
| A8.2 | #4170 | **GREEN** | `docs/track-a/A8-parity-checklist.md` — registry vs Doc #1380 |
| A8.3 | #4171 | **GREEN** | `docs/track-a/A8.3-evidence.md` — `npm run test:security` 74/74 |
| A8.4 | #4172 | **GREEN** | Named-URL a11y captures under `docs/track-a/screenshots/a8-a11y/` (+ A5/A6 visual parity) |
| A8.5 | #4173 | **GREEN** | Soft budgets + bench in `docs/track-a/A8-perf-notes.md` / `tools/perf/stream-bench.mjs` |
| A8.6 | #4174 | **GREEN** | `src/Browser/host/mount.js` + `tests/browser/host.mount.test.js` + `mount-contract.md` |
| A8.7 | #4175 | **GREEN** | `track-b-handoff-contract.md` **frozen** + `tests/fixtures/handoff/*` |
| A8.8 | #4176 | **GREEN** | This file + operator guide + Doc #907 / #1378 program notes |

## A8.6 mount proof

```bash
node --test tests/browser/host.mount.test.js
# 5 pass — negotiate, mount+stream+remount, adapter lease, contract reject, no lab imports
```

API: `mount(canvasElement, options)` · `sanctumCanvasMount(ctx)` · `createRendererAdapter()` · contract token **`canvas-host-v1`**.

## A8.7 handoff corpus

| Fixture | Role |
|---------|------|
| `version-negotiation.json` | Accept v1 / reject v2 |
| `canvas-initiation.json` | Normalized initiation |
| `ag-ui-text-run.json` / `ag-ui-tool-lifecycle.json` | Event sequences |
| `continue-conversation.json` / `open-url-callback.json` | Host callbacks |
| `tool-dispatch-boundary.json` / `cancel-and-errors.json` | Boundaries |
| `mount-lease-expectations.json` | No lab chrome |

Track B implements against these docs/fixtures **without** reading `old/`. Companion twin: `sanctum-companion-shell/contracts/canvas-host-v1/`.

## Operator guide (snippet)

1. Open **https://canvas-lab.decisionsciencecorp.com/stream.php**.  
2. Confirm status leaves “Booting…”, Fixture dropdown populated.  
3. Replay `lab-canvas-textcontent` → canvas shows **Hello from lab fixture**.  
4. For Track B integration: register `createRendererAdapter({ libraryUrl })` on `SanctumCompanion.canvas`, mount into `#sanctum-canvas-root`, feed AG-UI events via `handle.dispatchEvent` or SSE.  
5. **Do not** import lab controllers into the companion.  
6. Full contracts: [`mount-contract.md`](./mount-contract.md) · [`track-b-handoff-contract.md`](./track-b-handoff-contract.md).

## Merge gate

Track A handoff is **frozen**. Comment filed on Merge epic [#4100](https://tasks.decisionsciencecorp.com/admin/view.php?id=4100): **do not execute Merge** from this freeze alone — wait for Track B final gate + explicit Merge start.

## Status gate

| Gate | Result |
|------|--------|
| Named URL reviewable | **Yes** |
| A8.1–A8.5 audits | **GREEN** (sibling evidence) |
| A8.6 mount + remount fixture | **GREEN** |
| A8.7 event/action contract + fixtures | **GREEN** |
| A8.8 operator / program notes | **GREEN** |
| Track B can mount without lab chrome | **Yes** |
| **Track A complete** | **GREEN** |

---

**GREEN — Track A complete.**
