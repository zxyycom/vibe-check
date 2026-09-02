---
title: 分离成功前置与已结算终态观测
status: active
alignment: aligned
createdAt: 2026-09-01T10:43:18Z
purpose: 让默认依赖阻止未满足前置的作者工作，同时保留显式终态审计读取。
background: 当前 dependsOn 同时承担 settled wait 与 read authorization，导致非成功上游后仍会启动 dependent。
decision: dependsOn 只表示 all-passed prerequisite；observes 单独等待所有终态，并与 dependsOn 共同构成直接读取授权。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: enumerate-normalized-direct-dependency-outcomes.md
---

## 目的

- 让有副作用的下游 Check 默认只在全部直接前置成功后开始，同时让 audit、summary 和诊断 Check 明确观测任何已结算上游结果。
- 保持依赖数据只能通过 producing Check、显式 direct relation 和 producer parser 传递，不暴露调度历史或全局执行视图。

## 背景

- 仅等待 upstream Task settled 会把 `failed`、`unavailable` 与 `not-applicable` 同样视为下游可启动，迫使每个 consumer 重复实现成功 guard。
- 仍需读取失败或不可用终态的 consumer 有不同的审计语义；把它们混在默认 prerequisite 中会同时弱化安全默认值和读取边界。

## 决策

- 采用: `dependsOn` 保留 string collection authoring spelling，但每个 direct upstream 都必须是 `passed`，下游才能开始自己的 author work。
- 采用: `observes` 是独立 direct relation，等待每个 direct upstream 形成四态 terminal outcome，但不按状态过滤；observer 在 callback 中用普通 TypeScript 决定结果。
- 采用: 每个 executable Check 分别规范化稳定、去重的 `dependsOn` 与 `observes`；两者的 union 是 `CheckDependencies.get/list` 唯一 direct authorization set，`list()` 只给出稳定排序、冻结的四态 outcomes。
- 采用: 两类有向 edge 的 union 共同拒绝 unknown target、self edge 与 cycle；同一 upstream 不得同时处于一个 Check 的 effective `dependsOn` 与 `observes`。
- 保留: `passed` 和 `failed` data 继续只能由 producing Check parser 解释；`not-applicable` 与 `unavailable` 保留 canonical reason。
- 不采用: global executed-Check registry、transitive 或 undeclared read、状态选择/聚合 DSL、any-of prerequisite、上游控制，或把 publish/deploy 等领域路由移入 Scheduler。
