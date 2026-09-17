import {
  EventType,
  type ChatLLM,
  type Message,
} from "@openuidev/react-headless";
import {
  chatEventSchema,
  chatInputSchema,
  recentContext,
  type ConversationTurn,
  type RepairReport,
} from "./contract";

/** The message holds generation events; the final report replaces its preview. */
export function readReply(content: string) {
  let generation = "";
  let repairing = false;
  let report: RepairReport | undefined;
  for (const line of content.split("\n").filter(Boolean)) {
    const event = chatEventSchema.parse(JSON.parse(line));
    if (event.type === "delta") generation += event.text;
    if (event.type === "repairing") repairing = true;
    if (event.type === "result") report = event.report;
  }
  return { generation, repairing, report };
}

/** Forward conversation text and final programs, never event logs or diagnostics. */
export function conversationFromMessages(
  messages: Message[],
): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  for (const message of messages) {
    if (typeof message.content !== "string") continue;
    if (message.role === "user")
      turns.push({ role: "user", content: message.content });
    if (message.role === "assistant") {
      try {
        const report = readReply(message.content).report;
        if (report)
          turns.push({
            role: "assistant",
            content: report.output ?? report.generation,
          });
      } catch {
        /* Interrupted or older-format replies are not conversation context. */
      }
    }
  }
  const input = chatInputSchema.parse({ messages: turns.slice(-100) });
  return recentContext(input.messages);
}

export function createAutofixChat(fetcher: typeof fetch = fetch): ChatLLM {
  const requests = new WeakMap<Response, AbortSignal>();
  return {
    async send({ messages, signal }) {
      signal.throwIfAborted();
      const response = await fetcher("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationFromMessages(messages) }),
        signal,
      });
      signal.throwIfAborted();
      requests.set(response, signal);
      return response;
    },
    streamProtocol: {
      async *parse(response) {
        const signal = requests.get(response);
        if (!signal || !response.body)
          throw new Error("No generation stream is available.");
        signal.throwIfAborted();
        const reader = response.body.getReader();
        const cancel = () => {
          void reader.cancel(signal.reason).catch(() => {});
        };
        signal.addEventListener("abort", cancel, { once: true });
        const decoder = new TextDecoder();
        const messageId = crypto.randomUUID();
        let pending = "";
        let finished = false;
        try {
          yield {
            type: EventType.TEXT_MESSAGE_START,
            messageId,
            role: "assistant",
          };
          while (!finished) {
            signal.throwIfAborted();
            const { value, done } = await reader.read();
            signal.throwIfAborted();
            pending += done
              ? decoder.decode()
              : decoder.decode(value, { stream: true });
            const lines = pending.split("\n");
            pending = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.trim()) continue;
              signal.throwIfAborted();
              const event = chatEventSchema.parse(JSON.parse(line));
              if (event.type === "error") {
                yield { type: EventType.RUN_ERROR, message: event.message };
                return;
              }
              yield {
                type: EventType.TEXT_MESSAGE_CONTENT,
                messageId,
                delta: JSON.stringify(event) + "\n",
              };
              if (event.type === "result") {
                finished = true;
                break;
              }
            }
            if (done && !finished)
              throw new Error(
                "Generation ended before a final result arrived. Try again.",
              );
          }
          signal.throwIfAborted();
          yield { type: EventType.TEXT_MESSAGE_END, messageId };
        } finally {
          signal.removeEventListener("abort", cancel);
          await reader.cancel().catch(() => {});
          reader.releaseLock();
          requests.delete(response);
        }
      },
    },
  };
}
