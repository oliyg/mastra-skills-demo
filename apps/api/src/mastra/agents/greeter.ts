import { Agent } from '@mastra/core/agent';
import { deepseek } from '@ai-sdk/deepseek';

export const greeterAgent = new Agent({
  id: 'greeter-agent',
  name: 'Greeter',
  instructions:
    'You are a friendly greeter agent. Your job is to greet users warmly and respond to their greetings in a helpful manner.',
  model: deepseek('deepseek-chat'),
});
