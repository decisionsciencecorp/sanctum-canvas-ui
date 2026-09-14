/** Version the flag key before starting a different experiment. No experiment is enabled in code. */
export const DEPLOY_HINT_EXPERIMENT = "cli-deploy-hint-v2";
export type DeployHintVariant = "control" | "share-app";
export type DeployHint = {
  experiment_id: string;
  variant: "baseline" | DeployHintVariant;
  message_version: string;
  message: string;
};
export type DeployHintExposure = Omit<DeployHint, "message"> & { printed_at: string };

export function isDeployHintVariant(value: unknown): value is DeployHintVariant {
  return value === "control" || value === "share-app";
}

export function deployHint(variant?: DeployHintVariant): DeployHint {
  const heading = variant === "share-app" ? "Ready to share your app?" : "Deploy to Vercel:";
  return {
    experiment_id: variant ? DEPLOY_HINT_EXPERIMENT : "none",
    variant: variant ?? "baseline",
    message_version: variant === "share-app" ? "share-app-v2" : "deploy-vercel-v2",
    message: `${heading}\n> npx @openuidev/cli@latest deploy`,
  };
}

/** Never forward arbitrary persisted strings into analytics. */
export function readDeployHintExposure(value: unknown): DeployHintExposure | undefined {
  if (!value || typeof value !== "object") return;
  const raw = value as Partial<DeployHintExposure>;
  if (raw.variant !== "baseline" && !isDeployHintVariant(raw.variant)) return;
  const hint = deployHint(raw.variant === "baseline" ? undefined : raw.variant);
  if (
    raw.experiment_id !== hint.experiment_id ||
    raw.message_version !== hint.message_version ||
    typeof raw.printed_at !== "string" ||
    !Number.isFinite(Date.parse(raw.printed_at))
  )
    return;
  return {
    experiment_id: hint.experiment_id,
    variant: hint.variant,
    message_version: hint.message_version,
    printed_at: new Date(raw.printed_at).toISOString(),
  };
}
