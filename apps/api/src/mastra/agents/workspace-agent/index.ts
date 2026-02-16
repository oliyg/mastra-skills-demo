import { Agent } from '@mastra/core/agent';
import { Workspace, LocalFilesystem, LocalSandbox, WORKSPACE_TOOLS } from '@mastra/core/workspace';
import { deepseek } from '@ai-sdk/deepseek';
import { WORKSPACE_AGENT_PROMPT } from './prompt.js';
import { Memory } from '@mastra/memory';

const getWorkspacePath = () => {
  return process.env.MASTRA_WORKSPACE_PATH || './workspace';
};

export function createWorkspaceAgent(workspace?: Workspace) {
  const agentWorkspace =
    workspace ??
    new Workspace({
      id: 'workspace-agent-workspace',
      name: 'Workspace Agent Workspace',
      filesystem: new LocalFilesystem({
        basePath: getWorkspacePath(),
        contained: true,
      }),
      sandbox: new LocalSandbox({
        workingDirectory: getWorkspacePath(),
      }),
      tools: {
        [WORKSPACE_TOOLS.FILESYSTEM.READ_FILE]: { enabled: true },
        [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: { enabled: true },
        [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: { enabled: true },
        [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: { enabled: true },
        [WORKSPACE_TOOLS.FILESYSTEM.MKDIR]: { enabled: true },
        [WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES]: { enabled: true },
        [WORKSPACE_TOOLS.FILESYSTEM.FILE_STAT]: { enabled: true },
        [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: { enabled: true },
      },
    });

  return new Agent({
    id: 'workspace-agent',
    name: 'Workspace Agent',
    instructions: WORKSPACE_AGENT_PROMPT,
    model: deepseek('deepseek-chat'),
    workspace: agentWorkspace,
    memory: new Memory({
      options: {
        lastMessages: 20,
      },
    }),
  });
}

export const workspaceAgent = createWorkspaceAgent();
