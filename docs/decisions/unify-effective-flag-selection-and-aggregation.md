---
title: 统一 flag 有效选择、依赖启动与 aggregation
status: active
alignment: aligned
createdAt: 2026-09-04T08:38:14Z
purpose: 让 flag 选择可按 Check authoring 启动其 dependsOn 闭包，并让 aggregation 复用同一有效选择。
background: 现有 flag control 独立结算未匹配 Check，调用方须重复维护依赖闭包和 aggregate IDs。
decision: enabledByFlags 的显式 opt-in 形成一次私有有效选择；它只传播 dependsOn，并由显式 aggregation selector 同源消费。
tags:
  - configuration
  - dependency-policy
  - product-contract
  - workflow-policy
relations:
  - type: 归并
    target: treat-flag-control-settlements-as-scheduler-results.md
  - type: 归并
    target: use-explicit-run-controls-check-aggregation.md
  - type: 归并
    target: group-flag-disabled-checks-in-progress.md
---

## 目的

- 让只需传入 flags 的普通调用方能够使用 Check author 已声明的依赖启动策略，而不为每个 caller 或 Project Gate 复制 `dependsOn` 闭包。
- 让 flag control、依赖前提、progress 和显式 aggregation 共享同一次有效选择，避免执行集合与调用级结论各自计算不同闭包。
- 保留未选择 Check 的完整四态事实、现有默认行为和 `observes` 的独立语义，不把方便选择升级为权限、通用选择 DSL 或公共图 resolver。

## 背景

- 形成本 Decision 前，`enabledByFlags` 在完整静态图校验后独立结算 predicate 未命中的 executable Check；它的 `not-applicable / flag-condition-not-matched` 会阻断 `dependsOn`，但只等待终态的 `observes` 仍可运行。
- 因此当时一个被 flags 直接选中的 downstream Check 必须由调用方为所有传递 prerequisite 重复配置相同 flag；遗漏时 upstream 先不适用、downstream 再不可用。Project Gate 当时用有限、手工验证的 preset closure 规避该重复。
- 当时 `RunControls.checkAggregation` 保持显式且只从 settled Check statuses 派生；原有 `all` 与 ID list 不能表达 Product 已经为本次 flags 形成的有效选择，迫使 caller 另算同一集合。
- `dependsOn` 是 all-passed prerequisite，`observes` 只等待任意四态 outcome；完整静态图（含 unknown ID 与 cycle）必须先于任何 selection、author work 或 control settlement 验证。

## 决策

- 采用: `enabledByFlags` 增加仅可显式填写为 `true` 的 `propagateDependsOn` authoring opt-in；省略保持 `false`，不提供冗余 `false`、RunControls propagation 开关、第二套 predicate 或 token vocabulary。该字段和已有 flags/mode 一起是 canonical declarative identity。它属于 executable Check：作者以同一处声明 direct flag root 及其依赖启动意图，普通 caller 只传 flags。
- 采用: 在完整静态图通过后，Run 只构造一次私有 effective selection。没有 `enabledByFlags` 的 executable Check 与 predicate 匹配的 flag Check 直接选中；每个 predicate 匹配且 `propagateDependsOn: true` 的 flag root 还加入其 normalized `dependsOn` 传递闭包。多个 roots 的结果取去重并集，使用既有 canonical Check order；`observes` 永不进入闭包。若 invocation 在 control 前已经取消，该私有集合不产生 flag-control settlement、aggregate 或公共输出。
- 采用: 被闭包加入的 dependency 即使自己的 `enabledByFlags` predicate 未匹配，也作为 dependency-activated Check 保留在 effective selection，并继续其普通 Scheduler、preflight、execution 和 all-passed prerequisite 语义。只有不在 effective selection 的 predicate 未匹配 Check 才形成既有 `not-applicable / flag-condition-not-matched`；未声明 `enabledByFlags` 的 Check 不因本能力失去默认直接选择。静态 graph 无效时仍在 selection 前失败，故不创建 dynamic cycle 处理、图改写或 author work。
- 采用: `checkAggregation.checks` 在保留 `"all"` 与显式 canonical ID list 原语和默认 `aggregate: null` 的同时，增加显式 `"effective"` selector。它只消费同一次 private effective selection 的 settled statuses；空集合仍由现有 `empty` policy 结算。Product 不公开 resolver、effective ID list、第二 selection DSL 或 caller-local callback，显式 ID/all 行为及其 validation 不变。
- 采用: dependency-activated Check 的 progress 继续走普通 started/settled lifecycle；仅 effective selection 之外形成的 flag-control settlement 继续按既有规则分组。machine v4、Check facts、RunResult public shape 和 diagnostic channel 不增加 root、activation 或 effective-ID telemetry；它们保留所有 canonical terminal outcomes，诊断也不重复记录 selection snapshot。这样 caller 可从已存在的 outcome 观察行为，而不把内部 selection plan 变成稳定输出契约。
- 采用: Project Gate 在 Product 能力落地后改用 Check authoring 的 propagation 与 `"effective"` aggregation，删除手工 `dependsOn` closure 和重复 aggregate-ID 计算；Gate 仍可为自身读数需求保守校验 `observes` closure，不能据此要求或模拟 Product 自动传播 `observes`。
- 不采用: 让传播覆盖到 `observes`、把 dependency 的 flag predicate 继续作为 propagated activation 的硬门、默认开启传播、把传播移到 RunControls、公开通用 graph selection/resolver、为 root/activation 建立 machine/progress telemetry，或以 Gate 私有算法替代 Product 选择事实源。
