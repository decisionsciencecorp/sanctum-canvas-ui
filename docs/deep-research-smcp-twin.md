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

## Selective load + backflow

1. **Load only what you need** — `registerShellComponents` / `mount.shell.js`.
2. **Fix rendering / efficiency in this repo** — `src/Browser/…`, then
   `node tools/bundle-host-mount.mjs`.
3. **Re-vendor into Deep Research** — copy `public/assets/js/host/mount.shell.*`
   (and related shell deps) into `deep-research/public/vendor/sanctum-canvas/`,
   or rebuild the product’s shell bundle from this tree.

This is not a “keep two apps in sync” chore script. The lab page is the
isolation surface; the shell mount is the shared runtime slice products should
consume.

## Bundle

```bash
cd sanctum-canvas-ui
node tools/bundle-host-mount.mjs
# → public/assets/js/host/mount.bundle.js        (full)
# → public/assets/js/host/mount.shell.bundle.js  (shell)
```
