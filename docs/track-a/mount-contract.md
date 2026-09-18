# Mount contract — `#sanctum-canvas-root` (A8.6)

**Status:** **frozen** `canvas-host-v1` (2026-09-18). Breaking changes → `canvas-host-v2`.  
**Implementation:** `src/Browser/host/mount.js` (public twin `public/assets/js/host/mount.js`).  
**Lab proof:** `public/stream.php` keeps chrome **outside** the root; see `docs/track-a/A7.7-evidence.md`.  
**Fixture:** `tests/browser/host.mount.test.js` · expectations `tests/fixtures/handoff/mount-lease-expectations.json`.

---

## 1. DOM guarantee

Track B (when canvas is open) provides exactly one:

```html
<div id="sanctum-canvas-root" class="sanctum-canvas-root canvas-root" data-canvas-mount="1"></div>
```

| Rule | Detail |
|------|--------|
| Empty host | No lab controls, debug panes, or companion chrome **inside** the root |
| Children | Only Track A renderer output (and transient error placeholder on mount failure) |
| Id stability | Do not rename; breaking change → `canvas-host-v2` |
| Multiplicity | Exactly one when open; Track A must not create a second root |

Lab reference (siblings, not children of the root):

```text
#lab-chrome          ← Track B must not import
#sanctum-canvas-root ← mount target
#lab-debug           ← Track B must not import
```

---

## 2. Versioned adapter API (`canvas-host-v1`)

### Primary Track A API

```js
import { mount, CONTRACT } from "/assets/js/host/mount.js";

const handle = await mount(document.getElementById("sanctum-canvas-root"), {
  contract: CONTRACT,            // "canvas-host-v1"
  library,                       // or libraryUrl: "/assets/libraries/…/library.v1.json"
  initiation,                    // normalized — see track-b-handoff-contract.md
  signal,                        // AbortSignal from host lease
  continueConversation(msg, ctx) { /* Track B chat turn */ },
  openUrl(safeUrl) { /* policy-filtered; optional */ },
  dispatchAction,                // default rejects unsupported-action
});

handle.dispatchEvent(agUiEvent); // RUN_*/TEXT_*/TOOL_* …
await handle.unmount("close");
```

### Companion registration (Track B host)

```js
import { createRendererAdapter } from "/assets/js/host/mount.js";

await SanctumCompanion.canvas.registerRenderer(createRendererAdapter({
  libraryUrl: "/assets/libraries/dashboard/library.v1.json",
}));

await SanctumCompanion.canvas.mount({ /* optional context */ });
await SanctumCompanion.canvas.unmount("close");
```

`createRendererAdapter().mount(ctx)` delegates to `sanctumCanvasMount(ctx)`:

| `ctx` field | Behavior |
|-------------|----------|
| `root` | `#sanctum-canvas-root` |
| `signal` | AbortSignal; abort → dispose |
| `session` | Opaque session handle from B |
| `initiation` | Normalized initiation |
| `dispatchAction` | B default rejects; Merge may wrap ContinueConversation / OpenUrl |

### `mount` / `sanctumCanvasMount` responsibilities (Track A)

| Step | Behavior |
|------|----------|
| Negotiate | Refuse non-`canvas-host-v1` with `{ code: "contract-mismatch" }` |
| Clear | `clearRoot(root)` once (or host cleared) |
| Bootstrap | Register all component families; no lab modules |
| Hydrate | Apply `initiation.seed.programSource` / `stateHydration` |
| Stream | Accept `handle.dispatchEvent(agUiEvent)` (SSE/NDJSON adapters feed same events) |
| Callbacks | Wire ContinueConversation / OpenUrl through options / ctx |
| Dispose | Abort signal listeners; reconciler unmount; leave root empty |

### Lifecycle ordering (host)

1. Existing lease → `unmount` before remount (Track A also auto-disposes prior lease on same element)  
2. Abort `signal` → await adapter `unmount` → `root.replaceChildren()`  
3. Concurrent mount while mounting → throw `mount in progress`  
4. Mount throw → host shows `.companion-canvas-error`; Track A must not leave half-bound listeners

---

## 3. CSS / asset boundary

| Include | Exclude |
|---------|---------|
| `/assets/css/tokens.css`, `skins.css`, `layout.css`, `a11y.css` | Lab chrome stylesheets |
| `/assets/css/components/*.css` | Lab-only layout that positions `#lab-chrome` |
| `/assets/js/**` ES modules (incl. `/assets/js/host/mount.js`) | Lab controllers / fixture dropdowns |

CSP: same policy as [`csp.md`](./csp.md) — `script-src 'self'`; no CDN; no `unsafe-inline` / `unsafe-eval`.

Optional: Track B may set `frame-ancestors` differently if the companion is embedded; Track A lab uses `frame-ancestors 'none'`.

---

## 4. What remains outside Track A

- Thread sidebar, agent picker, Broca routing, SMCP plugin deploy  
- Privileged shell navigation (unless Merge explicitly grants a filtered `openUrl`)  
- Inference credentials (PHP / host only)  
- Named companion route provisioning (Track B)

---

## 5. Minimal host fixture (acceptance — met)

`tests/browser/host.mount.test.js`:

1. `#sanctum-canvas-root` only (no lab chrome)  
2. `mount` → stream handoff AG-UI text fixture → assert TextContent under root  
3. `unmount` → remount → root cleared between leases  
4. Source audit: zero imports of lab controllers from `host/mount.js`

Executable companion fixtures live in Track B (`fixtures/canvas-host/`). Track A mirrors expectations in `tests/fixtures/handoff/mount-lease-expectations.json`.

---

## 6. Cross-links

- Event / action contract: [`track-b-handoff-contract.md`](./track-b-handoff-contract.md)  
- Companion freeze: `sanctum-companion-shell/contracts/canvas-host-v1/api.md`  
- Lab evidence: [`A7.7-evidence.md`](./A7.7-evidence.md) · phase stop: [`A8-evidence.md`](./A8-evidence.md)
