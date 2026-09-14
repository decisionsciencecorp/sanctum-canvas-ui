import { formatCliCommand, resolveCliInvocation } from "../../cli-bin";
import { printLogTail } from "../../command-output";
import {
  loadProjectDeployEnv,
  loadProjectDeployFileEnv,
  printQuietDeploySuccess,
  warnMissingRequiredDeployEnv,
  type DeployTargetOptions,
} from "../../deploy";
import { deployStage, skipDeployStage } from "../../deploy-telemetry";
import { adoptVercelEnvVars } from "../../env";
import { runCommand, runQuietCommand } from "../../process-runner";
import { telemetry } from "../../telemetry";
import { throwCommandFailure } from "../../utils";
import { buildVercelDeployArgs, publicVercelArgs, vercelSpawnArgs } from "./args";
import {
  isVercelLinked,
  isVercelLoggedIn,
  linkVercelProject,
  loginToVercel,
  prepareVercelCli,
  vercelCliEnv,
} from "./connect";
import { syncLocalEnvToVercelProject } from "./project-env";
import { extractVercelDeploymentSummary } from "./summary";

/** Keep deploy parsing and flags stable until deliberately upgraded and re-tested. */
const VERCEL_CLI_PACKAGE = "vercel@59.15.1";

/** Login, link, optionally save env, then run `vercel` deploy. */
export async function deployToVercel(opts: DeployTargetOptions): Promise<void> {
  const t0 = Date.now();
  const { projectEnv, availableEnv } = await deployStage("environment_load", () => {
    adoptVercelEnvVars(opts.projectDir);
    const projectEnv = loadProjectDeployFileEnv(opts.projectDir);
    const availableEnv = loadProjectDeployEnv(opts.projectDir);
    warnMissingRequiredDeployEnv(opts.projectDir, availableEnv, "Vercel");
    return { projectEnv, availableEnv };
  });
  const localEnv = opts.skipEnv ? {} : availableEnv;
  const projectEnvToSave = opts.skipEnv ? {} : projectEnv;

  const vercel = resolveCliInvocation(opts.projectDir, "vercel", VERCEL_CLI_PACKAGE);
  telemetry.register({ cli_source: vercel.source });
  await deployStage("cli_prepare", () => prepareVercelCli(vercel, opts.projectDir));

  let loggedIn = await deployStage(
    "login_check",
    () => isVercelLoggedIn(vercel, opts.projectDir),
    (value) => ({ login_required: !value }),
  );
  telemetry.register({ login_required: !loggedIn });
  if (!loggedIn) {
    await deployStage("login", () => loginToVercel(vercel, opts));
    loggedIn = true;
  } else {
    skipDeployStage("login", "already_logged_in");
  }

  // Link before env sync / deploy so new projects can save env and run a
  // non-interactive (quiet) deploy without mid-build prompts.
  const linkRequired = !isVercelLinked(opts.projectDir);
  telemetry.register({ link_required: linkRequired });
  if (linkRequired) {
    await deployStage("link", () => linkVercelProject(vercel, opts));
  } else {
    skipDeployStage("link", "already_linked");
  }

  let envSavedKeyCount = 0;
  if (Object.keys(projectEnvToSave).length > 0) {
    const envSync = await deployStage(
      "env_sync",
      () =>
        syncLocalEnvToVercelProject({
          invocation: vercel,
          projectDir: opts.projectDir,
          localEnv: projectEnvToSave,
          yes: opts.yes,
          noInteractive: opts.noInteractive,
        }),
      (result) => ({ env_sync_outcome: result.outcome, env_saved_key_count: result.savedKeyCount }),
    );
    envSavedKeyCount = envSync.savedKeyCount;
    telemetry.register({ env_sync_outcome: envSync.outcome });
  } else {
    const reason = opts.skipEnv ? "skip_env" : "no_local_keys";
    telemetry.register({ env_sync_outcome: reason });
    skipDeployStage("env_sync", reason);
  }

  const linkedNow = isVercelLinked(opts.projectDir);
  const quiet = !opts.verbose;
  const noWait = opts.extraArgs.includes("--no-wait");
  const informational = opts.extraArgs.some((arg) =>
    ["--help", "-h", "--version", "-v", "-V"].includes(arg),
  );
  // Quiet mode needs a non-interactive Vercel deploy (piped stdio).
  const deployYes = opts.yes || (quiet && linkedNow);
  const vercelArgs = buildVercelDeployArgs({
    extraArgs: opts.extraArgs,
    yes: deployYes,
    localEnv,
  });

  if (opts.verbose) {
    console.info(
      `Deploying to Vercel (${vercel.source}): ${formatCliCommand(vercel, publicVercelArgs(vercelArgs))}`,
    );
    if (Object.keys(localEnv).length > 0) {
      console.info(
        envSavedKeyCount > 0
          ? `Also attaching local env on this deployment: ${Object.keys(localEnv).sort().join(", ")}`
          : `Passing local env on this deployment: ${Object.keys(localEnv).sort().join(", ")}`,
      );
    }
    console.info("");
  }

  const deployEnv = vercelCliEnv(opts.projectDir);
  const result = await deployStage("deploy", async () => {
    const result = quiet
      ? await runQuietCommand({
          command: vercel.command,
          args: vercelSpawnArgs(vercel, vercelArgs),
          cwd: opts.projectDir,
          label: "Uploading and building on Vercel...",
          env: deployEnv,
        })
      : await runCommand(vercel.command, vercelSpawnArgs(vercel, vercelArgs), opts.projectDir, {
          inheritOutput: true,
          env: deployEnv,
        });
    if (result.error || result.status !== 0 || result.signal) {
      if (quiet) printLogTail(result.diagnosticTail, "Vercel log (tail)");
      throwCommandFailure(result, "vercel_deploy", "Vercel deploy failed");
    }
    return result;
  });

  if (quiet) {
    printQuietDeploySuccess(
      extractVercelDeploymentSummary(result.diagnosticTail),
      result.durationMs,
      noWait,
    );
  }
  const properties = {
    target: "vercel",
    prod: opts.prod,
    yes: opts.yes,
    skip_env: opts.skipEnv,
    verbose: opts.verbose,
    cli_source: vercel.source,
    logged_in: loggedIn,
    env_key_count: Object.keys(localEnv).length,
    env_saved_key_count: envSavedKeyCount,
    duration_ms: Date.now() - t0,
    no_wait: noWait,
    completion_status: informational ? "unverified" : noWait ? "submitted" : "ready",
    confirmation_source: informational ? "none" : "vercel_cli_exit",
  };
  // Preserve the legacy event. New outcomes distinguish provider wait completion from submission.
  telemetry.capture("cli_deploy_succeeded", properties);
  if (!informational)
    telemetry.capture(noWait ? "cli_deploy_submitted" : "cli_deploy_ready", properties);
}
