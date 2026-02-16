## 上下文

当前 Mastra 应用程序在 `apps/api/src/mastra/index.ts` 中初始化，配置了代理、工作流、日志记录、存储和可观察性功能。但是，缺少一个集中式的工作空间来管理文件操作和提供隔离的执行环境。

Mastra 提供了 `Workspace`、`LocalFileSystem` 和 `LocalSandbox` 类，可用于创建统一的工作空间，使代理能够执行文件操作和沙盒命令。这些类是 `@mastra/core` 的内置功能，无需额外的外部依赖。

现有的代理（`greeterAgent`、`frontendCodeGeneratorAgent`）和工作流（`simpleWorkflow`）目前无法访问文件系统或命令执行功能。添加工作空间将启用这些功能。

## 目标 / 非目标

**目标:**

- 创建一个配置 LocalFileSystem 和 LocalSandbox 的**全局 Workspace 实例**
- 通过 Workspace 的 `tools` 配置限制特定代理的写入权限
- 将工作空间集成到 Mastra 初始化中，使其可供所有代理使用
- 通过环境变量支持可配置的工作空间路径
- 确保工作空间只能访问其目录内的文件，不能操作目录外的地址
- 为文件操作和命令执行提供安全的隔离环境
- 保持向后兼容现有代理和工作流

**非目标:**

- 实现远程文件系统（S3、GCS）- 仅使用 LocalFileSystem
- 实现远程沙盒（E2B）- 仅使用 LocalSandbox
- 修改现有代理的行为或功能
- 添加新的外部依赖
- 实现复杂的权限系统或访问控制

## 决策

### 决策 1: 在 Mastra 配置中直接初始化工作空间

**选择:** 直接在 `mastra/index.ts` 中创建 Workspace 实例并传递给 Mastra 构造函数。

**理由:**

- Mastra 支持在配置中直接传递 `workspace` 选项
- 这是最直接的集成方式
- 所有代理自动继承工作空间访问权限

**替代方案考虑:**

- 创建单独的 `workspace.ts` 模块 - 不必要，配置简单直接
- 在运行时动态创建 - 失去预配置的好处

### 决策 2: 使用环境变量进行路径配置

**选择:** 使用 `MASTRA_WORKSPACE_PATH` 环境变量，默认为 `./workspace`。

**理由:**

- 环境变量是配置此类路径的标准做法
- 易于在不同环境（开发、测试、生产）中覆盖
- 与 12-factor app 原则一致

**替代方案考虑:**

- 配置文件 - 增加了复杂性，环境变量足够
- 硬编码路径 - 不够灵活

### 决策 3: 共享文件系统和沙盒的基本路径

**选择:** LocalFileSystem 和 LocalSandbox 使用相同的基本路径。

**理由:**

- 确保文件操作和命令执行在同一个目录上下文中
- 代理写入的文件可以被沙盒命令访问
- 简化配置和推理

**替代方案考虑:**

- 分离路径 - 增加了复杂性，没有明确的好处

### 决策 4: 使用默认沙盒配置

**选择:** 使用 LocalSandbox 的默认配置，仅指定工作目录。

**理由:**

- 默认配置提供良好的隔离性和安全性
- 没有网络访问（`allowNetwork: false`）是安全默认值
- 可以根据需要稍后扩展

**替代方案考虑:**

- 自定义 seatbelt 配置 - 对于初始实现过于复杂
- 允许网络访问 - 安全风险，应默认禁用

### 决策 5: 通过 Workspace Tools 配置限制代理写入权限

**选择:** 使用 Workspace 的 `tools` 配置选项控制哪些工具可用，从而限制 `frontendCodeGeneratorAgent` 等代理的写入能力。

**理由:**

- **正确理解 Mastra 架构**: Mastra 的 `readOnly` 是在 LocalFileSystem 级别配置，不是在 Agent 级别
- **工具级别控制**: Workspace 支持 `tools` 配置，可以启用/禁用特定工具（如 `write_file`, `edit_file`, `delete`, `mkdir`）
- **灵活性**: 可以精确控制每个代理可以使用的工具，而不是全有或全无
- **安全性**: 通过禁用写入工具，确保只读代理无法修改文件

**实现方式:**

- 创建一个全局工作空间实例
- 对于需要只读访问的代理，在 Workspace 配置中禁用写入工具：
  ```typescript
  tools: {
    [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: { enabled: false },
    [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: { enabled: false },
    [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: { enabled: false },
    [WORKSPACE_TOOLS.FILESYSTEM.MKDIR]: { enabled: false },
  }
  ```
- 对于需要读写访问的代理，保持默认配置（所有工具启用）

**替代方案考虑:**

- 创建两个工作空间实例（只读和可写）- 不必要，工具配置足够灵活
- 使用 LocalFileSystem 的 `readOnly: true` - 这会完全禁用写入，但没有工具级别的细粒度控制
- 在 Agent 级别添加权限检查 - Mastra 不支持此方式

## 风险 / 权衡

**风险 1: 本地文件系统权限**

- 工作空间将能够读取/写入本地文件系统
- **缓解:** 使用隔离的目录（`./workspace`），避免系统敏感路径

**风险 2: 沙盒命令执行**

- 代理可以执行任意 shell 命令
- **缓解:** LocalSandbox 使用 seatbelt 配置文件限制访问；默认只允许 PATH 访问

**风险 3: 并发访问**

- 多个代理同时访问工作空间可能导致冲突
- **缓解:** LocalFileSystem 和 LocalSandbox 内部处理并发；代理应协调文件访问

**风险 4: 路径遍历攻击**

- 恶意路径（如 `../../../etc/passwd`）可能访问工作空间外
- **缓解:** Mastra 的路径处理会规范化并限制在工作空间基本路径内

**风险 5: 工具配置绕过**

- 如果工具配置不当，只读代理可能仍能写入文件
- **缓解:** 仔细配置 tools 选项，禁用所有写入相关工具；添加测试验证

## 迁移计划

此更改不需要迁移：

- 现有代理无需修改即可工作
- 工作空间是添加的新功能
- 没有破坏性更改

部署步骤:

1. 更新 `mastra/index.ts` 添加工作空间配置和工具限制
2. 部署应用程序
3. （可选）创建 `./workspace` 目录并设置适当的权限
4. 代理和工作流现在可以访问工作空间

## 待解决问题

1. **工作空间持久性:** 工作空间目录是否应该在容器环境中持久化？
   - 建议: 对于 Docker，挂载卷到 `./workspace`

2. **清理策略:** 是否需要定期清理工作空间文件？
   - 建议: 在应用层实现清理逻辑或使用临时文件策略

3. **监控:** 如何监控工作空间使用情况？
   - 建议: 使用现有的 Mastra 可观察性基础设施跟踪文件操作

4. **工具配置验证:** 如何确保工具配置正确应用？
   - 建议: 添加自动化测试验证只读代理无法写入文件
