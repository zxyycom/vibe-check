---
title: 在 custom admission policy 前提供决策边界 measurement
status: archived
alignment: aligned
createdAt: 2026-09-02T02:34:22Z
purpose: 让无状态 custom policy 在每次调用前读取安全、冻结且已 flush 的 Scheduler 一阶事实。
background: 终态 measurement Hook 不提供 policy 决策时点的 occupancy 或上一已提交 lifecycle transition。
decision: custom policy 获得有界 cumulative measurement 与最新 committed transition，Scheduler 仍独占采样和状态机。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: expose-stateless-custom-admission-policy-to-callers.md
---

## 目的
- 让 custom admission policy 每轮依据完整静态 graph、当前合法候选和准确到 callback boundary 的 invocation-local measurement 做同步无状态选择。
- 保持 Scheduler 单独拥有生命周期、clock sampling、interval attribution、hard guard 与 transition commit，不把 measurement 变成 history、telemetry 或策略状态。

## 背景
- 现有 AdmissionPolicyContext 已提供 detached graph/candidates/capacity/runtime，但无法表示连续 select 的上一 admission 或 wait 后完整 running cohort occupancy。
- 终态 Hook raw measurement 已有 bounded accumulator；把完整 ledger 或 caller-managed time 交给 policy 会复制 Scheduler 的状态和边界。

## 决策
- 采用: custom callback 前 Scheduler flush 当前 open occupancy interval，并将 deep-frozen `measurement.cumulative` 与 `measurement.latestTransition` 加入现有 context；cumulative 只保留 bounded graph-task/scope accumulations，latest 只保留上一 committed transition 的 sequence、kind、settlement discrete fact与 interval contribution。
- 采用: transition 只描述已关闭 lifecycle change及其 prior-state occupancy interval；不含 actionDuration、causedBy、criticalPath 或任何 action 因果主张。clock unavailable 仍保留离散 transition，但不伪造 timing。
- 采用: 每次 mutation 均保持 flush→mutate→capture post-state→commit latest transition；blocked、cancel、fault与drain不额外制造 policy callback。
- 不采用: learned scheduling、跨 invocation storage/history、policy reservation、完整 boundary ledger、async policy、自动调参或让 policy 执行/结算 Task。
