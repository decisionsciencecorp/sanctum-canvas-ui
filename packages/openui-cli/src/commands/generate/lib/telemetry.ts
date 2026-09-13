import { TelemetryClient } from "../../../lib/telemetry-client";

export class GenerateTelemetryClient extends TelemetryClient {
  trackStarted(props: { json_schema: boolean; spec: boolean; out_to_file: boolean }) {
    this.capture("cli_generate_started", props);
  }

  trackSucceeded(props: {
    json_schema: boolean;
    spec: boolean;
    out_to_file: boolean;
    duration_ms: number;
  }) {
    this.capture("cli_generate_succeeded", props);
  }
}
