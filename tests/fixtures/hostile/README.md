# Hostile fixtures (A4)

These snippets deliberately try to break out of the Sanctum canvas renderer.

| File | Attack | Expected rejection |
|------|--------|--------------------|
| `javascript-url.json` | Markdown `[x](javascript:…)` | `sanitizeUrl` drops href; no `<a href="javascript:…">` |
| `markdown-event-handlers.json` | Raw `<img onerror>` / `<p onclick>` / `<script>` in markdown | Escaped or stripped; no live handlers/script |
| `unknown-component.json` | OpenUI type `EvilScriptRunner` with hostile props | Inert `data-openui-unknown` fallback; no tool/script invoke |

Run: `node --test tests/browser/markdown.test.js tests/browser/registry.test.js tests/browser/reconciler.test.js`
