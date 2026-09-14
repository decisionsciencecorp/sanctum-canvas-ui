import * as fs from "node:fs";
import * as path from "node:path";

import { CreateError } from "../../telemetry";

export type RequestedEnvironment = "provider-default" | "preview" | "production" | "custom";

/** Do not infer preview from the absence of --prod: Vercel can choose production. */
export function requestedVercelEnvironment(args: string[]): {
  name: string;
  category: RequestedEnvironment;
} {
  let target: string | undefined;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === "--target") {
      target = args[++index];
      if (!target || target.startsWith("-")) {
        throw new CreateError(
          "args_resolution",
          "Pass an environment after --target.",
          "invalid_input",
          "MISSING_DEPLOY_TARGET",
        );
      }
    } else if (arg.startsWith("--target=")) target = arg.slice("--target=".length);
  }
  if (target !== undefined && !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(target)) {
    throw new CreateError(
      "args_resolution",
      "Invalid Vercel environment. Use preview, production, or a custom environment name.",
      "invalid_input",
      "INVALID_DEPLOY_TARGET",
    );
  }
  if (args.includes("--prod")) {
    if (target && target !== "production") {
      throw new CreateError(
        "args_resolution",
        "Use either --prod or --target, not conflicting environments.",
        "invalid_input",
        "CONFLICTING_DEPLOY_TARGET",
      );
    }
    target = "production";
  }
  return {
    name: target ?? "Vercel default (first deployment may be production)",
    category: !target
      ? "provider-default"
      : target === "preview" || target === "production"
        ? target
        : "custom",
  };
}

export type VercelProjectLink = { projectId: string; orgId: string; projectName?: string };

/** Provider env IDs override the directory link, as they do in Vercel CLI. */
export function readVercelProjectLink(
  projectDir: string,
  env: NodeJS.ProcessEnv,
): VercelProjectLink | undefined {
  const projectId = env["VERCEL_PROJECT_ID"]?.trim();
  const orgId = env["VERCEL_ORG_ID"]?.trim();
  if (projectId && orgId) return { projectId, orgId };
  try {
    const link = JSON.parse(
      fs.readFileSync(path.join(projectDir, ".vercel", "project.json"), "utf8"),
    );
    if (
      typeof link.projectId !== "string" ||
      !link.projectId.trim() ||
      typeof link.orgId !== "string" ||
      !link.orgId.trim()
    )
      return;
    return {
      projectId: link.projectId,
      orgId: link.orgId,
      projectName:
        typeof link.projectName === "string" && link.projectName.trim()
          ? link.projectName
          : undefined,
    };
  } catch {
    return;
  }
}

export function printVercelDestination(
  link: VercelProjectLink | undefined,
  environment: ReturnType<typeof requestedVercelEnvironment>,
) {
  console.info("Deploy to your Vercel account:");
  if (link) {
    console.info(`  Project: ${terminalLabel(link.projectName ?? link.projectId)}`);
    console.info(`  Team/account ID: ${terminalLabel(link.orgId)}`);
  } else console.info("  Project: selected by Vercel");
  console.info(`  Requested environment: ${environment.name}`);
  console.info("  Check the deployment's environment and access settings before sharing.\n");
}

function terminalLabel(value: string): string {
  return value.replace(/[\x00-\x1f\x7f-\x9f]/g, "");
}
