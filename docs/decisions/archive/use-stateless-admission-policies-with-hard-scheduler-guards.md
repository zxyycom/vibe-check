---
title: 使用无状态准入策略与 Scheduler 硬 guard
status: archived
alignment: aligned
createdAt: 2026-09-01T14:51:15Z
purpose: 让准入偏好以每轮重算的纯算法表达，同时由唯一 Scheduler 守住执行状态机与下一选项的硬合法性。
background: reservation 把防饥饿记忆植入 Core，既与纯策略边界冲突，也与完整静态图上的有限进展模型重复。
decision: 归并既有策略分离和优先级/并行上限方向，删除 Core reservation，采用无状态 select/wait policy 与硬 Scheduler guard。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations:
  - type: 归并
    target: separate-admission-policy-from-scheduler-state-machine.md
  - type: 归并
    target: retain-running-parallel-limits-and-order-ready-admission-by-priority.md
---

## 目的

- 让 static、custom 与 learned-duration 的准入偏好都表现为基于完整当前事实的无状态算法，而不是由 Scheduler 保存或解释某种特定算法的记忆。
- 保留每个 executable Check 从 admission 至 settlement 的 `maxParallel` 约束、Task-owned `admissionPriority` 与完整 normalized Task graph 的唯一事实来源。
- 保持唯一 Scheduler 对运行状态、执行、结算与硬合法性的责任，避免 public/custom policy 获得第二个状态机或 imperative Task 控制能力。

## 背景

- 已验证的静态图是有限且不可变的；每次合法 `select` 都使 pending 集合缩小。relation/mutex/capacity facts、运行集合和 lifecycle cutoff 可在每个 admission cycle 作为 immutable invocation-local snapshot 重新计算。
- 旧的 reservation `set` / `clear` / `keep` 让 Scheduler 保存“稍后优先处理哪个 Task”的策略状态，并要求 Core 解释 sticky、tightening 或 constrained continuation。这将防饥饿机制从算法误置为 Scheduler 的通用保留协议。
- 当 policy 只能看局部 ready candidates 时，无法利用已知后继、关键路径或全图拓扑；反之，若 policy 自行判定 readiness、启动或结算，则会复制 Scheduler。
- 完整静态图中，capacity 暂不可 admission 的 relation/mutex candidate 仍是有用动态事实：policy 可以在有 running work 可推进时返回 `wait`，settlement 后以新 snapshot 重算，而不须保存 reservation。
- `consolidate-project-gate-run-evidence.md` 仍要求 scheduler diagnostic 保存 reservation context；该要求与本决策的删除方向冲突。它不是本次归并的直接前序，但在实现无状态 contract 前必须由其 owner 以真实后继演进为不依赖 reservation 的 decision evidence，不能静默保留已退休字段或由本 Decision 直接归档。

## 决策

- 采用: Product-private admission policy 是同步、无状态的纯决策函数。每个 admission cycle 都从同一 immutable 完整 normalized Task graph、immutable invocation-local runtime inspection、Scheduler 形成的 relation/mutex eligible candidates 及其当前 capacity facts 重新计算；Graph 是唯一 topology 与 priority handoff，`admissionPriority` 仅是 Task metadata，绝不另设 priority map、priority list 或旁路排序输入。
- 采用: policy 的闭合结果只有 `select(taskId)` 或 `wait`。它不传递 reservation、await reason、历史计数、clock、filesystem、history store、executor、Promise、logger、signal 或 mutable cross-invocation state。public custom callback 的具体 authoring 名称、投影和 fault contract 由其独立 public-contract Decision/Change 承接；其实现不得削弱本决策的无状态边界。
- 采用: Scheduler 在 policy 前形成 relation/mutex candidates 并应用 lifecycle cutoff；在 policy 后只验证下一运行选项的硬合法性：selected Task 必须仍 pending、为本轮 candidate、满足当前 capacity 且未越过 cancellation/lifecycle boundary。`wait` 仅在存在可结算的 running Task 时合法，避免不可 drain 的停滞。Scheduler 独占 readiness、mutex、capacity、取消、blocked settlement、状态转换、Task 启动、等待和结算；它不解释 priority、公平、防饥饿、等待“理由”或任何 policy algorithm。
- 采用: 每个 executable Check 继续使用自身或 nearest explicit ancestor 的 effective `maxParallel`，缺失时用 invocation root limit；admission 同时遵守 root limit、candidate effective limit 与所有 active Task limit，并持续至 settlement。`maxParallel` 不创建 descendant pool、nested Task ownership 或 mutex 替代物。
- 采用: `admissionPriority` 继续是 signed safe-integer 的 immutable normalized Task metadata，省略为 `0`，按 nearest-explicit scalar inheritance 传播，子节点完整覆盖。默认 static tightening policy 每轮用同一无状态输入重算 constrained/tightening/priority/canonical tie-break；它可以选择 `wait`，但不承诺 sticky reservation trace。priority 绝不越过 relation、mutex、capacity 或 lifecycle hard guard。
- 采用: 完整静态 graph、pending 严格缩小和不可 drain `wait` 拒绝共同提供有限进展：每个 `select` 减少 pending，每个合法 `wait` 等待 running settlement 后重算，running 为空时 policy 必须合法 select 或 Scheduler 明确失败，而不能无限等待。
- 采用: learned-duration 的跨 Run 历史不进入 Scheduler 状态；它由 Scheduler 外的 owner 在单次 invocation 前形成 immutable prediction snapshot，再作为无状态 policy 输入。只有未来出现动态 Task、retry、循环队列或 aging 等当前模型无法表达的真实需求时，才另行设计 policy-owned opaque state；不预置通用 state protocol，也不让 Core 理解 reservation、starvation 或算法字段。
- 不采用: Core reservation/sticky state、`keep` / `clear` / `set` result、priority queue、第二 pending 集合、Core-owned fairness/anti-starvation/aging、Graph 外 priority 输入、局部候选作为唯一策略输入、policy registry/composition/lifecycle hooks、policy 直接执行或结算 Task，以及通过隐式 fallback 掩盖选择语义。
