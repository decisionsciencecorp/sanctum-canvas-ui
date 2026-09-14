export type DeploySuccessSummary = {
  url?: string;
  /** Unique `*.vercel.app` deployment URL when it differs from the alias. */
  deploymentUrl?: string;
  inspect?: string;
  /** Only reported when a Vercel output label identifies it; never inferred from flags. */
  environment?: "preview" | "production";
};

/** Print the deployment URL and inspect link after a quiet success/start. */
export function printQuietDeploySuccess(
  summary: DeploySuccessSummary,
  durationMs: number,
  noWait = false,
): void {
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  console.info(noWait ? `✓ Deployment started in ${seconds}s` : `✓ Deployed in ${seconds}s`);
  if (summary.url) console.info(`  ${summary.url}`);
  if (summary.deploymentUrl && summary.deploymentUrl !== summary.url) {
    console.info(`  ${summary.deploymentUrl}`);
  }
  if (summary.inspect) console.info(`  Inspect  ${summary.inspect}`);
  console.info("");
}

/** A successful build is not a verified hosted AI response. */
export function printDeployNextSteps(
  summary: DeploySuccessSummary,
  noWait: boolean,
  redeployCommand: string,
) {
  console.info(
    `Vercel reported environment: ${summary.environment ?? "not confirmed — check Inspect"}`,
  );
  if (noWait) {
    console.info("Build still pending. Wait for Ready in Vercel before testing or sharing.");
  } else {
    console.info(
      summary.url ? `Open your app: ${summary.url}` : "Open the deployment URL from Vercel.",
    );
    console.info(
      "Try the prompt that worked locally; check streaming, tools and conversation storage if configured.",
    );
    console.info(
      "Before sharing, check deployment protection and test access as the intended recipient.",
    );
  }
  console.info(`Deploy an update from this project folder:\n  ${redeployCommand}`);
  console.info("Reapply any additional Vercel flags from your original command.");
  console.info("Guide: https://www.openui.com/docs/deploy\n");
}
