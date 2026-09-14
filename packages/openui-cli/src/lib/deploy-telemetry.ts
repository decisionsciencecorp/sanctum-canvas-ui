import { CliCancelledError, telemetry } from "./telemetry";
import { cliErrorProperties } from "./utils";

type DeployStage =
  | "validate_project"
  | "environment_load"
  | "cli_prepare"
  | "login_check"
  | "login"
  | "link"
  | "env_sync"
  | "deploy";

export async function deployStage<T>(
  stage: DeployStage,
  run: () => T | Promise<T>,
  summarize?: (result: T) => Record<string, unknown>,
): Promise<T> {
  const startedAt = Date.now();
  telemetry.capture("cli_deploy_stage_started", { stage });
  try {
    const result = await run();
    telemetry.capture("cli_deploy_stage_completed", {
      stage,
      outcome: "succeeded",
      duration_ms: Date.now() - startedAt,
      ...summarize?.(result),
    });
    return result;
  } catch (error) {
    telemetry.capture("cli_deploy_stage_completed", {
      ...cliErrorProperties(error),
      stage,
      outcome: error instanceof CliCancelledError ? "cancelled" : "failed",
      duration_ms: Date.now() - startedAt,
    });
    throw error;
  }
}

export function skipDeployStage(
  stage: DeployStage,
  reason: "already_logged_in" | "already_linked" | "skip_env" | "no_local_keys",
) {
  telemetry.capture("cli_deploy_stage_completed", {
    stage,
    outcome: "skipped",
    skip_reason: reason,
    duration_ms: 0,
  });
}
