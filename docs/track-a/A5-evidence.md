# A5 evidence — foundation components phase stop

**Date:** 2026-09-18  
**Phase tracker:** [#4087](https://tasks.decisionsciencecorp.com/admin/view.php?id=4087)  
**Visual card:** [#4148](https://tasks.decisionsciencecorp.com/admin/view.php?id=4148) A5.8  
**Gate:** [Doc #1381](https://tasks.decisionsciencecorp.com/admin/doc.php?id=1381) — coverage ≥90%; visual parity for every foundation/layout family

## Child cards

| Card | Status | Slice |
|------|--------|-------|
| A5.1 #4141 | done | Stack / Card |
| A5.2 #4142 | done | Content primitives |
| A5.3 #4143 | done | Lists / Code / Images (+ chat content) |
| A5.4 #4144 | done | Tabs / Accordion |
| A5.5 #4145 | done | Section / Steps |
| A5.6–A5.7 #4146–#4147 | done | Carousel / Modal |
| A5.8 #4148 | done | Python Playwright visual parity |

## Visual parity (A5.8)

| Artifact | Path |
|----------|------|
| Port lab | `public/lab/a5-foundation.html` + `a5-foundation.js` |
| Upstream baseline (static) | `public/lab/a5-baseline.html` (+ tokens/CSS from `old/`) |
| Verify | `tools/design-smoke/verify.py` (Python Playwright; ephemeral `http.server`) |
| Screenshots | `docs/track-a/screenshots/a5/` |
| Inspection notes | `docs/track-a/A5-visual-parity.md` |

```bash
# Prefer design-smoke venv with Chromium (or companion-shell venv)
python3 tools/design-smoke/verify.py
# → 42 screenshots under docs/track-a/screenshots/a5/
```

**Verdict:** GREEN — no open visual defects. Baseline method: static OpenUI class fixture (Storybook not run).

## Coverage (A5 components)

```bash
node --experimental-test-coverage \
  --test-coverage-include='src/Browser/components/**' \
  --test tests/browser/*.test.js
# all files line % ≈ 97.36% (≥90%)
# note: layout/Card.js alone ~86.5% — overall components band still ≥90%; A5.1 already closed
```

## Browser suite

```bash
npm run test:browser
# 600+ pass (A0–A5); A5.6/A5.7 carousel.modal 30/30 after Modal/Carousel fixes
```

## Stop line

**GREEN — A5 complete.** A6 (forms / tables / charts) may start. Do not start A6 from this card’s workstream without Mark’s next phase order.
