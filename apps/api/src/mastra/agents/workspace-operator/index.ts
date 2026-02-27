import { Agent } from '@mastra/core/agent';
import { deepseek } from '@ai-sdk/deepseek';
import { WORKSPACE_AGENT_PROMPT } from './prompt.js';
import { Memory } from '@mastra/memory';
import { getModel } from '../../models/index.js';
import { workspace } from '../../workspaces/index.js';

let workspaceOperator: Agent;

export function getWorkspaceOperator() {
  if (workspaceOperator) return workspaceOperator;
  workspaceOperator = new Agent({
    id: 'workspace-operator',
    name: 'Workspace Operator',
    instructions: WORKSPACE_AGENT_PROMPT,
    model: getModel(),
    workspace,
    memory: new Memory({
      options: {
        lastMessages: 20,
      },
    }),
  });
  return workspaceOperator;
}
