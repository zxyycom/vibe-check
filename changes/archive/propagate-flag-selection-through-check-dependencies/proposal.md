# Proposal

记录本 Change 的 Product 结果：由 flag 选择下游 Check 时，作者可显式传递启动其 `dependsOn` 闭包，并让 aggregation 使用同一有效选择。

## Why

本 Change 之前，`enabledByFlags` 独立结算每个 executable Check。调用方若通过 flag 选择一个具有
`dependsOn` 的 Check，必须为全部传递依赖手工配置相同 flag；遗漏时依赖先结算为
`not-applicable`，下游再结算为 `unavailable`。这对低层条件控制是闭合行为，但不足以方便地承接
项目级局部 Check 选择，并迫使每个调用方重复维护依赖闭包和 aggregate selection。

## Outcome

Product 提供边界明确、可观察且兼容现有行为的 flag 依赖传递模型：Check author 在 `enabledByFlags`
中配置策略后，普通 caller 只传 flags 即可让被选 downstream Check 的 `dependsOn` 传递闭包参与同次运行。显式
aggregation 可选择同一 effective selection；不自动选择 `observes`，也不产生第二套项目私有传播算法。

## Scope

### Intended Change

- 为 executable `enabledByFlags` 增加默认关闭、只可显式写为 `true` 的 `propagateDependsOn` authoring
  opt-in，并将其纳入 Definition validation、normalization、declarative snapshot 和 fingerprint。
- 在完整静态 graph 验证后构造一次私有 effective selection：默认直接选择的无 flag Check、predicate
  匹配的 flag Check，以及每个 opt-in flag root 的 normalized `dependsOn` 传递闭包；该集合同时决定 flag
  control settlement 和新的 explicit aggregation `checks: "effective"` selector。
- 保持 `"all"`、显式 Check-ID aggregation、`aggregate: null` 默认、四态 outcome、`dependsOn` all-passed
  prerequisite 与 `observes` 任意终态等待不变。Product 落地后，Project Gate 改为消费这一能力，删除当前手工
  `dependsOn` 闭包和重复 aggregate-ID 计算，继续只在 Gate 层保守校验其 `observes` 输入。

### Resulting Impacts

- Configuration、API mechanics、Architecture、Quality Metrics、public type/JSDoc 和 package consumer
  material 需要表达新 authoring field、effective aggregation selector、默认兼容性与无 telemetry 边界。
- Project Definition normalization、Run planning、flag controls、aggregation、progress、diagnostic logging、machine
  publication 和 Check facts 从同一 static graph / effective selection 恢复各自责任，不引入 public resolver 或第二 DSL。
- flag-enabled、aggregation、progress、planning、machine/publication、Project Gate 与对应 semantic Case 的测试、Case
  mapping 和 Gate Definition 已同步；Decision alignment 只在完整方向成为已验证 current fact 后记录，不替代这些事实 owner 与验证。

## Success Criteria

- `propagateDependsOn` 仅在 executable `enabledByFlags` 中接受 `true`，省略完全保留当前 Definition fingerprint
  和未匹配 flag settlement 行为；unknown、`false` 或 container authoring 均在 Definition validation 失败。
- 多个匹配 opt-in roots 以唯一、确定的 `dependsOn` 传递闭包启动 prerequisite；closure 中的 dependency 即使自身
  predicate 未匹配仍照常运行，未标 flag 的 Check 保持默认选择，`observes` 永不因传播而被选择。
- 静态 graph（unknown relation、cycle、重复 relation 等）在 selection 前保持原有 planning failure；selected
  dependency 的普通 preflight、cancellation、dependency blocking 和四态 settlement 不被重写。
- `checkAggregation.checks: "effective"` 只聚合同一 effective selection 的 settled statuses；`"all"` 和显式
  IDs 原样兼容、空选择仍使用 `empty`，且没有默认 aggregate、public resolver 或新的 machine/progress selection fields。
- progress 只分组实际未选中的 flag settlements，dependency-activated Check 使用普通 lifecycle；diagnostic 与 machine
  保留既有事实而不增加 selection telemetry。Product 落地后 Gate 不再手工复制 `dependsOn` closure 或 aggregate IDs。
- owner docs、API material、examples/Case ledger（如测试 owner 判定需要）和 Decision index 同步，针对行为、public
  contract、output compatibility 与 Gate adapter 的验证通过。

## Affected Owners

- `docs/configuration.md`、`docs/api-mechanics.md`、`docs/architecture.md`、`docs/quality-metrics.md`：公共 authoring、Run
  Controls/aggregation、execution boundary、facts 与 aggregation 语义。
- `src/check/**`、`src/project-definition/**`、`src/project-run/**`、`src/index.ts`：public types、Definition normalization、static
  graph planning、flag controls、aggregation 和 private lifecycle handoff。
- `scripts/project/gate/**` 与 `docs/script-tooling.md`：Product capability 落地后的 Project Gate composition/aggregate ownership。
- `docs/testing.md`、`docs/testing/cases/**`、相关 Product/Gate tests：semantic Case、proof mapping 与验证入口。
- `docs/decisions/`：effective flag selection 的长期方向及其 predecessor lifecycle/index。
