import { Command } from "commander";

import { normalizeAuth } from "../../lib/auth/mint";
import { context } from "../../lib/context";
import { rejectConflictingScaffoldSelectors } from "../../lib/examples-catalog";
import { normalizeBackendFramework, normalizeTemplate } from "../../lib/utils";
import { rejectConflictingImmediateFlags } from "./lib/resolve";

import { runCreateApp } from "./run";

export const createCommand = new Command("create")
  .description(
    "Scaffold a Next.js agent app with the recommended OpenUI Cloud backend or your own provider",
  )
  .option("-n, --name <string>", "Project name (interactive default: openui-agent)")
  .option(
    "-t, --template <template>",
    "AI backend: openui-cloud (recommended default) | openui-self-hosted (infrastructure control)",
  )
  .option(
    "--backend-framework <framework>",
    "Backend framework: default | langgraph | vercel-ai-sdk | vercel-eve",
  )
  .option("-e, --example <example>", "Create from an example in examples/examples.json")
  .option("--api-key <key>", "OpenUI Cloud API key (cloud template; skips sign-in)")
  .option("--auth <method>", "Cloud auth method: oauth | skip (manual is deprecated)")
  .option("--skill", "Install the OpenUI agent skill for AI coding assistants")
  .option("--no-skill", "Skip installing the OpenUI agent skill")
  .option("--no-interactive", "Fail with error if required args are missing")
  .option("--no-install", "Scaffold without running the package install")
  .option("-i, --immediate", "Start the development server after installing dependencies")
  .option("--no-immediate", "Install dependencies without starting the development server")
  .option("--verbose", "Stream full dependency install logs")
  .addHelpText(
    "after",
    `
Templates:
  openui-cloud        Recommended default for prototypes and evaluations.
                      Hosted models, managed conversation history, built-in tools,
                      and ready-to-use reports and presentations. No model, storage,
                      or artifact infrastructure to operate. Bring your own
                      OpenAI/Anthropic/Google key (BYOK) on any plan,
                      including the free tier.
  openui-self-hosted  Choose when owning the OpenAI-compatible provider, AI route,
                      and persistence is a requirement. Available only via
                      --template; interactive runs default to openui-cloud.

Backend frameworks:
  default        Uses OpenAI SDK.
  langgraph      Bootstraps a LangGraph agent with the selected model backend.
  vercel-ai-sdk  Scaffolds a Vercel AI SDK agent with the selected model backend.
  vercel-eve     Scaffolds a Vercel Eve agent with the selected model backend.

OpenUI examples:
  Loaded at runtime from examples/examples.json in the OpenUI repo.
  Pick "Scaffold from OpenUI Examples" in the interactive prompt, or pass
  --example <name> with any catalog folder name.
`,
  )
  .action(
    async (options: {
      name?: string;
      template?: string;
      backendFramework?: string;
      example?: string;
      apiKey?: string;
      auth?: string;
      skill?: boolean;
      interactive: boolean;
      install: boolean;
      immediate?: boolean;
      verbose?: boolean;
    }) => {
      rejectConflictingImmediateFlags(context.argv.slice(2));
      rejectConflictingScaffoldSelectors({
        example: options.example,
        backendFramework: normalizeBackendFramework(options.backendFramework),
        template: options.template,
      });

      await runCreateApp(
        {
          name: options.name,
          template: normalizeTemplate(options.template),
          backendFramework: normalizeBackendFramework(options.backendFramework),
          example: options.example,
          apiKey: options.apiKey,
          auth: normalizeAuth(options.auth),
          skill: options.skill,
          noInteractive: !options.interactive,
          noInstall: !options.install,
          immediate: options.immediate,
          verbose: options.verbose,
        },
        context,
      );
    },
  );
