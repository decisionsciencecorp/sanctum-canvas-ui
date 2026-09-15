# Devtools-only deployment PR

User scope: reduce PR #1172 to devtools; retain the local popup and add a command-copy banner inside Inspect.

1. Remove this branch's non-devtools changes relative to its merge base. Preserve the earlier commits so removed work remains recoverable.
2. Share command/copy feedback between the popup and a compact persistent Inspect banner. Keep development + loopback gating and the deployHint opt-out. Link to the existing CLI deployment documentation, not the removed guide.
3. Run existing devtools tests, lint, types, build, formatting, and browser QA for banner/popup/copy/opt-out/production.
4. Commit and push to the existing PR; update title/body to the narrowed scope without closing the broader issue.
