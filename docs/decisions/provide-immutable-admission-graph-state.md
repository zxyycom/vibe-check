---
title: 提供不可变 AdmissionGraph 与 AdmissionState
status: active
alignment: unaligned
createdAt: 2026-09-03T09:09:30Z
purpose: 让 standalone 与 callback 共用 immutable 调度状态协议而不取得 Scheduler 控制能力。
background: 现有 callback 缺少可分支完整状态；重建 relation/capacity/transition 会复制语义，而 real Scheduler 必须保留 control boundary。
decision: 采用同型双 seed 的 immutable graph/state、shared reducer/effects 与 successor-only non-control boundary。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让调用方从一次验证和编译后的静态 Scheduler graph 创建初始 immutable state，并让真实 custom policy callback 读取同一 public state 进行 deterministic lookahead、branching 或离线探索。
- 让 static、custom 与 learned strategy 的选择和真实 Scheduler execution 继续只有一套 relation、mutex、capacity、scope、forced-block 与 settlement 语义来源。
- 保持 public state 是假设性、非权威且非控制性的 read/transition handle，不把 Scheduler execution ledger、Task command 或 private representation 变为 package contract。

## 背景

- `AdmissionPolicyContext` 当前提供 graph、候选、capacity、动态 ID 和 measurement prefix，但不能列出全部 pending 及其 primary blocker、验证单项、保留 predecessor 分支或对同一状态推演 select/settle。
- custom authoring 与 private invocation lifecycle 已分别由对齐 Decision 固定：callback 是 trusted synchronous result-only proposal seam；Invocation/provider 形成 policy；Scheduler 仍拥有 execution、measurement、hard revalidation、policy-fault cancellation 与 drain。
- standalone consumer 和 live custom lookahead 都需要相同的 graph legality 与 hypothetical successor。若各自复制规则或另建 simulator，将与 real Scheduler 发生 transition drift。
- current decision path 的 object/collection rebuild 是待测事实而非性能结论；public branching state 的内部表示必须先以同 workload 比较 full-clone Map/Set、parent+delta 和 dense ID + chunked copy-on-write，不能预先承诺复杂结构或数值 budget。

## 决策

- 采用: public `createAdmissionGraph({ graph, maxParallel })` 在 exact static input validation 后一次 compile，返回 opaque immutable `AdmissionGraph`；`initialState()` 与每个真实 `AdmissionPolicyContext.admissionState` 返回同一种 immutable `AdmissionState` contract。两个入口只有 seed 不同，不形成不同的 legality、DTO 或 state 类型。
- 采用: public state 只公开 frozen inspection/catalog DTO、single-task validation 和 `select(taskId)` / `settle(taskId, "satisfied" | "unsatisfied")` 的 typed accepted-or-rejected result。accepted transition 唯一携带 successor；保留 predecessor 即 fork；无 setter、copy、arbitrary seed/import、cancel、Task execution、writeback、state serialization/hash、ordered effects 或 global cache/interning contract。
- 采用: private Scheduler core 一次拥有 compiled graph、immutable dynamic state node、pure reducer、canonical forced microsteps 和 ordered effects；public state 只消费 hypothetical successor，real shell 仍独占 Task/Promise、signal、diagnostics、measurement、actual settlement payload/error、RunResult 与 callback-return hard guards，并执行 canonical effects。
- 采用: public v1 的 settlement 只表达 `satisfied` / `unsatisfied` scheduler-relevant binary。real shell 通过 private mapping 将 actual completion/failed/prerequisite-unsatisfied/blocked/cancelled lifecycle 转为 core action；不会将 Check result、value、error、cancellation control 或 policy fault 交给 public state。
- 采用: public contract 以 canonical task-ID order、closed rejection-reason union、明确 primary-reason precedence 与 trace oracle 固化观察语义。表示、dense IDs、indexes、node sharing、delta depth、chunk size、catalog memo/compaction 均为 private implementation choices，只有实测证据支持时选择最简单方案。
- 不采用: mutable Scheduler view、reservation、live state writeback、第二 graph semantics、通用 executor、public cancellation/replay/batch、public persistent-state format、算法/priority default 替换或将该 state capability作为已对齐 custom authoring/lifecycle 的前置条件。
