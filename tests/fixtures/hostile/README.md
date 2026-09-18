# Hostile fixtures (A4)

These snippets deliberately try to break out of the Sanctum canvas renderer.

| File | Attack | Expected rejection |
|------|--------|--------------------|
| `javascript-url.json` | Markdown `[x](javascript:…)` | `sanitizeUrl` drops href; no `<a href="javascript:…">` |
| `markdown-event-handlers.json` | Raw `<img onerror>` / `<p onclick>` / `<script>` in markdown | Escaped or stripped; no live handlers/script |
| `markdown-iframe-math.json` | Raw `<iframe>` / `<math>` | Escaped; no iframe/math elements |
| `markdown-table-xss.json` | XSS inside GFM table cells | Escaped text in `<td>`; no script/onerror |
| `markdown-citation-smuggle.json` | Cite smuggling + js link labeled `[2]` | `data-citation` only for `[n]`; js href dropped |
| `unknown-component.json` | OpenUI type `EvilScriptRunner` with hostile props | Inert `data-openui-unknown` fallback; no tool/script invoke |

**Citations (A4.5):** numeric `[1]` / `[1][2]` → `<cite data-citation="N">N</cite>`. Not raw HTML.

Run: `node --test tests/browser/markdown.test.js tests/browser/registry.test.js tests/browser/reconciler.test.js`
