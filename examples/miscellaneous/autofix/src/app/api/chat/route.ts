import { AutofixError } from "@/lib/autofix";
import { chatInputSchema, type ChatEvent } from "@/lib/contract";
import { generateAndRepair } from "@/lib/generate";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 180;

const providerErrors: Record<number, string> = {
  401: "The server's OPENAI_API_KEY is missing or invalid.",
  403: "The OpenAI API key does not have access to this model.",
  404: "The OpenAI model is unavailable. Check OPENAI_MODEL.",
  429: "OpenAI is rate limited or the account has insufficient credits. Check your OpenAI account and try again.",
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Send a valid JSON request." },
      { status: 400 },
    );
  }
  const input = chatInputSchema.safeParse(body);
  if (!input.success)
    return Response.json(
      { error: input.error.issues[0].message },
      { status: 400 },
    );

  const apiKey = process.env.OPENAI_API_KEY;
  const autofixKey = process.env.THESYS_API_KEY;
  if (
    !apiKey ||
    !autofixKey ||
    apiKey === "sk-..." ||
    autofixKey === "sk-th-..."
  )
    return Response.json(
      {
        error:
          "Set OPENAI_API_KEY and THESYS_API_KEY in .env.local, then restart the server.",
      },
      { status: 503 },
    );

  const cancellation = new AbortController();
  const signal = AbortSignal.any([
    request.signal,
    cancellation.signal,
    AbortSignal.timeout(150_000),
  ]);
  const events = generateAndRepair(input.data.messages, {
    apiKey,
    autofixKey,
    signal,
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    baseURL: process.env.OPENAI_BASE_URL,
    autofixURL: process.env.AUTOFIX_API_URL,
  });
  const encoder = new TextEncoder();
  const encode = (event: ChatEvent) =>
    encoder.encode(JSON.stringify(event) + "\n");
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await events.next();
        if (cancellation.signal.aborted) return;
        if (next.done) controller.close();
        else controller.enqueue(encode(next.value));
      } catch (error) {
        if (cancellation.signal.aborted) return;
        const message =
          error instanceof AutofixError
            ? error.message
            : signal.aborted
              ? "Generation was cancelled or timed out. Try again."
              : error instanceof OpenAI.APIError
                ? (providerErrors[error.status ?? 0] ??
                  "OpenAI could not complete this request. Try again.")
                : "Could not complete generation. Check the provider configuration and try again.";
        controller.enqueue(encode({ type: "error", message }));
        controller.close();
      }
    },
    async cancel() {
      cancellation.abort();
      await events.return(undefined);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
