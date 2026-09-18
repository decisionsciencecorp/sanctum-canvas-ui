# A8.3 security regression scaffold

Browser-side regressions that **do not** need the A7.8 named review URL.

```bash
node --test tests/security/*.test.js
```

| Suite | Covers |
|-------|--------|
| `xss.test.js` | Hostile markdown + unknown-component fail-closed |
| `url.test.js` | URL/CSS policy + handoff OpenUrl cases |
| `csp.test.js` | CSP tokens in `public/index.php` + docs |
| `tool-abuse.test.js` | Incomplete-program / partial tool gate + TOOL_CALL_ARGS |
| `parser-bomb.test.js` | Depth/node limits + broken-tail last-good |
| `handoff-fixtures.test.js` | A8.7 handoff JSON structural + reducer smoke |

PHP twin (already shipped): `tests/php/Security/ToolSecurityTest.php`.

Still open for full A8.3 acceptance (Doc #1379 §9): CSRF/IDOR/rate-limit e2e on named host, fuzz expansion, secret-leakage HTTP probes — tracked on Tasks #4171.
