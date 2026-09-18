# Sanctum Canvas UI

Decision Science Corp fork of [thesysdev/openui](https://github.com/thesysdev/openui) for a **standalone PHP / HTML / vanilla JavaScript / CSS** generative-UI runtime (Sanctum Canvas Track A).

## Layout (under construction)

| Path | Role |
|------|------|
| **Repository root** | Sanctum port — PHP host, browser Lang runtime, components, tests, lab. **This is where we build.** |
| **`old/`** | Frozen upstream OpenUI monorepo (prior art / parity reference). Do not treat as product runtime. |

Upstream pin at fork time: see `old/` history and `UPSTREAM.md`.

## Hard constraints

- No Node product dependency for the shipped Sanctum shell.
- Finite registered component vocabulary only.
- Track A lab is separable from Track B Broca fullscreen chat.

## Quality gates (Track A)

- **Strict phase gates:** A0→A8 — do not start the next phase until the prior stop line is met.
- **Unit coverage:** ≥ **90%** line coverage on new PHP and browser modules in that phase.
- **Integration coverage:** ≥ **90%** for the phase’s integration suite.
- **Core modules (parser, validator, evaluator, URL policy, tool router):** **100%** line coverage.
- **Functional e2e:** not the primary bar — smoke paths are enough.
- **Visual parity (hard):** every registered UI element is screenshot-compared (and model-inspected) against upstream OpenUI behavior in `old/` until behavior matches the port target. 100% of the agreed component surface must pass this visual parity pass before Track A closes.

## Board

- Program: https://tasks.decisionsciencecorp.com/admin/doc.php?id=1378
- Full port plan: https://tasks.decisionsciencecorp.com/admin/doc.php?id=1379
- Component inventory: https://tasks.decisionsciencecorp.com/admin/doc.php?id=1380
- Epic A: https://tasks.decisionsciencecorp.com/admin/view.php?id=4081

## License

Upstream OpenUI is MIT; preserve attribution under `old/` and in `LICENSES/`.

## Develop

```bash
composer install
./vendor/bin/phpunit
node --test tests/browser/*.test.js tests/browser/*.golden.test.js
```

Phases A0–A6 complete for the browser/library surface. A7.4–A7.6 PHP APIs live under `public/api/`. **A7.7 standalone lab:** `public/index.php` (local `php -S … -t public`; evidence `docs/track-a/A7.7-evidence.md`). Named review URL is A7.8.
