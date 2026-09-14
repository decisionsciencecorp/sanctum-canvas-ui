This is an [OpenUI](https://openui.com) Self Hosted Chat project bootstrapped with [`openui-cli`](https://openui.com/docs/chat/quick-start).

## Setup

Create `.env.local` with your OpenAI credentials:

```bash
OPENAI_API_KEY=...
# Optional:
OPENAI_MODEL=gpt-5.2
```

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/api/chat/route.ts` and improving your agent
by adding system prompts or tools. A LangGraph scaffold puts the
implementation in `src/agent/agent.ts` instead.

If you selected LangGraph, the Vercel AI SDK, or Vercel Eve, the generated app includes a `get_weather`
example. Ask “What’s the weather in Berlin?” to exercise its native tool loop.

## Deploy

From the project directory:

```bash
npx @openuidev/cli@latest deploy
```

Deploys to your Vercel account. The first deployment may be production; check Vercel's reported environment and access settings before sharing.

Allowlisted keys from `.env` / `.env.local` (including `OPENAI_API_KEY`) are attached to this deployment's build and runtime, with shell values taking precedence. `--skip-env` disables automatic attachment and saving. Request `--target preview` or `--prod` to also offer saving missing file values to that environment only; declining still uses them for this run. Existing saved keys are not overwritten.

Open the hosted URL and repeat the prompt that worked locally. Check streaming, tools and recipient access. `--no-wait` only submits the deployment; wait for Ready before testing. Rerun the same command and environment flags to deploy updates.

Protect access for controlled evaluation. Before public use, authenticate requests and add usage limits to protect your model key and application tools. Deployment does not add authentication or durable storage.

Follow the [deployment guide](https://www.openui.com/docs/deploy) for the full checklist and recovery steps.

## Framework deployments

The current LangGraph scaffold runs in-process inside the Next.js `/api/chat` route. Older scaffolds with `langgraph.json` and a `LANGGRAPH_API_URL` proxy need that server hosted separately at a reachable URL.

The Vercel AI SDK scaffold runs its backend inside the Next.js API route, so the
frontend and backend can be deployed together as one Next.js project.

## Conversation storage

This starter does not configure durable conversation storage. `AgentInterface`
keeps messages in memory for the current page session and sends that history to
`/api/chat`; refreshing the page loses it. To persist conversations, pass a storage
implementation to `AgentInterface` and back it with your own database. Add a
LangGraph checkpointer separately only for graph-specific durable state.

## Learn More

To learn more about OpenUI, take a look at the following resources:

- [OpenUI Documentation](https://openui.com/docs) - learn about OpenUI features and API.
- [OpenUI GitHub repository](https://github.com/thesysdev/openui) - your feedback and contributions are welcome!
