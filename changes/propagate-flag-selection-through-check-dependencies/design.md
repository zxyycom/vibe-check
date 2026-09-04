# Design

本 Draft 保存 flag 依赖传递能力的当前问题边界和待收敛设计，不授权在本轮 Gate 配置调整中实施 Product API。

## Context

- [`docs/configuration.md`](../../docs/configuration.md) 当前规定 `enabledByFlags` 在 Scheduler author work 前独立结算每个 executable Check；条件未匹配形成 `not-applicable / flag-condition-not-matched`。
- [`treat-flag-control-settlements-as-scheduler-results.md`](../../docs/decisions/treat-flag-control-settlements-as-scheduler-results.md) 要求该非通过结果继续按普通 `dependsOn` 阻断下游，并明确不由 Product 递归复制 blocked propagation。
- [`use-explicit-run-controls-check-aggregation.md`](../../docs/decisions/use-explicit-run-controls-check-aggregation.md) 规定 aggregate 的 Check 集合由调用方显式提供。只增加依赖启动而不统一 effective selection，会继续迫使调用方重复计算 aggregate IDs。
- 当前 Project Gate 可以用闭合的少量 preset 手工把依赖纳入同一 flag；这是本轮 Gate 调整的局部配置，不代替本 Change 的 Product 方向。
- 当前 Gate 方向由 [`use-project-check-command-with-focused-gate-presets`](../../docs/decisions/use-project-check-command-with-focused-gate-presets.md) 承接；它还保守校验 `observes` selection closure，而本 Change 的自动传播范围只讨论 `dependsOn`。

## Goals / Non-Goals

目标是形成 opt-in 的传递启动语义、单一 effective selection、依赖自身 flag 条件的优先级、诊断事实和聚合消费方式，并以公共配置、运行时与行为测试证明。非目标是改变 `dependsOn` 的 all-passed prerequisite 含义、自动选择 `observes`、把 flag 当作权限机制，或把 Project Gate 的命令和 preset 配置纳入本 Change。

## Decisions

### Intended Change

暂定采用向后兼容的显式 opt-in，而不改变现有 `enabledByFlags` 的默认独立结算。Product 应先从直接 flag 命中形成 selection roots，再对请求传递的 roots 形成 `dependsOn` 传递闭包，并让执行、诊断和 aggregate 消费同一 effective selection。最终字段形态、依赖自身未命中 predicate 的处理，以及 effective selection 如何进入显式 aggregation，仍需在 Draft 收敛时决定。

### Resulting Impacts

- Check authoring/configuration contract 需要表达是否允许依赖传递启动，并保持当前默认行为兼容。
- Project Definition 规范化与 flag control barrier 需要在 Scheduler admission 前确定直接选择、依赖激活和未选择三类节点。
- dependency、cancellation、progress、diagnostic、RunResult/machine facts 与 aggregation 必须继续使用同一静态图和四态结果，不得隐藏未选择 Check。
- active flag、dependency 与 aggregation Decisions 需要形成清楚的演进关系；稳定 owner、类型、测试和 package consumer 文档必须同步。

## Risks / Trade-offs

- 如果传递启动无条件覆盖依赖自己的 `enabledByFlags`，可能绕过原本用于环境或能力约束的条件；如果完全不覆盖，又无法消除手工重复配置。
- 只改变执行 selection、不改变 aggregate selection，会留下两套依赖闭包计算并产生调用级结论漂移。
- 隐式默认传播会改变现有调用方可观察的 Check facts、进度和 aggregate，因此必须保持 opt-in 或形成明确的 public hard cut。
- 将 selection、eligibility 与安全授权混为同一 flag predicate 会使优先级不可判读；设计必须限定 flag 的责任。

## Open Questions

1. 在现有 `enabledByFlags` 增加传递模式，还是建立独立的 selection contract，以区分项目选择与 Check 自身硬条件？
2. 被传递选择的 dependency 自身 flag predicate 未命中时，应运行、保持不可适用，还是在 Definition validation 阶段拒绝该组合？
3. explicit aggregation 应接受 effective-selection selector，还是由 Product 暴露同源 resolver 供调用方形成闭合 ID 集？
4. 直接 flag roots、dependency-activated nodes 与最终 effective IDs 应在哪些 diagnostic、progress 或 machine facts 中可见，而不扩张不必要的稳定 telemetry？
