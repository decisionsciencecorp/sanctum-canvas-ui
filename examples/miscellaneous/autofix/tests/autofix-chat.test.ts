import assert from "node:assert/strict";
import test from "node:test";
import {
  EventType,
  type ChatLLM,
  type AGUIEvent,
} from "@openuidev/react-headless";
import {
  createAutofixChat,
  conversationFromMessages,
  readReply,
} from "../src/lib/autofix-chat";
import {
  recentContext,
  type ChatEvent,
  type RepairReport,
} from "../src/lib/contract";
import { samples } from "./fixtures";

const report: RepairReport = {
  generation: samples[0].generation,
  output: samples[4].generation,
  status: "fixed",
  fixedErrors: [],
  remainingErrors: [],
};
const result: ChatEvent = { type: "result", report };
const args = () => ({
  threadId: "test",
  signal: new AbortController().signal,
  messages: [
    { id: "user", role: "user" as const, content: "Show September revenue." },
  ],
});
const wire = (events: ChatEvent[]) =>
  events.map((event) => JSON.stringify(event) + "\n").join("");
async function collect(llm: ChatLLM, response: Response) {
  const events: AGUIEvent[] = [];
  for await (const event of llm.streamProtocol.parse(response))
    events.push(event);
  return events;
}

test("follow-up turns carry the final repaired UI, not report metadata or incomplete generations", () => {
  const messages = conversationFromMessages([
    ...args().messages,
    {
      id: "assistant",
      role: "assistant",
      content: wire([{ type: "delta", text: report.generation }, result]),
    },
    {
      id: "partial",
      role: "assistant",
      content: wire([{ type: "delta", text: "root = " }]),
    },
    { id: "next", role: "user", content: "Change the revenue to $50,000." },
  ]);
  assert.deepEqual(messages, [
    { role: "user", content: "Show September revenue." },
    { role: "assistant", content: samples[4].generation },
    { role: "user", content: "Change the revenue to $50,000." },
  ]);
});

test("history trimming retains whole recent turns and the latest request within both limits", () => {
  assert.equal(
    recentContext(
      Array.from({ length: 25 }, (_, i) => ({
        role: "user" as const,
        content: String(i),
      })),
    ).length,
    20,
  );
  assert.deepEqual(
    recentContext([
      { role: "user", content: "old request" },
      { role: "assistant", content: "x".repeat(8000) },
      { role: "user", content: "latest request" },
    ]),
    [{ role: "user", content: "latest request" }],
  );
});

test("normal prompts go to the generation route without browser credentials", async () => {
  const request = args();
  const llm = createAutofixChat(async (url, init) => {
    assert.equal(url, "/api/chat");
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    assert.equal(init?.signal, request.signal);
    assert.deepEqual(JSON.parse(String(init?.body)), {
      messages: [{ role: "user", content: "Show September revenue." }],
    });
    return new Response(wire([result]));
  });
  await llm.send(request);
});

test("empty or oversized user prompts are rejected before transport", async () => {
  const llm = createAutofixChat(async () =>
    assert.fail("invalid input must not call the server"),
  );
  for (const content of [" ", "x".repeat(8001)])
    await assert.rejects(
      llm.send({ ...args(), messages: [{ id: "u", role: "user", content }] }),
    );
});

test("fragmented UTF-8 stream updates one reply through generation, repair, and replacement", async () => {
  const content = wire([
    { type: "delta", text: "root = Card([]) // café" },
    { type: "repairing" },
    result,
  ]);
  const bytes = new TextEncoder().encode(content);
  const response = new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 3)
          controller.enqueue(bytes.slice(i, i + 3));
        controller.close();
      },
    }),
  );
  const llm = createAutofixChat(async () => response);
  const events = await collect(llm, await llm.send(args()));
  assert.equal(
    events.filter((e) => e.type === EventType.TEXT_MESSAGE_START).length,
    1,
  );
  assert.equal(
    events.filter((e) => e.type === EventType.TEXT_MESSAGE_END).length,
    1,
  );
  const deltas = events.flatMap((e) =>
    e.type === EventType.TEXT_MESSAGE_CONTENT ? [e.delta] : [],
  );
  assert.equal(readReply(deltas[0]).generation, "root = Card([]) // café");
  assert.equal(readReply(deltas.slice(0, 2).join("")).repairing, true);
  assert.deepEqual(readReply(deltas.join("")).report, report);
});

test("HTTP errors, error events, and prematurely ended streams remain failures", async () => {
  const failed = createAutofixChat(async () =>
    Response.json({ error: "Configure your API key." }, { status: 503 }),
  );
  assert.equal((await failed.send(args())).status, 503);
  const errored = createAutofixChat(
    async () =>
      new Response(wire([{ type: "error", message: "Provider unavailable" }])),
  );
  assert.deepEqual(
    (await collect(errored, await errored.send(args()))).at(-1),
    { type: EventType.RUN_ERROR, message: "Provider unavailable" },
  );
  const truncated = createAutofixChat(
    async () => new Response(wire([{ type: "delta", text: "root = " }])),
  );
  await assert.rejects(
    collect(truncated, await truncated.send(args())),
    /before a final result/,
  );
});

test("cancellation prevents late events and closes a pending response reader", async () => {
  const controller = new AbortController();
  const llm = createAutofixChat(async () => {
    controller.abort();
    return new Response(wire([result]));
  });
  await assert.rejects(llm.send({ ...args(), signal: controller.signal }), {
    name: "AbortError",
  });

  const pending = new AbortController();
  let cancelled = false;
  const waiting = createAutofixChat(
    async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled = true;
          },
        }),
      ),
  );
  const response = await waiting.send({ ...args(), signal: pending.signal });
  const iterator = waiting.streamProtocol
    .parse(response)
    [Symbol.asyncIterator]();
  await iterator.next();
  const next = iterator.next();
  pending.abort();
  await assert.rejects(next, { name: "AbortError" });
  assert.equal(cancelled, true);
});
