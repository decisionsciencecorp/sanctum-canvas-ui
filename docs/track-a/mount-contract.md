# Mount contract — `#sanctum-canvas-root` (A8.6)

**Status:** draft for Track B / Merge. Compatible with companion **`canvas-host-v1`**.  
**Lab proof:** `public/index.php` keeps chrome **outside** the root; see `docs/track-a/A7.7-evidence.md`.

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

Track B registers a single renderer adapter, then mounts:

```js
await SanctumCompanion.canvas.registerRenderer({
  id: "sanctum-canvas",
  version: "0.1.0",
  contract: "canvas-host-v1",
  async mount(ctx) {
    // ctx.root === #sanctum-canvas-root
    // ctx.signal — AbortSignal; abort on unmount
    // ctx.session — opaque session handle from B
    // ctx.initiation — normalized initiation (see track-b-handoff-contract.md)
    // ctx.dispatchAction — B default rejects; Merge may wrap ContinueConversation / OpenUrl
    const handle = await sanctumCanvasMount(ctx);
    return {
      async unmount(reason) {
        await handle.dispose(reason);
      },
    };
  },
});

await SanctumCompanion.canvas.mount({ /* optional context */ });
await SanctumCompanion.canvas.unmount("close");
```

### `sanctumCanvasMount(ctx)` responsibilities (Track A)

| Step | Behavior |
|------|----------|
| Clear | Assume host cleared root; if not, `root.replaceChildren()` once |
| Bootstrap | Load library contracts + register component renderers (ES modules under `/assets/js/`) |
| Hydrate | Apply `initiation.seed` program/state if present |
| Stream | Subscribe to host-provided event source **or** accept `dispatchEvent(agUiEvent)` from B |
| Callbacks | Wire ContinueConversation / OpenUrl through `ctx` host hooks (policy-filtered) |
| Dispose | Abort in-flight queries/streams; remove listeners/timers; leave root empty |

### Lifecycle ordering (host)

1. Existing lease → `unmount` before remount  
2. Abort `signal` → await adapter `unmount` → `root.replaceChildren()`  
3. Concurrent mount while mounting → throw `mount in progress`  
4. Mount throw → host shows `.companion-canvas-error`; Track A must not leave half-bound listeners

---

## 3. CSS / asset boundary

| Include | Exclude |
|---------|---------|
| `/assets/css/tokens.css`, `skins.css`, `layout.css`, `a11y.css` | `/lab/*.css` lab chrome |
| `/assets/css/components/*.css` | Lab-only layout that positions `#lab-chrome` |
| `/assets/js/**` ES modules | `/lab/a7-lab.js`, fixture dropdown controllers |

CSP: same policy as [`csp.md`](./csp.md) — `script-src 'self'`; no CDN; no `unsafe-inline` / `unsafe-eval`.

Optional: Track B may set `frame-ancestors` differently if the companion is embedded; Track A lab uses `frame-ancestors 'none'`.

---

## 4. What remains outside Track A

- Thread sidebar, agent picker, Broca routing, SMCP plugin deploy  
- Privileged shell navigation (unless Merge explicitly grants a filtered `openUrl`)  
- Inference credentials (PHP / host only)  
- Named review URL provisioning (A7.8 / Ada)

---

## 5. Minimal host fixture (acceptance sketch)

A host page with **only**:

1. `#sanctum-canvas-root`  
2. `registerRenderer` → `mount` → stream one AG-UI text fixture → assert TextContent under root  
3. `unmount` → remount → no leaked timers/listeners  
4. Dependency audit: zero imports of `public/lab/**`

Executable companion fixtures live in Track B (`fixtures/canvas-host/`). Track A mirrors expectations in `tests/fixtures/handoff/mount-lease-expectations.json`.

---

## 6. Cross-links

- Event / action contract: [`track-b-handoff-contract.md`](./track-b-handoff-contract.md)  
- Companion freeze: `sanctum-companion-shell/contracts/canvas-host-v1/api.md`  
- Lab evidence: [`A7.7-evidence.md`](./A7.7-evidence.md)
