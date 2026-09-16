import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../src/app/api/autofix/route";
import spec from "../src/generated/spec.json";
import { AutofixError, buildAutofixRequest, requestAutofix } from "../src/lib/autofix";
import { inputSchema, MAX_CONTEXT_CHARS, MAX_GENERATION_CHARS } from "../src/lib/contract";
import { samples } from "../src/lib/samples";
import { findErrors } from "../src/lib/validation";

for (const sample of samples) {
  test(`the real parser validates the ${sample.id} fixture`, () => {
    const errors = findErrors(sample.generation);
    if (sample.expectedError === null) assert.deepEqual(errors, []);
    else
      assert.ok(
        errors.some((error) => error.code === sample.expectedError),
        JSON.stringify(errors),
      );
  });
}

test("sends the generated library as the first config turn and the original generation last", () => {
  const input = inputSchema.parse({
    generation: samples[3].generation,
    context: "  Show revenue.  ",
  });
  const body = buildAutofixRequest(input);
  assert.equal(body.messages[0].role, "system");
  assert.ok(body.messages[0].content.startsWith("]]>openui:config\n"));
  const config = JSON.parse(body.messages[0].content.slice("]]>openui:config\n".length));
  assert.deepEqual(config.chatLibrary.schema, spec.schema);
  assert.equal(config.chatLibrary.root, "Card");
  assert.equal("libraryVersion" in config, false);
  assert.equal("library" in body, false);
  assert.deepEqual(body.messages.slice(1), [
    { role: "user", content: "Show revenue." },
    { role: "assistant", content: samples[3].generation },
  ]);
  assert.equal(body.stream, false);
});

test("empty context is omitted, while source whitespace is preserved", () => {
  const generation = `\n${samples[4].generation}\n`;
  const body = buildAutofixRequest(inputSchema.parse({ generation }));
  assert.equal(body.messages.length, 2);
  assert.equal(body.messages[1].content, generation);
});

test("rejects empty, oversized, or client-supplied library requests before transport", () => {
  for (const body of [
    { generation: "  " },
    { generation: "x".repeat(MAX_GENERATION_CHARS + 1) },
    { generation: "root = Card([])", context: "x".repeat(MAX_CONTEXT_CHARS + 1) },
    { generation: "root = Card([])", library: {} },
  ])
    assert.equal(inputSchema.safeParse(body).success, false);
  assert.equal(
    inputSchema.safeParse({
      generation: "x".repeat(MAX_GENERATION_CHARS),
      context: "x".repeat(MAX_CONTEXT_CHARS),
    }).success,
    true,
  );
});

function completion(status: "fixed" | "already_valid" | "fix_failed") {
  return {
    choices: [{ message: { content: status === "fix_failed" ? null : samples[4].generation } }],
    fix_summary: {
      status,
      fixed_errors: [],
      unfixed_errors:
        status === "fix_failed" ? [{ code: "unresolved", message: "Missing note." }] : [],
    },
    usage: { prompt_tokens: 40, completion_tokens: 10, total_tokens: 50 },
  };
}

for (const status of ["fixed", "already_valid", "fix_failed"] as const) {
  test(`preserves the ${status} completion and keeps credentials in the server request`, async () => {
    const controller = new AbortController();
    const result = await requestAutofix(
      { generation: samples[0].generation, context: "" },
      {
        apiKey: "test-server-key",
        signal: controller.signal,
        fetcher: async (url, init) => {
          assert.equal(url, "https://api.thesys.dev/v1/autofix");
          assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-server-key");
          assert.equal(init?.signal, controller.signal);
          assert.equal(init?.cache, "no-store");
          assert.equal(JSON.parse(String(init?.body)).messages.at(-1).role, "assistant");
          return Response.json(completion(status));
        },
      },
    );
    assert.deepEqual(result, completion(status));
    assert.equal(JSON.stringify(result).includes("test-server-key"), false);
  });
}

test("maps upstream authentication, limits, unavailable routes, and server failures", async () => {
  for (const status of [400, 401, 403, 404, 429, 500]) {
    await assert.rejects(
      requestAutofix(
        { generation: samples[0].generation, context: "" },
        {
          apiKey: "test-key",
          fetcher: async () => new Response("private upstream details", { status }),
        },
      ),
      (error: unknown) =>
        error instanceof AutofixError &&
        error.status === (status === 500 ? 502 : status) &&
        !error.message.includes("private upstream"),
    );
  }
});

test("rejects malformed or inconsistent success responses", async () => {
  for (const value of [
    {},
    { ...completion("fixed"), choices: [{ message: { content: null } }] },
    { ...completion("fix_failed"), choices: [{ message: { content: "not a repair" } }] },
    { ...completion("already_valid"), choices: [] },
  ]) {
    await assert.rejects(
      requestAutofix(
        { generation: samples[0].generation, context: "" },
        {
          apiKey: "test-key",
          fetcher: async () => Response.json(value),
        },
      ),
      (error: unknown) => error instanceof AutofixError && error.status === 502,
    );
  }
  await assert.rejects(
    requestAutofix(
      { generation: samples[0].generation, context: "" },
      {
        apiKey: "test-key",
        fetcher: async () => new Response("not json"),
      },
    ),
    /unexpected response/,
  );
});

test("the Next route rejects invalid JSON and invalid inputs without an API key", async () => {
  for (const body of ["{", JSON.stringify({ generation: " " })]) {
    const response = await POST(
      new Request("http://localhost/api/autofix", { method: "POST", body }),
    );
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, "string");
  }
});

test("missing credentials produce an actionable setup response without contacting the API", async () => {
  const saved = process.env.THESYS_API_KEY;
  delete process.env.THESYS_API_KEY;
  try {
    const response = await POST(
      new Request("http://localhost/api/autofix", {
        method: "POST",
        body: JSON.stringify({ generation: samples[0].generation }),
      }),
    );
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /\.env\.local/);
  } finally {
    if (saved === undefined) delete process.env.THESYS_API_KEY;
    else process.env.THESYS_API_KEY = saved;
  }
});
