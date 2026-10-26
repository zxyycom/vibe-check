---
title: 以精确终态视图保持统一 summary delivery
id: 261016-deliver-summary-through-exact-terminal-views
status: active
alignment: aligned
createdAt: 2026-10-16T07:28:16Z
purpose: 保持 summary 与 caller effects 的顺序和故障边界而不绑定外层 identity
background: 终态需求精确交付与旧 summary 共享完整 context identity 冲突
decision: 统一 terminal runner 并分别投影所需字段，summary 自行包含 writer failure
tags:
  - diagnostics
  - product-contract
  - scheduler
  - workflow-policy
relations:
  - type: 修订
    target: 260902-unify-default-summary-with-terminal-measurement-hooks
    summary: 保留统一交付及故障包含，取消共享外层身份
---

## 目的

- 让 internal summary 与 caller terminal effects 共用有序交付边界和明确故障策略，不让 summary 成为 Scheduler 的特例分支。
- 允许精确字段视图，不把消费者外层 identity 当作共享事实的必要条件。

## 背景

- 前序把 diagnostic-enabled summary 纳入统一 terminal runner，解决默认副作用与 caller runner 的顺序和失败策略分离；同时承诺 terminal context 只构造一次和所有消费者共享 identity。
- 精确声明交付要求每个消费者仅取得自身字段，无法保留该外层 identity 承诺。需要保留的是同一次 seal 的事实与顺序，不是完整对象的偶然共享。
- summary writer failure 是 diagnostic observation；caller effect failure 是 terminalEffects output failure，两者不能混同。

## 决策

- 采用: diagnostic-enabled summary 仍以内部默认 wrapper 进入统一 terminal delivery，先于 Definition effects；prepared terminal effect 最后。runner 不识别 summary identity，也不在其外另行调用 summary。
- 采用: 根据内部 summary 和各 caller 的固定需求共享生产依赖，再分别交付精确冻结视图；不保证外层对象相同。同 Run graph 与同 seal 的 immutable 事实可复用，所有视图保持旧快照隔离。
- 采用: 默认 wrapper 自行包含 summary 投影与 writer failure，不进入 caller terminalEffects aggregate。caller effect 抛错或 reject 后仍顺序等待后续 effect；正常 completion 和既有 primary failure 遵循 terminalEffects output 优先级。
- 采用: terminal delivery 仅在既有 drained/sealed 边界发生，空需求 effect 不因未启用 collector 被略过；未到达边界仍 not-run。summary 真实诊断依赖加入生产闭包，不强迫所有 caller 取得完整测量。
- 不采用: per-transition caller hook、summary public API/machine/progress field、callback identity fingerprint、背景或跨 Run delivery、通过 summary 驱动 policy，或向 caller 暴露内部 summary/collector。
