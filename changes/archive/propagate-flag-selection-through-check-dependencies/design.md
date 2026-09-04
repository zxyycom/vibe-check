# Design

本 Plan 记录 flag 依赖传递、effective aggregation 与 Gate 简化的实施设计；稳定 current fact 由所链接的 Product/Gate owner 文档、代码和验证材料承接，而不是本 Plan 本身。

## Context

- [`docs/configuration.md`](../../docs/configuration.md) 将 `enabledByFlags` 作为 executable Check 的 declarative identity，并规定 literal `propagateDependsOn: true` 的 opt-in；`RunControls.checkAggregation` 接受 `"all"`、`"effective"` 或 Check-ID list。
- [`docs/api-mechanics.md`](../../docs/api-mechanics.md) 与 [`docs/architecture.md`](../../docs/architecture.md) 要求 `dependsOn` 是 passed prerequisite、`observes` 只等任意终态，完整 static graph 在 author work 前验证，Check facts/machine/progress 各自有独立边界。
- [`unify-effective-flag-selection-and-aggregation.md`](../../docs/decisions/unify-effective-flag-selection-and-aggregation.md) 归并先前 flag-control、explicit aggregation 与 flag-progress Directions；只有在本 Change 的完整方向经 current fact/验证核对后才标为 aligned。
- Project Gate 以 authoring propagation 和 `"effective"` aggregation 消费 Product 选择，已删除手工 `dependsOn` closure 与 aggregate-ID projection。其命令、preset 与 `observes` closure policy 继续由 [`delegate-project-gate-selection-to-product-effective-selection`](../../docs/decisions/delegate-project-gate-selection-to-product-effective-selection.md) 承接；Product 不自动传播 `observes`。

## Goals / Non-Goals

目标是实现 opt-in 的传递启动语义、单一 private effective selection、dependency 自身 predicate 的优先级、同源 aggregation 和无额外 telemetry 的可观察边界，并以公共配置、运行时、输出和 Gate 行为测试证明。非目标是改变 `dependsOn` 的 all-passed prerequisite 含义、自动选择 `observes`、把 flag 当作权限机制、公开 graph resolver/selection DSL，或改变 Gate 的命令/preset product policy。

## Decisions

### Intended Change

- `enabledByFlags` 增加 `propagateDependsOn?: true`：只接受 literal `true`，省略为当前兼容的关闭状态。它在 executable Check authoring 中同时表达 predicate 和该 predicate 命中的 root 是否可以启动 prerequisite；不新增 RunControls propagation 输入。
- 完整 static graph 校验成功后，Run 建立一次私有 effective selection。direct selection 包含没有 `enabledByFlags` 的 Check 和 predicate 匹配的 flag Check。每个匹配且 opt-in 的 flag root 以 normalized `dependsOn` 边深度优先或广度优先遍历至闭包；多个 roots 合并、去重，并按既有 canonical Check order 交给后续消费者。算法不访问 `observes`；control 前已经取消时，该私有集合不产生 flag-control settlement、aggregate 或公共输出。
- closure 中的 dependency 是 dependency-activated：即使它自己的 `enabledByFlags` predicate 未匹配，也保留在 effective selection，并照常接受 Scheduler admission、task-local preflight 和 execution。只在 effective selection 外的 predicate 未匹配 Check 形成既有 flag-control `not-applicable`；无 flag Check 仍按原有默认直接选择。`dependsOn` 的 failed/non-passed blocking 只在这些 Check 实际终态后发生，不能用 selection 伪造 passed 或绕过 cancellation。
- `checkAggregation.checks` 扩展为 `"all" | "effective" | readonly string[]`。`"effective"` 是显式 caller aggregation policy 的第三个 closed selector：它只使用这一次 private plan 的 IDs，完成后仍按现有 mode/unavailable/notApplicable/empty rules 折叠 terminal statuses。`"all"` 与 ID lists 不调用或模拟该 selector，`aggregate` 仍不默认生成。
- effective selection 是 Run planning 的私有领域值，不是新的 public return field、machine schema、diagnostic snapshot 或 callback capability。flag-control phase 仅对未选中 predicate 生成 settlement；dependency-activated Check 的 progress 走现有普通 lifecycle。现有 grouped flag-disabled presentation 因而仍只聚合真正未选中的 items，machine / Check facts 继续只显示 terminal outcomes。
- Product implementation 完成后，Gate Definition/eligibility 从同一个 authoring propagation 和 `"effective"` aggregation 获得 `dependsOn` membership，删除手工 closure/ID projection；其 local `observes` closure validation 和 command/preset policy 保持在 Gate owner。

### Resulting Impacts

- **Authoring / Definition:** exact-key validation、normalization、declarative snapshot、fingerprint 和 public declarations 必须把 omitted / `true` / invalid field 区分清楚；container、`false` 和未知字段 fail closed。
- **Selection / execution:** selection 只能从验证后的 normalized static `dependsOn` graph 派生，且在 control settlement、Scheduler、preflight、execution 前有唯一 owner。invalid graph、pre-work cancellation、unflagged direct nodes、multiple roots、dependency predicate miss 和 `observes` 必须有回归证明。
- **Aggregation:** `"effective"` 只能读取该 private plan；它与 terminal outcome fold 保持两层责任，空 selection 继续使用 caller `empty` policy，不能改变 `"all"` / IDs 的 syntax、validation 或结果。
- **Presentation / facts:** progress、diagnostic、RunResult、Check facts 和 machine publication 要证明没有遗漏或新增稳定 selection telemetry；dependency-activated Check 与真正 flag-disabled Check 的 lifecycle 仍能从既有 terminal facts/renderer 行为区分。
- **Gate / materials:** Product API、stable owners、example/declaration projection、semantic Cases、Gate composition 与 required Gate evidence 必须同步；Gate 只删除 Product 已拥有的 `dependsOn` closure / aggregate projection，保留自己拥有的 `observes` validation。

## Risks / Trade-offs

- dependency predicate miss 被 closure 覆盖是选择便利的必要条件，故 flags 不得被声明为安全、环境准入或 capability authorization；需要这些硬条件的 Check 继续在 preflight/execution ownership 内明确结算。
- `"effective"` 与 existing `"all"` 的结果在存在未选中的 flag Check 时可以不同；它必须是 explicit selector，既不能成为 default，也不能暗改 ID-list membership。
- static graph 因 flag 不同而改变 execution membership，但不改变 definition topology；closure 必须在既有 graph validation 后形成，避免 dynamic cycle / unknown-ID recovery 路径和第二 Task graph。
- Gate 的当前手工 `observes` closure 是其 consumer requirement，而非 Product propagation target；简化时错误删除该校验会使 observer readback 不可用。

## Open Questions

无。四项 Draft 问题已分别收敛为 `enabledByFlags.propagateDependsOn?: true` authoring opt-in、closure 覆盖 dependency 自身 predicate、closed `checkAggregation.checks: "effective"` selector，以及复用现有 terminal facts/lifecycle 而不新增 selection telemetry。
