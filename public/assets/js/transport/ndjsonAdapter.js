/**
 * A7.3 — OpenAI-compatible NDJSON (line-delimited chat) adapter.
 *
 * Parses chat.completion.chunk objects (no `data:` prefix), handles partial
 * UTF-8 / incomplete JSON lines, finish reasons, errors, and cancellation.
 * Emits the same AG-UI events the SSE adapter feeds into the canonical reducer.
 */

import { EventType, createEventReducer } from "./eventReducer.js";

export const DEFAULT_MAX_BUFFER_BYTES = 256 * 1024;

/**
 * @param {object} [options]
 * @param {string} [options.messageId]
 * @param {() => string} [options.idFactory]
 */
function makeIds(options = {}) {
  const idFactory =
    typeof options.idFactory === "function"
      ? options.idFactory
      : () =>
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    messageId: options.messageId || idFactory(),
    idFactory,
  };
}

/**
 * Create an incremental NDJSON → AG-UI → reducer adapter.
 *
 * @param {object} [options]
 * @param {ReturnType<typeof createEventReducer>} [options.reducer]
 * @param {number} [options.maxBufferBytes]
 * @param {string} [options.messageId]
 * @param {() => string} [options.idFactory]
 * @param {string} [options.runId]
 * @param {(event: Record<string, unknown>) => void} [options.onEvent]
 * @param {(info: object) => void} [options.onMalformed]
 * @param {boolean} [options.emitRunEnvelope] default true — RUN_STARTED on first chunk
 */
export function createNdjsonAdapter(options = {}) {
  const maxBufferBytes =
    typeof options.maxBufferBytes === "number" && options.maxBufferBytes > 0
      ? options.maxBufferBytes
      : DEFAULT_MAX_BUFFER_BYTES;
  const reducer = options.reducer ?? createEventReducer({ runId: options.runId });
  const onEvent = typeof options.onEvent === "function" ? options.onEvent : null;
  const onMalformed =
    typeof options.onMalformed === "function" ? options.onMalformed : null;
  const emitRunEnvelope = options.emitRunEnvelope !== false;
  const { messageId, idFactory } = makeIds(options);

  /** @type {Record<number, string>} */
  const toolCallIds = Object.create(null);
  let messageStarted = false;
  let runStarted = false;
  let textEnded = false;
  let cancelled = false;
  let closed = false;

  const decoder = new TextDecoder("utf-8", { fatal: false });
  let textBuffer = "";

  function emit(event) {
    reducer.dispatch(event);
    if (onEvent) onEvent(event);
  }

  function reportMalformed(detail) {
    emit({ type: EventType.DIAGNOSTIC_SKIP, detail: String(detail) });
    if (onMalformed) onMalformed({ detail });
  }

  function ensureRunStarted() {
    if (!emitRunEnvelope || runStarted) return;
    runStarted = true;
    emit({
      type: EventType.RUN_STARTED,
      runId: options.runId || reducer.getState().runId || "ndjson-run",
    });
  }

  function ensureMessageStart(role = "assistant") {
    if (messageStarted) return;
    messageStarted = true;
    ensureRunStarted();
    emit({
      type: EventType.TEXT_MESSAGE_START,
      messageId,
      role: role || "assistant",
    });
  }

  /**
   * @param {Record<string, unknown>} json
   */
  function handleObject(json) {
    if (cancelled || closed) return;

    // Top-level error object (OpenAI / Venice style)
    if (json.error && typeof json.error === "object") {
      ensureRunStarted();
      const err = /** @type {Record<string, unknown>} */ (json.error);
      const msg =
        (typeof err.message === "string" && err.message) ||
        (typeof json.message === "string" && json.message) ||
        "stream error";
      emit({ type: EventType.RUN_ERROR, message: msg });
      return;
    }

    const choices = Array.isArray(json.choices) ? json.choices : null;
    if (!choices || !choices.length) {
      // Heartbeat / empty — ignore
      return;
    }

    const choice = /** @type {Record<string, unknown>} */ (choices[0] || {});
    const delta =
      choice.delta && typeof choice.delta === "object"
        ? /** @type {Record<string, unknown>} */ (choice.delta)
        : null;
    const finishReason =
      typeof choice.finish_reason === "string" ? choice.finish_reason : null;

    if (delta) {
      if (!messageStarted && (delta.content || delta.role)) {
        ensureMessageStart(
          typeof delta.role === "string" ? delta.role : "assistant",
        );
      }

      if (typeof delta.content === "string" && delta.content) {
        ensureMessageStart();
        emit({
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId,
          delta: delta.content,
        });
      }

      if (Array.isArray(delta.tool_calls)) {
        ensureRunStarted();
        for (const tc of delta.tool_calls) {
          if (!tc || typeof tc !== "object") continue;
          const toolCall = /** @type {Record<string, unknown>} */ (tc);
          const index =
            typeof toolCall.index === "number" ? toolCall.index : Number(toolCall.index) || 0;
          const fn =
            toolCall.function && typeof toolCall.function === "object"
              ? /** @type {Record<string, unknown>} */ (toolCall.function)
              : {};

          if (typeof toolCall.id === "string" && toolCall.id) {
            toolCallIds[index] = toolCall.id;
            emit({
              type: EventType.TOOL_CALL_START,
              toolCallId: toolCall.id,
              toolCallName: typeof fn.name === "string" ? fn.name : "",
              toolName: typeof fn.name === "string" ? fn.name : "",
            });
          }

          if (typeof fn.arguments === "string" && fn.arguments) {
            const toolCallId = toolCallIds[index];
            if (toolCallId) {
              emit({
                type: EventType.TOOL_CALL_ARGS,
                toolCallId,
                delta: fn.arguments,
              });
            }
          }
        }
      }
    }

    if (finishReason === "stop" || finishReason === "length") {
      if (messageStarted && !textEnded) {
        textEnded = true;
        emit({ type: EventType.TEXT_MESSAGE_END, messageId });
      }
      if (emitRunEnvelope) {
        emit({
          type: EventType.RUN_FINISHED,
          runId: options.runId || reducer.getState().runId || "ndjson-run",
        });
      }
    } else if (finishReason === "tool_calls") {
      for (const toolCallId of Object.values(toolCallIds)) {
        emit({ type: EventType.TOOL_CALL_END, toolCallId });
      }
      if (emitRunEnvelope) {
        emit({
          type: EventType.RUN_FINISHED,
          runId: options.runId || reducer.getState().runId || "ndjson-run",
        });
      }
    } else if (finishReason === "content_filter") {
      emit({
        type: EventType.RUN_ERROR,
        message: "content_filter",
      });
    }
  }

  /**
   * @param {string} line
   */
  function handleLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    // Tolerate accidental SSE prefixes on NDJSON feeds
    const data = trimmed.startsWith("data:")
      ? trimmed.slice(5).trim()
      : trimmed;
    if (!data || data === "[DONE]") {
      if (data === "[DONE]" && emitRunEnvelope && runStarted) {
        if (messageStarted && !textEnded) {
          textEnded = true;
          emit({ type: EventType.TEXT_MESSAGE_END, messageId });
        }
        const st = reducer.getState();
        if (st.runStatus === "running") {
          emit({
            type: EventType.RUN_FINISHED,
            runId: options.runId || st.runId || "ndjson-run",
          });
        }
      }
      return;
    }

    let json;
    try {
      json = JSON.parse(data);
    } catch {
      // Incomplete JSON line — leave for later only if still in buffer mid-stream.
      // Caller only passes complete lines; incomplete JSON is malformed skip.
      reportMalformed(data.slice(0, 160));
      return;
    }

    if (!json || typeof json !== "object" || Array.isArray(json)) {
      reportMalformed(data.slice(0, 160));
      return;
    }

    handleObject(json);
  }

  function enforceBound() {
    if (textBuffer.length <= maxBufferBytes) return;
    const overflow = textBuffer.length - maxBufferBytes;
    textBuffer = textBuffer.slice(-Math.floor(maxBufferBytes / 2));
    reportMalformed(`buffer overflow trimmed ${overflow} chars`);
  }

  return {
    get reducer() {
      return reducer;
    },
    get messageId() {
      return messageId;
    },
    getState() {
      return reducer.getState();
    },
    isCancelled() {
      return cancelled;
    },

    /**
     * @param {string|Uint8Array|ArrayBuffer} chunk
     */
    push(chunk) {
      if (cancelled || closed) return reducer.getState();
      if (chunk == null) return reducer.getState();

      if (typeof chunk === "string") {
        textBuffer += chunk;
      } else if (chunk instanceof ArrayBuffer) {
        textBuffer += decoder.decode(new Uint8Array(chunk), { stream: true });
      } else if (ArrayBuffer.isView(chunk)) {
        textBuffer += decoder.decode(chunk, { stream: true });
      } else {
        reportMalformed(String(chunk));
        return reducer.getState();
      }

      enforceBound();

      const lines = textBuffer.split("\n");
      textBuffer = lines.pop() ?? "";
      for (const line of lines) {
        // Strip CR from CRLF
        const cleaned = line.endsWith("\r") ? line.slice(0, -1) : line;
        handleLine(cleaned);
      }
      return reducer.getState();
    },

    flush() {
      if (cancelled || closed) return reducer.getState();
      textBuffer += decoder.decode();
      if (textBuffer.trim()) {
        handleLine(textBuffer);
        textBuffer = "";
      }
      closed = true;
      return reducer.getState();
    },

    cancel(reason = "cancelled") {
      if (cancelled) return reducer.getState();
      cancelled = true;
      textBuffer = "";
      emit({ type: EventType.RUN_CANCELLED, message: reason });
      return reducer.getState();
    },

    reset(nextOptions = {}) {
      textBuffer = "";
      cancelled = false;
      closed = false;
      messageStarted = false;
      runStarted = false;
      textEnded = false;
      for (const k of Object.keys(toolCallIds)) delete toolCallIds[k];
      reducer.reset({ runId: nextOptions.runId ?? options.runId });
      return reducer.getState();
    },

    /** @internal test helper */
    _ids: { messageId, idFactory, toolCallIds },
  };
}

/**
 * @param {Response} response
 * @param {Parameters<typeof createNdjsonAdapter>[0]} [options]
 */
export async function consumeNdjsonResponse(response, options = {}) {
  const adapter = createNdjsonAdapter(options);
  const body = response && response.body;
  if (!body || typeof body.getReader !== "function") {
    adapter.reducer.dispatch({
      type: EventType.RUN_ERROR,
      message: "No response body",
    });
    return adapter;
  }
  const reader = body.getReader();
  try {
    while (!adapter.isCancelled()) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) adapter.push(value);
    }
    if (!adapter.isCancelled()) adapter.flush();
  } catch (err) {
    if (!adapter.isCancelled()) {
      adapter.reducer.dispatch({
        type: EventType.RUN_ERROR,
        message: err && err.message ? err.message : String(err),
      });
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
  return adapter;
}

/**
 * Build OpenAI NDJSON lines that should reduce to the same state as a
 * corresponding AG-UI event sequence (text + tools + run envelope).
 *
 * @param {object} opts
 * @param {string} [opts.runId]
 * @param {string} [opts.messageId]
 * @param {string} [opts.content]
 * @param {{ id: string, name: string, arguments: string, result?: string }[]} [opts.tools]
 */
export function buildNdjsonReplay(opts = {}) {
  const runId = opts.runId || "r1";
  const messageId = opts.messageId || "m1";
  const lines = [];
  void runId;
  void messageId;

  if (opts.content) {
    lines.push({
      id: "chatcmpl-1",
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }],
    });
    // Split content into small deltas for realism
    const content = String(opts.content);
    const step = Math.max(1, Math.ceil(content.length / 3));
    for (let i = 0; i < content.length; i += step) {
      lines.push({
        id: "chatcmpl-1",
        object: "chat.completion.chunk",
        choices: [
          {
            index: 0,
            delta: { content: content.slice(i, i + step) },
            finish_reason: null,
          },
        ],
      });
    }
  }

  if (Array.isArray(opts.tools)) {
    opts.tools.forEach((tool, index) => {
      lines.push({
        id: "chatcmpl-1",
        object: "chat.completion.chunk",
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index,
                  id: tool.id,
                  type: "function",
                  function: { name: tool.name, arguments: "" },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      });
      if (tool.arguments) {
        lines.push({
          id: "chatcmpl-1",
          object: "chat.completion.chunk",
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    index,
                    function: { arguments: tool.arguments },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        });
      }
    });
    lines.push({
      id: "chatcmpl-1",
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
    });
  } else if (opts.content) {
    lines.push({
      id: "chatcmpl-1",
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    });
  }

  return lines.map((o) => `${JSON.stringify(o)}\n`).join("");
}

export default {
  createNdjsonAdapter,
  consumeNdjsonResponse,
  buildNdjsonReplay,
  DEFAULT_MAX_BUFFER_BYTES,
};
