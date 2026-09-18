// old/packages/lang-core/src/runtime/toolProvider.ts
var ToolNotFoundError = class extends Error {
  toolName;
  availableTools;
  constructor(toolName, availableTools = []) {
    super(
      `[openui] No handler for tool "${toolName}". Available: ${availableTools.join(", ") || "(none)"}`
    );
    this.name = "ToolNotFoundError";
    this.toolName = toolName;
    this.availableTools = availableTools;
  }
};
export {
  ToolNotFoundError
};
