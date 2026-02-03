import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { withMastra } from "@mastra/ai-sdk";
import type { Processor } from "@mastra/core/processors";
import { deepseek } from "@ai-sdk/deepseek";
import {
  Workspace,
  LocalFilesystem,
  LocalSandbox,
  WORKSPACE_TOOLS,
} from "@mastra/core/workspace";

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

const workspace = new Workspace({
  filesystem: new LocalFilesystem({ basePath: "./agent-workspace" }),
  sandbox: new LocalSandbox({ workingDirectory: "./agent-workspace" }),
  skills: ["/skills"],
  tools: {
    // Global defaults
    enabled: true,
    requireApproval: false,

    // Per-tool overrides
    [WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES]: {
      requireApproval: false,
    },
    [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: {
      requireApproval: false,
      requireReadBeforeWrite: true,
    },
    [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: {
      enabled: false,
    },
    [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: {
      requireApproval: false,
    },
  },
});

await workspace.init();

export const frontEndDesignAgent = new Agent({
  id: "front-end-design-agent",
  name: "Front End Design Agent",
  instructions: `
    You are an agent that helps users design front-end html based on their requirements.
`,
  model,
  workspace,
  memory: new Memory(),
});
