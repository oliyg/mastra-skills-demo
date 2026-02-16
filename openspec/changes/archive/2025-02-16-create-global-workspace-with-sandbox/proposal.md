## 原因

Mastra 应用程序目前缺少一个集中式的工作空间和沙盒环境来管理文件操作和隔离执行上下文。本次变更将使用 Mastra 的 LocalFileSystem 和 LocalSandbox 引入一个具有沙盒功能的全局工作空间，实现安全的文件操作和代码执行，无需额外的系统接入。

## 变更内容

- 在 `apps/api/src/mastra/index.ts` 的 Mastra 初始化中添加**全局工作空间**配置
- 集成 Mastra 的 `LocalFileSystem` 用于本地文件存储和管理
- 集成 Mastra 的 `LocalSandbox` 用于隔离执行环境
- 通过 Mastra 配置确保工作空间只能访问其目录内的文件
- 通过 Workspace 的 `tools` 配置限制特定代理的写入权限
- 更新 Mastra 实例，向代理和工作流公开工作空间和沙盒功能

## 能力

### 新增能力

- `workspace-sandbox`: 具有 LocalFileSystem 和 LocalSandbox 集成的全局工作空间，用于文件操作和隔离执行

### 修改的能力

<!-- 不需要在规范级别修改现有能力 -->

## 影响

- **代码**: `apps/api/src/mastra/index.ts` - Mastra 初始化配置
- **依赖项**: 使用 `@mastra/core` 内置的 LocalFileSystem 和 LocalSandbox
- **存储**: 用于工作空间存储的本地文件系统路径
- **API**: 无外部 API 更改；工作空间可通过 Mastra 实例访问
- **配置**: 用于工作空间路径和沙盒设置的环境变量
