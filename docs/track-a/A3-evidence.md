# A3 evidence — runtime stop line

**Date:** 2026-09-18  
**Tracker:** [#4085](https://tasks.decisionsciencecorp.com/admin/view.php?id=4085)  
**Gate:** Doc #1381 — unit + integration ≥90%; **evaluator core 100%**; disposal proven

## Child cards

| Card | Status | Artifact | Line % |
|------|--------|----------|--------|
| A3.1 #4125 | done | `runtime/evaluator.js` | **100%** |
| A3.2 #4126 | done | `lang/builtins.js` + evaluate tests | (via evaluator) |
| A3.3 #4127 | done | `runtime/store.js` | **100%** |
| A3.4 #4128 | done | `runtime/bindings.js` | ≥97% |
| A3.5 #4129 | done | `runtime/queryManager.js` | **100%** |
| A3.6 #4130 | done | `runtime/mutations.js` | ≥98% |
| A3.7 #4131 | done | `runtime/actionRunner.js` | ≥93% |
| A3.8 #4132 | done | `runtime/formValidation.js` | ≥93% |
| A3.9 #4133 | done | `runtime/lifecycle.js` | **100%** |

## Suite

```bash
node --test tests/browser/*.test.js tests/browser/*.golden.test.js
# 293+ pass / 0 fail

node --experimental-test-coverage --test-coverage-include='src/Browser/runtime/**' \
  --test tests/browser/*.test.js tests/browser/*.golden.test.js
# all files ≥97% overall; evaluator 100%
```

## Stop line

**GREEN** — A4 may start.
