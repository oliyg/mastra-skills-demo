import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Observability, SensitiveDataFilter, DefaultExporter, CloudExporter } from '@mastra/observability';
import { Workspace, LocalSandbox, LocalFilesystem, WORKSPACE_TOOLS } from '@mastra/core/workspace';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { deepseek } from '@ai-sdk/deepseek';
import { Workflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';

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

You MUST respond with a JSON object in this exact structure, without any additional text or explanation:

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
`;

let model;
const getModel = (modelName = "qwen-flash") => {
  if (model) return model;
  model = createOpenAICompatible({
    baseURL: process.env.MODEL_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
    name: "openAICompatibleModel",
    apiKey: process.env.MODEL_API_KEY ?? "NO_API_KEY_FOUND"
  }).chatModel(process.env.modelName ?? modelName);
  return model;
};

function createFrontendCodeGeneratorAgent(workspace) {
  return new Agent({
    id: "frontend-code-generator",
    name: "Frontend Code Generator",
    instructions: SYSTEM_PROMPT,
    model: getModel(),
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
    workspace: agentWorkspace,
    memory: new Memory({
      options: {
        lastMessages: 20
      }
    })
  });
}
createWorkspaceAgent();

const generateFrontendCodeSchema = z.object({
  html: z.string(),
  metadata: z.object({
    title: z.string(),
    description: z.string(),
    tailwindVersion: z.string(),
    vueVersion: z.string(),
    estimatedComplexity: z.string(),
    components: z.array(z.string()),
    generatedAt: z.string()
  })
});
const stepOne = createStep({
  id: "receive-requirement",
  inputSchema: z.object({
    requirement: z.string().describe("User one-sentence requirement for frontend page")
  }),
  outputSchema: z.object({
    requirement: z.string()
  }),
  execute: async ({ inputData }) => {
    return {
      requirement: inputData.requirement
    };
  }
});
const stepTwo = createStep({
  id: "generate-frontend-code",
  inputSchema: z.object({
    requirement: z.string()
  }),
  outputSchema: generateFrontendCodeSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgent("frontendCodeGenerator");
    if (!agent) {
      throw new Error("Agent frontendCodeGenerator not found");
    }
    const prompt = JSON.stringify({
      requirement: inputData.requirement,
      options: {
        style: "modern",
        complexity: "simple"
      }
    });
    const result = await agent.stream(prompt, {
      structuredOutput: {
        schema: generateFrontendCodeSchema
      }
    });
    const res = await result.getFullOutput();
    return res.object;
  }
});
const stepThree = createStep({
  id: "write-files",
  inputSchema: generateFrontendCodeSchema,
  outputSchema: z.object({
    htmlPath: z.string(),
    jsonPath: z.string(),
    success: z.boolean()
  }),
  execute: async ({ inputData, mastra }) => {
    const title = inputData.metadata.title;
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const htmlContent = inputData.html;
    const metadataJson = JSON.stringify(inputData.metadata, null, 2);
    const htmlFileName = `${safeTitle}.html`;
    const jsonFileName = `${safeTitle}.json`;
    const workspaceAgent = mastra.getAgent("workspace");
    if (!workspaceAgent) {
      throw new Error("Agent workspace not found");
    }
    const htmlPrompt = `Write the following content to file "${htmlFileName}":

${htmlContent}`;
    await workspaceAgent.stream(htmlPrompt);
    const jsonPrompt = `Write the following content to file "${jsonFileName}":

${metadataJson}`;
    await workspaceAgent.stream(jsonPrompt);
    return {
      htmlPath: htmlFileName,
      jsonPath: jsonFileName,
      success: true
    };
  }
});
const simpleWorkflow = new Workflow({
  id: "simple-workflow",
  inputSchema: z.object({
    requirement: z.string().describe("User one-sentence requirement for frontend page")
  }),
  outputSchema: z.object({
    htmlPath: z.string(),
    jsonPath: z.string(),
    success: z.boolean()
  })
}).then(stepOne).then(stepTwo).then(stepThree);

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
  // skills: ['./skills'], // 可根据需要添加全局技能
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
  // skills: ['./skills'], // 可根据需要添加全局技能
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
