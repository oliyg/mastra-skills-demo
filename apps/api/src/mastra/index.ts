import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import {
  CloudExporter,
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability";
import { chatRoute } from "@mastra/ai-sdk";
import { weatherWorkflow } from "./workflows/weather-workflow";
import { weatherAgent } from "./agents/weather-agent";
import { echoAgent } from "./agents/echo-agent";
import { frontEndDesignAgent } from "./agents/front-end-design-agent";
import {
  completenessScorer,
  toolCallAppropriatenessScorer,
  translationScorer,
} from "./scorers/weather-scorer";
import {
  workspaceFilesystemList,
  workspaceFilesystemRead,
  workspaceInfo,
} from "./routes/workspace-route";
import {
  pollFileList,
  pollFileContent,
  sseFileList,
  sseFileContent,
  refreshCheck,
} from "./routes/poll-route";
import { getWorkspace } from "./workspace";

const workspace = await getWorkspace({
  basePath: "./workspace",
  workingDirectory: "./workspace",
  skills: ["/skills"],
});

export const mastra = new Mastra({
  workspace,
  server: {
    apiPrefix: "",
    apiRoutes: [
      chatRoute({
        path: "/chat",
        agent: "front-end-design-agent",
      }),
      // 自定义路由示例
      workspaceInfo,
      workspaceFilesystemRead,
      workspaceFilesystemList,
      // 轮询接口
      pollFileList,      // GET  /poll/files?path=/
      pollFileContent,   // GET  /poll/file/content?path=/xxx
      // SSE 实时推送接口（推荐）
      sseFileList,       // GET  /sse/files?path=/
      sseFileContent,    // GET  /sse/file/content?path=/xxx
      // 手动刷新接口
      refreshCheck,      // POST /poll/refresh
    ],
  },
  workflows: { weatherWorkflow },
  agents: { weatherAgent, echoAgent, frontEndDesignAgent },
  scorers: {
    toolCallAppropriatenessScorer,
    completenessScorer,
    translationScorer,
  },
  storage: new LibSQLStore({
    id: "mastra-storage",
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
