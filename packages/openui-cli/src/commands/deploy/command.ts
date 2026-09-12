import { Command } from "commander";

import type { CliContext } from "../../lib/context";
import { wrapCommand } from "../../lib/wrap-command";

import { runDeploy } from "./run";

export const deployCommand = new Command("deploy")
  .description("Deploy an OpenUI project")
  .usage("[dir] [options]")
  .argument("[dir]", "Project directory (default: current directory)")
  .option("-y, --yes", "Skip confirmation prompts")
  .option("--skip-env", "Do not pass or save local .env values")
  .option("--no-interactive", "Skip prompts (implies --yes)")
  .option("--verbose", "Stream full deployment build logs")
  .allowUnknownOption()
  .allowExcessArguments()
  .addHelpText(
    "after",
    `
Default supported platform is Vercel. If you are not logged in to the platform, 
opens vercel login first. Links the project when needed, then offers to save 
missing allowlisted keys from .env / .env.local to the project on the platform 
(auto-accepted with --yes). Build logs are hidden by default; pass --verbose 
to stream them. On failure the log tail is printed. Extra flags after deploy 
are forwarded as-is to the target platform, which validates them.

Examples:
  openui deploy
  openui deploy --verbose
`,
  )
  .action(
    wrapCommand(
      "cli_deploy_failed",
      async (
        dir: string | undefined,
        options: {
          yes?: boolean;
          skipEnv?: boolean;
          interactive: boolean;
          verbose?: boolean;
        },
        command: Command,
        ctx: CliContext,
      ) => {
        await runDeploy(
          {
            dir,
            yes: options.yes,
            skipEnv: options.skipEnv,
            noInteractive: !options.interactive,
            verbose: options.verbose,
            extraArgs: command.args,
          },
          ctx,
        );
      },
    ),
  );
