# A6 visual parity — library components

**Date:** 2026-09-18  
**Gate:** [Doc #1381](https://tasks.decisionsciencecorp.com/admin/doc.php?id=1381)  
**Tracker:** [#4160](https://tasks.decisionsciencecorp.com/admin/view.php?id=4160)  
**Capture:** `python3 tools/design-smoke/verify_a6.py` → `docs/track-a/screenshots/a6/`

## Baseline method

Storybook under `old/packages/react-ui` was **not** run in this environment. Upstream baseline is a **static HTML fixture**:

| Artifact | Role |
|----------|------|
| `public/lab/a6-baseline.html` | Same family sections / copy as the port lab |
| `public/lab/a5-baseline-tokens.css` | `:root` `--openui-*` vars (shared with A5.8) |
| `public/lab/a6-baseline.css` | Structural rules mirroring `openui-*` class names from `old/packages/react-ui/src/components/*` |

Port lab: `public/lab/a6-library.html` (+ `a6-library.js`), theme `data-theme="light"` for like-for-like token comparison. Mounts via `registerForms` / `registerActions` / `registerTable` / `registerCharts` / `registerCards` / `registerTools` (+ foundation Stack + content for metrics/tags).

Screenshots: mobile **390×844** + compact **768×900** + desktop **1280×800**, per family, `port-*` and `baseline-*` (54 files).

## Defects found and fixed during A6.12

| Issue | Severity | Fix |
|-------|----------|-----|
| Selection groups / Select / DatePicker / Slider / Button / Submit / Reset / IconButton self-rendered chrome wiped by reconciler | **Defect** | `ownsChildren: true` on those components (same pattern as A5.8 containers) |
| `applyProps` stringified complex props onto attributes (`items="[object Object]"`) | **Defect** | Skip non-primitive values in `reconciler.js` `applyProps` |
| Switch looked like a plain checkbox | **Defect** | Pill-track CSS for `.canvas-switch-item__input` in `forms.css` |
| Lab missing `public/assets/js/components/{forms,actions}` symlinks | Lab fixture | Symlink trees to `src/Browser/components/*` (same as table/charts) |
| EditableTable keyboard edit tests still `it.skip` | Test hygiene | Un-skipped — both pass under miniDom |

## Per-family inspection

Verdict key: **match** · **intentional** · **defect** (none open)

| Family | Port vs baseline | Notes |
|--------|------------------|-------|
| **Forms** | **match** | FormControl labels, required asterisk, Input/TextArea/DatePicker/Slider/Select, Save/Reset. Native `<select>` / `<input type=date>` vs OpenUI custom trigger — **intentional** Sanctum choice. |
| **Selection** | **match** | CheckBox, Radio, Switch (pill), Chips, OptionCards. Port Switch is CSS-styled `role=switch` checkbox; baseline uses OpenUI class chrome — same states. |
| **Buttons** | **match** | Primary / Secondary / Tertiary / Destructive / IconButton. Destructive uses `destructive` flag (red) vs baseline `openui-button-destructive`. |
| **Table** | **match** | Semantic thead/tbody, right-aligned Score, zebra-ish row surfaces. |
| **EditableTable** | **match** | Stable cells + URL links; edit chrome not open in static shot — **intentional**. |
| **Charts** | **match** (gallery) | All nine types render with legends + data tables. Baseline uses simplified SVG silhouettes — structure/intent match, not pixel-identical SVG. |
| **Card blocks** | **match** | Snippet / Overview / Context / Composite / Visual (each ≥2 items for homogeneous minItems). Port Overview uses `MetricIndicatorInline`; baseline metric text — **intentional**. |
| **Image gallery** | **match** | Five same-origin SVG tiles (H4 blocks `data:` / unsafe URLs). |
| **Tool activity** | **match** | Streaming / executing / complete + RunStatus finish/error. Copy wording (“Calling…” vs baseline “streaming”) — **intentional** presentation labels. |

## Open defects

**None.** A6 visual gate is green for library families shipped in A6.1–A6.11.

## Manifest audit (summary)

`python3 tools/design-smoke/audit_a6_manifest.py` → `docs/track-a/A6-manifest-audit.txt`

| Surface | Count |
|---------|-------|
| Registered (A5+A6 parse) | ~94 |
| chat `library.v1.json` | 6 (Stack, Card, TextContent, Input, Button, BarChart) |
| dashboard `library.v1.json` | 5 (no Card) |
| **Gaps** (registered, not in either slim manifest) | **85** — flagged; manifests remain intentionally slim until a later library expansion card |
| Orphans (manifest without register*) | **0** |

## Screenshot index

See `docs/track-a/screenshots/a6/manifest.txt` (54 files: port/baseline × mobile/compact/desktop × 9 families).
