import type { Telemetry } from "./telemetry";

export type CliContext = {
  cwd: string;
  telemetry: Telemetry;
  argv: string[];
};
