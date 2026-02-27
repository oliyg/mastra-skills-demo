import { Agent } from '@mastra/core/agent';
import type { Workspace } from '@mastra/core/workspace';
import { Memory } from '@mastra/memory';
import { getModel } from '../../models/index.js';
import { getFrontendCoderAgent } from '../frontend-coder/index.js';
import { getWorkspaceOperator } from '../workspace-operator/index.js';

const SYSTEM_PROMPT = `你是一个专业的前端开发工程师，专门负责创建高质量的 HTML 页面。

## 你的主要任务
1. 根据用户的需求调用 frontendCoderAgent 创建前端 HTML 页面
2. 将生成的 HTML 页面通过 workspaceOperator 写入到工作区文件夹内
`;

let frontendDevelopNetworkAgent: Agent;

export function getFrontendDevelopNetworkAgent() {
  if (frontendDevelopNetworkAgent) return frontendDevelopNetworkAgent;
  frontendDevelopNetworkAgent = new Agent({
    id: 'frontend-develop-network',
    name: 'Frontend Develop Network',
    instructions: SYSTEM_PROMPT,
    model: getModel(),
    memory: new Memory({
      options: {
        lastMessages: 20,
      },
    }),
    agents: {
      frontendCoderAgent: getFrontendCoderAgent(),
      workspaceOperator: getWorkspaceOperator(),
    },
  });
  return frontendDevelopNetworkAgent;
}
