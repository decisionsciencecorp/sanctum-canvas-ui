# A8.3 security regression suite

Browser-side + PHP-contract stubs for Doc [#1379](https://tasks.decisionsciencecorp.com/admin/doc.php?id=1379) §9. Does **not** require the A7.8 named review URL.

```bash
node --test tests/security/*.test.js
# or
npm run test:security

# Coverage on modules touched by this suite (≥90% gate):
node --experimental-test-coverage \
  --test-coverage-include='src/Browser/security/**' \
  --test-coverage-include='src/Browser/renderer/limits.js' \
  --test-coverage-include='src/Browser/renderer/safeRender.js' \
  --test-coverage-include='src/Browser/lang/limits.js' \
  --test -- tests/security/*.test.js
```

| Suite | §9 / topic |
|-------|------------|
| `xss.test.js` | Arbitrary HTML/JS; markdown allowlist; unknown-component fail-closed |
| `url.test.js` | Encoded/obfuscated schemes; host allowlist; CSS url; OpenUrl |
| `csp.test.js` | Header + **meta** CSP presence; no unsafe-inline/eval |
| `parser-bomb.test.js` | Depth/node/source/statement limits; cyclic trees; SSE buffer; last-good |
| `tool-abuse.test.js` | Incomplete-program + gesture gates; TOOL_CALL_ARGS; hostile names |
| `rate-limits.stub.test.js` | Fixed-window RateLimiter twin + PHP wiring stubs |
| `csrf-idor.stub.test.js` | CSRF mint/validate twin; ProgramController auth scope |
| `secret-leakage.stub.test.js` | Error redaction stubs + PHP twin pointers |
| `handoff-fixtures.test.js` | Track B handoff JSON + reducer smoke |

PHP twins (already shipped):

- `tests/php/Security/ToolSecurityTest.php`
- `tests/php/Http/HttpKernelTest.php` (CSRF, RateLimiter, ErrorRedactor)
- `tests/php/Storage/PersistenceTest.php` (CSRF + spoofed owner)

**Still open for full A8.3 acceptance:** CSRF/IDOR/rate-limit/secret-leakage **e2e on named host**, broader fuzz — tracked on Tasks **#4171**. Do not close A8 / A7.8 on this suite alone.
