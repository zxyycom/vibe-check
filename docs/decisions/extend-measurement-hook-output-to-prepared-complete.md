---
title: 将 prepared complete 纳入 measurement Hook output
status: active
alignment: unaligned
createdAt: 2026-09-03T06:15:21Z
purpose: 让 generic Hooks 与 prepared complete 共用 terminal pipeline，并保留既有 RunResult output。
background: 现有 output 只覆盖 generic Hook；complete 必须纳入同一 failure 语义而不改名。
decision: 保留 outputs.measurementHooks 和现有 diagnostic，并将 prepared complete 纳入 aggregate。
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: preserve-primary-run-failures-over-measurement-hook-output.md
---

## 目的

让 sealed terminal measurement 的 generic observers 与 per-Run prepared `complete` 经由一条 canonical side-effect pipeline 交付，并继续由 `outputs.measurementHooks` 表达整个 pipeline 的结果。

## 背景

- 当前 terminal measurement runner 在 Scheduler seal 后构造 frozen context，先运行 internal default summary，再按配置顺序运行 `scheduler.measurementHooks`；每个 generic Hook 都获得调用机会。
- 现有 `outputs.measurementHooks` 对 generic Hook list 投影 `enabled`、`not-run`、`succeeded` 与 `failed`，并以 `scheduler-measurement-hooks-failed` 表达 normal completion 后的 caller output failure。summary writer 的 failure 留在 internal containment wrapper。
- prepared `complete` 需要在 sealed context 存在时参与这一 output contract；其 lifecycle input 由 custom authoring Decision 定义。

## 决策

- 采用: single semantic terminal pipeline：Scheduler 在 sealed terminal context 上运行 existing `internal summary → configured generic Hooks（按配置顺序、全部获得调用机会）` runner；Invocation/orchestration 在该 runner 返回后交付 prepared `complete`（存在时至多一次），并汇总 `outputs.measurementHooks`。Scheduler 保留 generic runner，Invocation/orchestration 拥有 strategy lifecycle、overall sequencing 与 aggregate mapping。
- 采用: closed output states：`outputs.measurementHooks.enabled` 当且仅当 Definition generic Hook list 非空，或 successful prepared result 实际包含 `complete`；两者均无时为 disabled。enabled Run 未形成 sealed terminal sequence 时为 `not-run`；sequence 形成后，全部 actual generic Hooks 与 `complete`（如存在）成功为 `succeeded`，任一 generic Hook 或 `complete` throw/reject 为 `failed`。prepare failure 在无 generic Hooks 时为 disabled、有 generic Hooks 时为 enabled/`not-run`；无 generic Hooks 的 prepared result 未含 `complete` 时为 disabled，含 `complete` 而随后未形成 context 时为 enabled/`not-run`。field 名、status vocabulary 与 `scheduler-measurement-hooks-failed` diagnostic 保持既有 contract。
- 采用: facts-preserving result mapping：coordinator 在 aggregate mapping 前形成或保留 sealed Task/Check snapshot 与 selected aggregation。aggregate failure 将 normal completed Run 映射为 `kind: "output"`；cancellation、admission-policy fault、preparation failure 和其他 primary execution failure 保持其原 result，aggregate failure 继续在 `outputs.measurementHooks.status` 可见。
- 采用: internal summary containment：summary writer failure 不参与 caller/strategy aggregate，也不影响 Scheduler generic Hook runner 或 Invocation/orchestration `complete` delivery。
- 不采用 second terminal output、renamed output、compatibility dual-read、strategy-driven rescheduling、sealed fact mutation、generic Hook short-circuit、machine v4 output write、schema revision，或由本记录定义 public authoring grammar、private collector demand、Simulation/persistence capability。
