# Track A operator guide (A8.8)

Short runbook for humans and Track B / Merge. Detail lives in phase evidence and contracts.

## Review URLs

| Page | URL | What it is |
|------|-----|-----------|
| **Home** | **https://canvas-lab.decisionsciencecorp.com/** | Tile dashboard — pick what to look at (A9.2) |
| **Guided walkthrough** | **https://canvas-lab.decisionsciencecorp.com/walkthrough.php** | 18-step scripted story; every component family used in context; Next / Back / Auto-play; `?step=<id>` deep links (A9.3–A9.5) |
| Stream lab | **https://canvas-lab.decisionsciencecorp.com/stream.php** | Fixture replay, canned live prompt, fake tools, debug panes (A7.7) |
| Galleries | `/lab/a5-foundation.html`, `/lab/a6-library.html`, … | One static sample per component |

Lab chrome on every page is **outside** `#sanctum-canvas-root` so Track B never imports it.

### Smoke checklist

1. Page loads over HTTPS; status is not stuck on Booting.  
2. Fixture `lab-canvas-textcontent` → **Replay fixture** → canvas text **Hello from lab fixture**.  
3. Optional: Start with fake provider; Cancel / Reset; tool buttons.  
4. Mobile ~390×844 and desktop ~1280×800 both usable (lab chrome is dense by design).

## Repository

| Item | Value |
|------|--------|
| Repo | [decisionsciencecorp/sanctum-canvas-ui](https://github.com/decisionsciencecorp/sanctum-canvas-ui) |
| Upstream pin | `old/` @ `ee54f66` |
| Runtime | PHP host + browser ES modules under `src/Browser/` → `public/assets/js/` |
| Tests | `npm test` (PHPUnit + browser + security) |

## Visible capabilities (lab)

- Stream AG-UI SSE / NDJSON into Lang → keyed DOM render  
- Dashboard / chat component libraries (registered surface — see Doc #1380 checklist)  
- Allowlisted PHP tools + CSRF (`/api/tools.php`)  
- Program persistence endpoints (scoped)  
- CSP: `script-src 'self'` (see `docs/track-a/csp.md`)

## Track B mount (no lab)

```js
import { createRendererAdapter } from "/assets/js/host/mount.js";

await SanctumCompanion.canvas.registerRenderer(
  createRendererAdapter({
    libraryUrl: "/assets/libraries/dashboard/library.v1.json",
  }),
);
await SanctumCompanion.canvas.mount();
// Feed events: lease handle from adapter, or host SSE → dispatchEvent
await SanctumCompanion.canvas.unmount("close");
```

Contracts:

- [`mount-contract.md`](./mount-contract.md) — DOM root + lifecycle  
- [`track-b-handoff-contract.md`](./track-b-handoff-contract.md) — AG-UI events, initiation, callbacks  
- Fixtures: `tests/fixtures/handoff/`  
- Companion: `sanctum-companion-shell/contracts/canvas-host-v1/`

## Security model (one line)

Partial/incomplete programs cannot run tools, OpenUrl, or ContinueConversation; PHP revalidates every tool name; URL policy is centralized (`H4`); credentials never leave the PHP host.

## Library / tool authoring

- Libraries: versioned JSON under `resources/libraries/{chat,dashboard}/` — `contractFormatVersion`, root, components map.  
- Tools: fixed PHP `ToolRegistry` handlers only — never model-selected callables.  
- Hardenings inventory: [`intentional-hardenings.md`](./intentional-hardenings.md).

## Known limitations

- Lab is not the companion chrome (Track B).  
- Merge into Broca fullscreen is a separate epic (#4100) — **do not start from Track A freeze alone**.  
- Inference credentials are host-only (Venice when configured).

## Program links

- Live architecture: [Doc #907](https://tasks.decisionsciencecorp.com/admin/doc.php?id=907)  
- Program ledger: [Doc #1378](https://tasks.decisionsciencecorp.com/admin/doc.php?id=1378)  
- Port plan / gates: Doc #1379 · #1380 · #1381  
- Phase stop: [`A8-evidence.md`](./A8-evidence.md)
