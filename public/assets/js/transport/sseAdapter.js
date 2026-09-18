/**
 * A7.2 — AG-UI Server-Sent Events adapter.
 *
 * Parses SSE framing (multiline `data:`, `id:`, `event:`), reassembles across
 * arbitrary network chunk splits, bounds buffers, skips malformed non-terminal
 * frames, and feeds AG-UI JSON payloads into the canonical event reducer.
 */

import { EventType, createEventReducer } from "./eventReducer.js";

/** Default max buffered undecoded + incomplete SSE bytes before drop/report. */
export const DEFAULT_MAX_BUFFER_BYTES = 256 * 1024;

/**
 * @param {string} block
 * @returns {{ event: string, data: string, id: string|null, retry: number|null }}
 */
export function parseSseBlock(block) {
  let event = "";
  let id = null;
  let retry = null;
  const dataLines = [];

  for (const rawLine of block.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      // Spec: optional single space after colon
      const rest = line.slice(5);
      dataLines.push(rest.startsWith(" ") ? rest.slice(1) : rest);
    } else if (line.startsWith("id:")) {
      id = line.slice(3).trim();
    } else if (line.startsWith("retry:")) {
      const n = Number(line.slice(6).trim());
      if (Number.isFinite(n)) retry = n;
    }
  }

  return {
    event,
    data: dataLines.join("\n"),
    id,
    retry,
  };
}

/**
 * Split complete SSE blocks from a text buffer (blocks end on blank line).
 * @param {string} buffer
 * @returns {{ blocks: string[], rest: string }}
 */
export function splitSseBlocks(buffer) {
  const normalized = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = normalized.split("\n\n");
  const rest = parts.pop() ?? "";
  const blocks = parts.filter((b) => b.trim().length > 0);
  return { blocks, rest };
}

/**
 * @param {string} data
 * @returns {Record<string, unknown>|null}
 */
function parseAgUiPayload(data) {
  const trimmed = data.trim();
  if (!trimmed || trimmed === "[DONE]") return null;
  return JSON.parse(trimmed);
}

/**
 * Create an incremental SSE → reducer adapter.
 *
 * @param {object} [options]
 * @param {ReturnType<typeof createEventReducer>} [options.reducer]
 * @param {number} [options.maxBufferBytes]
 * @param {(event: Record<string, unknown>, meta: object) => void} [options.onEvent]
 * @param {(info: object) => void} [options.onMalformed]
 * @param {() => string} [options.idFactory]
 */
export function createSseAdapter(options = {}) {
  const maxBufferBytes =
    typeof options.maxBufferBytes === "number" && options.maxBufferBytes > 0
      ? options.maxBufferBytes
      : DEFAULT_MAX_BUFFER_BYTES;
  const reducer = options.reducer ?? createEventReducer();
  const onEvent = typeof options.onEvent === "function" ? options.onEvent : null;
  const onMalformed =
    typeof options.onMalformed === "function" ? options.onMalformed : null;

  const decoder = new TextDecoder("utf-8", { fatal: false });
  let textBuffer = "";
  let cancelled = false;
  let lastEventId = null;
  let closed = false;

  function reportMalformed(detail, terminal = false) {
    reducer.dispatch({
      type: EventType.DIAGNOSTIC_SKIP,
      detail: typeof detail === "string" ? detail : String(detail),
    });
    if (onMalformed) onMalformed({ detail, terminal, lastEventId });
    if (terminal) {
      reducer.dispatch({
        type: EventType.RUN_ERROR,
        message: typeof detail === "string" ? detail : "SSE terminal parse error",
      });
    }
  }

  /**
   * @param {string} block
   */
  function handleBlock(block) {
    if (cancelled || closed) return;
    const parsed = parseSseBlock(block);
    if (parsed.id != null && parsed.id !== "") lastEventId = parsed.id;

    if (!parsed.data) return;

    const terminalEvent = parsed.event === "error";

    let payload;
    try {
      payload = parseAgUiPayload(parsed.data);
    } catch (err) {
      reportMalformed(
        `invalid json: ${parsed.data.slice(0, 120)} (${err && err.message ? err.message : err})`,
        terminalEvent,
      );
      return;
    }
    if (payload == null) return;

    if (typeof payload !== "object" || Array.isArray(payload)) {
      reportMalformed(parsed.data, terminalEvent);
      return;
    }

    // AG-UI events carry `type`. Bare OpenAI-in-SSE is out of scope for A7.2.
    if (typeof payload.type !== "string" || !payload.type) {
      reportMalformed(payload, terminalEvent);
      return;
    }

    const meta = {
      sseEvent: parsed.event || null,
      id: parsed.id,
      lastEventId,
      retry: parsed.retry,
    };
    reducer.dispatch(/** @type {Record<string, unknown>} */ (payload));
    if (onEvent) onEvent(/** @type {Record<string, unknown>} */ (payload), meta);
  }

  function enforceBound() {
    if (textBuffer.length <= maxBufferBytes) return;
    const overflow = textBuffer.length - maxBufferBytes;
    textBuffer = textBuffer.slice(-Math.floor(maxBufferBytes / 2));
    reportMalformed(`buffer overflow trimmed ${overflow} chars`, false);
  }

  return {
    get reducer() {
      return reducer;
    },
    getState() {
      return reducer.getState();
    },
    getLastEventId() {
      return lastEventId;
    },
    isCancelled() {
      return cancelled;
    },

    /**
     * Push a network chunk (string or Uint8Array).
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
        reportMalformed(chunk, false);
        return reducer.getState();
      }

      enforceBound();

      const { blocks, rest } = splitSseBlocks(textBuffer);
      textBuffer = rest;
      for (const block of blocks) handleBlock(block);
      return reducer.getState();
    },

    /** Flush decoder + trailing incomplete block (stream ended). */
    flush() {
      if (cancelled || closed) return reducer.getState();
      textBuffer += decoder.decode();
      if (textBuffer.trim()) {
        // Final frame may omit trailing blank line — treat remainder as a block.
        handleBlock(textBuffer);
        textBuffer = "";
      }
      closed = true;
      return reducer.getState();
    },

    /** Cooperative cancel — stop parsing; mark run cancelled. */
    cancel(reason = "cancelled") {
      if (cancelled) return reducer.getState();
      cancelled = true;
      textBuffer = "";
      reducer.dispatch({ type: EventType.RUN_CANCELLED, message: reason });
      return reducer.getState();
    },

    reset() {
      textBuffer = "";
      cancelled = false;
      closed = false;
      lastEventId = null;
      reducer.reset();
      return reducer.getState();
    },
  };
}

/**
 * Consume a fetch Response body as AG-UI SSE into a reducer.
 *
 * @param {Response} response
 * @param {Parameters<typeof createSseAdapter>[0]} [options]
 */
export async function consumeSseResponse(response, options = {}) {
  const adapter = createSseAdapter(options);
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

export default {
  createSseAdapter,
  consumeSseResponse,
  parseSseBlock,
  splitSseBlocks,
  DEFAULT_MAX_BUFFER_BYTES,
};
