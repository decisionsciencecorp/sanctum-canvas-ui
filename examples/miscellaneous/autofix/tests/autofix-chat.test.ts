import assert from "node:assert/strict";
import test from "node:test";
import { EventType, type ChatLLM, type AGUIEvent } from "@openuidev/react-headless";
import { createAutofixChat, inputFromMessage, samplePrompt } from "../src/lib/autofix-chat";
import { samples } from "../src/lib/samples";
import { MAX_CONTEXT_CHARS, MAX_GENERATION_CHARS } from "../src/lib/contract";

async function collect(llm: ChatLLM, response: Response) {
  const events: AGUIEvent[] = [];
  for await (const event of llm.streamProtocol.parse(response)) events.push(event);
  return events;
}

function completion(status: "fixed" | "already_valid" | "fix_failed") {
  return {
    choices: [{ message: { content: status === "fix_failed" ? null : samples[4].generation } }],
    fix_summary: {
      status,
      fixed_errors: [],
      unfixed_errors:
        status === "fix_failed" ? [{ code: "unresolved", message: "Missing note." }] : [],
    },
  };
}

test("chat starters preserve each sample's source and repair context", () => {
  for (const sample of samples) {
    assert.deepEqual(inputFromMessage(samplePrompt(sample)), {
      generation: sample.generation,
      context: sample.context,
    });
  }
  assert.deepEqual(inputFromMessage(samples[3].generation), {
    generation: samples[3].generation,
    context: "",
  });
  assert.deepEqual(
    inputFromMessage(
      JSON.stringify({ generation: samples[0].generation, context: "  Fix the title.  " }),
    ),
    {
      generation: samples[0].generation,
      context: "Fix the title.",
    },
  );
});

test("chat rejects invalid or oversized input before making a request", async () => {
  const llm = createAutofixChat(async () => {
    assert.fail("must not contact the server");
  });
  for (const content of [
    " ",
    "{",
    "x".repeat(MAX_GENERATION_CHARS + 1),
    JSON.stringify({ generation: "root = Card([])", context: "x".repeat(MAX_CONTEXT_CHARS + 1) }),
  ]) {
    await assert.rejects(
      llm.send({
        threadId: "test",
        messages: [{ id: "user", role: "user", content }],
        signal: new AbortController().signal,
      }),
    );
  }
});

for (const status of ["fixed", "already_valid", "fix_failed"] as const) {
  test(`chat delivers a complete ${status} result with the original code preserved`, async () => {
    const controller = new AbortController();
    const llm = createAutofixChat(async (url, init) => {
      assert.equal(url, "/api/autofix");
      assert.equal(init?.signal, controller.signal);
      assert.equal(new Headers(init?.headers).has("Authorization"), false);
      assert.deepEqual(JSON.parse(String(init?.body)), {
        generation: samples[0].generation,
        context: samples[0].context,
      });
      return Response.json(completion(status));
    });
    const response = await llm.send({
      threadId: "test",
      signal: controller.signal,
      messages: [
        { id: "old-user", role: "user", content: "old input" },
        { id: "old-assistant", role: "assistant", content: "old repair report" },
        { id: "user", role: "user", content: samplePrompt(samples[0]) },
      ],
    });
    const events = await collect(llm, response);
    assert.deepEqual(
      events.map((event) => event.type),
      [EventType.TEXT_MESSAGE_START, EventType.TEXT_MESSAGE_CONTENT, EventType.TEXT_MESSAGE_END],
    );
    const content = events[1];
    assert.equal(content.type, EventType.TEXT_MESSAGE_CONTENT);
    if (content.type !== EventType.TEXT_MESSAGE_CONTENT) assert.fail("missing content event");
    assert.deepEqual(JSON.parse(content.delta), {
      input: { generation: samples[0].generation, context: samples[0].context },
      completion: completion(status),
    });
  });
}

test("chat retains HTTP errors for AgentInterface's retry state and rejects malformed completions", async () => {
  const args = {
    threadId: "test",
    signal: new AbortController().signal,
    messages: [{ id: "user", role: "user" as const, content: samples[0].generation }],
  };
  const failed = createAutofixChat(async () =>
    Response.json({ error: "Configure your API key." }, { status: 503 }),
  );
  const response = await failed.send(args);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "Configure your API key.");
  const malformed = createAutofixChat(async () => Response.json({ choices: [] }));
  await assert.rejects(collect(malformed, await malformed.send(args)), /unexpected response/);
});

test("cancelled requests cannot publish stale repair messages, even when transport ignores abort", async () => {
  const controller = new AbortController();
  const llm = createAutofixChat(async () => {
    controller.abort();
    return Response.json(completion("fixed"));
  });
  await assert.rejects(
    llm.send({
      threadId: "test",
      signal: controller.signal,
      messages: [{ id: "user", role: "user", content: samples[0].generation }],
    }),
    { name: "AbortError" },
  );

  const pending = new AbortController();
  const delayed = createAutofixChat(async () => Response.json(completion("fixed")));
  const response = await delayed.send({
    threadId: "test",
    signal: pending.signal,
    messages: [{ id: "user", role: "user", content: samples[0].generation }],
  });
  const iterator = delayed.streamProtocol.parse(response)[Symbol.asyncIterator]();
  assert.equal((await iterator.next()).value.type, EventType.TEXT_MESSAGE_START);
  pending.abort();
  await assert.rejects(iterator.next(), { name: "AbortError" });
});
