## Context

当前存在一个 simple-workflow，这是一个基础的工作流，用于演示目的。为了使其更具实用价值，需要将其改造为能够根据用户需求自动生成前端页面的工作流。

当前状态：

- simple-workflow 是一个简单的演示工作流
- 包含基础的 step 逻辑
- 未与 frontend-code-generator 或

约束：

- 保持工作流的基本 workspace-agent 集成结构
- 使用现有的 agent（frontend-code-generator、workspace-agent）
- 输出 HTML 文件和对应的 JSON 元数据文件

## Goals / Non-Goals

**Goals:**

- 将 simple-workflow 改造为前端页面生成工作流
- Step1 接收用户的一句话需求
- Step2 调用 frontend-code-generator agent 生成页面代码
- Step3 提取并准备 JSON 数据
- Step4 将 HTML 和 JSON 文件写入工作区

**Non-Goals:**

- 不修改工作流的核心框架
- 不创建新的 agent，只使用现有 agent

## Decisions

1. **使用现有的 frontend-code-generator agent**
   - 理由：已有现成的 agent 可以生成前端代码，无需重复开发
   - 替代方案：自己实现生成逻辑 → 选择复用现有 agent

2. **使用 workspace-agent 写入文件**
   - 理由：workspace-agent 提供了文件写入能力
   - 替代方案：直接使用文件系统 API → 选择使用现有 agent 保持一致性

3. **JSON 和 HTML 文件同名保存**
   - 理由：方便关联和追踪，HTML 文件名和 JSON 元数据文件名一致

## Risks / Trade-offs

- **风险**：frontend-code-generator agent 的输出格式可能不稳定
  - **缓解**：在 step3 中添加 JSON 提取和验证逻辑
- **风险**：workspace-agent 写入失败
  - **缓解**：添加错误处理和重试机制
