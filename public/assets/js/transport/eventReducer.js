/**
 * A7.1 — Canonical AG-UI-style stream event reducer.
 *
 * Framework-neutral: adapters (SSE / NDJSON) normalize wire bytes into these
 * events; this module owns run / message / tool state + bounded diagnostics.
 */

/** @typedef {'idle'|'running'|'finished'|'error'|'cancelled'} RunStatus */
/** @typedef {'streaming'|'complete'} MessageStatus */
/** @typedef {'streaming'|'executing'|'complete'|'result'|'error'} ToolStatus */

export const EventType = Object.freeze({
  RUN_STARTED: "RUN_STARTED",
  RUN_FINISHED: "RUN_FINISHED",
  RUN_ERROR: "RUN_ERROR",
  TEXT_MESSAGE_START: "TEXT_MESSAGE_START",
  TEXT_MESSAGE_CONTENT: "TEXT_MESSAGE_CONTENT",
  TEXT_MESSAGE_END: "TEXT_MESSAGE_END",
  TEXT_MESSAGE_CHUNK: "TEXT_MESSAGE_CHUNK",
  TOOL_CALL_START: "TOOL_CALL_START",
  TOOL_CALL_ARGS: "TOOL_CALL_ARGS",
  TOOL_CALL_END: "TOOL_CALL_END",
  TOOL_CALL_RESULT: "TOOL_CALL_RESULT",
  TOOL_CALL_CHUNK: "TOOL_CALL_CHUNK",
  /** Adapter → reducer: skipped non-terminal malformed wire frame */
  DIAGNOSTIC_SKIP: "DIAGNOSTIC_SKIP",
  /** Adapter → reducer: cooperative cancel */
  RUN_CANCELLED: "RUN_CANCELLED",
});

export const MAX_DIAGNOSTIC_ENTRIES = 32;
export const MAX_DIAGNOSTIC_DETAIL_CHARS = 240;

/**
 * @param {unknown} value
 * @param {number} [max]
 * @returns {string}
 */
function clipDetail(value, max = MAX_DIAGNOSTIC_DETAIL_CHARS) {
  let s;
  if (typeof value === "string") s = value;
  else {
    try {
      s = JSON.stringify(value);
    } catch {
      s = String(value);
    }
  }
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

/**
 * @param {object} [options]
 * @returns {import('./eventReducer.js').StreamState}
 */
export function createInitialState(options = {}) {
  return {
    runId: options.runId ?? null,
    runStatus: /** @type {RunStatus} */ ("idle"),
    messages: [],
    tools: [],
    currentMessageId: null,
    isStreaming: false,
    cancelled: false,
    error: null,
    diagnostics: {
      skippedMalformed: 0,
      entries: [],
    },
  };
}

/**
 * Deep-freeze a plain state tree for fixture equality checks.
 * @param {object} state
 * @returns {object}
 */
export function freezeState(state) {
  const clone = structuredClone
    ? structuredClone(state)
    : JSON.parse(JSON.stringify(state));
  return deepFreeze(clone);
}

/**
 * @param {object} obj
 * @returns {object}
 */
function deepFreeze(obj) {
  if (obj && typeof obj === "object") {
    Object.freeze(obj);
    for (const v of Object.values(obj)) deepFreeze(v);
  }
  return obj;
}

/**
 * Compact snapshot used by frozen fixtures (`expect` fields).
 * @param {ReturnType<typeof createInitialState>} state
 */
export function summarizeState(state) {
  const lastTool = state.tools.length ? state.tools[state.tools.length - 1] : null;
  let toolStatus = null;
  if (lastTool) {
    toolStatus =
      lastTool.status === "result" || lastTool.status === "complete"
        ? "complete"
        : lastTool.status;
  }
  return {
    messages: state.messages.length,
    runStatus: state.runStatus,
    toolStatus,
    skippedMalformed: state.diagnostics.skippedMalformed,
    tools: state.tools.length,
    isStreaming: state.isStreaming,
    cancelled: state.cancelled,
    error: state.error,
  };
}

/**
 * @param {ReturnType<typeof createInitialState>} state
 * @param {{ kind: string, detail?: unknown }} entry
 */
function pushDiagnostic(state, entry) {
  const next = {
    ...state,
    diagnostics: {
      ...state.diagnostics,
      entries: [
        ...state.diagnostics.entries,
        {
          kind: entry.kind,
          detail: clipDetail(entry.detail ?? ""),
          at: state.diagnostics.entries.length,
        },
      ].slice(-MAX_DIAGNOSTIC_ENTRIES),
    },
  };
  if (entry.kind === "malformed" || entry.kind === "skip") {
    next.diagnostics = {
      ...next.diagnostics,
      skippedMalformed: state.diagnostics.skippedMalformed + 1,
    };
  }
  return next;
}

/**
 * @param {ReturnType<typeof createInitialState>} state
 * @param {string} messageId
 * @param {string} [role]
 */
function ensureMessage(state, messageId, role = "assistant") {
  const idx = state.messages.findIndex((m) => m.id === messageId);
  if (idx !== -1) {
    return { state, index: idx };
  }
  const messages = [
    ...state.messages,
    {
      id: messageId,
      role,
      content: "",
      status: /** @type {MessageStatus} */ ("streaming"),
    },
  ];
  return {
    state: { ...state, messages, currentMessageId: messageId },
    index: messages.length - 1,
  };
}

/**
 * @param {ReturnType<typeof createInitialState>} state
 * @param {string} toolCallId
 * @param {string} [name]
 */
function ensureTool(state, toolCallId, name = "") {
  const idx = state.tools.findIndex((t) => t.id === toolCallId);
  if (idx !== -1) {
    const tools = [...state.tools];
    if (name && !tools[idx].name) {
      tools[idx] = { ...tools[idx], name };
    }
    return { state: { ...state, tools }, index: idx };
  }
  const tools = [
    ...state.tools,
    {
      id: toolCallId,
      name: name || "",
      args: "",
      status: /** @type {ToolStatus} */ ("streaming"),
      result: null,
      error: null,
    },
  ];
  return { state: { ...state, tools }, index: tools.length - 1 };
}

/**
 * Apply one AG-UI-style event. Pure — never mutates `state`.
 *
 * @param {ReturnType<typeof createInitialState>} state
 * @param {Record<string, unknown>|null|undefined} event
 * @returns {ReturnType<typeof createInitialState>}
 */
export function reduceEvent(state, event) {
  if (event == null || typeof event !== "object") {
    return pushDiagnostic(state, { kind: "malformed", detail: event });
  }

  // Adapter-marked raw / unparsed frame (fixtures use `{ raw: "…" }`)
  if ("raw" in event && !event.type) {
    return pushDiagnostic(state, { kind: "malformed", detail: event.raw });
  }

  const type = typeof event.type === "string" ? event.type : "";
  if (!type) {
    return pushDiagnostic(state, { kind: "malformed", detail: event });
  }

  switch (type) {
    case EventType.RUN_STARTED: {
      const runId =
        typeof event.runId === "string"
          ? event.runId
          : typeof event.threadId === "string"
            ? event.threadId
            : state.runId;
      return {
        ...state,
        runId: runId ?? state.runId,
        runStatus: "running",
        isStreaming: true,
        cancelled: false,
        error: null,
      };
    }

    case EventType.RUN_FINISHED: {
      if (state.cancelled) return state;
      const runId =
        typeof event.runId === "string" ? event.runId : state.runId;
      return {
        ...state,
        runId: runId ?? state.runId,
        runStatus: "finished",
        isStreaming: false,
      };
    }

    case EventType.RUN_ERROR: {
      const raw = event.message ?? event.error ?? "Stream error";
      const errorText = typeof raw === "string" ? raw : clipDetail(raw);
      const tools = state.tools.map((t) =>
        t.status === "streaming" || t.status === "executing"
          ? { ...t, status: /** @type {ToolStatus} */ ("error"), error: errorText }
          : t,
      );
      return {
        ...state,
        runStatus: "error",
        isStreaming: false,
        error: errorText,
        tools,
      };
    }

    case EventType.RUN_CANCELLED: {
      return {
        ...state,
        runStatus: "cancelled",
        isStreaming: false,
        cancelled: true,
      };
    }

    case EventType.TEXT_MESSAGE_START: {
      const messageId =
        typeof event.messageId === "string" && event.messageId
          ? event.messageId
          : `msg-${state.messages.length + 1}`;
      const role = typeof event.role === "string" ? event.role : "assistant";
      const { state: s } = ensureMessage(state, messageId, role);
      return { ...s, isStreaming: true };
    }

    case EventType.TEXT_MESSAGE_CONTENT:
    case EventType.TEXT_MESSAGE_CHUNK: {
      const delta = typeof event.delta === "string" ? event.delta : "";
      if (!delta) return state;
      let messageId =
        typeof event.messageId === "string" && event.messageId
          ? event.messageId
          : state.currentMessageId;
      if (!messageId) {
        messageId = `msg-${state.messages.length + 1}`;
      }
      const role = typeof event.role === "string" ? event.role : "assistant";
      const { state: withMsg, index } = ensureMessage(state, messageId, role);
      const messages = [...withMsg.messages];
      const prev = messages[index];
      messages[index] = {
        ...prev,
        content: (prev.content || "") + delta,
        status: "streaming",
      };
      return {
        ...withMsg,
        messages,
        currentMessageId: messageId,
        isStreaming: true,
      };
    }

    case EventType.TEXT_MESSAGE_END: {
      const messageId =
        typeof event.messageId === "string" && event.messageId
          ? event.messageId
          : state.currentMessageId;
      if (!messageId) return state;
      const messages = state.messages.map((m) =>
        m.id === messageId ? { ...m, status: /** @type {MessageStatus} */ ("complete") } : m,
      );
      return { ...state, messages };
    }

    case EventType.TOOL_CALL_START: {
      const toolCallId =
        typeof event.toolCallId === "string" ? event.toolCallId : "";
      if (!toolCallId) {
        return pushDiagnostic(state, { kind: "malformed", detail: event });
      }
      const name =
        (typeof event.toolCallName === "string" && event.toolCallName) ||
        (typeof event.toolName === "string" && event.toolName) ||
        "";
      const { state: s } = ensureTool(state, toolCallId, name);
      return { ...s, isStreaming: true };
    }

    case EventType.TOOL_CALL_ARGS: {
      const toolCallId =
        typeof event.toolCallId === "string" ? event.toolCallId : "";
      if (!toolCallId) {
        return pushDiagnostic(state, { kind: "malformed", detail: event });
      }
      const delta = typeof event.delta === "string" ? event.delta : "";
      const { state: s, index } = ensureTool(state, toolCallId);
      const tools = [...s.tools];
      const prev = tools[index];
      tools[index] = {
        ...prev,
        args: (prev.args || "") + delta,
        status: "streaming",
      };
      return { ...s, tools, isStreaming: true };
    }

    case EventType.TOOL_CALL_END: {
      const toolCallId =
        typeof event.toolCallId === "string" ? event.toolCallId : "";
      if (!toolCallId) {
        return pushDiagnostic(state, { kind: "malformed", detail: event });
      }
      const { state: s, index } = ensureTool(state, toolCallId);
      const tools = [...s.tools];
      tools[index] = { ...tools[index], status: "executing" };
      return { ...s, tools };
    }

    case EventType.TOOL_CALL_RESULT: {
      const toolCallId =
        typeof event.toolCallId === "string" ? event.toolCallId : "";
      if (!toolCallId) {
        return pushDiagnostic(state, { kind: "malformed", detail: event });
      }
      const content =
        typeof event.content === "string"
          ? event.content
          : event.content != null
            ? clipDetail(event.content)
            : "";
      const failed =
        event.isError === true ||
        (typeof event.error === "string" && event.error.length > 0);
      const errorText = failed
        ? typeof event.error === "string" && event.error
          ? event.error
          : content
        : null;
      const { state: s, index } = ensureTool(state, toolCallId);
      const tools = [...s.tools];
      tools[index] = {
        ...tools[index],
        status: failed ? "error" : "complete",
        result: content,
        error: errorText,
      };
      return { ...s, tools };
    }

    case EventType.TOOL_CALL_CHUNK: {
      const toolCallId =
        typeof event.toolCallId === "string" ? event.toolCallId : "";
      if (!toolCallId) return state;
      const name =
        (typeof event.toolCallName === "string" && event.toolCallName) ||
        (typeof event.toolName === "string" && event.toolName) ||
        "";
      const delta = typeof event.delta === "string" ? event.delta : "";
      const { state: s, index } = ensureTool(state, toolCallId, name);
      const tools = [...s.tools];
      const prev = tools[index];
      tools[index] = {
        ...prev,
        name: prev.name || name,
        args: (prev.args || "") + delta,
        status: "streaming",
      };
      return { ...s, tools, isStreaming: true };
    }

    case EventType.DIAGNOSTIC_SKIP: {
      return pushDiagnostic(state, {
        kind: "malformed",
        detail: event.detail ?? event.raw ?? event,
      });
    }

    default:
      // Unknown event types are non-terminal: record + continue.
      return pushDiagnostic(state, { kind: "unknown_event", detail: type });
  }
}

/**
 * Fold a sequence of events. Identical inputs → identical state.
 *
 * @param {Iterable<Record<string, unknown>|null|undefined>} events
 * @param {ReturnType<typeof createInitialState>} [initial]
 */
export function reduceEvents(events, initial = createInitialState()) {
  let state = initial;
  for (const event of events) {
    state = reduceEvent(state, event);
  }
  return state;
}

/**
 * Mutable reducer handle for adapters that push incrementally.
 * @param {object} [options]
 */
export function createEventReducer(options = {}) {
  let state = createInitialState(options);
  return {
    /** @returns {ReturnType<typeof createInitialState>} */
    getState() {
      return state;
    },
    /**
     * @param {Record<string, unknown>|null|undefined} event
     * @returns {ReturnType<typeof createInitialState>}
     */
    dispatch(event) {
      state = reduceEvent(state, event);
      return state;
    },
    /**
     * @param {Iterable<Record<string, unknown>|null|undefined>} events
     */
    dispatchAll(events) {
      state = reduceEvents(events, state);
      return state;
    },
    reset(nextOptions = options) {
      state = createInitialState(nextOptions);
      return state;
    },
    summarize() {
      return summarizeState(state);
    },
  };
}

export default {
  EventType,
  createInitialState,
  reduceEvent,
  reduceEvents,
  createEventReducer,
  summarizeState,
  freezeState,
  MAX_DIAGNOSTIC_ENTRIES,
  MAX_DIAGNOSTIC_DETAIL_CHARS,
};
