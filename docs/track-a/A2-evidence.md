# A2 evidence — language kernel stop line

**Date:** 2026-09-18  
**Task:** [#4084](https://tasks.decisionsciencecorp.com/admin/view.php?id=4084)  
**Gate:** Doc #1381 — unit ≥90%; parser/validator **100%**

## Command

```bash
node --experimental-test-coverage \
  --test-coverage-include='src/Browser/lang/**' \
  --test tests/browser/*.test.js tests/browser/*.golden.test.js
```

## Results

| Module | Line % |
|--------|--------|
| parser.js | **100.00** |
| validation.js | **100.00** |
| tokens.js | 100.00 |
| statements.js | 100.00 |
| limits.js | 100.00 |
| contractLoader.js | 100.00 |
| merge.js | 100.00 |
| builtins.js | 100.00 |
| lexer.js | 100.00 |
| **all lang files** | **99.54** |

Browser tests: **181 pass / 0 fail**.

## Artifacts

- Port: `src/Browser/lang/*` (esbuild from `old/packages/lang-core` + Sanctum adapters)
- Suites: `tests/browser/coverage.*.test.js`, goldens, corpus, materialize.validation

## Stop line

**GREEN** — A3 may start.
