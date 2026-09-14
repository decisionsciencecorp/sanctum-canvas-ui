---
"@openuidev/cli": patch
---

Improve the create-to-deploy journey with neutral destination messaging, key-source summaries, backend preflight checks, hosted verification guidance and a canonical deployment guide. Save missing local file values only for an explicitly selected preview/production environment, instead of across all environments; plain deploy uses deployment-only values.

Track hint exposure, sticky experiment attribution and deployment stages. Distinguish no-wait submission from waiting-mode readiness while preserving CLI success events and telemetry opt-out. Report requested versus Vercel-labeled environments without assuming preview. Use the positional directory argument instead of forwarded `--cwd` so validation and env loading cannot target a different app.
