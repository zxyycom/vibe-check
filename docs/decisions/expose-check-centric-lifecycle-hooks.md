---
title: 提供以 Check 为中心的生命周期观察
id: 260910-expose-check-centric-lifecycle-hooks
status: active
alignment: unaligned
createdAt: 2026-09-10T07:43:04Z
purpose: 让调用方观察逐 Check 生命周期且不取得执行控制权
background: 私有 progress 生命周期混合全局 barrier 与 Check 事件而调度 Hook 只覆盖终态测量
decision: 独立提供只读 Check 生命周期观察并由后续 Change 收敛具体 effect 契约
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: 260830-report-per-check-duration-without-changing-check-facts
    summary: 保留执行时长并增加 Check 事件观察
---

## 目的

- 为需要观察逐 Check 进展与终态的 Definition 作者提供独立、只读的生命周期扩展方向。
- 将 Check 生命周期观察与 Scheduler 终态测量、progress presentation 和 Check facts 的 owner 分开。
- 保留现有 execution duration 的事实边界，观察契约不获得执行、结算或输入控制权。

## 背景

- 当前私有 `CheckExecutionLifecycle` 同时承载 invocation-wide `flagControlCompleted` 与逐 Check `started` / `settled`，全局阶段和 Check 事件没有清楚分层。
- 计划中的 project-file input preparation 会在 effective selection 与 Check-owned work 之间增加新阶段；在现有 interface 上继续追加 callback 会进一步混淆生命周期责任。
- 公共 `scheduler.measurementHooks` 只消费 Scheduler drain 后的 sealed measurement，不适合承接逐 Check 观察。
- `260830-report-per-check-duration-without-changing-check-facts` 形成时明确不发布 public lifecycle Hook；本方向修订这一点，但继续保留其中 duration 不是 Check/Record/machine/aggregation fact 的判断。
- 后续设计仍须遵守 `260909-select-admission-optimization-by-effective-opportunity` 的 effective-graph 约束，不能为了整理生命周期把 strategy preparation 固定回完整静态图。

## 决策

- 采用: 建立独立于 `scheduler.measurementHooks` 的 public Check-centric lifecycle observation 方向。它只观察 Product 已接受的 Check 生命周期事件；selection、project inputs、Scheduler legality、Check outcome 和 facts 仍由原 owner 决定。
- 采用: invocation-wide preparation/barrier、逐 Check transition、progress projection 与 Scheduler terminal measurement 分属明确 owner；后续 Change 先恢复这些边界，再决定公共 observation 从哪个稳定 transition 投影。
- 采用: public API 的放置与命名、事件集合与时点、payload、同步/异步交付、failure containment、output readback 以及精确 phase ordering，全部留在 Draft Change 中审阅并在进入 Plan 前收敛；本 Decision 不提前固定这些实现契约。
- 采用: 既有 monotonic execution `durationMs` 继续只是 invocation execution summary，不成为 Check outcome、Record、aggregation 或 machine fact；是否投影给 lifecycle observation 由 Change 结合事件语义决定，仍不发布 per-Check wall-clock chronology 或跨 Run telemetry stream。
- 不采用: 把 Check 事件并入 Scheduler measurement context、建立通用 invocation event bus、让 observation 返回 Check result 或调度决定、事件 replay/持久队列、公开 effective selection，或在本次纯计划工作中实施 runtime/API 改动。
