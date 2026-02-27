import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

let model: any;
export const getModel = () => {
  if (model) return model;
  model = createOpenAICompatible({
    baseURL: process.env.MODEL_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    name: 'openAICompatibleModel',
    apiKey: process.env.MODEL_API_KEY ?? 'NO_API_KEY_FOUND',
  }).chatModel(process.env.MODEL_NAME ?? 'NO_MODEL_NAME_FOUND');
  return model;
};
