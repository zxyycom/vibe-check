---
title: 默认有效 Check 聚合并允许调用方同步解释
id: 260915-default-effective-check-aggregation-with-caller-local-callback
status: active
alignment: aligned
createdAt: 2026-09-15T10:20:22Z
purpose: 让每次完成结算的 Run 无需 policy 即得到严格默认聚合，并允许调用方同步解释同一有效 Check 列表。
background: 现有有效选择已统一 flag、依赖启动与 aggregation 输入，却仍要求闭合 policy 并默认 aggregate 为 null。
decision: 以默认 strict-all 和 caller-local 同步 callback 直接替换旧 policy，保留完整 snapshot 与 Run 生命周期责任。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: 260904-unify-effective-flag-selection-and-aggregation
    summary: 替换旧 policy 与 null 默认聚合
---

## 目的

- 让完成结算且具有完整 facts 的每次 Run 都给出可直接消费的默认聚合，不把普通调用方的结论建立在重复的 policy 配置上。
- 让需要领域解释的调用方能基于 Product 已形成的同一有效 Check 列表同步给出四态结论，而不复制选择、结算或 snapshot 处理。
- 保留完整 Check/Record snapshot、Scheduler 结算、Definition identity、machine publication 和 Gate exit mapping 各自的责任边界。

## 背景

- 前序 Decision 已把 flag 选择、dependsOn 传播和 aggregation 输入收敛为 canonical-order 的私有 effective selection，但它仍保留 `checkAggregation.checks` 的 `"all"` / ID list / `"effective"` selector、闭合 policy 和 `aggregate: null` 默认。
- 结算后的有效 Check facts 已足以为默认结论服务；继续要求 caller 表达选择集合会重新引入与 Product selection 漂移的机会，也不能让 caller 读取 Check final data 形成其领域结论。
- callback 只能解释已经结算的事实。若 Product 吞没其错误并伪造普通 RunResult，将混淆 caller authoring fault 与 Check、planning、configuration、execution 或 output 的既有结算分支。

## 决策

- 采用: 直接以 `RunControls.checkAggregation?: CheckAggregation` 替换旧闭合 aggregation policy，不保留旧 selector、`empty` policy、`aggregate: null` 默认或兼容入口。`CheckAggregation` 是同步函数 `(checks: readonly CoreCheck[]) => CheckAggregate`；`CoreCheck` 公开 `checkId`、outcome 和既有 passed/failed final data，`CheckAggregate` 仍为既有闭合四态。
- 采用: Product 在完整 settlement 后按 canonical Check order 从同一个 private effective selection 取出完整 `CoreCheck[]`。缺省 callback 时，仅非空且全部为 `passed` 返回 `passed`；空列表或任一 `failed`、`unavailable`、`not-applicable` 返回 `failed`。完整 `snapshot.checks` / `snapshot.records` 继续保存所有 canonical facts，未选 Check 仍保留其既有终态。
- 采用: 提供 callback 时，Product 只验证并采用其同步四态返回，不等待 Promise 或提供异步、选择、调度、状态写入或结果变换能力。callback 只在完整 settlement 后执行，不进入 Definition fingerprint，也不成为 public effective-selection resolver。
- 采用: callback 抛错、非 Error throwable、Promise 或其他非法返回均使 `run` Promise 拒绝；原 Error 保持其身份，其它故障转为可定位 Error。拒绝路径关闭 invocation-owned diagnostics 与 progress writer，且不呈现正常成功 summary 或发布伪造 RunResult；清理错误不得掩盖 callback 原错误。普通配置、planning、Check callback、execution 和 output 故障继续由原有 RunResult 分支结算。
- 采用: Project Gate 省略 `checkAggregation` 并消费默认严格聚合；它继续拥有将 bound Run 的正常 aggregate 或 Promise rejection 映射为报告和 process exit 的责任。此变更不改变有效选择、dependsOn / observes、Check outcome、candidate binding、scheduler 或 machine facts。
- 不采用: 继续要求 caller 配置 `"effective"` 或其它 selector、为 default 建立可配置空集合例外、保留旧 policy 兼容、将 callback 设计为 async，或让 callback 接收全量 snapshot、控制执行、修改 facts 或替代 Gate 映射。
