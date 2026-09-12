import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import { Command } from "commander";

import { commands } from "./commands";
import { detectAgent, UNKNOWN_AGENT_NAME } from "./lib/detect-agent";
import { telemetry } from "./lib/telemetry";

export function buildProgram(): Command {
  const program = new Command();

  const cliVersion = (
    JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")) as {
      version: string;
    }
  ).version;

  program.name("openui").description("CLI for OpenUI").version(cliVersion);
  program.option("--no-telemetry", "Disable anonymous usage analytics");
  program.option(
    "--agent-name <name>",
    "AI agents: declare your stable lowercase kebab-case product slug for telemetry (e.g. codex or claude-code); humans can omit",
    UNKNOWN_AGENT_NAME,
  );
  program.configureHelp({ showGlobalOptions: true });

  program.hook("preAction", (_thisCommand, actionCommand) => {
    const globalOptions = program.opts<{ agentName: string; telemetry?: boolean }>();
    const command = actionCommand.name();
    telemetry.init({ cliVersion, flagEnabled: globalOptions.telemetry !== false });
    telemetry.register({
      agent_name: globalOptions.agentName,
      detected_agent_name: detectAgent(),
      cli_run_id: randomUUID(),
      command,
    });
    telemetry.capture("cli_invoked");
  });

  for (const command of commands) {
    command.configureHelp({ showGlobalOptions: true });
    program.addCommand(command);
  }

  return program;
}
