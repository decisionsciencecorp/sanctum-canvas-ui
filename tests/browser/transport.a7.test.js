/**
 * A7.1–A7.3 — Event reducer + SSE + NDJSON transport.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EventType,
  createInitialState,
  reduceEvent,
  reduceEvents,
  createEventReducer,
  summarizeState,
  freezeState,
  MAX_DIAGNOSTIC_ENTRIES,
  createSseAdapter,
  consumeSseResponse,
  parseSseBlock,
  splitSseBlocks,
  createNdjsonAdapter,
  consumeNdjsonResponse,
  buildNdjsonReplay,
  registerTransport,
  TRANSPORT_MODULES,
  register,
} from "../../src/Browser/transport/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, "../fixtures/stream");
const resourceFixtureDir = join(__dirname, "../../resources/fixtures/stream");

function loadJson(name) {
  const path = join(fixtureDir, name);
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertExpect(state, expect) {
  const summary = summarizeState(state);
  for (const [key, value] of Object.entries(expect)) {
    assert.equal(summary[key], value, `expect.${key}`);
  }
}

describe("A7.1 eventReducer — frozen fixtures", () => {
  const eventFixtures = readdirSync(fixtureDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => loadJson(f))
    .filter((f) => Array.isArray(f.events));

  for (const fixture of eventFixtures) {
    it(`${fixture.id} is deterministic`, () => {
      const a = freezeState(reduceEvents(fixture.events));
      const b = freezeState(reduceEvents(fixture.events));
      assert.deepEqual(a, b);
      if (fixture.expect) assertExpect(a, fixture.expect);
    });
  }

  it("reuses resources/fixtures/stream corpus", () => {
    for (const name of readdirSync(resourceFixtureDir)) {
      const fixture = JSON.parse(readFileSync(join(resourceFixtureDir, name), "utf8"));
      if (!fixture.events) continue;
      const state = reduceEvents(fixture.events);
      assertExpect(state, fixture.expect);
    }
  });

  it("handles TEXT_MESSAGE_CHUNK and empty deltas", () => {
    const state = reduceEvents([
      { type: EventType.TEXT_MESSAGE_CHUNK, messageId: "m", delta: "Hi" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m", delta: "" },
      { type: EventType.TEXT_MESSAGE_END, messageId: "m" },
    ]);
    assert.equal(state.messages[0].content, "Hi");
    assert.equal(state.messages[0].status, "complete");
  });

  it("TOOL_CALL_CHUNK lazily starts tools", () => {
    const state = reduceEvents([
      { type: EventType.TOOL_CALL_CHUNK, toolCallId: "t", toolCallName: "fn", delta: "{" },
      { type: EventType.TOOL_CALL_CHUNK, toolCallId: "t", delta: "}" },
    ]);
    assert.equal(state.tools[0].name, "fn");
    assert.equal(state.tools[0].args, "{}");
    assert.equal(state.tools[0].status, "streaming");
  });

  it("TOOL_CALL_RESULT error flags", () => {
    const state = reduceEvents([
      { type: EventType.TOOL_CALL_START, toolCallId: "t", toolName: "x" },
      {
        type: EventType.TOOL_CALL_RESULT,
        toolCallId: "t",
        content: "boom",
        isError: true,
        error: "nope",
      },
    ]);
    assert.equal(state.tools[0].status, "error");
    assert.equal(state.tools[0].error, "nope");
  });

  it("bounds diagnostic entries", () => {
    let state = createInitialState();
    for (let i = 0; i < MAX_DIAGNOSTIC_ENTRIES + 20; i++) {
      state = reduceEvent(state, { raw: `bad-${i}` });
    }
    assert.equal(state.diagnostics.entries.length, MAX_DIAGNOSTIC_ENTRIES);
    assert.equal(state.diagnostics.skippedMalformed, MAX_DIAGNOSTIC_ENTRIES + 20);
  });

  it("unknown events are non-terminal diagnostics", () => {
    const state = reduceEvents([
      { type: EventType.RUN_STARTED, runId: "r" },
      { type: "CUSTOM_FOO", x: 1 },
      { type: EventType.RUN_FINISHED, runId: "r" },
    ]);
    assert.equal(state.runStatus, "finished");
    assert.ok(state.diagnostics.entries.some((e) => e.kind === "unknown_event"));
  });

  it("createEventReducer dispatch/reset/summarize", () => {
    const r = createEventReducer();
    r.dispatch({ type: EventType.RUN_STARTED, runId: "x" });
    assert.equal(r.summarize().runStatus, "running");
    r.reset();
    assert.equal(r.getState().runStatus, "idle");
  });

  it("null/invalid events count as malformed", () => {
    const state = reduceEvents([null, undefined, 42, { type: EventType.RUN_STARTED, runId: "r" }]);
    assert.equal(state.diagnostics.skippedMalformed, 3);
    assert.equal(state.runStatus, "running");
  });

  it("RUN_CANCELLED stops streaming", () => {
    const state = reduceEvents([
      { type: EventType.RUN_STARTED, runId: "r" },
      { type: EventType.RUN_CANCELLED },
      { type: EventType.RUN_FINISHED, runId: "r" },
    ]);
    assert.equal(state.runStatus, "cancelled");
    assert.equal(state.cancelled, true);
  });
});

describe("A7.2 sseAdapter", () => {
  it("parseSseBlock multiline data + id", () => {
    const block = "id: 9\nevent: msg\ndata: {\"a\":1}\ndata: {\"b\":2}\n";
    const p = parseSseBlock(block);
    assert.equal(p.id, "9");
    assert.equal(p.event, "msg");
    assert.equal(p.data, '{"a":1}\n{"b":2}');
  });

  it("splitSseBlocks keeps partial rest", () => {
    const { blocks, rest } = splitSseBlocks("data: a\n\ndata: b");
    assert.deepEqual(blocks, ["data: a"]);
    assert.equal(rest, "data: b");
  });

  it("sse-chunk-split-text fixture", () => {
    const fixture = loadJson("sse-chunk-split-text.json");
    const adapter = createSseAdapter();
    for (const chunk of fixture.chunks) adapter.push(chunk);
    adapter.flush();
    assertExpect(adapter.getState(), fixture.expect);
    assert.equal(adapter.getState().messages[0].content, 'root = Title("Hi")\n');
    assert.equal(adapter.getLastEventId(), "1");
  });

  it("skips malformed non-terminal JSON and continues", () => {
    const adapter = createSseAdapter();
    adapter.push('data: {"type":"RUN_STARTED","runId":"r3"}\n\n');
    adapter.push("data: not-json\n\n");
    adapter.push('data: {"type":"RUN_FINISHED","runId":"r3"}\n\n');
    adapter.flush();
    assert.equal(adapter.getState().runStatus, "finished");
    assert.equal(adapter.getState().diagnostics.skippedMalformed, 1);
  });

  it("handles chunk splits mid-JSON and UTF-8", () => {
    const adapter = createSseAdapter();
    const payload = JSON.stringify({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "m",
      delta: "café",
    });
    const wire = `data: ${payload}\n\n`;
    const bytes = new TextEncoder().encode(wire);
    adapter.push(bytes.slice(0, 12));
    adapter.push(bytes.slice(12));
    adapter.flush();
    assert.equal(adapter.getState().messages[0].content, "café");
  });

  it("cancel stops further parsing", () => {
    const adapter = createSseAdapter();
    adapter.push('data: {"type":"RUN_STARTED","runId":"r"}\n\n');
    adapter.cancel();
    adapter.push('data: {"type":"RUN_FINISHED","runId":"r"}\n\n');
    assert.equal(adapter.getState().runStatus, "cancelled");
    assert.equal(adapter.isCancelled(), true);
  });

  it("bounds oversized buffers", () => {
    const adapter = createSseAdapter({ maxBufferBytes: 64 });
    adapter.push("x".repeat(200));
    assert.ok(adapter.getState().diagnostics.skippedMalformed >= 1);
  });

  it("consumeSseResponse reads a stream", async () => {
    const body = [
      'data: {"type":"RUN_STARTED","runId":"r"}\n\n',
      'data: {"type":"RUN_FINISHED","runId":"r"}\n\n',
    ].join("");
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(body));
        c.close();
      },
    });
    const adapter = await consumeSseResponse(new Response(stream));
    assert.equal(adapter.getState().runStatus, "finished");
  });

  it("consumeSseResponse without body → error", async () => {
    const adapter = await consumeSseResponse(/** @type {any} */ ({ body: null }));
    assert.equal(adapter.getState().runStatus, "error");
  });

  it("onEvent / onMalformed hooks fire", () => {
    const seen = [];
    const bad = [];
    const adapter = createSseAdapter({
      onEvent: (e) => seen.push(e.type),
      onMalformed: (i) => bad.push(i.detail),
    });
    adapter.push('data: {"type":"RUN_STARTED","runId":"r"}\n\n');
    adapter.push("data: {{{{\n\n");
    adapter.flush();
    assert.deepEqual(seen, ["RUN_STARTED"]);
    assert.equal(bad.length, 1);
  });

  it("reset clears adapter", () => {
    const adapter = createSseAdapter();
    adapter.push('data: {"type":"RUN_STARTED","runId":"r"}\n\n');
    adapter.reset();
    assert.equal(adapter.getState().runStatus, "idle");
    assert.equal(adapter.getLastEventId(), null);
  });

  it("coverage gaps — retry, ArrayBuffer, arrays, [DONE], terminal error event", async () => {
    const p = parseSseBlock("retry: 1500\ndata: {\"type\":\"RUN_STARTED\",\"runId\":\"r\"}\n: comment\n");
    assert.equal(p.retry, 1500);

    const adapter = createSseAdapter();
    const enc = new TextEncoder();
    const buf = enc.encode('data: {"type":"RUN_STARTED","runId":"r"}\n\n').buffer;
    adapter.push(buf);
    adapter.push(null);
    adapter.push(/** @type {any} */ (12));
    adapter.push('data: [1,2]\n\n');
    adapter.push('data: {"noType":true}\n\n');
    adapter.push("data: [DONE]\n\n");
    adapter.push('data: {"type":"RUN_FINISHED","runId":"r"}\n\n');
    adapter.flush();
    assert.equal(adapter.getState().runStatus, "finished");
    assert.ok(adapter.getState().diagnostics.skippedMalformed >= 3);

    // flush with trailing frame (no blank line) already closed — second flush no-op
    adapter.flush();

    const term = createSseAdapter();
    term.push('event: error\ndata: not-json\n\n');
    term.flush();
    assert.equal(term.getState().runStatus, "error");

    // Reader throws mid-stream
    const badStream = new ReadableStream({
      start(c) {
        c.enqueue(enc.encode('data: {"type":"RUN_STARTED","runId":"r"}\n\n'));
        c.error(new Error("boom"));
      },
    });
    const failed = await consumeSseResponse(new Response(badStream));
    assert.equal(failed.getState().runStatus, "error");
    assert.match(failed.getState().error || "", /boom/);

    // Double cancel is idempotent
    const c = createSseAdapter();
    c.cancel("a");
    c.cancel("b");
    assert.equal(c.getState().runStatus, "cancelled");
  });
});

describe("A7.3 ndjsonAdapter", () => {
  it("ndjson-text-parity matches AG-UI text fixture summary", () => {
    const agui = loadJson("text-message-basic.json");
    const nd = loadJson("ndjson-text-parity.json");
    const aguiState = summarizeState(reduceEvents(agui.events));

    const adapter = createNdjsonAdapter({
      messageId: nd.messageId,
      runId: nd.runId,
    });
    adapter.push(
      buildNdjsonReplay({
        runId: nd.runId,
        messageId: nd.messageId,
        content: nd.content,
      }),
    );
    adapter.flush();
    const ndState = summarizeState(adapter.getState());
    assert.equal(ndState.messages, aguiState.messages);
    assert.equal(ndState.runStatus, aguiState.runStatus);
    assert.equal(adapter.getState().messages[0].content, nd.content);
  });

  it("passes through AG-UI events on an NDJSON line", () => {
    const adapter = createNdjsonAdapter({ runId: "lab-1", messageId: "m1" });
    adapter.push(
      '{"type":"RUN_STARTED","runId":"lab-1"}\n' +
        '{"type":"TEXT_MESSAGE_START","messageId":"m1","role":"assistant"}\n' +
        '{"type":"TEXT_MESSAGE_CONTENT","messageId":"m1","delta":"root = TextContent(\\"Hi\\")\\n"}\n' +
        '{"type":"TEXT_MESSAGE_END","messageId":"m1"}\n' +
        '{"type":"RUN_FINISHED","runId":"lab-1"}\n',
    );
    adapter.flush();
    const state = adapter.getState();
    assert.equal(state.runStatus, "finished");
    assert.equal(state.messages.length, 1);
    assert.equal(state.messages[0].content, 'root = TextContent("Hi")\n');
  });

  it("ndjson-tool-parity finishes tools as executing (END without RESULT)", () => {
    const nd = loadJson("ndjson-tool-parity.json");
    const adapter = createNdjsonAdapter({
      messageId: nd.messageId,
      runId: nd.runId,
    });
    adapter.push(
      buildNdjsonReplay({
        runId: nd.runId,
        messageId: nd.messageId,
        tools: nd.tools,
      }),
    );
    adapter.flush();
    assertExpect(adapter.getState(), nd.expect);
    assert.equal(adapter.getState().tools[0].args, '{"q":1}');
  });

  it("partial UTF-8 across chunks then complete JSON line", () => {
    const adapter = createNdjsonAdapter({ messageId: "m1", runId: "r1" });
    const line = JSON.stringify({
      choices: [{ delta: { role: "assistant", content: "π" }, finish_reason: null }],
    });
    const bytes = new TextEncoder().encode(`${line}\n`);
    adapter.push(bytes.slice(0, 8));
    adapter.push(bytes.slice(8));
    adapter.push(
      `${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] })}\n`,
    );
    adapter.flush();
    assert.equal(adapter.getState().messages[0].content, "π");
    assert.equal(adapter.getState().runStatus, "finished");
  });

  it("skips malformed lines and continues", () => {
    const adapter = createNdjsonAdapter({ messageId: "m", runId: "r3", emitRunEnvelope: true });
    adapter.push(`${JSON.stringify({ choices: [{ delta: { role: "assistant" }, finish_reason: null }] })}\n`);
    adapter.push("not-json\n");
    adapter.push(
      `${JSON.stringify({ choices: [{ delta: { content: "ok" }, finish_reason: null }] })}\n`,
    );
    adapter.push(
      `${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] })}\n`,
    );
    adapter.flush();
    assert.equal(adapter.getState().diagnostics.skippedMalformed, 1);
    assert.equal(adapter.getState().runStatus, "finished");
    assert.match(adapter.getState().messages[0].content, /ok/);
  });

  it("error objects become RUN_ERROR", () => {
    const adapter = createNdjsonAdapter({ runId: "r" });
    adapter.push(`${JSON.stringify({ error: { message: "quota" } })}\n`);
    adapter.flush();
    assert.equal(adapter.getState().runStatus, "error");
    assert.equal(adapter.getState().error, "quota");
  });

  it("content_filter finish reason errors", () => {
    const adapter = createNdjsonAdapter({ runId: "r", messageId: "m" });
    adapter.push(
      `${JSON.stringify({ choices: [{ delta: { content: "x" }, finish_reason: null }] })}\n`,
    );
    adapter.push(
      `${JSON.stringify({ choices: [{ delta: {}, finish_reason: "content_filter" }] })}\n`,
    );
    adapter.flush();
    assert.equal(adapter.getState().runStatus, "error");
  });

  it("cancel stops parsing", () => {
    const adapter = createNdjsonAdapter({ runId: "r", messageId: "m" });
    adapter.push(
      `${JSON.stringify({ choices: [{ delta: { content: "a" }, finish_reason: null }] })}\n`,
    );
    adapter.cancel();
    adapter.push(
      `${JSON.stringify({ choices: [{ delta: { content: "b" }, finish_reason: "stop" }] })}\n`,
    );
    assert.equal(adapter.getState().cancelled, true);
    assert.equal(adapter.getState().messages[0].content, "a");
  });

  it("consumeNdjsonResponse", async () => {
    const body = buildNdjsonReplay({ content: "hi", runId: "r", messageId: "m" });
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(body));
        c.close();
      },
    });
    const adapter = await consumeNdjsonResponse(new Response(stream), {
      messageId: "m",
      runId: "r",
    });
    assert.equal(adapter.getState().runStatus, "finished");
  });

  it("[DONE] finishes an open run", () => {
    const adapter = createNdjsonAdapter({ messageId: "m", runId: "r" });
    adapter.push(
      `${JSON.stringify({ choices: [{ delta: { content: "z" }, finish_reason: null }] })}\n`,
    );
    adapter.push("[DONE]\n");
    adapter.flush();
    assert.equal(adapter.getState().runStatus, "finished");
  });

  it("coverage gaps — heartbeat, ArrayBuffer, reset, length, no body, overflow", async () => {
    const adapter = createNdjsonAdapter({ messageId: "m", runId: "r" });
    adapter.push(`${JSON.stringify({ id: "x" })}\n`); // no choices
    adapter.push(`${JSON.stringify([])}\n`);
    adapter.push("data: {\"choices\":[{\"delta\":{\"content\":\"hi\"},\"finish_reason\":null}]}\n");
    const enc = new TextEncoder();
    const ab = enc.encode(
      `${JSON.stringify({ choices: [{ delta: {}, finish_reason: "length" }] })}\n`,
    ).buffer;
    adapter.push(ab);
    adapter.push(null);
    adapter.push(/** @type {any} */ ({ weird: true }));
    assert.equal(adapter.getState().runStatus, "finished");
    assert.match(adapter.getState().messages[0].content, /hi/);

    adapter.reset({ runId: "r2" });
    assert.equal(adapter.getState().runStatus, "idle");

    const tiny = createNdjsonAdapter({ messageId: "m", runId: "r", maxBufferBytes: 40 });
    tiny.push("y".repeat(120));
    assert.ok(tiny.getState().diagnostics.skippedMalformed >= 1);

    // flush trailing line without newline
    const trail = createNdjsonAdapter({ messageId: "m", runId: "r" });
    trail.push(
      JSON.stringify({ choices: [{ delta: { content: "t" }, finish_reason: "stop" }] }),
    );
    trail.flush();
    assert.equal(trail.getState().runStatus, "finished");

    const noBody = await consumeNdjsonResponse(/** @type {any} */ ({ body: null }));
    assert.equal(noBody.getState().runStatus, "error");

    const badStream = new ReadableStream({
      start(c) {
        c.error(new Error("nd-boom"));
      },
    });
    const failed = await consumeNdjsonResponse(new Response(badStream), { runId: "r" });
    assert.equal(failed.getState().runStatus, "error");

    // cancel then flush/push no-ops
    const c = createNdjsonAdapter({ runId: "r", messageId: "m" });
    c.cancel();
    c.push("x\n");
    c.flush();
    assert.equal(c.getState().cancelled, true);
  });
});

describe("A7 register / index", () => {
  it("registerTransport attaches helpers", () => {
    const target = registerTransport({});
    assert.equal(typeof target.createEventReducer, "function");
    assert.equal(typeof target.createSseAdapter, "function");
    assert.equal(typeof target.createNdjsonAdapter, "function");
    assert.ok(TRANSPORT_MODULES.eventReducer);
    assert.equal(register, registerTransport);
  });

  it("registerTransport rejects non-objects", () => {
    assert.throws(() => registerTransport(null), /target object required/);
  });
});
