import { EventType, type ChatLLM } from "@openuidev/react-headless";
import { z } from "zod/v4";
import { completionSchema, inputSchema, type AutofixInput } from "./contract";
import { samples } from "./samples";

export const repairMessageSchema = z.object({ input: inputSchema, completion: completionSchema });

export function samplePrompt(sample: { label: string }) {
  return `Try the "${sample.label}" example.`;
}

/** Starters load saved output; custom messages accept source or { generation, context } JSON. */
export function inputFromMessage(content: string): AutofixInput {
  const sample = samples.find((item) => samplePrompt(item) === content.trim());
  let input: unknown = sample
    ? { generation: sample.generation, context: sample.context }
    : { generation: content };
  if (!sample && content.trimStart().startsWith("{")) {
    try {
      input = JSON.parse(content);
    } catch {
      throw new Error(
        "Send valid JSON with generation and optional context, or paste OpenUI Lang directly.",
      );
    }
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  return parsed.data;
}

/** Adapt one complete Autofix JSON response to AgentInterface's message lifecycle. */
export function createAutofixChat(fetcher: typeof fetch = fetch): ChatLLM {
  const requests = new WeakMap<Response, { input: AutofixInput; signal: AbortSignal }>();
  return {
    async send({ messages, signal }) {
      signal.throwIfAborted();
      const message = messages.findLast((item) => item.role === "user");
      if (typeof message?.content !== "string") throw new Error("Enter an OpenUI Lang program.");
      // Each repair is independent. Earlier assistant reports are never sent as generations.
      const input = inputFromMessage(message.content);
      const response = await fetcher("/api/autofix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal,
      });
      signal.throwIfAborted();
      requests.set(response, { input, signal });
      return response;
    },
    streamProtocol: {
      async *parse(response) {
        const request = requests.get(response);
        if (!request) throw new Error("No Autofix request is associated with this response.");
        try {
          request.signal.throwIfAborted();
          const parsed = completionSchema.safeParse(await response.json());
          request.signal.throwIfAborted();
          if (!parsed.success)
            throw new Error("Autofix returned an unexpected response. Try again.");
          const messageId = crypto.randomUUID();
          // The API is non-streaming: publish the completed report in one content event.
          yield { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" };
          request.signal.throwIfAborted();
          yield {
            type: EventType.TEXT_MESSAGE_CONTENT,
            messageId,
            delta: JSON.stringify({ input: request.input, completion: parsed.data }),
          };
          yield { type: EventType.TEXT_MESSAGE_END, messageId };
        } finally {
          requests.delete(response);
        }
      },
    },
  };
}
