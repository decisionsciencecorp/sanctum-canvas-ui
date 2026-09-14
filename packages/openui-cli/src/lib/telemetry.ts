import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { PostHog } from "posthog-node";

import {
  DEPLOY_HINT_EXPERIMENT,
  deployHint,
  isDeployHintVariant,
  readDeployHintExposure,
  type DeployHint,
  type DeployHintExposure,
  type DeployHintVariant,
} from "./deploy-hint";
import { isTruthyEnv } from "./env";

// Public ingestion key (same project as docs/coda-prod). Overridable for testing.
const POSTHOG_KEY =
  process.env["OPENUI_POSTHOG_KEY"] ?? "phc_3OLW53x09ZTVZSV6BEpj5uycj3ooqR6KOemOjx04e3D";
const POSTHOG_HOST = process.env["OPENUI_POSTHOG_HOST"] ?? "https://us.i.posthog.com";
const SHUTDOWN_TIMEOUT_MS = 2000;
const FLAG_TIMEOUT_MS = 750;

const isTelemetryDebug = () => process.env["OPENUI_TELEMETRY_DEBUG"] === "1";
const configDir = () =>
  path.join(process.env["XDG_CONFIG_HOME"] ?? path.join(os.homedir(), ".config"), "openui");
const isCi = () => {
  const e = process.env;
  return isTruthyEnv(e["CI"]) || !!e["GITHUB_ACTIONS"] || !!e["GITLAB_CI"] || !!e["BUILDKITE"];
};
const isInteractiveTerminal = () => Boolean(process.stdin.isTTY && process.stdout.isTTY);
const debugLogPostHogFailure = (stage: string, error: unknown) => {
  if (!isTelemetryDebug()) return;
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[OpenUI telemetry] PostHog ${stage} failed: ${message}`);
};

type Stored = {
  distinctId: string;
  firstRunNoticeShown?: boolean;
  deployHintAssignment?: { experiment_id: string; variant: DeployHintVariant };
  lastDeployHint?: DeployHintExposure;
};

function loadOrCreateState() {
  const file = path.join(configDir(), "telemetry.json");
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Stored;
    if (typeof raw.distinctId !== "string" || !raw.distinctId) throw new Error("Invalid state");
    return {
      distinctId: raw.distinctId,
      firstRunNoticeShown: raw.firstRunNoticeShown === true,
      deployHintAssignment:
        raw.deployHintAssignment?.experiment_id === DEPLOY_HINT_EXPERIMENT &&
        isDeployHintVariant(raw.deployHintAssignment.variant)
          ? { experiment_id: DEPLOY_HINT_EXPERIMENT, variant: raw.deployHintAssignment.variant }
          : undefined,
      lastDeployHint: readDeployHintExposure(raw.lastDeployHint),
    };
  } catch {
    /* missing/corrupt → create */
  }
  return { distinctId: crypto.randomUUID(), firstRunNoticeShown: false } as Stored;
}
function writeState(file: string, s: Stored) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(s));
  } catch {
    /* read-only fs / CI: best-effort */
  }
}

/** Thrown by command funnels so the index wrapper can attribute the failure stage + drain once. */
export type CliErrorClass =
  | "invalid_input"
  | "filesystem"
  | "authentication"
  | "dependency"
  | "peer_dependency"
  | "registry_auth"
  | "network"
  | "package_compatibility"
  | "workspace_config"
  | "install_script"
  | "process"
  | "user_cancelled"
  | "generation"
  | "unknown";

export type CliErrorMetadata = {
  duration_ms?: number;
  exit_code?: number;
  failure_signal?: NodeJS.Signals;
  http_status?: number;
  cancellation_exit_code?: number;
  auth_failure_stage?: string;
};

export class CreateError extends Error {
  constructor(
    public stage: string,
    message: string,
    public errorClass: CliErrorClass = "unknown",
    public errorCode = "UNKNOWN",
    public errorMetadata: CliErrorMetadata = {},
  ) {
    super(message);
    this.name = "CreateError";
  }
}

export class CliCancelledError extends CreateError {
  constructor(
    stage: string,
    public exitCode = 0,
    metadata: CliErrorMetadata = {},
  ) {
    super(
      stage,
      "Operation cancelled.",
      "user_cancelled",
      exitCode === 0 ? "USER_CANCELLED" : exitCode === 143 ? "TERMINATED" : "INTERRUPTED",
      { ...metadata, cancellation_exit_code: exitCode },
    );
    this.name = "CliCancelledError";
  }
}

export class Telemetry {
  private client?: PostHog;
  private distinctId = "anonymous";
  private superProps: Record<string, unknown> = {};
  private enabled = false;
  private state?: Stored;

  init(opts: { cliVersion: string; flagEnabled: boolean }) {
    const optedOut =
      isTruthyEnv(process.env["DO_NOT_TRACK"]) ||
      isTruthyEnv(process.env["OPENUI_TELEMETRY_DISABLED"]) ||
      opts.flagEnabled === false;
    if (optedOut) return; // enabled stays false → all capture() are no-ops
    const state = loadOrCreateState();
    this.state = state;
    this.distinctId = state.distinctId;
    const interactiveTerminal = isInteractiveTerminal();
    this.superProps = {
      cli_version: opts.cliVersion,
      os: process.platform,
      os_release: os.release(),
      arch: process.arch,
      node_version: process.version,
      ci: isCi(),
      stdin_is_tty: Boolean(process.stdin.isTTY),
      stdout_is_tty: Boolean(process.stdout.isTTY),
      is_interactive_terminal: interactiveTerminal,
    };
    try {
      this.client = new PostHog(POSTHOG_KEY, {
        host: POSTHOG_HOST,
        flushAt: 1,
        flushInterval: 0,
        featureFlagsRequestTimeoutMs: FLAG_TIMEOUT_MS,
      });
      // Telemetry is best-effort: swallow network/flush errors so an offline CLI
      // run never spams the user's console with PostHog stack traces.
      this.client.on("error", (error) => debugLogPostHogFailure("request", error));
    } catch (error) {
      debugLogPostHogFailure("init", error);
      return;
    }
    this.enabled = true;
    if (state.lastDeployHint) this.registerDeployHintExposure(state.lastDeployHint);
    // posthog-core logs flush failures via a hardcoded console.error (not gated on
    // any logger/option). Filter ONLY those lines so an offline run stays quiet —
    // the CLI's own console.error output passes through untouched.
    const origError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === "string" && args[0].includes("flushing PostHog")) return;
      origError(...args);
    };
    if (isTelemetryDebug()) this.client.debug();
    if (!state.firstRunNoticeShown) {
      process.stderr.write(
        "\n◆ OpenUI CLI collects usage analytics; OAuth sign-ins may link usage to your OIDC account ID.\n" +
          "  No code, prompts, API keys, email, or personal name are collected. Opt out: set DO_NOT_TRACK=1 or pass --no-telemetry.\n\n",
      );
      state.firstRunNoticeShown = true;
      this.persistState();
    }
  }

  /** Resolve only at the hint surface, never during deploy. Unknown/offline flags keep baseline copy. */
  async resolveDeployHint(): Promise<DeployHint> {
    if (!this.enabled || !this.client || !this.state) return deployHint();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const value = await Promise.race([
        this.client.getFeatureFlag(DEPLOY_HINT_EXPERIMENT, this.distinctId, {
          sendFeatureFlagEvents: false,
        }),
        new Promise<undefined>((resolve) => {
          timer = setTimeout(() => resolve(undefined), FLAG_TIMEOUT_MS);
        }),
      ]);
      if (!isDeployHintVariant(value)) return deployHint();
      // Keep an enrolled installation in the same arm even if allocation weights change.
      return deployHint(this.state.deployHintAssignment?.variant ?? value);
    } catch {
      return deployHint();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Call only after the message was printed. Exposure is not proof that someone read it. */
  deployHintPrinted(hint: DeployHint, properties: { dev_server_starting: boolean }) {
    if (!this.enabled || !this.state) return;
    const metadata = {
      experiment_id: hint.experiment_id,
      variant: hint.variant,
      message_version: hint.message_version,
    };
    const exposure = { ...metadata, printed_at: new Date().toISOString() };
    if (isDeployHintVariant(hint.variant)) {
      this.state.deployHintAssignment = {
        experiment_id: DEPLOY_HINT_EXPERIMENT,
        variant: hint.variant,
      };
    }
    this.state.lastDeployHint = exposure;
    this.persistState();
    this.registerDeployHintExposure(exposure);
    this.capture("cli_deploy_hint_printed", {
      ...metadata,
      ...properties,
      source: "cli-create",
      position: "create_completion",
    });
    if (isDeployHintVariant(hint.variant)) {
      // Emit native experiment exposure for the rendered, sticky variant, not the remote assignment.
      this.capture("$feature_flag_called", {
        $feature_flag: DEPLOY_HINT_EXPERIMENT,
        $feature_flag_response: hint.variant,
      });
    }
  }

  private registerDeployHintExposure(exposure: DeployHintExposure) {
    this.register({
      last_deploy_hint_experiment_id: exposure.experiment_id,
      last_deploy_hint_variant: exposure.variant,
      last_deploy_hint_message_version: exposure.message_version,
      last_deploy_hint_printed_at: exposure.printed_at,
      [`$feature/${DEPLOY_HINT_EXPERIMENT}`]:
        exposure.variant === "baseline" ? false : exposure.variant,
    });
  }

  private persistState() {
    if (this.state) writeState(path.join(configDir(), "telemetry.json"), this.state);
  }

  register(props: Record<string, unknown>) {
    if (this.enabled) Object.assign(this.superProps, props);
  }

  capture(event: string, properties: Record<string, unknown> = {}) {
    if (!this.enabled || !this.client) return;
    try {
      this.client.capture({
        distinctId: this.distinctId,
        event,
        properties: { ...this.superProps, ...properties },
      });
    } catch (error) {
      debugLogPostHogFailure("capture", error);
    }
  }

  alias(distinctId: string, alias: string) {
    if (!this.enabled || !this.client) return;
    if (!distinctId || !alias || distinctId === alias) return;
    try {
      this.client.alias({ distinctId, alias });
      this.client.setPersonProperties({
        distinctId,
        propertiesOnce: {
          first_cli_auth_ts: new Date().toISOString(),
        },
      });
    } catch (error) {
      debugLogPostHogFailure("alias", error);
    }
  }

  aliasOidcSubject(oidcSub: string) {
    if (!this.enabled || !this.client || !oidcSub || oidcSub === this.distinctId) {
      return;
    }

    this.alias(oidcSub, this.distinctId);
  }

  async shutdown() {
    if (!this.enabled || !this.client) return;
    try {
      await Promise.race([
        this.client.shutdown(),
        new Promise<void>((r) => setTimeout(r, SHUTDOWN_TIMEOUT_MS)),
      ]);
    } catch (error) {
      debugLogPostHogFailure("shutdown", error);
    }
  }
}

export const telemetry = new Telemetry();
