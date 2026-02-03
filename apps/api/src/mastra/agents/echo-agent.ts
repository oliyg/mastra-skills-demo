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

// const deepseek = createDeepSeek({
//   apiKey: process.env.DEEPSEEK_API_KEY || "",
//   baseURL: "	https://api.deepseek.com",
// });

const model = withMastra(deepseek("deepseek-chat"), {
  inputProcessors: [loggingProcessor],
  outputProcessors: [loggingProcessor],
});

export const echoAgent = new Agent({
  id: "echo-agent",
  name: "Echo Agent",
  instructions: `
    You are an echo agent that repeats back whatever the user says.
`,
  model,

  memory: new Memory(),
});
