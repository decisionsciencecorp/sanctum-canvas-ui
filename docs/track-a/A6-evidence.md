# A6 evidence — forms / tables / charts / cards / tools phase stop

**Date:** 2026-09-18  
**Phase tracker:** [#4088](https://tasks.decisionsciencecorp.com/admin/view.php?id=4088)  
**Visual card:** [#4160](https://tasks.decisionsciencecorp.com/admin/view.php?id=4160) A6.12  
**Gate:** [Doc #1381](https://tasks.decisionsciencecorp.com/admin/doc.php?id=1381) — coverage ≥90%; visual parity for remaining library families

## Child cards

| Card | Status | Slice |
|------|--------|-------|
| A6.1–A6.3 | done | Forms shell + controls + selection |
| A6.4 | done | Buttons / IconButton |
| A6.5–A6.6 | done | Table / EditableTable |
| A6.7–A6.9 | done | Chart kernel + chart family |
| A6.10 | done | Card blocks + ImageGallery |
| A6.11 | done | ToolActivity / RunStatus |
| A6.12 #4160 | done | Python Playwright visual parity + manifest audit |

## Visual parity (A6.12)

| Artifact | Path |
|----------|------|
| Port lab | `public/lab/a6-library.html` + `a6-library.js` |
| Upstream baseline (static) | `public/lab/a6-baseline.html` (+ `a6-baseline.css`, shared `a5-baseline-tokens.css`) |
| Verify | `tools/design-smoke/verify_a6.py` (Python Playwright; ephemeral `http.server`) |
| Manifest audit | `tools/design-smoke/audit_a6_manifest.py` → `docs/track-a/A6-manifest-audit.txt` |
| Screenshots | `docs/track-a/screenshots/a6/` (54 PNGs) |
| Inspection notes | `docs/track-a/A6-visual-parity.md` |

```bash
python3 tools/design-smoke/verify_a6.py
# → 54 screenshots under docs/track-a/screenshots/a6/
python3 tools/design-smoke/audit_a6_manifest.py
```

**Verdict:** GREEN — no open visual defects. Baseline method: static OpenUI class fixture (Storybook not run).

## Coverage (A6 components)

```bash
node --experimental-test-coverage \
  --test-coverage-include='src/Browser/components/forms/**' \
  --test-coverage-include='src/Browser/components/actions/**' \
  --test-coverage-include='src/Browser/components/table/**' \
  --test-coverage-include='src/Browser/components/charts/**' \
  --test-coverage-include='src/Browser/components/cards/**' \
  --test-coverage-include='src/Browser/components/tools/**' \
  --test tests/browser/forms.a6.test.js tests/browser/actions.a6.test.js \
        tests/browser/table.editable.test.js tests/browser/charts.*.test.js \
        tests/browser/card-blocks.test.js tests/browser/tool-activity.test.js
# all files line % ≈ 92.27% (≥90%)
```

## Browser suite

```bash
npm run test:browser
# 746 pass / 0 skip (EditableTable keyboard paths un-skipped in A6.12)
```

## Manifest consistency

Slim `resources/libraries/{chat,dashboard}/library.v1.json` still expose only the bootstrap component set (6 / 5 names). Full register* surface (~94 including A5) is listed as **gaps** in `A6-manifest-audit.txt` — this sentence recorded an execution deferral. **That deferral is closed.** The catalogs are now the full OpenUI libraries (dashboard 82, chat 84).

## Stop line

**GREEN — A6 complete.** A7 must not start from this card’s workstream without Mark’s next phase order.
