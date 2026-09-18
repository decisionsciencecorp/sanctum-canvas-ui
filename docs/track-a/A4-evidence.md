# A4 evidence — renderer + security stop line

**Date:** 2026-09-18  
**Tracker:** [#4086](https://tasks.decisionsciencecorp.com/admin/view.php?id=4086)  
**Gate:** Doc #1381 — unit + integration ≥90%; **URL policy 100%**; hostile fixtures cannot create executable DOM or invoke tools

## Child cards

| Card | Status | Artifact | Line % |
|------|--------|----------|--------|
| A4.1 #4134 | done | `renderer/registry.js` + `context.js` | **98.8%** / **100%** |
| A4.2 #4135 | done | `renderer/reconciler.js` (stream keys + focus preserve) | **92.2%** |
| A4.3 #4136 | done | `partialGate.js` + `lastGoodSubtree.js` + `safeRender.js` | ≥91% / **94.1%** / **96.7%** |
| A4.4 #4137 | done | `security/urlPolicy.js` | **100%** line/branch/funcs |
| A4.5 #4138 | done | `security/markdown.js` (tables + citations) | **97.6%** |
| A4.6 #4139 | done | `public/assets/css/{tokens,skins,layout,a11y}.css` | file presence tests |
| A4.7 #4140 | done | `renderer/limits.js` + `public/lab/csp.html` + `docs/track-a/csp.md` | **90.6%** |

## Suite

```bash
npm run test:browser
# 396+ pass / 0 fail (includes A0–A4)

node --experimental-test-coverage \
  --test-coverage-include='src/Browser/security/**' \
  --test-coverage-include='src/Browser/renderer/**' \
  --test tests/browser/urlPolicy.test.js tests/browser/markdown.test.js \
        tests/browser/registry.test.js tests/browser/reconciler.test.js \
        tests/browser/renderer*.test.js tests/browser/safeRender*.test.js \
        tests/browser/css.tokens.test.js tests/browser/coverage.a4.gaps.test.js
# all files ≥90% line; overall 95.32%; urlPolicy.js 100%
```

## Hostile stop line

Fixtures under `tests/fixtures/hostile/` (javascript-url, markdown-event-handlers, unknown-component, broken-tail, XSS table/iframe variants):

- Unsafe schemes never become active `href`/`src`
- Event-handler / raw HTML / iframe payloads stay inert
- Unknown component types → `data-openui-unknown` (no scripts)
- Broken-tail → last-good subtree retained; `assertInteractive` blocks tool invoke while partial
- Large trees → `limits.js` rejects without hanging

## Stop line

**GREEN** — A5 may start.
