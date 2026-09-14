# Deploy adoption release handoff

This is a maintainer checklist and draft launch material, not a published campaign or a claim of measured uplift.

## Release order

1. Release the CLI changeset and confirm the published `@openuidev/cli@latest` contains the destination/env changes and telemetry contract. Template manifests/READMEs come from the template catalog source; verify a fresh scaffold too.
2. Release the devtools changeset. Auto-mounted devtools fetch the major-0 CDN bundle. Exact CDN pins need updating; manual wrappers need the updated package for the host development-mode gate. Check cache propagation before calling the nudge live.
3. Publish the website guide/homepage updates. Verify `/docs/deploy`, its MDX form, `llms.txt`, `llms-full.txt`, search and copied commands against the published CLI.
4. Coordinate with the existing [skills PR #15](https://github.com/thesysdev/skills/pull/15) under `skills-worktrees/skill-openui-deploy`; do not duplicate the public OpenUI skill. Its recipe should link to the guide and reflect use-once versus explicit-environment saving.
5. Audit the console's actual setup flow in its owning repo. If there is a local-app setup success step, add a secondary “Deploy your local app” link to this guide. Do not imply the console can upload local files or add a deployment button without that capability.

The original journey FigJam is [OpenUI Deploy · Discovery, DX & Developer Journey](https://www.figma.com/board/W54yREkyKtR7GpEgVs9nhe). Its initial post-create/quickstart opportunity labels predate the current-main correction: those nudges already existed. This PR refines them and adds missing surfaces; it does not introduce terminal discovery from zero.

## Acceptance checks before launch

- Fresh default, LangGraph and Vercel AI SDK starters: local response → build → deploy → hosted prompt, tools and configured storage. Exercise Cloud and self-hosted variants. Use approved test credentials and a controlled Vercel project, not production data.
- New versus linked projects, personal/team destinations, explicit preview/production, default target, `--skip-env`, declined persistence, `--yes`, no TTY, `--no-wait`, and failed/cancelled builds.
- Confirm Vercel output/environment semantics with both the pinned fallback CLI and supported installed CLI versions. Unrecognized labels must remain “not confirmed.”
- Local nudge: success only, one-time origin persistence, dismissal, disabled/blocked storage, failed clipboard copy, keyboard access, narrow viewport, light/dark, no hosted/production card and no network analytics.
- Guide and copy events arrive in PostHog with only bounded source categories; CLI opt-out suppresses capture and flag evaluation. Validate delivery in a permitted analytics environment before relying on a dashboard.

Real deployment and live analytics-ingestion checks require an approved test project/credentials. Unit/mocked checks do not replace these.

## Tutorial and demo recording brief

Use the canonical guide as the written tutorial, keeping a single source for flags and setup. Record a 45–60 second walkthrough after the release is available:

1. Create an app and show the existing completion hint (hide credentials and account identifiers).
2. Ask a local prompt such as “Compare three travel options in a table.” Show a completed useful result and the optional local share card.
3. Copy `npx @openuidev/cli@latest deploy`, run it in the project folder and show destination plus key names, never values.
4. Show the confirmed deployment environment and Ready status. Open the hosted app and repeat the prompt.
5. Confirm recipient access and end on the actual hosted response, not the deployment log. Link the guide in the caption.

Do not invent a hosted demo URL or publish an unauthenticated shared-identity Cloud starter. Review the app's auth/authorization/rate limits before public access. Crop terminal paths, account IDs, prompts containing private data, and credentials from recordings.

## Draft release/community copy

> Built something useful with OpenUI locally? Deploy it to your Vercel account with `npx @openuidev/cli@latest deploy`. The CLI helps with login, project linking and supported environment variables. Open the hosted app, try your prompt, check access and share. Start with the [deployment guide](https://www.openui.com/docs/deploy).

Use this for the release note/community example after publication, with a real reviewed screenshot or recording. Publishing to social/community channels and scheduling a campaign are separate actions; none are automated by this PR.

## Measurement and experiment

Use [the telemetry contract](../packages/openui-cli/TELEMETRY.md) for event names and dashboard recipes. Establish a baseline after the discovery/DX rollout stabilizes. Track first ready deployment within seven days and repeat ready deployers; split no-wait submissions, CI and agent cohorts.

The optional `cli-deploy-hint-v2` flag tests terminal heading copy only. No flag is enabled in this PR. Keep complete conversion windows and inspect baseline traffic before choosing a sample size or uplift target. Do not claim that a before/after change proves causality.

The devtools hint is not randomized or instrumented. A local-nudge experiment needs a separately designed consent/assignment bridge. Same-project analytics and hosted-response tracking remain explicitly excluded; browser copies, CLI invocations, build readiness and hosted application success are different milestones.
