import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Observability, SensitiveDataFilter, DefaultExporter, CloudExporter } from '@mastra/observability';
import { Workspace, LocalSandbox, LocalFilesystem, WORKSPACE_TOOLS } from '@mastra/core/workspace';
import { Agent } from '@mastra/core/agent';
import { deepseek } from '@ai-sdk/deepseek';
import { Memory } from '@mastra/memory';
import { Workflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

const greeterAgent = new Agent({
  id: "greeter-agent",
  name: "Greeter",
  instructions: "You are a friendly greeter agent. Your job is to greet users warmly and respond to their greetings in a helpful manner.",
  model: deepseek("deepseek-chat")
});

const SYSTEM_PROMPT = `You are an expert frontend code generator. Your task is to create complete, standalone HTML files based on user requirements.

## Core Constraints (CRITICAL - MUST FOLLOW)

1. **External Resources - ONLY THESE TWO ALLOWED:**
   - TailwindCSS CDN: https://cdn.tailwindcss.com
   - Vue.js CDN: https://unpkg.com/vue@3/dist/vue.global.js

2. **ALL OTHER RESOURCES MUST BE INLINED:**
   - Custom CSS \u2192 Place inside <style> tags
   - Custom JavaScript \u2192 Place inside <script> tags
   - Fonts \u2192 Use system fonts or inline font-face declarations with base64
   - Icons \u2192 Use inline SVG or Unicode characters
   - Images \u2192 Use data URIs (base64) or inline SVG

3. **PROHIBITED:**
   - No external CSS files via <link> (except Tailwind)
   - No external JS files via <script src> (except Vue)
   - No external image URLs (http/https)
   - No Google Fonts or other font CDNs
   - No icon libraries (FontAwesome, etc.)

## HTML Structure Template

\`\`\`html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Page Title]</title>
    <!-- ONLY EXTERNAL RESOURCES ALLOWED -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <!-- Custom styles MUST be inline -->
    <style>
        /* Your custom CSS here */
    </style>
</head>
<body>
    <div id="app">
        <!-- Vue.js application markup -->
    </div>
    
    <!-- Custom JavaScript MUST be inline -->
    <script>
        const { createApp } = Vue;
        createApp({
            // Vue app configuration
        }).mount('#app');
    </script>
</body>
</html>
\`\`\`

## Input Format

The user will provide input in this JSON structure:
\`\`\`json
{
  "requirement": "Description of what to build",
  "options": {
    "style": "modern" | "minimalist" | "colorful",
    "complexity": "simple" | "medium" | "complex"
  }
}
\`\`\`

## Output Format

You MUST respond with a JSON object in this exact structure:

\`\`\`json
{
  "html": "<!DOCTYPE html>...",
  "metadata": {
    "title": "Brief title",
    "description": "What the page does",
    "tailwindVersion": "3.x",
    "vueVersion": "3.x",
    "estimatedComplexity": "simple|medium|complex",
    "components": ["component1", "component2"],
    "generatedAt": "2024-01-01T00:00:00Z"
  },
  "success": true
}
\`\`\`

## Style Guidelines

- **modern**: Clean, professional, subtle shadows, rounded corners, generous whitespace
- **minimalist**: Maximum simplicity, monochrome or limited colors, essential elements only
- **colorful**: Vibrant colors, gradients, playful elements, visual interest

## Complexity Levels

- **simple**: Single component, basic interactivity, < 100 lines
- **medium**: Multiple components, moderate state management, 100-300 lines
- **complex**: Rich interactions, advanced Vue features, > 300 lines

## Best Practices

1. Use semantic HTML elements
2. Make components responsive with Tailwind classes
3. Add appropriate comments in code
4. Ensure accessibility (ARIA labels where needed)
5. Use Vue 3 Composition API with <script setup> syntax when appropriate
6. Validate that no prohibited external resources are included

Before responding, double-check that:
- [ ] Only Tailwind and Vue CDNs are used as external resources
- [ ] All custom CSS is in <style> tags
- [ ] All custom JS is in <script> tags
- [ ] No external images, fonts, or other resources are referenced
`;

function createFrontendCodeGeneratorAgent(workspace) {
  return new Agent({
    id: "frontend-code-generator",
    name: "Frontend Code Generator",
    instructions: SYSTEM_PROMPT,
    model: deepseek("deepseek-chat"),
    workspace,
    // 3.3 为只读代理应用工作空间配置
    memory: new Memory({
      options: {
        lastMessages: 20
      }
    })
  });
}
createFrontendCodeGeneratorAgent();

const WORKSPACE_AGENT_PROMPT = `You are a Workspace Agent with full permissions to manage workspace files and execute code in sandbox.

## Capabilities

You have complete access to:
- **Workspace Files**: Read, write, edit, delete files and create directories within the workspace
- **Sandbox Execution**: Run code and execute commands in an isolated sandbox environment

## Guidelines

1. **File Operations**: Perform file operations safely within the workspace directory
2. **Code Execution**: Execute code in the sandbox and return results
3. **Data Flow**: Support reading files from workspace, executing in sandbox, and writing results back to workspace
4. **Security**: Ensure all operations stay within the configured workspace boundaries

## Safety

- Never attempt to access files outside the workspace directory
-\u62D2\u7EDD\u6267\u884C\u5371\u9669\u547D\u4EE4 that could harm the system
- Report any security concerns immediately
`;

const getWorkspacePath$1 = () => {
  return process.env.MASTRA_WORKSPACE_PATH || "./workspace";
};
function createWorkspaceAgent(workspace) {
  const agentWorkspace = workspace ?? new Workspace({
    id: "workspace-agent-workspace",
    name: "Workspace Agent Workspace",
    filesystem: new LocalFilesystem({
      basePath: getWorkspacePath$1(),
      contained: true
    }),
    sandbox: new LocalSandbox({
      workingDirectory: getWorkspacePath$1()
    }),
    tools: {
      [WORKSPACE_TOOLS.FILESYSTEM.READ_FILE]: { enabled: true },
      [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: { enabled: true },
      [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: { enabled: true },
      [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: { enabled: true },
      [WORKSPACE_TOOLS.FILESYSTEM.MKDIR]: { enabled: true },
      [WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES]: { enabled: true },
      [WORKSPACE_TOOLS.FILESYSTEM.FILE_STAT]: { enabled: true },
      [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: { enabled: true }
    }
  });
  return new Agent({
    id: "workspace-agent",
    name: "Workspace Agent",
    instructions: WORKSPACE_AGENT_PROMPT,
    model: deepseek("deepseek-chat"),
    workspace: agentWorkspace
  });
}
createWorkspaceAgent();

const stepOne = createStep({
  id: "step-one",
  inputSchema: z.object({
    input: z.string()
  }),
  outputSchema: z.object({
    result: z.string(),
    timestamp: z.string()
  }),
  execute: async ({ inputData }) => {
    return {
      result: `Step 1 processed: ${inputData.input}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
});
const stepTwo = createStep({
  id: "step-two",
  inputSchema: z.object({
    result: z.string(),
    timestamp: z.string()
  }),
  outputSchema: z.object({
    finalResult: z.string(),
    processed: z.boolean()
  }),
  execute: async ({ inputData }) => {
    const stepOneResult = inputData.result || "No input";
    return {
      finalResult: `Step 2 completed with: ${stepOneResult}`,
      processed: true
    };
  }
});
const simpleWorkflow = new Workflow({
  id: "simple-workflow",
  inputSchema: z.object({
    input: z.string().describe("Input text to process")
  }),
  outputSchema: z.object({
    finalResult: z.string(),
    processed: z.boolean()
  })
}).then(stepOne).then(stepTwo);

const getWorkspacePath = () => {
  return process.env.MASTRA_WORKSPACE_PATH || "./workspace";
};
const workspacePath = getWorkspacePath();
const globalWorkspace = new Workspace({
  id: "mastra-global-workspace",
  name: "Mastra Global Workspace",
  filesystem: new LocalFilesystem({
    basePath: workspacePath,
    contained: true
    // 1.5 确保工作空间只能访问其目录内的文件
  }),
  sandbox: new LocalSandbox({
    workingDirectory: workspacePath
  })
});
const readOnlyWorkspace = new Workspace({
  id: "mastra-readonly-workspace",
  name: "Mastra ReadOnly Workspace",
  filesystem: new LocalFilesystem({
    basePath: workspacePath,
    contained: true
  }),
  tools: {
    // 禁用写入相关工具
    [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: {
      enabled: false
    },
    [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: {
      enabled: false
    },
    [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: {
      enabled: false
    },
    [WORKSPACE_TOOLS.FILESYSTEM.MKDIR]: {
      enabled: false
    }
  }
});
const frontendCodeGeneratorAgent = createFrontendCodeGeneratorAgent(readOnlyWorkspace);
const workspaceAgent = createWorkspaceAgent(globalWorkspace);
const mastra = new Mastra({
  agents: {
    greeter: greeterAgent,
    frontendCodeGenerator: frontendCodeGeneratorAgent,
    workspace: workspaceAgent
  },
  workflows: {
    simple: simpleWorkflow
  },
  logger: new PinoLogger({
    name: "Mastra",
    level: "info"
  }),
  storage: new LibSQLStore({
    id: "mastra-storage",
    url: ":memory:"
    // Storage is required for tracing
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [
          new DefaultExporter(),
          // Persists traces to storage for Mastra Studio
          new CloudExporter()
          // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter()
          // Redacts sensitive data like passwords, tokens, keys
        ]
      }
    }
  }),
  workspace: globalWorkspace
  // 2.1 在 Mastra 配置中添加 workspace 选项
});
const bundler = {};

export { bundler, mastra as default };
