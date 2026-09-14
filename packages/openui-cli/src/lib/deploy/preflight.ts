import * as fs from "node:fs";
import * as path from "node:path";

import { loadAllowlistedProjectEnv } from "../env";
import { CreateError } from "../telemetry";
import { readProjectDependencies, readProjectPackageJson } from "./project";
import { DEPLOY_ENV_ALLOWLIST } from "./project-env";

export const DEPLOY_GUIDE_URL = "https://www.openui.com/docs/deploy";

/** Conservative checks, not a promise that any OpenUI dependency makes an app deployable. */
export function checkDeployCompatibility(
  projectDir: string,
  environments: Record<string, string>[],
) {
  const deps = readProjectDependencies(projectDir);
  const pkg = readProjectPackageJson(projectDir);
  if (!deps["next"] && !deps["vite"] && !deps["nuxt"] && !deps["@sveltejs/kit"] && !deps["astro"]) {
    console.info(
      `[!] Check this project's Vercel framework, build command and output directory. An OpenUI dependency alone does not establish compatibility. ${DEPLOY_GUIDE_URL}\n`,
    );
  }
  if (!pkg.scripts?.["build"] && !fs.existsSync(path.join(projectDir, "vercel.json"))) {
    console.info(
      "[!] No build script or vercel.json found. Confirm the build settings when linking the Vercel project.\n",
    );
  }
  for (const key of ["LANGGRAPH_API_URL", "OPENAI_BASE_URL", "THESYS_API_BASE_URL"]) {
    for (const value of new Set(environments.map((env) => env[key]))) {
      if (!value) continue;
      try {
        const { hostname } = new URL(value);
        if (
          hostname === "localhost" ||
          hostname.endsWith(".localhost") ||
          hostname === "[::1]" ||
          hostname === "0.0.0.0" ||
          hostname.startsWith("127.")
        ) {
          throw new CreateError(
            "deploy_preflight",
            `${key} points to a local server. Host that backend and set a reachable URL, or use --skip-env if Vercel already has the correct configuration. ${DEPLOY_GUIDE_URL}`,
            "invalid_input",
            "LOCAL_BACKEND_URL",
          );
        }
      } catch (error) {
        if (error instanceof CreateError) throw error;
        console.info(`[!] Check ${key}: expected an absolute backend URL.\n`);
      }
    }
  }
  if (fs.existsSync(path.join(projectDir, "langgraph.json"))) {
    console.info(
      "[!] This project includes a separate LangGraph server configuration. Deploy that server separately and configure a reachable LANGGRAPH_API_URL; uploading the frontend does not host the Agent Server.\n",
    );
  }
  if (deps["@openuidev/thesys"] || deps["@openuidev/thesys-server"]) {
    console.info(
      `[!] Cloud demo identities are not multi-user authentication. Before public use, authenticate both API routes, authorize conversations and add usage limits. ${DEPLOY_GUIDE_URL}#before-public-use\n`,
    );
  }
}

/** Show names and effective sources only. No values, including in verbose output. */
export function printDeployEnvSummary(
  projectDir: string,
  localEnv: Record<string, string>,
  skipEnv: boolean,
) {
  if (skipEnv) {
    console.info(
      "Local env: not attached or saved (--skip-env). Explicit Vercel env flags still apply.\n",
    );
    return;
  }
  const localFile = loadAllowlistedProjectEnv(projectDir, DEPLOY_ENV_ALLOWLIST, [".env.local"]);
  const names = Object.keys(localEnv).sort();
  console.info(
    names.length
      ? "Local keys attached to this deployment's build and runtime:"
      : "No allowlisted local keys to attach; using Vercel project configuration.",
  );
  for (const key of names) {
    const source = process.env[key]?.trim() ? "shell" : localFile[key] ? ".env.local" : ".env";
    console.info(`  ${key} (${source})`);
  }
  if (names.length)
    console.info(
      "These override saved values for this run; explicit --env/--build-env values take precedence. Saving file values for later is a separate choice.",
    );
  console.info("");
}
