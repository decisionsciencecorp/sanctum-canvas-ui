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
