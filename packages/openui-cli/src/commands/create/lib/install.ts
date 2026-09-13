import * as fs from "node:fs";
import * as path from "node:path";

import { printLogTail, QUIET_COMMAND_CAPTURE_LIMIT } from "../../../lib/command-output";
import type { CliContext } from "../../../lib/context";
import type { PackageManager } from "../../../lib/detect-package-manager";
import { mutedNpmEnv, runCommand } from "../../../lib/process-runner";
import { withSpinner } from "../../../lib/spinner";
import { CliCancelledError, CreateError } from "../../../lib/telemetry";
import { processErrorProperties } from "../../../lib/utils";
import { createFunnelProps } from "./create-telemetry";
import type { OverlayName, TemplateName } from "./create-types";

export function resolveInstallInvocation(params: {
  backendFramework: OverlayName;
  packageManager: PackageManager;
  targetDir: string;
}): { installCmd: string; installArgs: string[] } {
  const { backendFramework, packageManager, targetDir } = params;
  // Framework scaffolds without an npm lock must resolve ranges against the
  // registry (`npm install`). When a backend overlay ships package-lock.json,
  // keep the normal `npm ci` path. --prefer-offline is only safe for `npm ci`,
  // where the lockfile pins exact versions and cache hits are content-addressed;
  // bare `npm install` can fail with ETARGET on a stale packument cache.
  const frameworkInstall = backendFramework !== "default";
  const hasNpmLock = fs.existsSync(path.join(targetDir, "package-lock.json"));
  const installCmd =
    frameworkInstall && packageManager.name === "npm" && !hasNpmLock
      ? "npm install --no-audit --no-fund --progress=false"
      : frameworkInstall && packageManager.name === "pnpm"
        ? "pnpm install --no-frozen-lockfile"
        : packageManager.installCmd;
  const installArgs =
    frameworkInstall && packageManager.name === "npm" && !hasNpmLock
      ? ["install", "--no-audit", "--no-fund", "--progress=false"]
      : frameworkInstall && packageManager.name === "pnpm"
        ? ["install", "--no-frozen-lockfile"]
        : packageManager.installArgs;
  return { installCmd, installArgs };
}

export async function installProjectDependencies(params: {
  ctx: CliContext;
  verbose?: boolean;
  targetDir: string;
  template: TemplateName;
  aiSetup: string;
  packageManager: PackageManager;
  installCmd: string;
  installArgs: string[];
  installDependencies: boolean;
}): Promise<boolean> {
  const {
    ctx,
    verbose,
    targetDir,
    template,
    aiSetup,
    packageManager,
    installCmd,
    installArgs,
    installDependencies,
  } = params;

  if (!installDependencies) {
    ctx.telemetry.capture("cli_dependency_install_skipped", {
      skip_reason: "no_install_flag",
    });
    console.info(`Skipping dependency install (--no-install). Run \`${installCmd}\` later.`);
    return false;
  }

  ctx.telemetry.capture("cli_dependency_install_started", {
    ...createFunnelProps("dependency_install_started"),
    template,
    ai_setup: aiSetup,
  });
  const runInstall = () =>
    verbose
      ? runCommand(packageManager.runCmd, installArgs, targetDir)
      : runCommand(packageManager.runCmd, installArgs, targetDir, {
          echo: false,
          stdin: "ignore",
          captureLimit: QUIET_COMMAND_CAPTURE_LIMIT,
          env: mutedNpmEnv(),
        });

  if (verbose) {
    console.info(`Installing dependencies with: ${installCmd}\n`);
  }
  const installResult = verbose
    ? await runInstall()
    : await withSpinner("Installing dependencies...", runInstall);
  if (!installResult.error && installResult.status === 0) {
    if (!verbose) {
      console.info("✓ Dependencies installed");
    }
    ctx.telemetry.capture("cli_dependency_install_succeeded", {
      ...createFunnelProps("dependency_install_succeeded"),
      template,
      ai_setup: aiSetup,
      dependency_installed: true,
    });
    return true;
  }

  if (!verbose) {
    printLogTail(installResult.diagnosticTail, "install log (tail)");
  }
  const properties = processErrorProperties(installResult, "dependency_install", {
    error_class: "dependency",
    error_code: "NONZERO_EXIT",
  });
  if (properties.error_class === "user_cancelled") {
    ctx.telemetry.capture("cli_dependency_install_cancelled", {
      ...createFunnelProps("dependency_install_cancelled"),
      template,
      ai_setup: aiSetup,
      dependency_installed: false,
      ...properties,
    });
    throw new CliCancelledError(
      "dependency_install",
      properties.cancellation_exit_code ?? 0,
      properties,
    );
  }
  ctx.telemetry.capture("cli_dependency_install_failed", {
    ...createFunnelProps("dependency_install_failed"),
    template,
    ai_setup: aiSetup,
    dependency_installed: false,
    ...properties,
  });
  const { failure_stage, error_class, error_code, ...metadata } = properties;
  throw new CreateError(
    failure_stage,
    "dependency install failed",
    error_class,
    error_code,
    metadata,
  );
}
