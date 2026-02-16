## 1. 创建 Workspace Agent 文件结构

- [x] 1.1 在 `apps/api/src/mastra/agents/` 目录下创建 `workspace-agent/` 目录
- [x] 1.2 创建 `index.ts` 文件作为 Agent 主入口
- [x] 1.3 创建 `prompt.ts` 文件定义 Agent 指令

## 2. 实现 Workspace Agent 核心逻辑

- [x] 2.1 在 `index.ts` 中导入必要的模块（Agent, Workspace, LocalFilesystem, LocalSandbox）
- [x] 2.2 创建 `createWorkspaceAgent` 工厂函数，接受可选 workspace 参数
- [x] 2.3 配置完整权限的 workspace（启用所有 WORKSPACE_TOOLS）
- [x] 2.4 导出默认 Agent 实例

## 3. 集成到 Mastra

- [x] 3.1 在 `apps/api/src/mastra/agents/index.ts` 中导出 workspaceAgent
- [x] 3.2 在 `apps/api/src/mastra/index.ts` 中注册 workspaceAgent
- [x] 3.3 验证 Agent 正确初始化

## 4. 测试验证

- [ ] 4.1 启动 Mastra 开发服务器验证 Agent 可用
- [ ] 4.2 测试文件操作权限（读写删）
- [ ] 4.3 测试沙箱执行权限
- [ ] 4.4 验证安全性隔离（尝试访问工作区外资源）
