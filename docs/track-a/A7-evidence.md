# A7 evidence — named laboratory URL (A7.8)

**Date:** 2026-09-18  
**Task:** [#4168](https://tasks.decisionsciencecorp.com/admin/view.php?id=4168) (phase parent [#4089](https://tasks.decisionsciencecorp.com/admin/view.php?id=4089))  
**Repo:** `sanctum-canvas-ui`  
**Commit:** `9ba6cff` — *A7.8: named-URL Playwright smoke for canvas-lab* (+ follow-up evidence)

## Named URL (what a human can review)

| | |
|--|--|
| **Review URL** | **https://canvas-lab.decisionsciencecorp.com/index.php** |
| HTTP | Redirects to HTTPS (Let’s Encrypt live as of 2026-09-18; Ada). |
| What you see | Standalone Sanctum Canvas laboratory: fixture replay, live prompt (`/api/chat.php`), deterministic tools, debug panes, canvas mount `#sanctum-canvas-root`. |

Open the URL cold. After load, status should leave “Booting…”, the Fixture dropdown should list options, and **Replay fixture** on `lab-canvas-textcontent` should paint **Hello from lab fixture** in the center canvas.

## Smoke tooling

| Piece | Path |
|-------|------|
| Named-URL Playwright | `tools/design-smoke/verify_a7_named.py` |
| Local lab (php -S child) | `tools/design-smoke/verify_a7_lab.py` (A7.7) |
| Multihost asset fix | `tools/materialize-public-assets.py` — replaces `public/` symlinks with real copies so `rsync -a` deploy serves JS/fixtures |

```bash
/root/projects/sanctum-companion-shell/tools/design-smoke/.venv/bin/python \
  tools/design-smoke/verify_a7_named.py
# A7.8 named-URL smoke OK
#   lab_ready: True
#   fixture_replay: ok — TextContent fixture rendered
```

**Asserts (hard):** HTTP(S) 200, `#lab-fixture` present, `#sanctum-canvas-root` present, CSP meta with `script-src 'self'`.  
**Optional (passed on live):** offline fixture replay → TextContent “Hello from lab fixture”.  
**Viewports:** desktop 1280×800, mobile 390×844.

## Screenshots (inspected)

Under `docs/track-a/screenshots/a7/`:

| File | What a human sees |
|------|-------------------|
| `a7-named-desktop-1280x800.png` | Desktop lab chrome + canvas after load |
| `a7-named-mobile-390x844.png` | Mobile stack of the same page |
| `a7-named-fixture-replay-desktop.png` | Fixture replay: canvas shows “Hello from lab fixture”; stream state `finished` |

## Defects / notes from the A7.8 pass

1. **First pass (pre-materialize):** Lab stuck on “Booting…” because `public/assets/js/*` and fixtures were **symlinks** into `src/` / `resources/` / `tests/`. Multihost `deploy.sh` rsyncs only `public/` and preserves symlinks → module **404**s. Fixed by materializing 181 files in `9ba6cff`; Ada sync landed tip `9ba6cff` on the box.
2. **HTTPS:** Initially self-signed / pending; Ada then issued Let’s Encrypt. Prefer **https://** now. Early instruction used HTTP — both work (HTTP redirects).
3. **Cosmetic:** Page subtitle still says “A7.7 standalone laboratory” — not a smoke failure.
4. **Mobile:** Controls stack above canvas; usable, dense — expected for lab chrome, not product UI.

## Status gate

| Gate | Result |
|------|--------|
| Named URL exists and loads | Yes — HTTPS 200 |
| Core Playwright smoke | Yes |
| Fixture replay on named URL | Yes |
| HTTPS cert | Yes (Ada LE, 2026-09-18 → 2026-12-17) |
| A7 phase DoD (named URL reviewable) | **Met** |
| Track A complete | **No** — A8 still open |

## Human review checklist

1. Open **https://canvas-lab.decisionsciencecorp.com/index.php**.
2. Confirm status is not stuck on Booting.
3. Fixture `lab-canvas-textcontent` → Replay → canvas shows “Hello from lab fixture”.
4. Optional: Start with fake provider; Cancel / Reset; tool buttons.
