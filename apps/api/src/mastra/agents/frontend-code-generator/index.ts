import { Agent } from '@mastra/core/agent';
import { deepseek } from '@ai-sdk/deepseek';
import type { Workspace } from '@mastra/core/workspace';
import { SYSTEM_PROMPT } from './prompt.js';
import type { FrontendCodeInput, FrontendCodeOutput } from './types.js';
import { Memory } from '@mastra/memory';

/**
 * Create Frontend Code Generator Agent with workspace configuration
 *
 * Generates standalone HTML files with Vue.js and TailwindCSS.
 * All resources except Vue.js and TailwindCSS CDN are inlined.
 *
 * @param workspace - Optional workspace for file operations (typically read-only)
 */
export function createFrontendCodeGeneratorAgent(workspace?: Workspace) {
  return new Agent({
    id: 'frontend-code-generator',
    name: 'Frontend Code Generator',
    instructions: SYSTEM_PROMPT,
    model: deepseek('deepseek-chat'),
    workspace, // 3.3 为只读代理应用工作空间配置
    memory: new Memory({
      options: {
        lastMessages: 20,
      },
    }),
  });
}

// 导出默认实例（向后兼容）
export const frontendCodeGeneratorAgent = createFrontendCodeGeneratorAgent();

/**
 * Helper function to generate frontend code
 *
 * @param input - The input containing requirement and options
 * @returns Generated HTML and metadata
 */
export async function generateFrontendCode(input: FrontendCodeInput): Promise<FrontendCodeOutput> {
  const prompt = JSON.stringify(input);

  const result = await frontendCodeGeneratorAgent.generate(prompt);

  // Parse the response as JSON
  const content = result.text || '{}';
  const parsed = JSON.parse(content) as FrontendCodeOutput;

  return parsed;
}

export { SYSTEM_PROMPT };
export * from './types.js';
