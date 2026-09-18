# A0.1 — Upstream package disposition

Upstream pin: `ee54f66` in `old/`. Machine-readable: `source-disposition.json`.

| Path | Disposition |
|------|-------------|
| `packages/lang-core` | Port completely |
| `packages/react-lang` | Port behavior (not React hooks) |
| `packages/react-ui/src/genui-lib` | Port contracts + prompt guidance |
| `packages/react-ui/src/components` | Port DOM/CSS/a11y behavior |
| `packages/react-headless` | Port transport adapters selectively |
| Product AgentInterface / companion chrome | Exclude — Track B |
| `browser-bundle` | Exclude |
| Cloud/CLI/Next/Vue/Svelte/RN templates | Reference only |
| Devtools / observability cloud | Exclude initially |

Hardenings: see `intentional-hardenings.md`.
