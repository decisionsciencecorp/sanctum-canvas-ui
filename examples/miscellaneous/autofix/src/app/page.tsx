"use client";

import { RepairMessage } from "@/components/repair-message";
import { createAutofixChat, samplePrompt } from "@/lib/autofix-chat";
import { samples } from "@/lib/samples";
import { library } from "@/library";
import { AgentInterface, useSystemThemeMode } from "@openuidev/react-ui";
import { useMemo } from "react";

const starters = samples.map((sample) => ({
  displayText: sample.label,
  prompt: samplePrompt(sample),
}));
const components = { AssistantMessage: RepairMessage };

export default function Page() {
  const mode = useSystemThemeMode();
  const llm = useMemo(() => createAutofixChat(), []);

  return (
    <main className="autofix-app">
      <AgentInterface
        llm={llm}
        componentLibrary={library}
        components={components}
        agentName="OpenUI Autofix"
        theme={{ mode }}
        starters={starters}
        starterVariant="short"
      >
        <AgentInterface.Welcome
          title="Repair generated UI."
          description="Choose a saved example or paste OpenUI Lang. Inspect the repair and see the resulting interface in your conversation."
        />
        <AgentInterface.Composer placeholder="Paste OpenUI Lang to repair…" />
      </AgentInterface>
    </main>
  );
}
