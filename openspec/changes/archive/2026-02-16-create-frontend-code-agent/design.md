## Context

项目使用 Mastra 框架构建 AI agents。目前已有一个 `greeter` agent 作为示例。需要新增一个专门用于生成前端代码的 agent，能够根据用户需求生成独立的、可直接在浏览器运行的 HTML 文件。

**当前状态**:

- 项目使用 Mastra + DeepSeek 模型
- Agent 文件位于 `apps/api/src/mastra/agents/`
- Agent 配置通过 `index.ts` 统一导出

**约束条件**:

- 生成的 HTML 必须完全独立，不依赖构建工具
- 仅允许使用 TailwindCSS 和 Vue.js 的 CDN 链接
- 所有样式、脚本、资源必须内联

## Goals / Non-Goals

**Goals:**

- 创建能够生成高质量前端代码的 Mastra agent
- 定义清晰的输入/输出接口（使用 zod schema 验证）
- 确保生成的 HTML 遵循资源引用规范
- 提供丰富的元数据（生成时间、复杂度评估、依赖列表等）

**Non-Goals:**

- 不支持需要构建工具的项目（如 webpack/vite 配置）
- 不处理后端 API 集成
- 不提供组件库管理功能

## Decisions

### 1. Agent 文件组织结构

采用单文件 + 分离文件两种模式：

- 简单 agent: 单文件（如 greeter.ts）
- 复杂 agent: 目录结构（index.ts, prompt.ts, types.ts）

**选择**: 为 `frontend-code-generator` 使用目录结构
**理由**: 需要复杂的 prompt 和类型定义，分离文件便于维护

### 2. 输入/输出格式

- **输入**: 结构化 JSON，包含用户需求描述
- **输出**: 结构化 JSON，包含 HTML 代码和元数据

**Schema 设计**:

```typescript
// Input
{
  "requirement": "string - 用户需求描述",
  "options": {
    "style": "modern | minimalist | colorful",
    "complexity": "simple | medium | complex"
  }
}

// Output
{
  "html": "string - 完整的 HTML 代码",
  "metadata": {
    "title": "string",
    "description": "string",
    "tailwindVersion": "string",
    "vueVersion": "string",
    "estimatedComplexity": "simple | medium | complex",
    "components": ["string"],
    "generatedAt": "ISO timestamp"
  }
}
```

### 3. Prompt 工程策略

使用系统提示词明确约束：

- 强调只允许 TailwindCSS 和 Vue.js CDN
- 要求所有资源内联
- 提供 HTML 模板结构
- 包含输出格式要求

### 4. 模型选择

沿用项目现有的 DeepSeek 模型 (`deepseek-chat`)
**理由**: 成本效益和中文理解能力较好

## Risks / Trade-offs

- **[Risk]** 生成的 HTML 可能包含不安全的外部引用
  → **Mitigation**: 在 prompt 中明确禁止，并在输出 schema 中不暴露外部引用字段

- **[Risk]** 复杂 UI 生成质量不稳定
  → **Mitigation**: 添加 complexity 选项，引导用户选择合适的复杂度

- **[Risk]** 内联资源导致 HTML 文件过大
  → **Mitigation**: 在 metadata 中标记文件大小预估，提醒用户注意

- **[Trade-off]** 仅支持 TailwindCSS，限制了样式选择的灵活性
  → **Acceptance**: 这是设计约束，确保生成的代码简单可运行

## Open Questions

1. 是否需要支持图片生成并内联为 base64？
2. 是否需要支持多页面应用生成？
3. 输出 HTML 的大小是否有上限？
