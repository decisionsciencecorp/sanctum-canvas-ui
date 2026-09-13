import { telemetry, type Telemetry } from "./telemetry";

export type CliContext = {
  cwd: string;
  argv: string[];
  telemetry: Telemetry;
};

export const context: CliContext = {
  get cwd() {
    return process.cwd();
  },
  get argv() {
    return process.argv;
  },
  telemetry,
};
