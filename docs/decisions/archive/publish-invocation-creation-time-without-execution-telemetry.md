---
title: 发布 invocation 创建时间而非执行遥测
status: archived
alignment: aligned
createdAt: 2026-08-30T04:14:36Z
purpose: 让 machine invocation timestamp 可靠表示一次 Run 创建时刻，同时不把执行起止遥测加入 Check 或 Record contract。
background: 前序排除 wall-clock start/end；现在既有 invocation timestamp 已明确为 Run creation instant，需演进边界。
decision: 发布 invocation creation timestamp；继续排除 per-Check start/end、Record report time 与独立 telemetry。
tags:
  - product-contract
  - product-priority
relations:
  - type: 修订
    target: complete-project-gate-before-public-package-release.md
---

## 目的

- 让首次公开 npm 产品仍以完整 Project Gate 的真实消费者证据为先，而不把 quality dogfood 当成完成条件。
- 让 machine `invocation.timestamp` 有单一、可复现的语义：Run invocation 创建时捕获的 UTC instant。
- 保持 execution timing 的最小边界：不将 per-Check wall-clock start/end、record-report time 或独立 telemetry 加入 Core、Check outcome、Record 或 machine contract。

## 背景

- 前序 `complete-project-gate-before-public-package-release.md` 正确地把 first-release 的 per-Check `durationMs` 限为 progress/summary signal，并排除未经消费需求支持的 wall-clock timing；但其“首轮不输出 startedAt / endedAt”的文字会与当前 machine v4 的 `invocation.timestamp` 被明确为 Run creation instant 发生冲突。
- 现有 Product 在创建 invocation 时只捕获一次 wall-clock instant：它既用于 diagnostic log filename，也投影为 `run.json` 的 `invocation.timestamp`。该 timestamp 不是 publication completion time、per-Check start/end、Record report time 或 performance telemetry stream。
- Project Gate phase elapsed 是 Gate-private afterGate context 的 monotonic elapsed observation；它不改变 machine v4 invocation timestamp 的含义，也不成为 public Product lifecycle API。
- 本记录保留前序的 release order、candidate/Gate consumer、partial execution、duration、registry authorization 与非授权 publish 边界，只修订 timestamp 的精确表述。

## 决策

- 采用: 在当前 v4 machine `run.json` 中保留 `invocation.timestamp`，并将其定义为 Run invocation 创建时一次捕获的 UTC instant；它不是 machine publication 完成时刻。
- 采用: Product 继续对每个实际执行 Check 以 monotonic `durationMs` 提供 progress 与 final RunResult summary；duration 不是 Check terminal status、aggregation input 或 Record 固有字段。
- 采用: 不发布 per-Check wall-clock `startedAt` / `endedAt`、Record report time、独立 execution telemetry，且不为仅呈现目的修改 `CheckOutcome`、minimal Record、Core identity 或 machine schema。
- 采用: 在公开发布前继续要求完整 Gate 的 candidate/tarball acceptance、fresh registry checks 与明确外部写入授权；本 Decision 不授予 registry 查询、credential 使用或 `npm publish` 授权。
- 不采用: 将 invocation creation timestamp 误作 publication time、用它推导 Check/Record chronology、或借此建立跨 invocation telemetry、performance budget 或 lifecycle Hook API。
