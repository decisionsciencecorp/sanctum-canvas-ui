This is an [OpenUI](https://openui.com) Cloud project bootstrapped with [`openui-cli`](https://openui.com/docs/chat/quick-start).

## Setup

The CLI writes `.env` for you. If you cloned the generated project elsewhere,
run `pnpm generate:apiKey` to mint `THESYS_API_KEY`, then add `DEMO_USER_ID`
and `APP_ID`.

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/api/chat/route.ts` and improving your agent
by adding system prompts or tools. A LangGraph scaffold puts the implementation in
`src/agent/agent.ts` instead.

## Deploy

From the project directory:

```bash
npx @openuidev/cli@latest deploy
```

Deploys to your Vercel account. The first deployment may be production; check Vercel's reported environment and access settings before sharing.

Allowlisted keys from `.env` / `.env.local` (including `THESYS_API_KEY`) are attached to this deployment's build and runtime, with shell values taking precedence. `--skip-env` disables automatic attachment and saving. Request `--target preview` or `--prod` to also offer saving missing file values to that environment only; declining still uses them for this run. Existing saved keys are not overwritten.

Open the hosted URL and repeat the prompt that worked locally. Check streaming, tools, storage and recipient access. `--no-wait` only submits the deployment; wait for Ready before testing. Rerun the same command and environment flags to deploy updates.

Before public or multi-user use, replace the shared demo identity with authenticated server-side users, protect both `/api/chat` and `/api/frontend-token`, authorize conversations and set usage limits. Deploying does not add these controls. Use deployment protection for controlled evaluation.

Follow the [deployment guide](https://www.openui.com/docs/deploy) for the full checklist and recovery steps.

## Framework deployments

The current LangGraph scaffold runs in-process inside the Next.js `/api/chat` route; it does not require a separate Agent Server. Older scaffolds with `langgraph.json` and a `LANGGRAPH_API_URL` proxy need that server hosted separately at a reachable URL.

The Vercel AI SDK scaffold is a standard Next.js app: `streamText()` owns the
agent loop and UIMessage stream, so the whole project can be deployed to Vercel.

In both variants, your framework executes application tools. OpenUI Cloud
provides managed conversation storage and executes its provider tools: reports,
presentations, web search, image search, and configured MCP servers.

## Conversation storage

OpenUI Cloud is the only durable conversation and artifact store in every Cloud
variant. The browser connects directly through `useOpenuiCloudStorage()` with a
short-lived token from `/api/frontend-token`. For default, LangGraph, and
Vercel AI SDK routes, the `threadId` sent to `/api/chat` is the Cloud
conversation id, and the route appends each model turn to it with
`conversation: threadId` and `store: true`. The Eve overlay uses that same Cloud
thread store and maps each Cloud `threadId` to an Eve session cursor in the
browser; it does not use `/api/chat`.
Browser `localStorage` holds only the selected model (and, for Eve, the session
cursor), not conversation messages.

The Vercel AI SDK route does not create a second store. Add a LangGraph
checkpointer separately only if the graph needs durable state, interrupts, or
resumable runs.

## Switching Models

Use the model switcher in the chat header to choose a model for new messages. The starter keeps a
small curated model list in `src/lib/models.tsx` and sends the selected `provider/model` id to
`/api/chat`, which validates it against the same list. The built-in list includes Gemini, GPT,
Claude Sonnet, and Claude Opus options; free Gemini variants are marked with a `Free` badge.

The built-in model ids are available on [models.dev's OpenRouter provider
list](https://models.dev/providers/openrouter/).

## SDK packages

- `@openuidev/lang-core` — `generateSystemPrompt({ cloud: true })` and `artifactTool`
  (from `@openuidev/lang-core/cloud`) used by the `/api/chat` route.
- `@openuidev/thesys` — the React component library (`chatLibrary`, `Presentation`,
  `Report`) used by the client page and artifact renderers.
- `@openuidev/react-ui` — the chat UI runtime (`AgentInterface`, `fetchLLM`,
  `ModelSwitcher`, storage/stream contracts).

A devtools widget is available automatically in development.

## Learn More

To learn more about OpenUI, take a look at the following resources:

- [OpenUI Documentation](https://openui.com/docs) - learn about OpenUI features and API.
- [OpenUI GitHub repository](https://github.com/thesysdev/openui) - your feedback and contributions are welcome!
