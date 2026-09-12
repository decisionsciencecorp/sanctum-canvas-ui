import type { CliContext } from "./context";
import { telemetry } from "./telemetry";
import { handleCliError } from "./utils";

export function wrapCommand(
  failedEvent: string,
  handler: (...args: never[]) => Promise<void>,
): (...args: unknown[]) => Promise<void> {
  return async (...args: unknown[]) => {
    const ctx: CliContext = {
      cwd: process.cwd(),
      telemetry,
      argv: process.argv,
    };
    // Commander always appends the Command instance. Forward only the
    // parameters the handler declared (minus ctx) so create/generate-api-key
    // receive ctx, not that Command object.
    const forwarded = args.slice(0, Math.max(handler.length - 1, 0));
    try {
      await (handler as unknown as (...args: unknown[]) => Promise<void>)(...forwarded, ctx);
    } catch (e) {
      handleCliError(e, failedEvent, ctx.telemetry);
    } finally {
      await ctx.telemetry.shutdown();
    }
  };
}
