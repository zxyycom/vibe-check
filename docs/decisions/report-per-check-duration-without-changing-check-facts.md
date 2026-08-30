---
title: 报告每项 Check 时长而不改变 Check facts
status: active
alignment: aligned
createdAt: 2026-08-30T17:34:09Z
purpose: 为 progress 与最终 RunResult 提供 monotonic duration，同时保持 Check、Record 和聚合契约不变。
background: 消费者需要执行耗时反馈，但时长不是 terminal status、Record identity 或领域结算输入。
decision: Project Run 报告 per-Check durationMs，不发布 wall-clock chronology 或独立 telemetry。
tags:
  - product-contract
relations:
  - type: 拆分
    target: preserve-release-gate-readiness-with-invocation-creation-time.md
---

## 目的

- 让长时间运行的 Check 在 progress 和最终结构化结果中有可用耗时，而不把计时扩散到领域事实。
- 区分 monotonic elapsed duration 与可关联的 wall-clock execution chronology。

## 背景

- Project Run 可以在调度边界测量 elapsed duration；producing Check 和 Core 无需知道 wall clock 或 presentation concern。
- 将时间写入 Check outcome、Record 或 aggregation 会扩大稳定领域契约，且不能为当前消费者提供额外可信证明。

## 决策

- 采用: Project Run 对每个实际执行 Check 测量 monotonic `durationMs`，并在 progress 与 final structured `RunResult.checkDurations` 中报告。
- 采用: duration 只是 invocation execution summary，不成为 Check terminal status、aggregation input、minimal Record、Core identity 或 machine Record field。
- 采用: 不发布 per-Check wall-clock `startedAt`/`endedAt`、Record report time、跨 invocation telemetry stream 或 public lifecycle hook。
- 不采用: 为了展示耗时而修改 Check settlement、QualityRecord identity、finding policy 或 machine schema 的领域事实。
