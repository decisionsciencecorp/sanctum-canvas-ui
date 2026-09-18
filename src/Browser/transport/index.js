/**
 * A7 — Browser stream transport barrel (event reducer + SSE + NDJSON).
 */

export {
  EventType,
  createInitialState,
  reduceEvent,
  reduceEvents,
  createEventReducer,
  summarizeState,
  freezeState,
  MAX_DIAGNOSTIC_ENTRIES,
  MAX_DIAGNOSTIC_DETAIL_CHARS,
} from "./eventReducer.js";

export {
  createSseAdapter,
  consumeSseResponse,
  parseSseBlock,
  splitSseBlocks,
  DEFAULT_MAX_BUFFER_BYTES as SSE_MAX_BUFFER_BYTES,
} from "./sseAdapter.js";

export {
  createNdjsonAdapter,
  consumeNdjsonResponse,
  buildNdjsonReplay,
  DEFAULT_MAX_BUFFER_BYTES as NDJSON_MAX_BUFFER_BYTES,
} from "./ndjsonAdapter.js";

export { registerTransport, TRANSPORT_MODULES } from "./register.js";
export { default as register } from "./register.js";

export { default } from "./register.js";
