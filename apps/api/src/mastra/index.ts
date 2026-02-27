import { Mastra } from '@mastra/core';
import {
  getFrontendCoderAgent,
  getFrontendDevelopNetworkAgent,
  getWorkspaceOperator,
} from './agents/index.js';
import { simpleWorkflow } from './workflows/index.js';
import { initWorkspaces } from './workspaces/index.js';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import {
  CloudExporter,
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from '@mastra/observability';

// 前端代码生成器使用只读工作空间
const frontendCoderAgent = getFrontendCoderAgent();

// 工作空间代理使用全局工作空间
const workspaceOperator = getWorkspaceOperator();

// 前端开发网络代理（无需工作空间配置）
const frontendDevelopNetworkAgent = getFrontendDevelopNetworkAgent();

// 初始化工作空间
initWorkspaces();

// 创建 Mastra 实例
const mastra = new Mastra({
  agents: {
    frontendCoder: frontendCoderAgent,
    workspaceOperator: workspaceOperator,
    frontendDevelopNetwork: frontendDevelopNetworkAgent,
  },
  workflows: {
    simple: simpleWorkflow,
  },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  storage: new LibSQLStore({
    id: 'mastra-storage',
    url: ':memory:', // Storage is required for tracing
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
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

export { mastra };

export default mastra;
