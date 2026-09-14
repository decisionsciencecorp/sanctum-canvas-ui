type PostHog = (typeof import("posthog-js"))["default"];

let posthogPromise: Promise<PostHog> | undefined;

export function loadPostHog(): Promise<PostHog> {
  posthogPromise ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init("phc_3OLW53x09ZTVZSV6BEpj5uycj3ooqR6KOemOjx04e3D", {
      api_host: "https://dgoeivjus9jfp.cloudfront.net",
      capture_pageview: "history_change",
      disable_session_recording: false,
      session_recording: {
        sampleRate: 0.3,
      },
      disable_surveys: true,
    });

    return posthog;
  });

  return posthogPromise;
}

export const analytics = {
  capture(eventName: string, properties: object = {}): void {
    void loadPostHog()
      .then((posthog) => posthog.capture(eventName, properties as Record<string, unknown>))
      .catch(() => {
        // Analytics must never interfere with the user action being measured.
      });
  },
};

export const CREATE_CLI_COMMAND_COPIED_EVENT = "create_cli_command_copied";
export const DEPLOY_COMMAND_COPIED_EVENT = "deploy_command_copied";

export type CreateCliPackageManager = "pnpm" | "bun" | "yarn" | "npm" | "unknown";

export interface CreateCliCopyAnalyticsContext {
  source: string;
  interaction?: string;
}

interface CreateCliCommandCopiedProperties {
  package_manager: CreateCliPackageManager;
  source: string;
  interaction?: string;
}

const CREATE_CLI_COMMAND_PATTERN = /@openuidev\/cli(?:@\S+)?\s+create(?:\s|$)/i;

export function getCreateCliPackageManager(command: string): CreateCliPackageManager | null {
  const normalized = command.trim().replace(/\s+/g, " ");
  if (!CREATE_CLI_COMMAND_PATTERN.test(normalized)) return null;

  if (/^pnpx\s/i.test(normalized)) return "pnpm";
  if (/^bunx\s/i.test(normalized)) return "bun";
  if (/^yarn dlx\s/i.test(normalized)) return "yarn";
  if (/^npx\s/i.test(normalized)) return "npm";
  return "unknown";
}

export function getCreateCliCommandCopiedProperties(
  command: string,
  context: CreateCliCopyAnalyticsContext,
): CreateCliCommandCopiedProperties | null {
  const packageManager = getCreateCliPackageManager(command);
  if (!packageManager) return null;

  return {
    package_manager: packageManager,
    source: context.source,
    ...(context.interaction ? { interaction: context.interaction } : {}),
  };
}

export function captureCreateCliCommandCopied(
  command: string,
  context: CreateCliCopyAnalyticsContext,
): void {
  const properties = getCreateCliCommandCopiedProperties(command, context);
  if (!properties || typeof window === "undefined") return;

  analytics.capture(CREATE_CLI_COMMAND_COPIED_EVENT, properties);
}

export function deployCopySource(pathname: string): string {
  const path = pathname.replace(/\/$/, "");
  if (path === "") return "homepage";
  if (path === "/docs/getting-started") return "getting-started";
  if (path === "/docs/agent/getting-started/quickstart") return "agent-quickstart";
  if (path === "/docs/api-reference/cli") return "cli-reference";
  return "docs";
}

/** Parse command kind locally; never capture copied code, flags, URLs or secrets. */
export function getDeployCommandCopiedProperties(command: string, source: string) {
  const normalized = command.replace(/\\\r?\n/g, " ");
  const match = normalized.match(
    /^\s*(?:\$\s*)?(?:(npx|pnpx|bunx|yarn\s+dlx|pnpm\s+dlx)\s+@openuidev\/cli(?:@\S+)?|openui)\s+deploy(?:\s|$)/m,
  );
  if (!match) return null;
  const runner = match[1]?.replace(/\s+/g, " ");
  const packageManager: CreateCliPackageManager =
    runner === "npx"
      ? "npm"
      : runner === "pnpx" || runner === "pnpm dlx"
        ? "pnpm"
        : runner === "bunx"
          ? "bun"
          : runner === "yarn dlx"
            ? "yarn"
            : "unknown";
  const allowedSources = [
    "homepage",
    "getting-started",
    "agent-quickstart",
    "cli-reference",
    "docs",
  ];
  return {
    package_manager: packageManager,
    source: allowedSources.includes(source) ? source : "unknown",
  };
}

/** Call only after a successful clipboard write, including for future homepage deploy CTAs. */
export function captureCliCommandCopied(
  command: string,
  context: CreateCliCopyAnalyticsContext,
): void {
  captureCreateCliCommandCopied(command, context);
  if (typeof window === "undefined") return;
  const properties = getDeployCommandCopiedProperties(
    command,
    deployCopySource(window.location.pathname),
  );
  if (properties) analytics.capture(DEPLOY_COMMAND_COPIED_EVENT, properties);
}
