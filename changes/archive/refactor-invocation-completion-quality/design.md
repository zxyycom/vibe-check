# Design

本设计将既有 Project Run 生命周期拆到其真实私有责任边界，同时保持当前结果、事实和输出契约不变。

## Context

`docs/architecture.md`、`docs/configuration.md`、`docs/output.md` 和 `docs/testing.md` 分别拥有 Product Runtime、Run、输出及测试证据规则；相邻 `src/project-run/invocation.ts` 与 `completion.ts` 是当前实现事实。目标是清除这两个文件中由交错职责造成的质量记录，而不是改写产品决定。相邻 active Change `add-invocation-fail-fast-policy` 可能后续修改失败策略，但不属于本 Change，不能混入其行为。

## Goals / Non-Goals

目标：保持完整 Run 事务、结果 kind/facts、输出失败优先级、机器输出时机、诊断与 progress close 顺序，以及 Scheduler 与 public prepared strategy 生命周期；使事务顺序和三个私有责任边界能由小型模块和直接测试逐项审查。

非目标：不修改 public API、Run Controls、Project Definition、Scheduler/admission core 算法、progress/output 内容、machine v4 DTO，亦不实现 fail-fast policy 行为。默认 Project Gate 只按后续显式授权运行一次；完整 `bun run check -- --all` 仍不运行。

## Decisions

### Intended Change

事务按分支协调：`run.started` 后，初始 cancellation 直接产生候选；未取消的 invocation 先做 graph validation，失败时产生 planning candidate。只有图验证成功的路径才进入后续 cancellation gates、strategy preparation、Scheduler adapter、prepared-strategy terminal measurement 与 resolved-execution candidate mapper。每个 non-configuration candidate 最后统一按 terminal diagnostic observation、diagnostic close/status merge、progress close、completion result resolver 的顺序关闭。completed mapping 内的 machine publication 继续发生在 terminal diagnostic observation 之前；policy-fault 则在 progress final、aggregation 和 machine publication 之前短路。

三个私有边界不重叠：

1. Scheduler adapter 唯一承接四项 collector OR（diagnostic enabled、generic hooks、policy measurement、prepared terminal measurement）、`executeResolvedChecks` 参数 bridge 和 `task-engine-failed` containment；它不准备策略、不调用 public completion，也不关闭 outputs。
2. Resolved-execution candidate mapper 唯一承接 sealed Scheduler execution 到 Run candidate 的映射：policy-fault 短路、progress final、cancelled candidate、completed aggregation/effective selection 和 `completeInvocation`。它不执行 Scheduler，也不关闭 diagnostic/progress owners。
3. Completion result resolver 只接收 non-configuration candidate 与所有 owner close 后的 statuses。它让 completed candidate 按 failed-output priority 升级，让既有 `output` candidate 按同一 priority 重选，并让 `planning`、`cancelled`、`execution` 保持 primary kind；它不产生 output status、machine bytes 或 close side effect。

`finalizeInvocation` 仍是关闭协调器：先写 terminal diagnostic observation，再 close 每个 diagnostic channel 并 merge statuses，接着 close progress，最后调用 resolver。输出失败 priority 明确为 progress rendering、machine publication、diagnostic logging、measurement hooks；任何 candidate 都保留所有 closed statuses，含 final snapshot facts 的 candidate 也保留 aggregate、durations、messages 和 snapshot。

### Resulting Impacts

- Graph validation 必须仍早于策略、flags 读取与 callback；Scheduler adapter 不得碰 prepare 或 public completion。
- collector 条件保持 diagnostic enabled、generic hooks、policy measurement、prepared terminal measurement 四项 OR；pre-terminal failure 不调用 completion。
- generic Hooks 必须先于 public prepared completion；policy fault 不发送 progress final、aggregation 或 machine publication；completed/cancelled 映射及 terminal event pre-close 保持不变。
- 所有 diagnostic channel close 尝试必须早于 progress close，即使一个 diagnostic close 已失败。闭合后的 output priority 是 progress rendering、machine publication、diagnostic logging、measurement hooks：仅 `completed` 升级为 `output`，既有 `output` 按该优先级重选，primary `planning`/`cancelled`/`execution` kind 保持。facts 不得丢失，machine v4 不吸收 diagnostics、progress、durations 或 messages。
- 直接测试与现有语义 Case 将覆盖 resolver 矩阵和 diagnostic close-failure 顺序；不为私有重构发明公共契约。

## Risks / Trade-offs

拆分过度会掩盖而非澄清事务顺序，故只创建拥有稳定输入/输出或失败归属的 private modules。错误放置 Scheduler containment、终态 mapper 或 resolver 可能使 public completion 在 pre-terminal failure 发生、改变 progress/aggregation 顺序或损失 facts；测试需锁定这些边界。并行工作区的无关修改不应被纳入 diff 或验证结论。

## Open Questions

无；现有 owner、相邻测试及用户给定护栏已足以限定实现。

## Implementation Observations

已将 closed-status result reselect 放入 `completion-result-resolver.ts`；`completion.ts` 保留 terminal observation、diagnostic close/status merge、progress close 与 resolver 调用。`scheduler-adapter.ts` 是 Scheduler-only bridge，`resolved-execution-candidate.ts` 是 sealed execution 到 Run candidate 的 mapper；root coordinator 保留上述事务顺序。

已记录的直接矩阵测试覆盖 completed upgrade、existing-output priority reselect 与 primary kind/status preservation；diagnostic close-failure 测试覆盖 terminal observation、每个 diagnostic channel 的 close 尝试和随后 progress close。已记录通过：`bun test src/project-run`、`bun run test-evidence -- check --root .`、产品 typecheck/lint/format、`bun run check -- --quality`；focused quality 从 9 条降至 6 条，三个目标 invocation/completion 记录已消除。随后按显式授权仅运行一次默认 `bun run check`：passed（31 passed、5 not-applicable、0 failed/unavailable），machine records 保持 6 条且无 invocation/completion target，日志为 `.log/project-gate/2026-09-05T07-12-32.826Z-2035919-b7914bc7-6008-42a0-90de-ea088058c4b1`。完整 `bun run check -- --all` 与 push 未运行。
