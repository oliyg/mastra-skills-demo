import { Mastra } from '@mastra/core';
import {
  greeterAgent,
  createFrontendCodeGeneratorAgent,
  createWorkspaceAgent,
} from './agents/index.js';
import { simpleWorkflow } from './workflows/index.js';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import {
  CloudExporter,
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from '@mastra/observability';
import { Workspace, LocalFilesystem, LocalSandbox, WORKSPACE_TOOLS } from '@mastra/core/workspace';

// 1.2 创建工作空间路径配置函数，支持 MASTRA_WORKSPACE_PATH 环境变量
const getWorkspacePath = () => {
  return process.env.MASTRA_WORKSPACE_PATH || './workspace';
};

// 1.3 创建全局工作空间实例（完整访问权限）
const workspacePath = getWorkspacePath();
const globalWorkspace = new Workspace({
  id: 'mastra-global-workspace',
  name: 'Mastra Global Workspace',
  filesystem: new LocalFilesystem({
    basePath: workspacePath,
    contained: true, // 1.5 确保工作空间只能访问其目录内的文件
  }),
  sandbox: new LocalSandbox({
    workingDirectory: workspacePath,
  }),
});

// 3.2 创建只读工作空间实例（用于 frontendCodeGeneratorAgent）
const readOnlyWorkspace = new Workspace({
  id: 'mastra-readonly-workspace',
  name: 'Mastra ReadOnly Workspace',
  filesystem: new LocalFilesystem({
    basePath: workspacePath,
    contained: true,
  }),
  tools: {
    // 禁用写入相关工具
    [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: { enabled: false },
    [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: { enabled: false },
    [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: { enabled: false },
    [WORKSPACE_TOOLS.FILESYSTEM.MKDIR]: { enabled: false },
  },
});

// 1.4 初始化工作空间
await globalWorkspace.init();
await readOnlyWorkspace.init();

// 3.1 识别需要只读访问的代理（frontendCodeGeneratorAgent）
// 3.3 为只读代理应用工作空间配置（传入 readOnlyWorkspace）
// 3.4 确保其他代理使用默认工具配置（所有工具启用）- greeterAgent 使用全局 workspace
const frontendCodeGeneratorAgent = createFrontendCodeGeneratorAgent(readOnlyWorkspace);

// 创建 Workspace Agent，使用全局工作空间配置
const workspaceAgent = createWorkspaceAgent(globalWorkspace);

// 创建 Mastra 实例并配置 workspace
const mastra = new Mastra({
  agents: {
    greeter: greeterAgent,
    frontendCodeGenerator: frontendCodeGeneratorAgent,
    workspace: workspaceAgent,
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
  workspace: globalWorkspace, // 2.1 在 Mastra 配置中添加 workspace 选项
});

// 2.2 确保工作空间在 Mastra 实例中可用
// 工作空间已通过 Mastra 配置传递，可以通过 mastra.workspace 访问

export { mastra, frontendCodeGeneratorAgent, greeterAgent, workspaceAgent };

export default mastra;
