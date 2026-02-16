## Context

当前系统中存在 `greeterAgent` 和 `frontendCodeGeneratorAgent` 两种 Agent。`greeterAgent` 使用全局工作区配置（具备完整权限），而 `frontendCodeGeneratorAgent` 使用只读工作区配置（仅可读取文件）。系统中缺少一个能够同时操作工作区和沙箱（Sandbox）的 Agent，无法满足需要在工作区和沙箱之间进行数据流转和统一管理的场景。

## Goals / Non-Goals

**Goals:**

- 创建一个新的 Workspace Agent，具备工作区的完整文件操作权限
- 赋予该 Agent 沙箱的完整执行权限
- 支持在工作区和沙箱之间进行数据流转
- 确保安全性隔离，操作限制在配置的工作区目录内

**Non-Goals:**

- 不包含用户认证和权限管理功能（由外部系统负责）
- 不实现 RAG 或其他知识管理功能
- 不支持跨工作区的资源访问

## Decisions

### Decision 1: 使用全局工作区配置 vs 创建新配置

**选择**: 复用现有的 `globalWorkspace` 配置

**理由**:

- 代码中已经创建了具备完整权限的 `globalWorkspace`，包含：
  - `LocalFilesystem` with `contained: true` - 确保文件操作限制在工作区内
  - `LocalSandbox` - 提供沙箱执行能力
- 复用现有配置可以减少代码重复，保持一致性
- 参考 `apps/api/src/mastra/index.ts` 中的实现模式

### Decision 2: Agent 创建方式

**选择**: 使用工厂函数模式，参考 `createFrontendCodeGeneratorAgent` 的实现

**理由**:

- 工厂函数允许在创建时传入可选的 workspace 配置
- 支持创建默认实例和自定义实例两种模式
- 便于后续扩展和测试

### Decision 3: 工具权限配置

**选择**: 使用 `WORKSPACE_TOOLS` 枚举显式配置所有工具为启用状态

**理由**:

- `WORKSPACE_TOOLS` 提供了所有可用工具的枚举
- 显式配置比隐式默认更清晰，便于审查
- 与现有的只读配置模式保持一致

## Risks / Trade-offs

- [Risk] 权限过大可能导致安全风险 → [Mitigation] 通过 `contained: true` 确保文件系统操作限制在工作区目录内
- [Risk] 沙箱执行可能产生资源消耗 → [Mitigation] 沙箱默认在隔离环境中运行，可通过配置限制资源
- [Risk] 长期运行可能导致资源泄漏 → [Mitigation] Mastra 框架负责资源管理，需验证框架的清理机制
