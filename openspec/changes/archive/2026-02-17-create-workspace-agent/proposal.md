## Why

当前系统中缺少一个能够同时管理工作区(workspace)和沙箱(sandbox)的高权限 Agent。现有的 Agent 可能权限分离，无法满足需要对两者进行统一操作和管理场景的需求。

## What Changes

- 在 `agents` 目录下创建一个新的工作区 Agent (`workspace-agent`)
- 赋予该 Agent 工作区的所有权限（包括创建、读取、更新、删除等）
- 赋予该 Agent Sandbox 的所有权限（包括创建、读取、更新、删除等）
- 该 Agent 专门用于操作工作区和 Sandbox 资源

## Capabilities

### New Capabilities

- `workspace-agent`: 创建具备工作区和沙箱全部权限的 Workspace Agent，用于统一管理这两类资源

### Modified Capabilities

- (无)

## Impact

- 新增文件: `agents/workspace-agent/` 目录及相关代码
- 权限系统: 扩展 Agent 权限配置，支持 workspace 和 sandbox 的组合权限
- API: 可能需要新增或扩展相关 API 端点以支持 Agent 操作
