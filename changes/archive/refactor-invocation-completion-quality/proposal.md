# Proposal

将 Project Run invocation 与 completion 的高复杂度收尾路径按既有责任边界重组为可独立审查的私有阶段，当前为实施中的 Change Plan。

## Why

`src/project-run/invocation.ts` 将图验证、策略准备、Scheduler 调用、终态映射、进度和聚合交织在同一实现中；`completion.ts` 同时承担关闭顺序和候选结果重选。它们已经有严格的事务、输出优先级和关闭顺序契约，但当前局部表达使这些不变量难以直接审查。

## Outcome

Project Run 在不改变公开 API、Scheduler/admission 核心算法、进度/输出可观察行为或 Run 结果语义的前提下，明确既有分支事务：初始 cancellation 或 graph validation；只有通过 graph validation 的未取消路径才继续策略准备、Scheduler bridge、策略 terminal measurement 与已解析执行候选映射；每个 non-configuration candidate 最后都经历 terminal diagnostic observation、diagnostic close/status merge、progress close 和关闭后纯结果解析。三个私有模块分别承接 Scheduler bridge、已解析执行候选映射和关闭后纯结果解析；直接测试证明输出优先级和关闭顺序。

## Scope

### Intended Change

重构 `src/project-run/invocation.ts`、`src/project-run/completion.ts` 及其真实私有 module/test/Case，使下列三个责任边界可独立审查：

1. Scheduler adapter 只桥接已准备 invocation 到 `executeResolvedChecks`，拥有四项 scheduler-performance collector OR 条件、参数 handoff 与 `task-engine-failed` containment。
2. Resolved-execution candidate mapper 只把 sealed Scheduler outcome 映射为 Run candidate，拥有 admission-policy failure 短路、progress final、cancelled/completed 映射、aggregation/effective selection 与 machine-publication completion。
3. Completion result resolver 只在所有 output owner close 后，以 closed statuses 纯粹重选最终结果；它不关闭 owner、不发布 machine output，也不改变 primary execution result。

### Resulting Impacts

需要保留 Project Run 的完整事务：graph validation 早于 strategy preparation 和 Scheduler；策略 terminal measurement 早于 candidate mapper；completed candidate 的 machine publication 早于 terminal diagnostic observation；terminal observation 早于 diagnostic close/status merge；所有 diagnostic channel close 尝试早于 progress close；resolver 最后读取 closed statuses。输出失败优先级仍为 progress rendering、machine publication、diagnostic logging、measurement hooks；仅 completed candidate 可升级为 `output`，既有 `output` 可按该优先级重选，`planning`、`cancelled` 与 `execution` 保持 primary kind 和完整 closed statuses。facts 必须保留；不接触 Scheduler/admission core、公开 API 或相邻 fail-fast policy Change。

## Success Criteria

1. Focused quality 的已记录结果从 9 条降至 6 条：三个 invocation/completion 目标记录消除，且该 focused result 未新增记录。
2. 纯 resolver 的直接测试覆盖 completed upgrade、已有 `output` priority reselect，以及 `planning`、`cancelled`、`execution` primary kind 在 closed statuses 下不被替换的行为。
3. diagnostic close-failure 的直接测试证明 terminal observation、全部 diagnostic channel close 尝试、progress close 的顺序，并保留 Run facts 与 output statuses。
4. 已记录通过的验证为窄范围 `bun test src/project-run`、`bun run test-evidence -- check --root .`、产品 typecheck/lint/format、`bun run check -- --quality` 及 active Change check。后续显式授权的单次默认 required Gate `bun run check` 也已通过（31 passed、5 not-applicable、0 failed/unavailable；machine records 6 条且无 invocation/completion target）；完整 Gate `bun run check -- --all` 未运行。本 Change 不将 focused quality 或窄范围测试表述为 Gate 证明。

## Affected Owners

- `docs/architecture.md`
- `docs/configuration.md`
- `docs/output.md`
- `docs/testing.md`
- `docs/testing/case-maintenance.md`
- `docs/coding-style.md`
