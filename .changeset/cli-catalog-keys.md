---
"@openuidev/cli": minor
---

`--template` and `--backend-framework` now accept catalog keys only (`openui-cloud`, `openui-self-hosted`, `default`, `langgraph`, `vercel-ai-sdk`, `vercel-eve`). Short names like `cloud` and `eve` no longer resolve. `--verbose` is a global flag, so it works before or after the command.
