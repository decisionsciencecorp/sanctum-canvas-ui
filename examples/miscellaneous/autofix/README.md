# Autofix

A standalone Next.js **AgentInterface** example of the [OpenUI Autofix API](https://www.openui.com/docs/gateway/api/autofix). Choose a saved broken generation or paste OpenUI Lang into the chat. Each assistant reply contains the repair status, rendered interface, original and repaired code, and diagnostics.

## What this demonstrates

- `AgentInterface` for the chat shell, conversation starters, in-memory threads, composer, cancellation, and request errors.
- Local validation with `createParser` against a custom four-component library.
- A server-side call to `POST /v1/autofix`, using `generateSystemPrompt({ cloud: true, library })` in the **first system message** and the generation in the **last assistant message**.
- Complete output replacement, error diagnostics, and handling of `fixed`, `already_valid`, and `fix_failed`.
- Bare and Markdown-fenced generations, optional request context, cancellation of stale requests, and a rendered preview inside the assistant message.

The sample starts with saved model output so you can reproduce a repair without calling a model to generate a broken response first. The repair itself uses the real Autofix API. A provider key is not needed; only `THESYS_API_KEY` is required for repair.

## Getting started

Requires Node.js 20.19+ (or 22.12+) and pnpm, npm, or Bun.

```bash
cd examples/miscellaneous/autofix
pnpm install --ignore-workspace
cp .env.example .env.local
```

Set `THESYS_API_KEY` in `.env.local` using a key from [the Thesys console](https://console.thesys.dev/keys). You can also run `pnpm generate:apiKey`.

```bash
pnpm dev
```

Open [localhost:3000](http://localhost:3000). The chat shell loads without credentials; submitting a sample or program requires a key. With npm or Bun, use the equivalent `install` and `run dev` commands; `--ignore-workspace` is only needed for pnpm inside this repository.

### Backend compatibility

This example requires the Autofix contract introduced in [Muse #604](https://github.com/thesysdev/muse/pull/604) and the matching edge update in [Coda #1031](https://github.com/thesysdev/coda/pull/1031) to be deployed. It sends the actual component library in a config message. It does not send the removed top-level `library` field or rely on a default library.

`AUTOFIX_API_URL` optionally overrides `https://api.thesys.dev/v1/autofix` for a compatible development/staging backend. Both environment variables remain server-side. This is a local reference app; add your application's authentication and request quotas before making its proxy publicly accessible.

## Try it

1. **Unknown component:** `Heading` is unavailable; the library defines `Header`.
2. **Missing value:** `Metric` lacks a required value, supplied in the original request context.
3. **Missing reference:** `note` is referenced but never defined.
4. **Fenced output:** repair a fenced program while retaining the fence.
5. **Already valid:** check a valid program and receive it unchanged.

Click a conversation starter to repair its saved output, or paste a bare/fenced OpenUI Lang program into the composer. To include the original request context with custom code, send JSON:

```json
{
  "generation": "root = Card([metric])\nmetric = Metric(\"Revenue\")",
  "context": "Show revenue of $48,200."
}
```

The four available components are `Card(children)`, `Header(title)`, `Text(content)`, and `Metric(label, value, detail?)`. This is a repair chat: it accepts completed output, rather than generating a new UI from a natural-language prompt. Every turn is an independent repair; prior chat reports are not forwarded to Autofix.

Repairs are model-generated, so their exact wording may vary. The example always shows the real status and diagnostics returned by the API. `fix_failed` preserves the original source in the message and shows the remaining errors; it never renders a null result as a success. Network and setup errors use AgentInterface's error/retry state.

## How it works

```text
AgentInterface starter or composer → ChatLLM.send
       ↓ { generation, context }
Next.js /api/autofix → OpenUI /v1/autofix (stream: false)
       ↓
Complete JSON response → message adapter → assistant repair report
       ↓
Local validation → Renderer inside AgentInterface
```

The OpenUI CLI generates `src/generated/spec.json` from `src/library.tsx` before `dev`, `build`, and `verify`. That same spec drives the browser parser and server config message, and `Renderer` uses the original library. Generated files are ignored by Git.

The browser sends only `{ generation, context }`. The server validates sizes, constructs the system/user/assistant messages, adds its API key, and makes one non-streaming request. It imposes a 90-second timeout and forwards cancellation. The `ChatLLM` transport forwards AgentInterface's abort signal and checks it before publishing a completed message, so cancelling cannot insert a stale repair result. Backend cancellation and billing follow the gateway's normal behavior; stopping the UI request does not guarantee provider work stops.

AgentInterface expects a message-event adapter. `src/lib/autofix-chat.ts` adapts the completed JSON into one assistant content event; it does not request or simulate token streaming from Autofix. The `components.AssistantMessage` slot renders the report and uses `Renderer` only after the returned code passes local validation. Threads use AgentInterface's default in-memory storage and reset on refresh.

The API accepts at most 100,000 generation characters and 20 usable context turns totaling 8,000 characters, excluding config blocks. This example uses one optional user context turn and enforces those character limits. In a real conversation, send relevant preceding turns while preserving the first config turn and final assistant generation. Repair only after generation has finished; incomplete streaming output is expected to contain transient errors.

The chat intentionally lets you call the API on the valid sample to demonstrate `already_valid`. In a production flow, skip the call when local validation passes. The API also supports OpenUI sentinel frames and preserves their context; this example demonstrates bare/fenced programs and does not implement a separate frame parser.

## Key files

| File                                | Purpose                                                              |
| ----------------------------------- | -------------------------------------------------------------------- |
| `src/library.tsx`                   | `Card`, `Header`, `Text`, and `Metric` schemas and renderers         |
| `src/lib/samples.ts`                | Reproducible broken and valid output                                 |
| `src/lib/validation.ts`             | Parser diagnostics, including unresolved references and missing root |
| `src/lib/autofix.ts`                | Config-message construction and server transport                     |
| `src/lib/contract.ts`               | Request limits and response validation                               |
| `src/app/api/autofix/route.ts`      | Server credentials, timeout, and HTTP errors                         |
| `src/app/page.tsx`                  | AgentInterface shell, starter prompts, and message slot              |
| `src/lib/autofix-chat.ts`           | Chat input, cancellable transport, and complete-response adapter     |
| `src/components/repair-message.tsx` | Status, diagnostics, code, and rendered assistant result             |
| `tests/autofix.test.ts`             | Real parser fixtures and mocked API/route checks                     |
| `tests/autofix-chat.test.ts`        | Chat transport, statuses, limits, and stale-result cancellation      |

## Verify

```bash
pnpm verify
```

This generates the spec, runs ESLint and local tests, and performs a production Next.js build. It requires no API key and makes no model calls. `pnpm test` runs just the local tests. Real endpoint verification requires the compatible backend and an API key; local tests stub only the HTTP transport.

## Extend it

Replace or extend `src/library.tsx` with your own components, update the samples, and rerun `pnpm generate`. To integrate with a model, send the completed model response and its relevant conversation context through the same server helper, then replace that assistant response with `choices[0].message.content` only on success. Handle runtime/tool failures separately; fixing code cannot restore an unavailable external service.
