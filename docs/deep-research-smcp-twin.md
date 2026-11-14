# Canvas isolation test — Deep Research shell

## What this is

A **stripped test app** in the canonical Sanctum Canvas repo that deploys to
[canvas-lab.sanctumos.org/lab/deep-research.php](https://canvas-lab.sanctumos.org/lab/deep-research.php).

Use it when Deep Research (or another product host) looks wrong and you need to
know whether the bug is:

| Outcome on this page | Meaning |
|---|---|
| Fixture looks right | Bug is in the product host / Broca / Face / vendor wiring |
| Fixture looks wrong | Bug is in Sanctum Canvas — fix here, then re-vendor into the product |

## What loads (and what does not)

**Shell profile only** — foundation, content, containers, forms, actions, cards.

**Not loaded:** charts, tables, tools, chat, carousel, modal, section/steps packs.

Product hosts that only paint Form / Stack / OptionCards should import
`mount.shell.js` / `mount.shell.bundle.js`, not the full kitchen sink.

## Local fixtures (no SMCP)

Buttons on the page fetch Lang from `/fixtures/lang/`:

| Button | Fixture |
|---|---|
| Paint scope form | `deep-research-scope-v1.lang` |
| Paint form-schema sample | `deep-research-form-schema-v1.lang` |

Same renderer path the product should use. Submits stay on this page (Last submit).

## Optional SMCP

Otto can still paint via `sanctum_canvas_lab` (`paint` / `paint_fixture` / `clear`).
Local fixtures take priority until you hit Clear.

| Item | Value |
|---|---|
| Page | https://canvas-lab.sanctumos.org/lab/deep-research.php |
| Surface | `deep-research` |
| Plugin | `smcp_plugin/sanctum_canvas_lab/` |

## Selective load + lazy packs + backflow

1. **Shell first** — `registerShellComponents` / `mount.shell.js` (forms / content / layout).
2. **Lazy packs** — if the OpenUI program names `BarChart`, `Table`, `ToolActivity`,
   etc., `ensureLazyPacks` dynamic-imports that pack chunk and registers it before paint.
3. **Fix rendering / efficiency here** — `src/Browser/…`, then `npm run bundle:host`.
4. **Re-vendor** — copy `mount.shell.js` / `mount.shell.bundle.js` **and** `chunk-*.js`
   into `deep-research/public/vendor/sanctum-canvas/js/host/` (or run
   `deep-research/tools/bundle-sanctum-canvas-mount.sh`).

## Bundle

```bash
cd sanctum-canvas-ui
npm run bundle:host
# → mount.bundle.js              (full kitchen sink)
# → mount.shell.js + chunk-*.js  (shell + on-demand packs)
# → mount.shell.bundle.js        (alias of the shell entry)
```
