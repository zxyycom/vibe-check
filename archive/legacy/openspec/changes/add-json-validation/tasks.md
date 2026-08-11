> **核心句：**本 change 只保存未来 JSON Check 的方向；任务 1.1 完成前不得修改实现、主 specs、schemas、examples 或测试。

## 1. 实现前阻塞审计

- [ ] 1.1 **BLOCKING：当前不得实施。** 在本 feature 被明确排期后，先确认 `establish-check-record-core` 与 `adopt-typescript-project-definition` 已实际实施；根据其真实的 Check、Record、input selection 和 authoring contracts 重新基线全部 artifacts。届时补齐 JSON 输入分类、严格语义、可定位结果、执行失败、资源安全、依赖选择与验收证据，并清除全部过时基础假设和推测性共享 owner。任何阻塞问题未闭合前不得执行后续任务。

## 2. 领域实现与证据

- [ ] 2.1 以 1.1 审计后的契约实现 Product-owned JSON Check 和私有 parser boundary，同步 Project Definition declaration、最窄行为测试、owner 文档与必要 public artifacts；不得向 Core 添加 JSON 领域分支。

## 3. 验证

- [ ] 3.1 运行审计确定的目标测试、测试证据检查、产品 typecheck/lint、文档/OpenSpec 校验与 workspace required verification，并复核最终 diff 只兑现本 feature。
