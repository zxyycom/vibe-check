---
title: 以 invocation 策略生命周期包装纯准入选择
status: active
alignment: aligned
createdAt: 2026-09-03T04:24:05Z
purpose: 让每次 Run 的策略准备、纯准入选择和终态性能处理各有唯一边界，同时保持 Scheduler 对执行状态机与硬合法性的唯一责任。
background: 现有 Decision 将外层策略生命周期与 Scheduler-facing policy 一并拒绝，导致 learned history 组合边界混合且不能准确表达其跨 Run 数据流。
decision: 采用 invocation-scoped strategy lifecycle，并保持 Scheduler policy 为同步纯 select 或 wait 投影。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: use-stateless-admission-policies-with-hard-scheduler-guards.md
---

## 目的

- 让 static、custom 与 learned-duration 的准入偏好继续在完整当前事实之上形成可重放的选择，同时不让 Scheduler 保存、解释或执行算法专属状态。
- 让一次 effective strategy 在静态 graph 已就绪后，能先准备 invocation-local 模型，再将纯选择交给 Scheduler，并在性能测量终态封闭后处理跨 Run 优化状态。
- 保持唯一 Scheduler 对 relation、mutex、capacity、cancellation、blocked settlement、Task 启动、等待、结算、有限进展 guard 与性能一阶测量的责任；策略不得获得第二个状态机或 imperative Task 控制能力。

## 背景

- 已验证的静态 graph 是有限且不可变的；每次合法 `select` 都使 pending 集合缩小。relation/mutex/capacity facts、运行集合、lifecycle cutoff 与 decision-boundary measurement 可以在每个 admission cycle 作为 immutable invocation-local snapshot 重算。
- learned-critical-path 的本地 history、prediction 与 terminal recording 是跨 Run 优化状态，不是 Scheduler state、quality fact 或 public Run result。它需要在第一次选择前从 caller-managed state 形成 immutable prediction，并只在 drain 后消费 sealed terminal measurement；把这两个阶段手工散布在 invocation 中会混合 model、ranking 与 selection owner。
- 现有 policy 边界正确拒绝 reservation、priority queue、第二 pending 集合、Core-owned fairness/aging、policy registry 与 Scheduler 解释算法意图；但其中“lifecycle hooks”的拒绝未区分 Scheduler-facing selection policy 与 Invocation 在 Scheduler 外管理的策略实例生命周期。
- terminal measurement Hooks 已是 Scheduler-owned raw facts的有序投递边界。它们不应成为策略重新调度、跨 Run history 或通用 strategy side-effect protocol 的替身；同时，当前 custom 的 per-decision measurement prefix、learned terminal recording、diagnostic 与 caller Hooks 有不同的最小采样需求，不能因引入 complete 而无条件采样每个 Run。

## 决策

- 采用: 每次 Run 在完整 immutable Scheduler graph 已形成后，只 resolve 并 prepare 一个 effective `AdmissionStrategy`。`prepare` 在 Scheduler performance measurement 开始前恰好调用一次；它可以异步读取或初始化 strategy-owned external state，并返回仅属于该 Run 的 prepared instance。它只消费本 Run 的稳定准备事实和显式授权的 strategy state，不消费动态 candidate/running/settled inspection 或尚未产生的 measurement。
- 采用: prepared strategy 向 Scheduler 交付完整、frozen 的 private `AdmissionSelectionPolicy`，Scheduler 只接触该 policy，绝不接触 strategy 的 prepare 或 complete。所有 Scheduler-facing policy 的结果契约都是同步、result-only 的精确 `select(taskId)` 或 `wait`，不携带 imperative Scheduler capability。Product-owned static/learned policy 的 decide 以 immutable prepared model 和 Scheduler 提供的当前 detached/frozen context 进行纯选择；其 prepare closure 只能承载本 Run immutable prepared model，动态事实必须从本轮 context 读取，complete 不得反向改变同一次 Run 已结束的 decide 行为。当前 custom adapter 则调用 trusted synchronous callback；Product 不 sandbox、timeout、隔离或验证调用方 closure 的 host-side effect，只以 context 和 hard guard 限制其不能取得 Product-managed mutable Scheduler state 或命令。
- 采用: private policy 保留既有 `requiresMeasurement` metadata；它不是算法状态、public authoring field 或 fingerprint input，只要求 Scheduler 在相应 policy callback 前准备既有 decision-boundary measurement。设有该 metadata 的当前 custom adapter 继续得到已 flush 的 frozen cumulative facts、captured-prefix `measurementAt` reader 与从 accepted select/wait post-state 开始的 action observation；Scheduler 仍拥有 collector、clock、append、冻结和 measurement lifecycle。prepared strategy 还以不承诺 public 字段名的最小 private terminal-measurement demand，声明其 complete 是否需要 sealed terminal raw facts。Invocation 只在既有 diagnostic logging、caller measurement Hooks、policy `requiresMeasurement` 或 prepared strategy terminal demand 任一成立时启用 collector：plain static 在四者均不存在时不采样；custom 的 per-decision requirement 自然取得 terminal facts；learned 的 ready 与 static-fallback preparation 都声明 terminal demand。没有 `requiresMeasurement` 的 static/learned policy 不因此创建 custom callback measurement prefix path。
- 采用: Scheduler 在 policy 前形成 relation/mutex candidates 并应用 lifecycle cutoff；在 policy 后只验证下一运行选项的硬合法性：selected Task 必须仍 pending、为本轮 candidate、满足当前 capacity 且未越过 cancellation/lifecycle boundary。`wait` 仅在存在可结算的 running Task 时合法。Scheduler 独占 readiness、mutex、capacity、取消、blocked settlement、状态转换、Task 启动、等待和结算；它不解释 priority、公平、防饥饿、等待理由、模型、history 或任何 strategy algorithm。
- 采用: Scheduler 继续拥有 monotonic clock、interval attribution、raw measurement 与 terminal seal。它停止 admission、drain 所有 started work、封闭 terminal raw measurement，并按既有规则投递 internal summary 与 caller measurement Hooks；这些 Hook 的顺序、output status 和 primary-failure precedence 不因 strategy lifecycle 改变。prepared strategy 的 `complete` 仅在有已封闭 terminal measurement 的策略 Run 中、于该 Scheduler terminal delivery 返回后调用一次；它可以异步消费终态事实与执行 strategy-owned side effect，但其耗时不计入 Scheduler measurement，不能启动/取消/结算 Task、再调度或改写 sealed facts。没有 Scheduler terminal sequence 时不制造 complete 调用。
- 采用: `learned-critical-path` 作为内置 outer strategy 采用此生命周期。其 prepare 从 caller-managed history 形成 immutable duration prediction 和 graph-derived ranking；其 decide 只以该 immutable model 和当前 Scheduler context 选择；其 complete 从 sealed admitted-to-settled terminal samples 更新 caller-managed history，供后续 Run 的 prepare 使用。history 永不进入 Scheduler mutable state；missing、malformed、incompatible、read/write、clock 或并发 last-writer 问题仍只降低未来优化质量，绝不改变本次 Task membership、Check/Record facts、aggregation、machine publication 或 Run result kind。
- 采用: `maxParallel` 继续由每个 executable Check 自身或 nearest explicit ancestor 决定，缺失时使用 invocation root limit；admission 同时遵守 root limit、candidate effective limit 与所有 active Task limit，并持续至 settlement。`maxParallel` 不创建 descendant pool、nested Task ownership 或 mutex 替代物。`admissionPriority` 继续是 signed safe-integer immutable normalized Task metadata，省略为 `0`，按 nearest-explicit scalar inheritance 传播，子节点完整覆盖；它绝不成为 graph 外 map/list 或旁路排序输入。
- 采用: 默认 static tightening policy 每轮以同一无状态输入重算 constrained/tightening/priority/canonical tie-break，且可以在可 drain 时 `wait`，但不保存 reservation、sticky target 或任何 Core-owned strategy state。learned policy 继续先在既有 selection layer 比较 estimated downstream critical-path score，仅在 score 相同时比较 effective `admissionPriority`，最后用 canonical Task ID；任何策略都不得越过 relation、mutex、capacity 或 lifecycle hard guard。
- 采用: 完整静态 graph、pending 严格缩小和不可 drain `wait` 拒绝共同提供有限进展：每个 `select` 减少 pending，每个合法 `wait` 等待 running settlement 后重算，running 为空时 policy 必须合法 select 或 Scheduler 明确失败，而不能无限等待。
- 采用: 当前 public custom admission authoring 仍是 trusted synchronous `proposeAdmission(context)`，只表达 `select|wait`，不改变其 context、fingerprint、fault、reentrancy、host-side effect 或 output contract；它可在内部适配为 no-op prepare/complete 与原 decide。未来若公开 custom strategy lifecycle，可以把外部副作用引导到 prepare/complete，但必须复用本记录的 outer `prepare → decide* → complete` 边界，而不是扩展 Scheduler-facing policy；其 public grammar、prepare/complete context、错误映射、state authorization 与 overlapping-Run contract 由独立 public Change 和后继 Decision 闭合。
- 不采用: Core reservation/sticky state、`keep` / `clear` / `set` result、priority queue、第二 pending 集合、Core-owned fairness/anti-starvation/aging、Graph 外 priority 输入、局部 candidates 作为唯一策略输入、Scheduler-facing policy registry/composition/lifecycle hooks、policy 直接执行或结算 Task、通过 implicit fallback 掩盖选择语义、以 terminal measurement Hook 驱动再调度，或让 complete 把本次终态数据反馈给同次 decide。
