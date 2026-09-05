# Tasks

按 owner、私有职责拆分、直接测试与聚焦验证的顺序完成行为保持重构。

## Readiness

- [x] 0.1 阅读架构、Configuration/Output、编码规范、测试证据 owner、相邻实现与测试，确认本 Change 不包含相邻 fail-fast policy 行为。
- [x] 0.2 运行 Change catalog 与测试证据起点检查，并审阅 invocation/completion 的终态、输出优先级和关闭顺序。

## Implementation

- [x] 1.1 新建 completion 私有纯 resolver，并让 `finalizeInvocation` 在 terminal observation、diagnostic close/status merge 与 progress close 后使用它；resolver 只重选 closed-status result。
- [x] 1.2 新建 invocation 私有 Scheduler adapter，保留四项 collector OR、Scheduler 参数 bridge 和 `task-engine-failed` containment，且不承担 prepare、public completion 或 output close。
- [x] 1.3 新建 resolved execution 到 Run candidate mapper，保留 policy-fault、progress、aggregation/effective selection、machine-publication completion 和 cancellation边界，且不执行 Scheduler 或 close outputs。
- [x] 1.4 收窄 root coordinator，保持分支事务：初始 cancellation 或 graph validation；成功图验证后的 cancellation、prepare、Scheduler、terminal measurement、mapper；每个 non-configuration candidate 的 terminal observation、diagnostic close/status merge、progress close、resolver。
- [x] 1.5 同步受影响的直接测试实体和语义 Case，且不改变产品 contract。

## Verification

- [x] 2.1 已通过窄范围 `bun test src/project-run` 及 `bun run test-evidence -- check --root .`；直接测试覆盖 close order 和 closed-status output priority。
- [x] 2.2 已通过产品 typecheck、lint、format 与 `bun run check -- --quality`；focused quality 从 9 条降至 6 条，三个目标 invocation/completion 记录消除。
- [x] 2.3 已审阅局部 diff、Change check 与质量记录；按后续显式授权仅运行一次默认 required Gate `bun run check`，结果 passed（31 passed、5 not-applicable、0 failed/unavailable），记录保持 6 条且无 invocation/completion target；完整 Gate `bun run check -- --all` 未运行。
