# A5 visual parity — foundation components

**Date:** 2026-09-18  
**Gate:** [Doc #1381](https://tasks.decisionsciencecorp.com/admin/doc.php?id=1381)  
**Tracker:** [#4148](https://tasks.decisionsciencecorp.com/admin/view.php?id=4148)  
**Capture:** `python3 tools/design-smoke/verify.py` → `docs/track-a/screenshots/a5/`

## Baseline method

Storybook under `old/packages/react-ui` was **not** run in this environment (no pnpm Storybook smoke). Upstream baseline is a **static HTML fixture**:

| Artifact | Role |
|----------|------|
| `public/lab/a5-baseline.html` | Same family sections / copy as the port lab |
| `public/lab/a5-baseline-tokens.css` | `:root` `--openui-*` vars extracted from `old/.../openui-defaults.scss` |
| `public/lab/a5-baseline.css` | Structural rules mirroring `openui-*` class names from `old/packages/react-ui/src/components/*` |

Port lab: `public/lab/a5-foundation.html` (+ `a5-foundation.js`), theme `data-theme="light"` for like-for-like token comparison with OpenUI defaults. Sanctum dark skin remains available separately and is **not** the A5.8 parity surface.

Screenshots: mobile **390×844** + desktop **1280×800**, per family, `port-*` and `baseline-*`.

## Defects found and fixed during A5.8

| Issue | Severity | Fix |
|-------|----------|-----|
| Reconciler wiped prop-rendered chrome (`ownsChildren` missing on Carousel/Modal/Section/Steps + content lifecycle) | **Defect** | `ownsChildren: true` on those containers; content `lifecycle()` defaults `ownsChildren` |
| Carousel stamped `offsetLeft` on real DOM → throw, blocked Modal mount | **Defect** | Guard writable/`try` in `Carousel.js` |
| Modal `showModal()` before dialog connected → throw | **Defect** | Catch + microtask retry in `Modal.js` |
| Carousel prev/next `position:absolute` over slides | **Defect** | Grid layout: buttons beside track (`carousel.css`) |
| Lab `data:` image URLs blocked by H4 urlPolicy | Lab fixture | Same-origin `public/lab/lab-image.svg` |

## Per-family inspection

Verdict key: **match** · **intentional** · **defect** (none open)

| Family | Port vs baseline | Notes |
|--------|------------------|-------|
| **Stack** | **match** | Row + wrap + gap; three labels; light surface. Port lab chrome (family card) vs baseline family card — layout of stack children matches. |
| **Card** | **match** | Title, subtitle, body, Sources strip. Port source chip shows title only (URL/name in attrs) — **intentional** (CardSources item label vs baseline combined string). |
| **Content** | **match** | InlineHeader, TextContent sunk, TextCallout/Callout with info accent, Separator, TagBlock variants, EntityList rows, MetricIndicator + trend. |
| **Lists / Code / Images** | **match** | Numbered ListBlock, CodeBlock + Copy, Image + ImageBlock from same-origin SVG. **Intentional (H4):** `data:` URLs never render as active images. |
| **Tabs** | **match** | Clear tablist, Line active underline, panel body visible. |
| **Accordion** | **intentional** | Port auto-opens **newest** item while streaming (upstream AccordionRenderer) → Section two open; baseline fixture opens Section one. Chrome/chevron/card variant otherwise align. |
| **Section** | **match** | Foldable Overview open / Details closed; chevron affordance. |
| **Steps** | **intentional** | Progress semantics match (step 1 current). Inactive step **titles** muted; **details** stay primary for readability — minor vs baseline greying both. |
| **Carousel** | **match** (after CSS fix) | Prev/next flanking track; slides readable; “Slide 1 of 3”. Multi-slide peek is scroll-snap design (same idea as upstream). |
| **Modal** | **match** | Open dialog: title, close, body. Prefer `*-modal-viewport.png` for full chrome; family crop can clip fixed dialog. Native `<dialog>` vs upstream div portal — **intentional** Sanctum choice (A5.7). |

## Open defects

**None.** A5 visual gate is green for foundation families shipped in A5.1–A5.7.

## Screenshot index

See `docs/track-a/screenshots/a5/manifest.txt` (42 files: port/baseline × mobile/desktop × families, plus modal viewport extras).
