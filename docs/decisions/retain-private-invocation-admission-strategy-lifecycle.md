---
title: 保留私有 invocation 准入策略生命周期
status: active
alignment: aligned
createdAt: 2026-09-03T06:15:11Z
purpose: 让 static、custom 与 learned 准入策略在 Invocation 内完成私有准备、同步选择与终态记录，同时保持 Scheduler 的唯一执行责任。
background: private lifecycle、measurement demand 与 Scheduler execution boundary 需要共同 owner。
decision: 保留 private provider lifecycle、measurement demand、learned state 与 Scheduler hard guards。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations:
  - type: 拆分
    target: introduce-invocation-scoped-admission-strategy-lifecycle.md
---

## 目的

让 static、custom 与 learned-critical-path 在每个 graph-ready Invocation 内形成私有 prepared policy；Scheduler 以该 policy 完成同步选择、Task execution、drain 和 first-order measurement。learned 的 caller-managed history/prediction/terminal recording 保持在 Scheduler 外。

## 背景

- runtime 在 static graph validation 后、且未在 pre-work/planning cancel 时，于 Invocation 内 resolve closed private provider 并 await 一次 `prepare`；Scheduler 接收 frozen `AdmissionSelectionPolicy`。
- static、custom 与 learned strategy 各有 measurement demand：plain static 可省略 collector，custom 保留实际 callback measurement，learned ready/static-fallback 需要 terminal measurement。该 demand 属于 private resolution。
- 私有 seam 建立时，custom public callback 为 trusted synchronous `proposeAdmission(context)`；私有 provider lifecycle 与 public authoring surface 分别拥有各自的稳定 owner。

## 决策

- 采用: Invocation-owned private preparation：每个实际 Run resolve 一个 closed provider 并 await 一次 `prepare`，得到只属于该 Run 的 prepared instance。它可读取 strategy-owned external state，并以 immutable graph/prepared model 形成选择所需信息。
- 采用: frozen selection handoff：prepared instance 向 Scheduler 交付 result-only `AdmissionSelectionPolicy`；Scheduler 同步调用 `decide`。Product-private static/learned policy 从 immutable prepared model 和 detached/frozen context 选择；私有 seam 建立时的 custom adapter 调用 trusted synchronous callback。
- 采用: Scheduler-owned measurement：private `requiresMeasurement` 表示 callback 前的 decision-boundary measurement demand。Scheduler 继续拥有 collector、clock、append、freeze、captured-prefix reader 与 raw measurement lifecycle；Invocation 在 diagnostic、configured generic Hooks、policy requirement 或 closed terminal demand 存在时创建 collector。
- 采用: Scheduler-owned execution guards：Scheduler 在 policy 前形成 relation/mutex candidate 并应用 lifecycle cutoff，随后验证 pending/candidate/capacity/cancellation/drain。合法 `select` 缩小 pending，`wait` 受 finite-progress contract 约束；strategy 不参与 Task start、cancellation 或 settlement。
- 采用: sealed terminal handoff：Scheduler 停止 admission、drain started work 并 seal raw terminal measurement；Invocation 在 sealed terminal context 存在时将它交给 private prepared `complete`。learned-critical-path `complete` 可用 admitted-to-settled sample 更新 caller-managed history，供 later Run `prepare` 使用。
- 不采用将 private provider、measurement demand、history、prediction、score 或 terminal sample 公开为 custom contract；也不采用 Scheduler-facing registry/composition/lifecycle hook、reservation、second pending set、Core-owned fairness/aging、mutable Scheduler state 或 Task command。history 的 missing/malformed/read/write/clock/concurrent failure 仅降低后续 optimization quality，保持 Task membership、Check/Record facts、aggregation、machine publication 与 Run result kind。
