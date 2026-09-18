# A9 — Lab home dashboard and guided walkthrough

Tasks **#4253** (parent), **#4254–#4259**. Mark, 2026-09-18: the lab had no entry point and no way to
see the component set in use.

## What shipped

| Piece | Path | Notes |
|-------|------|-------|
| Home dashboard | `public/index.php`, `public/lab/home.css` | Tile per lab page with a one-sentence "what" and "what to expect" |
| Guided walkthrough | `public/walkthrough.php`, `public/lab/walkthrough.js`, `public/lab/walkthrough.css` | Wizard chrome: narration column, chat strip, canvas, Next / Back / Auto-play / Restart, step dots, `?step=` deep links, ← → keys |
| Story | `public/lab/walkthrough-script.js` | 18 steps; ops lead asks how Empanada Empire did this week. Fixed data, no model |
| Stream lab | `public/stream.php` (was `index.php`) | Unchanged behaviour; "← Home" link added |
| Smoke | `tools/design-smoke/verify_a9_home_walkthrough.py` | Walks all 18 steps, performs the three real interactions, desktop + mobile screenshots |

## Renderer path

The walkthrough drives the **real** renderer — `registerAllComponents` from `host/mount.js`,
reconciler, reactive store + bindings, `ctx.actions.run` for Buttons / Form submit / FollowUps,
`ctx.continueConversation`. Each step returns the whole canvas vnode; the reconciler keeps prior DOM.
The "What the model writes" panel is illustrative Lang, not parsed live.

Components exercised in-story: InlineHeader, TextContent, OverviewCardBlock, MetricIndicatorInline,
Text, Tabs, BarChart, LineChart, PieChart, Table, Callout, TagBlock, Card, CardHeader, CardSources,
Form, FormControl, Input, Select, DatePicker, Slider, Buttons, Submit, Button, ToolActivity,
RunStatus, Steps, Accordion, FollowUpBlock, SingleStackedBarChart, Modal, Carousel, Image,
CodeBlock, ListBlock.

## Runtime bugs found and fixed while building it

1. **Inline `style` attributes blocked by the Canvas CSP.** `setAttribute("style", …)` in nine
   components (chart legend swatches, Image aspect ratio, ImageBlock / ContextCard / VisualCard
   backgrounds, Callout auto-dismiss, CardBlockLayout gap, ImageText size, CodeBlock live region)
   was silently dropped under `style-src 'self'` — the A6 gallery only looked right because it ran
   with `'unsafe-inline'`. New `renderer/inlineStyle.js` uses the CSSOM API (allowed under CSP) with
   an attribute fallback for miniDom tests.
2. **`CardSources(sources)` rendered empty.** Children derived from `props.sources` were wiped by the
   reconciler because the vnode had no `children`. `ownsChildren: true` on `CardSources`.
3. **Number inputs threw on re-render.** `restoreInteractiveState` assigned `selectionStart = null`
   back onto `<input type="number">`, which Chrome rejects. Guarded.
4. Security stub tests still read `src/Php/…` after the A7 autoload move → repointed to
   `public/includes/Php/…`.

## Verification

```
python3 tools/design-smoke/verify_a9_home_walkthrough.py            # local php -S child
CANVAS_LAB_URL=https://canvas-lab.decisionsciencecorp.com python3 tools/design-smoke/verify_a9_home_walkthrough.py
```

Local run: `A9 smoke OK (local) — steps: 18/18`; screenshots under `docs/track-a/screenshots/a9/`.
`node --test tests/browser/*.test.js` 806/806, `tests/security` 74/74, PHPUnit 122 tests OK.
