/**
 * MCP tool error — preserved from lang-core for structured query/mutation handling.
 */
export class McpToolError extends Error {
  constructor(errorText) {
    super(`MCP tool error: ${errorText || "Unknown error"}`);
    this.name = "McpToolError";
    this.toolErrorText = errorText;
  }
}
