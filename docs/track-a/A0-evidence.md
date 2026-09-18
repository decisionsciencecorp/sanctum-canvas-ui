# A0 stop-line evidence

**Date:** 2026-09-18  
**Repo:** `decisionsciencecorp/sanctum-canvas-ui`  
**Upstream pin:** `ee54f66` in `old/`

## Delivered

| Item | Path |
|------|------|
| Source disposition | `docs/track-a/source-disposition.md` + `.json` |
| MIT license copy | `LICENSES/openui-MIT.txt` |
| Intentional hardenings | `docs/track-a/intentional-hardenings.md` (H1–H7) |
| Contract format v1 | `resources/libraries/contract-format.v1.md` |
| Examples (primitive/container/form/chart/action) | `resources/libraries/examples/` |
| Validated example library | `resources/libraries/dashboard/library.examples.json` |
| Heuristic full stub catalog | `resources/libraries/dashboard/library.stub.json` |
| PHP + browser loaders | `src/Php/Library/ContractLoader.php`, `src/Browser/lang/contractLoader.js` |
| Lang program inputs + case indexes | `resources/fixtures/lang-core/` |
| Golden expect stubs | `resources/fixtures/lang-core/golden/` |
| Runtime / stream / URL / visual checklist | `resources/fixtures/{runtime,stream,url-policy,component-behavior}/` |

## Tests (A0 stop line)

```
./vendor/bin/phpunit
node --test tests/browser/contractLoader.test.js
```

Coverage (PHP `src/Php`, pcov): see latest `phpunit --coverage-text` output recorded in Tasks comments when closing #4082.

## Stop line (Doc #1379 A0)

- Fixtures and property-order / reactive metadata decisions are tested → **met**
- No full parser implementation started before this evidence → **held**

## Next

Phase A1 — library + prompt compiler consuming the same JSON.
