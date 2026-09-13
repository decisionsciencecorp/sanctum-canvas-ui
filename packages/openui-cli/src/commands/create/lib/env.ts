import * as fs from "node:fs";
import * as path from "node:path";

import { resolveCloudApiKey, THESYS_KEYS_URL } from "../../../lib/auth/mint";
import type { CliContext } from "../../../lib/context";
import { CliCancelledError } from "../../../lib/telemetry";
import { cliErrorProperties } from "../../../lib/utils";
import { createFunnelProps } from "./create-telemetry";
import type { CreateAppOptions, EnvResult, TemplateName } from "./create-types";

export function buildAppId(name: string): string {
  // Stable per-scaffold identity (see writeEnv). Slugified because the name is
  // free-form and APP_ID lands in .env and ?app_id= query params; the random
  // suffix keeps two same-named apps in one org from colliding.
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${slug}-${Math.random().toString(36).slice(2, 8)}`;
}

export function requiredApiKeyEnv(template: TemplateName): "THESYS_API_KEY" | "OPENAI_API_KEY" {
  return template === "openui-cloud" ? "THESYS_API_KEY" : "OPENAI_API_KEY";
}

export async function writeEnv(
  targetDir: string,
  result: EnvResult,
  appId?: string,
): Promise<void> {
  // APP_ID is the scaffold's stable identity: the frontend-token route sends
  // it as `app_id`, so every conversation this app creates is bound to it and
  // apps sharing one org API key stay isolated from each other. It must stay
  // stable for the app's lifetime — regenerating it orphans existing threads.
  const content = `${result.envContent ?? ""}${appId ? `APP_ID=${appId}\n` : ""}`;
  if (!content) return;
  await fs.promises.writeFile(path.join(targetDir, ".env"), content);
}

async function promptForProviderKey(): Promise<string | null> {
  try {
    const { input } = await import("@inquirer/prompts");
    const apiKey = (
      await input({
        message: "Enter your OpenAI-compatible provider API key (leave blank to skip):",
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

export async function resolveChatEnv(interactive: boolean): Promise<EnvResult> {
  const apiKey = interactive ? await promptForProviderKey() : null;

  // Always write a file, so the scaffold has a .env to edit rather than one the
  // user must know to create. Without a key the entries stay commented out: an
  // empty `OPENAI_API_KEY=` would shadow a key already exported in the shell.
  const lines = apiKey
    ? [`OPENAI_API_KEY=${apiKey}`]
    : [
        "# Your OpenAI-compatible provider key. Uncomment and fill it in.",
        "# OPENAI_API_KEY=sk-your-key-here",
        "# Optional:",
        "# OPENAI_MODEL=gpt-5.2",
        "# OPENAI_BASE_URL=https://api.openai.com/v1",
      ];

  return {
    // False without a key, so the immediate dev-server gate and the
    // "add your API key" message still apply even though .env now exists.
    envWritten: apiKey != null,
    envContent: lines.join("\n") + "\n",
  };
}

export async function resolveCloudEnv(
  name: string,
  options: CreateAppOptions,
  interactive: boolean,
  ctx: CliContext,
): Promise<EnvResult> {
  let apiKey: string | null = null;
  let authMethod: EnvResult["authMethod"];
  try {
    ctx.telemetry.capture("cli_cloud_auth_started", {
      ...createFunnelProps("cloud_auth_started"),
      auth_method: options.auth ?? (options.apiKey ? "apikey-flag" : undefined),
    });
    const resolved = await resolveCloudApiKey({
      apiKey: options.apiKey,
      auth: options.auth,
      projectName: name,
      interactive,
    });
    apiKey = resolved.key;
    authMethod = resolved.method;
    ctx.telemetry.capture("cli_cloud_auth_method", {
      ...createFunnelProps("cloud_auth_resolved"),
      auth_method: resolved.method,
      auth_succeeded: apiKey != null,
    });
  } catch (err) {
    if (err instanceof CliCancelledError) {
      ctx.telemetry.capture("cli_cloud_auth_cancelled", {
        ...createFunnelProps("cloud_auth_cancelled"),
        auth_method: options.auth ?? (options.apiKey ? "apikey-flag" : undefined),
        auth_succeeded: false,
        ...cliErrorProperties(err),
      });
      throw err;
    }
    const msg = err instanceof Error ? err.message : String(err);
    const properties = cliErrorProperties(err, {
      failure_stage: "cloud_auth",
      error_class: "authentication",
      error_code: "AUTH_FAILED",
    });
    ctx.telemetry.capture("cli_cloud_auth_failed", {
      ...createFunnelProps("cloud_auth_failed"),
      auth_method: options.auth ?? (options.apiKey ? "apikey-flag" : undefined),
      auth_succeeded: false,
      ...properties,
    });
    console.error(`\n[!] Could not obtain an API key: ${msg}`);
    console.error(`  Add THESYS_API_KEY to .env later (keys: ${THESYS_KEYS_URL}).\n`);
  }
  const lines = [`THESYS_API_KEY=${apiKey ?? ""}`, `DEMO_USER_ID=demo-user`];
  return {
    envWritten: apiKey != null,
    envContent: lines.join("\n") + "\n",
    authMethod,
    authSucceeded: apiKey != null,
  };
}
