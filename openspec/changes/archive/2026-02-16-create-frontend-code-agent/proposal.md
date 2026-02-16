## Why

需要一个专门的前端代码生成 agent，能够根据用户需求自动生成独立的 HTML 文件，使用 TailwindCSS 和 Vue.js（通过 CDN）作为唯一的外部资源，确保生成的代码可以在浏览器中直接运行，无需构建工具或额外配置。

## What Changes

- 在 `apps/api/src/mastra/agents/` 下创建新的 agent：`frontend-code-generator`
- Agent 接收结构化的用户需求文本输入
- Agent 返回结构化的输出，包含生成的 HTML 代码和元数据
- 生成的 HTML 必须遵循严格的资源引用规范：
  - 仅允许外部引用：TailwindCSS CDN、Vue.js CDN
  - 所有其他资源（CSS、JavaScript、字体、图标等）必须内联
  - 禁止任何其他外部 script、href、图片 URL 等引用

## Capabilities

### New Capabilities

- `frontend-code-generator`: 生成独立可运行的 HTML 文件的前端代码生成 agent
  - 输入：用户需求描述文本（结构化 JSON）
  - 输出：包含 HTML 代码和元数据的结构化响应
  - 约束：严格遵守资源内联规范，只允许 TailwindCSS 和 Vue.js CDN 外部引用

### Modified Capabilities

- (none)

## Impact

- **新增文件**:
  - `apps/api/src/mastra/agents/frontend-code-generator/index.ts` - agent 定义和配置
  - `apps/api/src/mastra/agents/frontend-code-generator/prompt.ts` - 系统提示词
  - `apps/api/src/mastra/agents/frontend-code-generator/types.ts` - 输入输出类型定义
- **依赖**: 需要 @mastra/core 和 AI provider
- **API**: 可能需要在 mastra 入口文件中注册新 agent
- **安全性**: 生成的 HTML 应经过安全验证，确保没有恶意代码注入风险
