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
import { checkDeployCompatibility, printDeployEnvSummary } from "../../deploy/preflight";
import { printDeployNextSteps } from "../../deploy/quiet";
import { adoptVercelEnvVars } from "../../env";
import { runCommand, runQuietCommand } from "../../process-runner";
import { telemetry } from "../../telemetry";
import { throwCommandFailure } from "../../utils";
import {
  buildVercelDeployArgs,
  publicVercelArgs,
  vercelPreflightEnvironments,
  vercelSpawnArgs,
} from "./args";
import {
  isVercelLinked,
  isVercelLoggedIn,
  linkVercelProject,
  loginToVercel,
  prepareVercelCli,
  vercelCliEnv,
} from "./connect";
import {
  printVercelDestination,
  readVercelProjectLink,
  requestedVercelEnvironment,
} from "./destination";
import { syncLocalEnvToVercelProject } from "./project-env";
import { extractVercelDeploymentSummary } from "./summary";

/** Keep deploy parsing and flags stable until deliberately upgraded and re-tested. */
const VERCEL_CLI_PACKAGE = "vercel@59.15.1";

/** Login, link, optionally save env, then run `vercel` deploy. */
export async function deployToVercel(opts: DeployTargetOptions): Promise<void> {
  const t0 = Date.now();
  const environment = requestedVercelEnvironment(opts.extraArgs);
  telemetry.register({ requested_environment: environment.category });
  const vercel = resolveCliInvocation(opts.projectDir, "vercel", VERCEL_CLI_PACKAGE);
  telemetry.register({ cli_source: vercel.source });
  const informational = opts.extraArgs.some((arg) =>
    ["--help", "-h", "--version", "-v", "-V"].includes(arg),
  );
  if (informational) {
    // Asking the provider for help must not log in, link a project or persist keys.
    await deployStage("cli_prepare", async () => {
      const result = await runCommand(
        vercel.command,
        vercelSpawnArgs(vercel, opts.extraArgs),
        opts.projectDir,
        { inheritOutput: true },
      );
      if (result.error || result.status !== 0 || result.signal)
        throwCommandFailure(result, "vercel_cli_info", "Could not display Vercel CLI help/version");
    });
    telemetry.capture("cli_deploy_succeeded", {
      completion_status: "unverified",
      confirmation_source: "none",
      reported_environment: "unknown",
      environment_confirmation_source: "none",
      duration_ms: Date.now() - t0,
    });
    return;
  }
  const { projectEnv, availableEnv } = await deployStage("environment_load", () => {
    adoptVercelEnvVars(opts.projectDir);
    const projectEnv = loadProjectDeployFileEnv(opts.projectDir);
    const availableEnv = loadProjectDeployEnv(opts.projectDir);
    warnMissingRequiredDeployEnv(opts.projectDir, availableEnv, "Vercel");
    return { projectEnv, availableEnv };
  });
  const localEnv = opts.skipEnv ? {} : availableEnv;
  const projectEnvToSave = opts.skipEnv ? {} : projectEnv;
  await deployStage("preflight", () =>
    checkDeployCompatibility(
      opts.projectDir,
      vercelPreflightEnvironments(opts.extraArgs, localEnv),
    ),
  );

  await deployStage("cli_prepare", () => prepareVercelCli(vercel, opts.projectDir, opts.extraArgs));

  let loggedIn = await deployStage(
    "login_check",
    () => isVercelLoggedIn(vercel, opts.projectDir, opts.extraArgs),
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

  printVercelDestination(
    readVercelProjectLink(opts.projectDir, vercelCliEnv(opts.projectDir)),
    environment,
  );
  printDeployEnvSummary(opts.projectDir, localEnv, opts.skipEnv);

  let envSavedKeyCount = 0;
  const canSaveEnvironment =
    environment.category === "production" || environment.category === "preview";
  if (Object.keys(projectEnvToSave).length > 0 && canSaveEnvironment) {
    const envSync = await deployStage(
      "env_sync",
      () =>
        syncLocalEnvToVercelProject({
          invocation: vercel,
          projectDir: opts.projectDir,
          localEnv: projectEnvToSave,
          yes: opts.yes,
          noInteractive: opts.noInteractive,
          environment: environment.category as "preview" | "production",
          extraArgs: opts.extraArgs,
        }),
      (result) => ({ env_sync_outcome: result.outcome, env_saved_key_count: result.savedKeyCount }),
    );
    envSavedKeyCount = envSync.savedKeyCount;
    telemetry.register({ env_sync_outcome: envSync.outcome });
  } else {
    const reason = opts.skipEnv
      ? "skip_env"
      : Object.keys(projectEnvToSave).length === 0
        ? "no_local_keys"
        : "environment_not_selected";
    if (reason === "environment_not_selected") {
      console.info(
        "Using local keys for this deployment only. To save missing file values for later, select --target preview or --prod. For custom environments, configure saved keys in Vercel.\n",
      );
    }
    telemetry.register({ env_sync_outcome: reason });
    skipDeployStage("env_sync", reason);
  }

  const linkedNow = isVercelLinked(opts.projectDir);
  const quiet = !opts.verbose;
  const noWait = opts.extraArgs.includes("--no-wait");
  // Setup is already complete. Piped output lets verbose mode stream and retain
  // a tail for the same result parsing as quiet mode, without mid-build prompts.
  const deployYes = opts.yes || linkedNow;
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
          echo: true,
          stdin: "ignore",
          env: deployEnv,
        });
    if (result.error || result.status !== 0 || result.signal) {
      if (quiet) printLogTail(result.diagnosticTail, "Vercel log (tail)");
      console.info(
        "Fix the error above, then rerun the same command with --verbose for full logs. Your Vercel project link is retained.\n",
      );
      throwCommandFailure(result, "vercel_deploy", "Vercel deploy failed");
    }
    return result;
  });

  const summary = extractVercelDeploymentSummary(result.diagnosticTail);
  if (quiet) {
    printQuietDeploySuccess(summary, result.durationMs, noWait);
  }
  const environmentFlag =
    environment.category === "provider-default" ? "" : ` --target ${environment.name}`;
  printDeployNextSteps(
    summary,
    noWait,
    `npx @openuidev/cli@latest deploy${environmentFlag}${opts.skipEnv ? " --skip-env" : ""}`,
  );
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
    completion_status: noWait ? "submitted" : "ready",
    confirmation_source: "vercel_cli_exit",
    requested_environment: environment.category,
    reported_environment: summary.environment ?? "unknown",
    environment_confirmation_source: summary.environment ? "vercel_cli_output" : "none",
  };
  // Preserve the legacy event. New outcomes distinguish provider wait completion from submission.
  telemetry.capture("cli_deploy_succeeded", properties);
  telemetry.capture(noWait ? "cli_deploy_submitted" : "cli_deploy_ready", properties);
}
