---
title: 将准入选择策略与 Scheduler 状态机分离
status: active
alignment: aligned
createdAt: 2026-09-01T13:03:39Z
purpose: 让 Scheduler 在不放弃硬合法性和状态机责任的前提下，把候选选择交给可利用完整 Task graph 的私有纯策略。
background: 静态与学习型选择都需要动态事实及后继；图外 priority 或拓扑输入会形成双重事实来源。
decision: 私有 policy 以完整图和 inspection 选择或等待；priority 内置 Task，Scheduler guard 合法性并拥有状态机。
tags:
  - product-contract
  - workflow-policy
relations: []
---

## 目的

- 让静态、custom 和 learned-duration 准入选择共享一个明确且可审查的私有边界，同时不把 Task engine 变成公开 workflow DSL。
- 允许策略利用完整已验证图的关系、后继和关键路径信息，而不复制 graph 或为 priority 建立第二个输入来源。
- 保持唯一 Scheduler 对 readiness、互斥、容量、取消、settlement、有限进展 guard 与 imperative execution 的责任。

## 背景

- Task graph 已规范化并冻结 Task ID、directed relation、scope、mutex 与 `admissionPriority`；静态 priority 是 Task metadata，不是独立调度配置表。
- Scheduler 先形成 relation/mutex eligible candidates，并为每项交接当前 capacity fact；capacity 不足的 candidate 仍保留，使 policy 能返回可 drain 的 `wait`。Scheduler 只在 `select` 后守 capacity；reservation、公平和防饥饿不是候选形成规则。
- 仅把当前 ready candidates 交给策略会隐藏已知下游和全图拓扑，迫使 learned-duration 或未来策略重建不完整视图；反过来让策略启动、结算或自行判定 readiness 会形成第二个 Scheduler。

## 决策

- 采用: Product-private admission policy 在每个 admission cycle 接收同一份 immutable 完整 normalized Task graph，以及只读、invocation-local 的动态 inspection、Scheduler 形成的 relation/mutex eligible candidates 和每项当前 capacity fact。Graph 是交接单元；`admissionPriority` 与其它静态 Task facts 只存在于 Graph/Task metadata，绝不另设 priority map、priority list 或旁路排序输入。
- 采用: policy 只返回闭合的 `select` 或 `wait` 决定；两者都带 reservation update，`wait` 带闭合 await reason。policy 可用完整拓扑和动态 inspection 推导偏好，但不读 clock、filesystem、history store、executor、Promise、logger、signal 或可变跨 invocation state。
- 采用: Scheduler 在 policy 前形成 relation/mutex candidates 与 lifecycle cutoff，在 policy 后验证 selected Task 仍是本轮 candidate 且当前可 admission、reservation `set` target 仍是本轮 candidate，以及 wait 仍有可 drain 的 running Task。Scheduler 不重演 reservation、公平或防饥饿策略：policy 可保留、clear 或替换 reservation；默认 static policy 保留既有 sticky trace。Scheduler 独占 readiness、mutex、capacity、取消、blocked settlement、状态转换、启动、等待和结算。
- 采用: 默认 static policy 保持现行 reservation、tightening、constrained continuation、priority 与 canonical tie-break。custom selector 与 learned-duration policy 只能复用该私有边界：前者另行定义 public trusted-callback contract，后者在 Scheduler 外构造 immutable prediction snapshot；两者均不得绕过 Scheduler guard。
- 不采用: Graph 外 priority 输入、只提供局部 selector candidates 的信息模型、policy 组合/注册表/生命周期 hook、第二 pending 集合、priority queue、策略直接执行 Task 或把公平/防饥饿作为 Scheduler 内置排序规则。
