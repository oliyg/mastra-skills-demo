import { Workflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

const generateFrontendCodeSchema = z.object({
  html: z.string(),
  metadata: z.object({
    title: z.string(),
    description: z.string(),
    tailwindVersion: z.string(),
    vueVersion: z.string(),
    estimatedComplexity: z.string(),
    components: z.array(z.string()),
    generatedAt: z.string(),
  }),
});

const stepOne = createStep({
  id: 'receive-requirement',
  inputSchema: z.object({
    requirement: z.string().describe('User one-sentence requirement for frontend page'),
  }),
  outputSchema: z.object({
    requirement: z.string(),
  }),
  execute: async ({ inputData }) => {
    return {
      requirement: inputData.requirement,
    };
  },
});

const stepTwo = createStep({
  id: 'generate-frontend-code',
  inputSchema: z.object({
    requirement: z.string(),
  }),
  outputSchema: generateFrontendCodeSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgent('frontendCodeGenerator');

    if (!agent) {
      throw new Error('Agent frontendCodeGenerator not found');
    }

    const prompt = JSON.stringify({
      requirement: inputData.requirement,
      options: {
        style: 'modern',
        complexity: 'simple',
      },
    });

    const result = await agent.stream(prompt, {
      structuredOutput: {
        schema: generateFrontendCodeSchema,
      },
    });

    const res = await result.getFullOutput();
    return res.object;
  },
});

const stepThree = createStep({
  id: 'write-files',
  inputSchema: generateFrontendCodeSchema,
  outputSchema: z.object({
    htmlPath: z.string(),
    jsonPath: z.string(),
    success: z.boolean(),
  }),
  execute: async ({ inputData, mastra }) => {
    const title = inputData.metadata.title;
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const htmlContent = inputData.html;
    const metadataJson = JSON.stringify(inputData.metadata, null, 2);

    const htmlFileName = `${safeTitle}.html`;
    const jsonFileName = `${safeTitle}.json`;

    const workspaceAgent = mastra.getAgent('workspace');

    if (!workspaceAgent) {
      throw new Error('Agent workspace not found');
    }

    const htmlPrompt = `Write the following content to file "${htmlFileName}":\n\n${htmlContent}`;
    await workspaceAgent.stream(htmlPrompt);

    const jsonPrompt = `Write the following content to file "${jsonFileName}":\n\n${metadataJson}`;
    await workspaceAgent.stream(jsonPrompt);

    return {
      htmlPath: htmlFileName,
      jsonPath: jsonFileName,
      success: true,
    };
  },
});

export const simpleWorkflow = new Workflow({
  id: 'simple-workflow',
  inputSchema: z.object({
    requirement: z.string().describe('User one-sentence requirement for frontend page'),
  }),
  outputSchema: z.object({
    htmlPath: z.string(),
    jsonPath: z.string(),
    success: z.boolean(),
  }),
})
  .then(stepOne)
  .then(stepTwo)
  .then(stepThree);

export default simpleWorkflow;
