import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { withMastra } from "@mastra/ai-sdk";
import type { Processor } from "@mastra/core/processors";
import { deepseek } from "@ai-sdk/deepseek";

const loggingProcessor: Processor<"logger"> = {
  id: "logger",
  async processInput({ messages }) {
    console.log("Input:", messages.length, "messages");
    return messages;
  },
  async processOutputResult({ messages }) {
    console.log("Output:", messages.length, "messages");
    return messages;
  },
};

const model = withMastra(deepseek("deepseek-chat"), {
  inputProcessors: [loggingProcessor],
  outputProcessors: [loggingProcessor],
});

export const frontEndDesignAgent = new Agent({
  id: "front-end-design-agent",
  name: "Front End Design Agent",
  instructions: `
    You are an agent that helps users design front-end html based on their requirements.
`,
  model,
  memory: new Memory(),
});
