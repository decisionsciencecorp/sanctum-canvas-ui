# Handoff fixtures (A8.7)

**Status:** frozen with `canvas-host-v1` (A8.6 mount published).  
Frozen examples for Track B / Merge against `docs/track-a/track-b-handoff-contract.md`.

| File | Covers |
|------|--------|
| `version-negotiation.json` | `canvas-host-v1` accept/reject |
| `canvas-initiation.json` | Normalized initiation payload |
| `ag-ui-text-run.json` | Message/run IDs + text stream |
| `ag-ui-tool-lifecycle.json` | Tool call IDs + non-executing args |
| `continue-conversation.json` | ContinueConversation callback cases |
| `open-url-callback.json` | OpenUrl + URL policy / gesture / incomplete |
| `tool-dispatch-boundary.json` | Allowlist vs hostile names |
| `cancel-and-errors.json` | Cancel, RUN_ERROR, malformed skip |
| `mount-lease-expectations.json` | Mount without lab chrome |

Stream corpus reused: `tests/fixtures/stream/`.
