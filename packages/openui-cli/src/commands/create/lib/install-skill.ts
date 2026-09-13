import { printLogTail, QUIET_COMMAND_CAPTURE_LIMIT } from "../../../lib/command-output";
import type { CliContext } from "../../../lib/context";
import {
  runCommand,
  type CommandResult,
  type RunCommandOptions,
} from "../../../lib/process-runner";
import { withSpinner } from "../../../lib/spinner";
import { CliCancelledError } from "../../../lib/telemetry";
import { processErrorProperties } from "../../../lib/utils";
import { createFunnelProps } from "./create-telemetry";

const OPENUI_SKILL_SOURCE = "thesysdev/skills";

export async function shouldInstallSkill(
  option: boolean | undefined,
  interactive: boolean,
): Promise<boolean> {
  if (option !== undefined) return option;
  if (!interactive) return false;

  try {
    const { confirm } = await import("@inquirer/prompts");
    return await confirm({
      message: "Install the OpenUI agent skill for AI coding assistants?",
      default: true,
    });
  } catch (err) {
    const { ExitPromptError } = await import("@inquirer/core");
    if (err instanceof ExitPromptError) {
      throw new CliCancelledError("skill_prompt");
    }
    throw err;
  }
}

export async function runSkillInstall(
  targetDir: string,
  options: RunCommandOptions = {},
): Promise<CommandResult> {
  return runCommand(
    "npx",
    ["-y", "skills", "add", OPENUI_SKILL_SOURCE, "--skill", "openui", "-y"],
    targetDir,
    options,
  );
}

export async function installRequestedSkill(params: {
  enabled: boolean;
  verbose?: boolean;
  targetDir: string;
  ctx: CliContext;
  printFailureLog?: boolean;
}): Promise<boolean> {
  const { enabled, verbose, targetDir, ctx, printFailureLog } = params;
  if (!enabled) return false;

  ctx.telemetry.capture("cli_skill_install_started", {
    ...createFunnelProps("skill_install_started"),
    skill_installed: true,
  });
  const runSkill = () =>
    verbose
      ? runSkillInstall(targetDir)
      : runSkillInstall(targetDir, {
          echo: false,
          stdin: "ignore",
          captureLimit: QUIET_COMMAND_CAPTURE_LIMIT,
        });
  if (verbose) {
    console.info("Installing OpenUI agent skill...\n");
  }
  const skillResult = verbose
    ? await runSkill()
    : await withSpinner("Installing OpenUI agent skill...", runSkill);
  const skillInstalled = !skillResult.error && skillResult.status === 0;
  if (skillInstalled) {
    if (!verbose) {
      console.info("✓ OpenUI agent skill installed");
    }
    ctx.telemetry.capture("cli_skill_install_finished", {
      ...createFunnelProps("skill_install_finished"),
      skill_installed: true,
      duration_ms: skillResult.durationMs,
      exit_code: skillResult.status,
    });
    return true;
  }

  const properties = processErrorProperties(skillResult, "skill_install", {
    error_class: "dependency",
    error_code: "SKILL_INSTALL_FAILED",
  });
  if (properties.error_class === "user_cancelled") {
    ctx.telemetry.capture("cli_skill_install_cancelled", {
      ...createFunnelProps("skill_install_cancelled"),
      skill_installed: false,
      ...properties,
    });
    throw new CliCancelledError(
      "skill_install",
      properties.cancellation_exit_code ?? 0,
      properties,
    );
  }
  ctx.telemetry.capture("cli_skill_install_failed", {
    ...createFunnelProps("skill_install_failed"),
    skill_installed: false,
    ...properties,
  });
  if (printFailureLog && !verbose) {
    printLogTail(skillResult.diagnosticTail, "skill install log (tail)");
  }
  console.warn(
    "\nCould not install the OpenUI agent skill automatically.\n" +
      "You can install it manually later with:\n\n" +
      "  npx skills add thesysdev/skills --skill openui\n",
  );
  return false;
}
