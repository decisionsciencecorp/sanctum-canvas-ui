# A8.4 — Accessibility & responsive acceptance (named URL)

**Date:** 2026-09-18  
**Task:** [#4172](https://tasks.decisionsciencecorp.com/admin/view.php?id=4172)  
**Review URL:** **https://canvas-lab.decisionsciencecorp.com/stream.php**  
**Tool:** `tools/design-smoke/verify_a8_a11y.py` (Python Playwright)  
**Depends:** A7.8 named lab, A8.2 registry parity checklist

## Scope

| Surface | URL | Role |
|---------|-----|------|
| Standalone stream lab | `/stream.php` | Primary review — keyboard smoke, landmarks, fixture canvas |
| A5 labs | `/lab/a5-*.html` | Foundation + upstream baseline gallery |
| A6 labs | `/lab/a6-*.html` | Library + upstream baseline gallery |

Viewports: **desktop 1280×800**, **mobile 390×844**. Screenshots under `docs/track-a/screenshots/a8-a11y/` (model-inspected). Machine JSON: `a8-a11y-report.json`.

```bash
/root/projects/sanctum-companion-shell/tools/design-smoke/.venv/bin/python \
  tools/design-smoke/verify_a8_a11y.py
```

## Keyboard / a11y smoke (lab main)

| Check | Result |
|-------|--------|
| HTTP 200 + `lang="en"` + document title | Pass |
| Landmarks: `<header>` chrome, `<main id="sanctum-canvas-root">`, debug `<aside>` | Pass |
| Form controls labeled (fixture / prompt / provider) | Pass |
| Status live region (`role="status"`) | Pass |
| Tab moves focus among chrome controls | Pass (≥12 distinct stops) |
| `:focus-visible` ring on lab chrome | Pass after A8.4 CSS (lab chrome is outside `.canvas-root`) |
| Skip link → `#sanctum-canvas-root` | Pass after A8.4 (`a.a7-lab-skip`) |
| Fixture replay paints TextContent | Pass — “Hello from lab fixture” |

## Model inspection (screenshots)

| File | Observation |
|------|-------------|
| `lab-main-desktop-1280x800.png` | Three-column lab; chrome left, empty canvas, debug right; status Ready |
| `lab-main-mobile-390x844.png` | Chrome stacks above canvas; usable, dense (lab chrome, not product UI) |
| `lab-main-fixture-desktop.png` | Canvas shows “Hello from lab fixture”; stream `finished` |
| `lab-a5-foundation-desktop-*.png` | Foundation families + open modal for open-state parity |
| `lab-a6-library-desktop-*.png` | Forms, charts, cards, gallery mounted |
| `lab-a6-baseline-desktop-*.png` | Upstream static baseline gallery (parity reference) |

## WCAG defects found → fixed

| Id | Criterion | Where | Fix |
|----|-----------|-------|-----|
| `control-name` | 4.1.2 | `/lab/a6-baseline.html` form inputs (name/email/date) had adjacent `<label>` text but **no `for`/`id`** | Wired `for`/`id`; Priority slider + Region trigger get `aria-labelledby` |
| Focus outside canvas | 2.4.7 | Lab chrome not covered by `a11y.css` (scoped to `.canvas-root`) | `:focus-visible` rules in `public/lab/a7-lab.css` |
| Bypass blocks | 2.4.1 | Dense chrome before canvas | Skip link in `public/stream.php` |
| Baseline focus CSS | 2.4.7 | Static A5/A6 baseline pages had no focus rules | Appended `:focus-visible` to `a5-baseline.css` / `a6-baseline.css` |

## Explicit non-blockers

| Item | Notes |
|------|-------|
| Upstream baseline visual fidelity | Baseline pages intentionally mirror `old/` class names; a11y patches are additive (`for`/`id`, focus ring) and do not change layout chrome |
| Lab density on mobile | Expected for operator lab; product hosts use `#sanctum-canvas-root` only |
| Chart SVG `aria-label`s | Present on baseline gallery figures |
| Registry parity notes | See `A8-parity-checklist.md` (86 Doc #1380 names; 0 missing) — a11y smoke covers deployed lab surfaces, not every registry type in isolation |

## Status

| Gate | Result |
|------|--------|
| Named-URL Playwright a11y smoke | **Pass** (after WCAG fixes landed on lab) |
| Mobile + desktop captures inspected | **Yes** |
| WCAG blockers fixed or explicitly blocked | **Fixed** (none left open) |
