## Why

当前的 simple-workflow 是一个基础的演示工作流，功能较为简单。为了满足实际开发需求，需要将其改造为能够根据用户的一句话需求自动生成前端页面的工作流，从而提升开发效率。

## What Changes

修改 simple-workflow，将其转变为一个完整的前端页面生成工作流：

- **Step 1 - 接收用户需求**：接收用户输入的一句话需求描述
- **Step 2 - 调用生成 agent**：使用 frontend-code-generator agent 生成前端页面代码
- **Step 3 - 提取 JSON**：从 step2 返回的内容中提取 JSON 并做好写入准备
- **Step 4 - 写入文件**：通过 workspace-agent 调用 workspace 工具，将 HTML 文件写入工作区，同时创建同名的 JSON 文件保存 step3 中的 JSON 数据

## Capabilities

### New Capabilities

- **frontend-page-generation**: 前端页面生成能力，包括接收需求、调用生成服务、提取结果并写入文件到工作区

### Modified Capabilities

- 无

## Impact

- 修改 `simple-workflow` 的工作流定义
- 可能需要新增或修改相关的 agent 配置（frontend-code-generator、workspace-agent）
