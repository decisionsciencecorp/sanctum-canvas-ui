import type { Telemetry } from "./telemetry";

/** Typed clients wrap the store. Event-name strings stay private to subclasses. */
export class TelemetryClient {
  constructor(protected readonly store: Telemetry) {}

  protected capture(event: string, properties: Record<string, unknown> = {}) {
    this.store.capture(event, properties);
  }

  protected register(props: Record<string, unknown>) {
    this.store.register(props);
  }
}

export class RootTelemetryClient extends TelemetryClient {
  init(opts: { cliVersion: string; flagEnabled: boolean }) {
    this.store.init(opts);
  }

  registerRun(props: {
    agent_name: string;
    detected_agent_name: string;
    cli_run_id: string;
    command: string;
  }) {
    this.register(props);
  }

  trackInvoked() {
    this.capture("cli_invoked");
  }
}
