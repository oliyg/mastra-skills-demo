## ADDED Requirements

### Requirement: 用户可以输入一句话需求生成前端页面

工作流 SHALL 接收用户的一句话需求描述，并自动生成对应的前端页面代码。

#### Scenario: 用户输入需求后生成页面

- **WHEN** 用户输入一句话需求（例如 "创建一个登录页面"）
- **THEN** 工作流调用 frontend-code-generator agent 生成页面代码

### Requirement: 生成的代码包含 HTML 和 JSON 元数据

工作流 SHALL 从生成的代码中提取 JSON 元数据，用于后续文件写入。

#### Scenario: 提取 JSON 元数据

- **WHEN** frontend-code-generator agent 返回包含 JSON 的内容
- **THEN** 工作流提取 JSON 并做好写入准备

### Requirement: 文件写入工作区

工作流 SHALL 通过 workspace-agent 将 HTML 文件和 JSON 元数据文件写入工作区。

#### Scenario: 成功写入文件

- **WHEN** JSON 提取完成后
- **THEN** 工作流创建同名的 HTML 文件和 JSON 文件到工作区

#### Scenario: 写入失败时重试

- **WHEN** 写入文件失败
- **THEN** 工作流返回错误信息
