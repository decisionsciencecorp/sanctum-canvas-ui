import { EventType } from "@ag-ui/core";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessageChunk, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { MemorySaver } from "@langchain/langgraph";
import { createDeepAgent, createSummarizationMiddleware, StateBackend } from "deepagents";
import { summarizationMiddleware } from "langchain";
import { describe, expect, it } from "vitest";

import { openUIStreamTransformer } from "../transformer";

const ANSWER = "[ANSWER] reply";
const SUMMARY = "SUMMARY: earlier chat";

/**
 * Streams a canned reply for agent turns and a canned summary for the
 * single-message summarization prompt, and counts how many summaries it
 * was asked for so tests can prove compaction actually ran.
 */
class ScriptedChatModel extends BaseChatModel {
  summaryRequests = 0;

  _llmType() {
    return "scripted";
  }

  bindTools() {
    return this;
  }

  async _generate(): Promise<never> {
    throw new Error("ScriptedChatModel only supports streaming");
  }

  async *_streamResponseChunks(messages: BaseMessage[]) {
    const isSummaryPrompt = messages.length === 1 && /summar/i.test(String(messages[0].content));
    if (isSummaryPrompt) this.summaryRequests += 1;
    const text = isSummaryPrompt ? SUMMARY : ANSWER;
    for (const word of text.split(" ")) {
      const chunk = `${word} `;
      yield new ChatGenerationChunk({
        text: chunk,
        message: new AIMessageChunk({ content: chunk }),
      });
    }
  }
}

const TURNS = ["one", "two", "three", "four"];

async function collectAssistantTexts(
  middleware: Parameters<typeof createDeepAgent>[0]["middleware"],
  model: ScriptedChatModel,
): Promise<string[]> {
  const agent = createDeepAgent({
    model,
    middleware,
    checkpointer: new MemorySaver(),
    streamTransformers: [openUIStreamTransformer],
  });
  const config = { configurable: { thread_id: "thread" }, version: "v3" as const };

  const texts: string[] = [];
  for (const turn of TURNS) {
    const stream = await agent.streamEvents({ messages: [new HumanMessage(turn)] }, config);
    let current = "";
    for await (const event of stream) {
      if (event.method !== "custom:openui") continue;
      const data = event.params.data;
      if (data.type === EventType.TEXT_MESSAGE_CONTENT) current += data.delta;
      if (data.type === EventType.TEXT_MESSAGE_END) {
        texts.push(current.trim());
        current = "";
      }
    }
  }
  return texts;
}

describe("DeepAgents summarization and openUIStreamTransformer", () => {
  // Tracks https://github.com/langchain-ai/deepagentsjs/issues/629. When this
  // starts failing, deepagents tags its summary call `nostream` and the docs
  // workaround can be dropped.
  it("leaks the compaction summary as an assistant text message (deepagents middleware)", async () => {
    const model = new ScriptedChatModel({});
    const texts = await collectAssistantTexts(
      [
        createSummarizationMiddleware({
          backend: (runtime) => new StateBackend(runtime),
          trigger: { type: "messages", value: 3 },
          keep: { type: "messages", value: 1 },
        }),
      ],
      model,
    );

    expect(model.summaryRequests).toBeGreaterThan(0);
    expect(texts).toContain(SUMMARY);
  });

  it("keeps the summary out of the stream with LangChain's summarizationMiddleware", async () => {
    const model = new ScriptedChatModel({});
    const texts = await collectAssistantTexts(
      [summarizationMiddleware({ model, trigger: { messages: 3 }, keep: { messages: 1 } })],
      model,
    );

    expect(model.summaryRequests).toBeGreaterThan(0);
    expect(texts).toEqual(TURNS.map(() => ANSWER));
  });
});
