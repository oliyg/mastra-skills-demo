## 1. 项目结构与类型定义

- [x] 1.1 创建 agent 目录: `apps/api/src/mastra/agents/frontend-code-generator/`
- [x] 1.2 创建 `types.ts` 文件，定义输入输出 zod schemas
  - `FrontendCodeInputSchema` (包含 requirement 和 options)
  - `FrontendCodeOutputSchema` (包含 html 和 metadata)
  - `MetadataSchema` (包含所有元数据字段)
- [x] 1.3 导出 TypeScript 类型定义

## 2. Agent Prompt 设计

- [x] 2.1 创建 `prompt.ts` 文件，定义系统提示词
- [x] 2.2 编写详细的 system instructions，包含：
  - Agent 角色定义（前端代码生成专家）
  - HTML 结构要求
  - 资源引用约束（仅允许 TailwindCSS 和 Vue.js CDN）
  - 内联资源要求说明
  - 输出格式说明（JSON 结构）
  - 示例输出

## 3. Agent 实现

- [x] 3.1 创建 `index.ts` 文件，实现 FrontendCodeGeneratorAgent
- [x] 3.2 配置 agent 使用 deepseek 模型
- [x] 3.3 集成 system prompt
- [x] 3.4 配置 output schema 验证
- [x] 3.5 添加 agent ID 和名称

## 4. Agent 注册与导出

- [x] 4.1 更新 `apps/api/src/mastra/agents/index.ts`，添加新 agent 导出
- [x] 4.2 检查 `apps/api/src/mastra/index.ts` 是否需要注册 agent

## 5. 测试与验证

- [x] 5.1 运行类型检查确保无 TypeScript 错误
- [x] 5.2 验证 agent 可以正常加载
- [ ] 5.3 测试简单用例（生成一个按钮组件）
- [ ] 5.4 验证生成的 HTML 不包含禁止的外部资源

## 6. 文档与示例

- [x] 6.1 在 agent 目录添加 README.md 说明使用方式
- [x] 6.2 提供输入/输出示例
- [x] 6.3 说明约束条件和限制
