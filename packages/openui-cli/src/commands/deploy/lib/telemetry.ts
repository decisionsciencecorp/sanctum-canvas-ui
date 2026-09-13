import { TelemetryClient } from "../../../lib/telemetry-client";

export class DeployTelemetryClient extends TelemetryClient {
  registerContext(props: Record<string, unknown>) {
    this.register(props);
  }

  trackStarted(props: {
    target: string;
    prod: boolean;
    yes: boolean;
    skip_env: boolean;
    verbose: boolean;
    has_dir_arg: boolean;
  }) {
    this.capture("cli_deploy_started", props);
  }

  trackSucceeded(props: Record<string, unknown>) {
    this.capture("cli_deploy_succeeded", props);
  }
}
