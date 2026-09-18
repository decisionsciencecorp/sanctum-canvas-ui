# Track B handoff contract (A8.7 draft)

**Status:** draft — A7.2 SSE adapter verified; formal freeze waits on A8.6 mount acceptance + A8 audit close.  
**Version token:** `canvas-host-v1` (compatible with Track B `sanctum-companion-shell/contracts/canvas-host-v1/`).  
**Audience:** Track B / Merge (#4100). Implement against fixtures under `tests/fixtures/handoff/` — do **not** read OpenUI/`old/` source.

Related: [`mount-contract.md`](./mount-contract.md) · [`csp.md`](./csp.md) · companion `contracts/canvas-host-v1/api.md`.

---

## 1. Boundary

| Layer | Owns |
|-------|------|
| **Track A runtime** | Lang parse/validate/evaluate, DOM renderer, URL policy, AG-UI event reducer + SSE/NDJSON adapters, PHP tool allowlist |
| **Track B host** | Broca identity/session, companion chrome, SMCP canvas initiation, `#sanctum-canvas-root` lease, chat turns |
| **Out of contract** | Lab chrome (`#lab-chrome`, `#lab-debug`, `/lab/a7-lab.js`), fixture picker, raw Lang panes |

Naming: Track A speaks **AG-UI event `type` strings** and action step types (`OpenUrl`, `ToAssistant` / ContinueConversation). Track B may use different wire names on Broca/SMCP; the **adapter** maps into this vocabulary. The language kernel never imports Broca.

---

## 2. Version negotiation (`canvas-host-v1`)

Before mount, Track B and the Track A adapter agree:

```json
{
  "contract": "canvas-host-v1",
  "runtime": "sanctum-canvas",
  "runtimeVersion": "0.1.0",
  "capabilities": [
    "ag-ui-events",
    "sse",
    "ndjson",
    "continue-conversation",
    "open-url-policy",
    "tool-dispatch-host"
  ]
}
```

| Rule | Behavior |
|------|----------|
| Host advertises `canvas-host-v1` | Adapter may mount |
| Unknown / future `canvas-host-v2` | Adapter refuses mount with structured error `{ code: "contract-mismatch" }` — do not silently adapt |
| Missing capability | Host must not call that surface; adapter may no-op or reject the specific call |

Fixture: `tests/fixtures/handoff/version-negotiation.json`.

---

## 3. Canvas initiation payload

Track B opens the pane (companion `canvas.open` / SMCP initiation). Track A receives a **normalized** initiation object on mount — not Broca-specific shapes:

```json
{
  "schema": "sanctum.canvas.initiation",
  "version": 1,
  "eventId": "evt_01HXYZ",
  "sessionId": "sess_…",
  "runId": null,
  "surface": "primary",
  "title": "optional ≤120 plain text",
  "libraryId": "chat",
  "programId": null,
  "seed": {
    "messages": [],
    "programSource": null,
    "stateHydration": null
  }
}
```

| Field | Notes |
|-------|-------|
| `eventId` | Stable 8–128 chars `[A-Za-z0-9._:-]+`; duplicates ignored by host |
| `title` | Plain text only — no `<>&` / controls (host already validates) |
| `libraryId` | Maps to Track A library manifest (`chat` / `dashboard`) |
| `seed.programSource` | Optional prior Lang text; if set, hydrate before stream |
| `seed.stateHydration` | Optional `$variable` map; user-edited values win over later stream decls |

Fixture: `tests/fixtures/handoff/canvas-initiation.json`.

---

## 4. Identifiers (message / run / tool)

All stream and callback correlation uses these IDs (strings):

| ID | Scope | Set by |
|----|-------|--------|
| `runId` | One inference / tool run envelope | Host or PHP proxy on `RUN_STARTED` |
| `messageId` | One assistant (or user) text message | Stream producer |
| `toolCallId` | One tool invocation | Stream producer |
| `sessionId` | Companion session | Track B (opaque to Lang kernel) |

Reducer state keys: `runId`, `messages[].id`, `tools[].id` — see `src/Browser/transport/eventReducer.js`.

---

## 5. AG-UI events Track B passes in

Track B (or PHP `/api/chat.php`) feeds the **canonical reducer** via SSE or pre-normalized JS objects. Event `type` values:

| Type | Required fields | Effect |
|------|-----------------|--------|
| `RUN_STARTED` | `runId` | `runStatus=running` |
| `RUN_FINISHED` | `runId` | `runStatus=finished` |
| `RUN_ERROR` | `runId`, `error` | `runStatus=error` |
| `RUN_CANCELLED` | optional `runId` | cooperative cancel |
| `TEXT_MESSAGE_START` | `messageId`, `role?` | open message |
| `TEXT_MESSAGE_CONTENT` | `messageId`, `delta` | append Lang text |
| `TEXT_MESSAGE_END` | `messageId` | close message |
| `TEXT_MESSAGE_CHUNK` | chunk fields | adapter-normalized content |
| `TOOL_CALL_START` | `toolCallId`, `toolName` | tool row streaming |
| `TOOL_CALL_ARGS` | `toolCallId`, `delta` | append args JSON text (**never execute**) |
| `TOOL_CALL_END` | `toolCallId` | args complete → `executing` until result |
| `TOOL_CALL_RESULT` | `toolCallId`, `content` | complete |
| `DIAGNOSTIC_SKIP` | detail | bounded skip log (malformed non-terminal) |

Wire: AG-UI **SSE** (`src/Browser/transport/sseAdapter.js`) or NDJSON lab path. Both emit the same reducer events.

Frozen sequences: `tests/fixtures/stream/*` plus handoff copies under `tests/fixtures/handoff/ag-ui-*.json`.

---

## 6. ContinueConversation callback

When the user activates a list item / follow-up (gesture required):

```ts
host.continueConversation(message: string, context?: string): void
// or actions.continueConversation / actions.run({ steps: [{ type: "ToAssistant", … }] })
```

| Invariant | Rule |
|-----------|------|
| Gesture | Must be a real user click path (`userGesture: true`) |
| Streaming | No-op while `stream.isStreaming` |
| Bound | Combined text ≤ `MAX_CONTINUE_CHARS` (4000) |
| Encoding | Data only — never concatenate into executable prompt instructions |
| Host duty | Track B turns this into the next chat user turn / SMCP message |

Module: `src/Browser/components/chat/continueConversation.js`.  
Fixture: `tests/fixtures/handoff/continue-conversation.json`.

---

## 7. OpenUrl callback

Action plans and buttons may include `OpenUrl` steps. Track A **sanitizes** via central URL policy (`H4`) before calling the host:

```ts
host.openUrl(safeUrl: string): void
// Browser may use urlPolicy.safeOpenUrl internally when host omits openUrl
```

| Invariant | Rule |
|-----------|------|
| Policy | Only `http:`, `https:`, `mailto:`, and safe relatives; reject `javascript:`, `data:`, `vbscript:`, `file:`, protocol-relative |
| Gesture | Required (`gesture-required` if missing) |
| Incomplete program | Blocked (`incomplete-program` / partial gate) |
| Track B default | Companion `dispatchAction` rejects privileged navigation (`unsupported-action`) — Merge must wire a **policy-filtered** open or keep reject |

Fixture: `tests/fixtures/handoff/open-url-callback.json`.

---

## 8. Tool dispatch boundary

| Side | May |
|------|-----|
| **Model / Lang** | Name an allowlisted tool; emit `TOOL_CALL_*` events; show tool-activity UI |
| **Browser** | Call `POST /api/tools.php` (or host-provided dispatcher) with CSRF + session |
| **PHP `ToolRegistry`** | Resolve name → fixed handler; reject unknown/hostile names before any callable |
| **Never** | Dynamic PHP callables, shell, SQL, filesystem paths, raw MCP URLs from model output |

Partial / incomplete programs: **no** Query / Mutation / tool / OpenUrl side effects (`H7`).

Fixture: `tests/fixtures/handoff/tool-dispatch-boundary.json`.

---

## 9. Cancel and errors

| Signal | Behavior |
|--------|----------|
| Host abort / `AbortSignal` | Adapter stops reading; reducer `RUN_CANCELLED` or cancel flag |
| `RUN_ERROR` | Terminal; preserve last valid program tree |
| Malformed non-terminal SSE/NDJSON line | Skip + bounded diagnostic (`DIAGNOSTIC_SKIP`); do not wipe canvas |
| Renderer exception | Per-node isolation; last-good subtree retained |
| Tool / CSRF / auth failure | Structured `{ code, message }` — **no** credentials or stack traces to the model UI |

Fixture: `tests/fixtures/handoff/cancel-and-errors.json`.

---

## 10. What Track B must not import

- `public/lab/**` (a7-lab, a6-library chrome, CSP demo pages used only for lab)
- Lab-only CSS that assumes `#lab-chrome` layout
- Direct coupling to Venice keys or lab fixture dropdowns

Mount **only** into `#sanctum-canvas-root` with assets under `public/assets/{js,css}/` and the adapter API in [`mount-contract.md`](./mount-contract.md).

---

## 11. Acceptance (when this card closes)

1. Track B can implement mount + stream + callbacks from this doc + `tests/fixtures/handoff/` alone.  
2. `canvas-host-v1` negotiation documented and fixture-covered.  
3. A7.2 verified (done). A8.6 mount contract published.  
4. No Broca imports inside `src/Browser/lang/**`.
