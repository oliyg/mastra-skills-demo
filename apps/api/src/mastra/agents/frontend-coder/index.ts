import { Agent } from '@mastra/core/agent';
import type { Workspace } from '@mastra/core/workspace';
import { SYSTEM_PROMPT } from './prompt.js';
import { Memory } from '@mastra/memory';
import { getModel } from '../../models/index.js';
import { readOnlyWorkspace } from '../../workspaces/index.js';

let frontendCoderAgent: Agent;
/**
 * 创建前端代码生成器代理
 *
 * 生成独立的 HTML 代码，包含 Vue.js 和 TailwindCSS。
 * 除 Vue.js 和 TailwindCSS CDN 外，其他资源均内联。
 *
 * @param workspace - 可选的工作空间配置（通常为只读）
 */
export function getFrontendCoderAgent() {
  if (frontendCoderAgent) return frontendCoderAgent;
  frontendCoderAgent = new Agent({
    id: 'frontend-coder',
    name: 'Frontend Coder',
    instructions: SYSTEM_PROMPT,
    model: getModel(),
    workspace: readOnlyWorkspace,
    memory: new Memory({
      options: {
        lastMessages: 20,
      },
    }),
  });
  return frontendCoderAgent;
}
