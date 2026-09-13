import * as path from "node:path";

import type { CliContext } from "../../../lib/context";
import { resolveInstallPackageManager } from "../../../lib/detect-package-manager";
import { upsertEnvVar } from "../../../lib/env";
import type { ExampleProject } from "../../../lib/examples-catalog";
import {
  exampleDevCommand,
  exampleLayout,
  isNestedExample,
  scaffoldExample,
  type ExampleLayout,
} from "../../../lib/scaffold-example";
import { withSpinner } from "../../../lib/spinner";
import { CliCancelledError, CreateError } from "../../../lib/telemetry";
import { cliErrorProperties } from "../../../lib/utils";
import { createFunnelProps } from "./create-telemetry";
import type { CreateAppOptions, EnvResult } from "./create-types";
import { installRequestedSkill, shouldInstallSkill } from "./install-skill";

export async function runCreateExample(params: {
  options: CreateAppOptions;
  interactive: boolean;
  packageManager: ReturnType<typeof resolveInstallPackageManager>;
  t0: number;
  name: string;
  targetDir: string;
  example: ExampleProject;
  ctx: CliContext;
}): Promise<void> {
  const { options, interactive, packageManager, t0, name, targetDir, example, ctx } = params;

  ctx.telemetry.register({ example: example.name, project_category: "example" });
  ctx.telemetry.capture("cli_example_selected", {
    ...createFunnelProps("example_selected"),
    example: example.name,
    example_source: options.example ? "flag" : interactive ? "prompt" : "default",
  });

  ctx.telemetry.capture("cli_env_resolution_started", {
    ...createFunnelProps("env_resolution_started"),
    example: example.name,
  });
  const envResult = await resolveExampleEnv(example, interactive);

  const installSkill = await shouldInstallSkill(options.skill, false);
  ctx.telemetry.capture("cli_skill_installed", {
    ...createFunnelProps("skill_prompt_resolved"),
    skill_installed: installSkill,
  });
  ctx.telemetry.capture("cli_immediate_selected", {
    immediate: false,
    dependency_install_requested: false,
    selection_source: "no_install",
  });

  console.info();
  ctx.telemetry.capture("cli_scaffold_started", {
    ...createFunnelProps("scaffold_started"),
    example: example.name,
  });
  let layout: ExampleLayout | undefined;
  try {
    const runScaffold = () =>
      scaffoldExample({
        example,
        targetDir,
        name,
        packageManager: packageManager.name,
      });
    layout = options.verbose
      ? await runScaffold()
      : await withSpinner("Scaffolding...", runScaffold);
    if (!options.verbose) {
      console.info("✓ Scaffolded");
    }
  } catch (err) {
    const properties = cliErrorProperties(err, {
      failure_stage: "scaffold",
      error_class: "filesystem",
      error_code: "SCAFFOLD_FAILED",
    });
    ctx.telemetry.capture("cli_scaffold_failed", {
      ...createFunnelProps("scaffold_failed"),
      example: example.name,
      ...properties,
    });
    throw new CreateError(
      properties.failure_stage,
      err instanceof Error ? err.message : String(err),
      properties.error_class,
      properties.error_code,
    );
  }
  ctx.telemetry.capture("cli_scaffold_succeeded", {
    ...createFunnelProps("scaffold_succeeded"),
    example: example.name,
  });

  try {
    if (envResult.envKeyValue && example.envKey) {
      upsertEnvVar(path.join(targetDir, example.envFile), example.envKey, envResult.envKeyValue);
    }
  } catch (err) {
    const properties = cliErrorProperties(err, {
      failure_stage: "environment_write",
      error_class: "filesystem",
      error_code: "WRITE_FAILED",
    });
    throw new CreateError(
      properties.failure_stage,
      err instanceof Error ? err.message : String(err),
      properties.error_class,
      properties.error_code,
    );
  }
  ctx.telemetry.capture("cli_env_resolved", {
    ...createFunnelProps("env_written"),
    example: example.name,
    env_written: envResult.envWritten,
  });

  layout ??= exampleLayout(targetDir);
  const installCmd = packageManager.installCmd;
  ctx.telemetry.capture("cli_dependency_install_skipped", {
    skip_reason: "example_scaffold_only",
  });
  ctx.telemetry.capture("cli_dev_command_skipped", {
    skip_reason: "not_immediate",
  });

  const skillInstalled = await installRequestedSkill({
    enabled: installSkill,
    verbose: options.verbose,
    targetDir,
    ctx,
    printFailureLog: true,
  });

  ctx.telemetry.capture("cli_create_succeeded", {
    ...createFunnelProps("create_succeeded"),
    example: example.name,
    duration_ms: Date.now() - t0,
    skill_installed: skillInstalled,
    env_written: envResult.envWritten,
    dependency_installed: false,
  });
  const envKey = example.envKey;
  const envNote = envKey
    ? envResult.envWritten
      ? `✅ ${example.envFile} updated with ${envKey}.`
      : `Add ${envKey}=… to ${example.envFile} (see the example README).`
    : `Add your API keys to ${example.envFile} (see the example README).`;
  const skillMessage = skillInstalled
    ? "The OpenUI agent skill was installed.\nAI coding assistants will use it to help you build with OpenUI.\n"
    : "";
  const nextStep = isNestedExample(layout)
    ? nestedExampleNextSteps({
        name,
        targetDir,
        layout,
        runCmd: packageManager.runCmd,
        installCmd,
      })
    : [`> cd ${name}`, `> ${installCmd}`, `> ${packageManager.runCmd} run dev`].join("\n");

  console.info(
    `\n${[skillMessage.trim(), "Done!", envNote, nextStep].filter(Boolean).join("\n\n")}\n`,
  );
}

async function resolveExampleEnv(
  example: ExampleProject,
  interactive: boolean,
): Promise<EnvResult & { envKeyValue?: string }> {
  if (!example.envKey) {
    return { envWritten: false };
  }

  const apiKey = interactive ? await promptForProviderKey(example.envKey) : null;
  return {
    envWritten: apiKey != null,
    envKeyValue: apiKey ?? undefined,
  };
}

async function promptForProviderKey(envKey: string): Promise<string | null> {
  try {
    const { input } = await import("@inquirer/prompts");
    const apiKey = (
      await input({
        message: `Enter your ${envKey} (leave blank to skip):`,
      })
    ).trim();
    return apiKey || null;
  } catch (error) {
    const { ExitPromptError } = await import("@inquirer/core");
    if (error instanceof ExitPromptError) {
      throw new CliCancelledError("environment_resolution");
    }
    throw error;
  }
}

function posixJoin(...parts: string[]): string {
  return parts.filter((part) => part && part !== ".").join("/");
}

function nestedExampleNextSteps(params: {
  name: string;
  targetDir: string;
  layout: ExampleLayout;
  runCmd: string;
  installCmd: string;
}): string {
  const blocks: string[] = [];
  for (const relative of params.layout.jsPackages) {
    const pkgDir = relative === "." ? params.targetDir : path.join(params.targetDir, relative);
    blocks.push(
      [
        `> cd ${posixJoin(params.name, relative)}`,
        `> ${params.installCmd}`,
        `> ${exampleDevCommand(pkgDir, params.runCmd)}`,
      ].join("\n"),
    );
  }
  for (const relative of params.layout.pythonPackages) {
    blocks.push(
      [`> cd ${posixJoin(params.name, relative)}`, `> uv run uvicorn app.main:app --reload`].join(
        "\n",
      ),
    );
  }
  return blocks.join("\n\n");
}
