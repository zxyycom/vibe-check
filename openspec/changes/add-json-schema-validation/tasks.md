> **核心句：**本 change 只保存未来 JSON Schema Check 的方向；任务 1.1 完成前不得修改实现、主 specs、schemas、examples 或测试。

## 1. 实现前阻塞审计

- [ ] 1.1 **BLOCKING：当前不得实施。** 在本 feature 被明确排期后，确认 `establish-check-record-core`、`adopt-typescript-project-definition` 与 `add-json-validation` 已实际实施；基于真实 Check/Record、Project Definition 和 JSON parsing/location contracts 重新基线全部 artifacts。届时明确支持的 dialect、显式 binding、local-safe reference boundary、validator dependency、final result contract、资源限制与验收证据，并清除全部过时基础假设和未经验证的实现细节。任何阻塞问题未闭合前不得执行后续任务。

## 2. 领域实现与证据

- [ ] 2.1 以 1.1 审计后的契约实现 Product-owned JSON Schema Check、显式 binding/local reference resolution 与私有 validator boundary，同步 Project Definition authoring、最窄行为和安全测试、owner 文档及必要 public artifacts。

## 3. 验证

- [ ] 3.1 运行审计确定的目标测试、测试证据检查、产品 typecheck/lint、文档/OpenSpec 校验与 workspace required verification，并证明 required tests 不访问公共网络且 Core 没有 schema-domain 分支。
