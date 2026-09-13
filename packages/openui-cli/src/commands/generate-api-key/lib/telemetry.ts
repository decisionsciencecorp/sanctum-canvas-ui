import { TelemetryClient } from "../../../lib/telemetry-client";

export class GenerateApiKeyTelemetryClient extends TelemetryClient {
  trackStarted(props: { env_file: string; env_key: string }) {
    this.capture("cli_generate_api_key_started", props);
  }

  trackSucceeded(props: {
    auth_method: string;
    env_file: string;
    env_key: string;
    duration_ms: number;
  }) {
    this.capture("cli_generate_api_key_succeeded", props);
  }
}
