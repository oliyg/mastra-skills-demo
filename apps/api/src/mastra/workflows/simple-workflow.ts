import { Workflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

const stepOne = createStep({
  id: 'step-one',
  inputSchema: z.object({
    input: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
    timestamp: z.string(),
  }),
  execute: async ({ inputData }) => {
    return {
      result: `Step 1 processed: ${inputData.input}`,
      timestamp: new Date().toISOString(),
    };
  },
});

const stepTwo = createStep({
  id: 'step-two',
  inputSchema: z.object({
    result: z.string(),
    timestamp: z.string(),
  }),
  outputSchema: z.object({
    finalResult: z.string(),
    processed: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const stepOneResult = inputData.result || 'No input';
    return {
      finalResult: `Step 2 completed with: ${stepOneResult}`,
      processed: true,
    };
  },
});

export const simpleWorkflow = new Workflow({
  id: 'simple-workflow',
  inputSchema: z.object({
    input: z.string().describe('Input text to process'),
  }),
  outputSchema: z.object({
    finalResult: z.string(),
    processed: z.boolean(),
  }),
})
  .then(stepOne)
  .then(stepTwo);

export default simpleWorkflow;
