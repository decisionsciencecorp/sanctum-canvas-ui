# Canvas Content-Security-Policy (A4.7)

Strict CSP for the Sanctum Canvas lab and future PHP host. Model output must never become executable script; scripts and styles load same-origin only.

## Meta (lab HTML)

Used in `public/lab/csp.html` and `public/lab/index.html`:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
/>
```

## PHP header snippet (future lab / prod)

Set once before any body output:

```php
<?php
header(
    "Content-Security-Policy: default-src 'self'; " .
    "script-src 'self'; " .
    "style-src 'self'; " .
    "img-src 'self' data: https:; " .
    "connect-src 'self'; " .
    "object-src 'none'; " .
    "base-uri 'self'; " .
    "frame-ancestors 'none'"
);
```

Optional hardening once HTTPS is standard:

```php
header("Content-Security-Policy: …; upgrade-insecure-requests");
```

## Rules of thumb

| Directive | Intent |
|-----------|--------|
| `script-src 'self'` | ES modules under `public/assets/js/` only — **no** `unsafe-inline`, **no** `unsafe-eval`, **no** CDN |
| `style-src 'self'` | Stylesheets under `public/assets/css/` — prefer classes; avoid inline `style=""` (blocked without `unsafe-inline`) |
| `img-src 'self' data: https:` | Local + data URLs + https images (still filtered by URL policy) |
| `connect-src 'self'` | Lab/API same origin; widen only for an explicit inference proxy host |
| `object-src 'none'` | No plugins |
| `frame-ancestors 'none'` | Not embeddable (adjust if Track B must iframe the canvas) |

## Renderer limits

Browser module: `src/Browser/renderer/limits.js` (lab symlink: `public/assets/js/renderer/limits.js`).

Defaults:

| Limit | Default |
|-------|--------:|
| `maxNodes` | 2000 |
| `maxDepth` | 64 |
| `maxActions` | 64 |
| `maxQueries` | 32 |
| `maxImages` | 64 |
| `maxUpdatesPerTick` | 256 |

`checkLimits(stats)` returns `{ ok: true }` or `{ ok: false, error }`. `withLimits(fn)` runs work under a tracker and stops cleanly when a budget is exceeded.

## Verify

```bash
# Token namespace smoke
node --test tests/browser/css.tokens.test.js

# Limits (hostile tree)
node --test tests/browser/renderer.limits.test.js

# Serve public/ and open /lab/csp.html — DevTools → Network/Console should show no CSP violations for same-origin assets
```
