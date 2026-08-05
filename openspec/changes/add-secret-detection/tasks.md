> **核心句：**本 change 只保存未来 Secret Detection Check 的方向；任务 1.1 完成前不得修改实现、主 specs、schemas、examples、dependencies 或测试。

## 1. 实现前阻塞审计

- [ ] 1.1 **BLOCKING：当前不得实施。** 在本 feature 被明确排期后，确认 `establish-check-record-core` 与 `adopt-typescript-project-definition` 已实际实施，并判断是否需要已实施的 `establish-check-task-orchestration`；基于真实 Check/Record、Project Definition、input selection与coverage contracts重新基线全部artifacts。届时完成 detector/dependency、输入范围、资源边界、误报控制、不可逆脱敏和公开结果的安全审计，补齐验收证据，并清除全部过时基础假设与推测性实现矩阵。任何阻塞问题未闭合前不得执行后续任务。

## 2. 安全实现与证据

- [ ] 2.1 以 1.1 审计后的最小规则集实现 Product-owned Secret Detection Check 与私有 detector boundary，同步 Project Definition declaration、安全与行为测试、owner 文档及必要 public artifacts；验证所有用户可见和持久 surface 均不会泄露 raw secret material。

## 3. 验证

- [ ] 3.1 运行审计确定的目标测试、泄露 canary、测试证据检查、依赖与许可证检查、产品 typecheck/lint、文档/OpenSpec 校验及 workspace required verification，并复核 record 保留与 CheckRun 覆盖相互独立。
