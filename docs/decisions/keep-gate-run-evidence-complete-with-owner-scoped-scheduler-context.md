---
title: 以 owner-scoped Scheduler context 保持完整 Gate Run 证据
status: active
alignment: aligned
createdAt: 2026-09-04T06:54:14Z
purpose: 让单次 Gate invocation 在 Scheduler owner channel 内保留完整且可复核的动态 decision evidence，同时删除无独立证明价值的重复 payload。
background: 每个 decision 重复 immutable graph 主导诊断体积；单核心“event 自包含”要求阻碍按 owner 拆分和去重。
decision: 每次 Run 的 scheduler channel 记录一次 graph/fingerprint，decision 引用它并保留动态 admission facts。
tags:
  - configuration
  - testing
  - workflow-policy
relations:
  - type: 修订
    target: keep-gate-run-evidence-complete-with-stateless-scheduler-context.md
---

## 目的

- 让维护者从一次 owner-scoped `scheduler` channel 复核无状态 select 或 wait、full graph identity 与 hard-guard context，而不保留已退休的 reservation、sticky、fairness 或 starvation 状态。
- 保留每轮 admission 的动态因果事实，同时把不变 graph identity 和由 machine/progress canonical owner 保存的完整 payload 降到其唯一有证明价值的位置。
- 让截断或缺失 graph 的 scheduler log 可以由 fingerprint 和明确的不完整诊断识别，而不是被误读为自包含 event。

## 背景

- 无状态 admission 仍需记录 trigger、relation/mutex candidates、running/capacity、blockers、proposal、hard guard 与实际 `select(taskId)` 或 `wait`；这些动态 facts 不能仅因数值相同而删除。
- 每次 decision 重复 immutable full graph 使同次 diagnostic 的绝大部分 bytes 成为重复内容。owner-aware routing 后，合理的自包含边界是同一个 scheduler channel，不再是单个 decision event。
- 成功 Record 的完整 data 由 `machine/records.ndjson` 保存，Check final data 由 `machine/run.json` 保存，presentation messages 与完整 per-Check duration 由 `progress.log` 保存；machine disabled/failed 不是 diagnostic 接管这些 canonical persistence 的理由。

## 决策

- 采用: 每次 invocation 的 scheduler channel 在开头完整记录 immutable graph identity 并形成 fingerprint；后续每个 decision 引用 fingerprint，且仍完整记录 trigger、dynamic candidates、running/capacity、blockers、proposal、hard guard 和实际 decision。日志若不能提供所引用 graph，必须可诊断为不完整。
- 采用: Core channel 的 `record.reported` 只保留 check/record identity、result 和定位 machine Record 所需信息；被拒绝 Record 只记录有界 validation category。`check.finished` 只保留 status、duration、phase、reason code、message count 与必要 failure category。diagnostic 不复制完整 accepted Record data、final data、完整 messages 或 duration table。
- 采用: progress owner 一次性呈现所有 Check duration，未执行 Check 为 `null`；不建立 Top-N ranking。machine disabled 或 failed 时，调用方仅从仍成立的 `RunResult` 读取事实，diagnostic 不成为 canonical Record/final-data fallback。
- 不采用: 每个 Scheduler event 重复 full graph、仅因数值相同压缩动态 decision facts、回写 reservation 或其他已删除策略状态、以 diagnostic text 重建 machine facts，或用新的 summary reducer 替代既有 owner canonical outputs。
