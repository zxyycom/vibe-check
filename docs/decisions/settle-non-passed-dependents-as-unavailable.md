---
title: 将未通过前置的 dependent 结算为 unavailable
status: active
alignment: aligned
createdAt: 2026-09-01T10:43:22Z
purpose: 让未满足成功前置的 Check 不执行作者工作，并形成完整、可追溯的 Product outcome。
background: 现有 blocked 只传播 executor failure，Product finalizer 将 blocked Check 视为 invariant failure。
decision: 未满足 dependsOn 时，Product 将 private blocked 单次映射为 dependency-not-passed unavailable。
tags:
  - product-contract
relations:
  - type: 修订
    target: cancel-task-admission-and-drain-started-work.md
---

## 目的

- 让任何 direct `dependsOn` 未通过时，dependent 的 preflight 和 execution 都不启动，且 downstream、progress、aggregation 与 output 仍能读取完整 Check fact。
- 保持 invocation cancellation 与 prerequisite blocking 是不同的 scheduler 原因，不以 abort 或领域 status string 混淆两者。

## 背景

- 四态 Check outcome 中的 `failed`、`unavailable` 与 `not-applicable` 都是已形成的上游事实，但不能满足成功 prerequisite。
- generic Task layer 不应读取 Check data、reason 或 status string；Product finalizer 才拥有 public Check outcome 和 diagnostics 的语义。

## 决策

- 采用: Task Scheduler 对每条 `dependsOn` 只读取 Product 提供的 prerequisite-satisfied signal；任一 direct prerequisite 非 passed 时以 private `blocked` settlement 阻断 descendant admission，observer relation 不受该状态过滤。
- 采用: Product 对 blocked dependent 单次结算 `unavailable`，reason code 为 `dependency-not-passed`，`checkIds` 只含稳定排序的 direct non-passed prerequisites，duration 为 `null`，且不伪造 author message、Record、preflight 或 execution。
- 采用: 该 outcome 像其它 terminal Check fact 一样闭合 Core scope、progress、snapshot、aggregation、machine publication、diagnostic timeline 与允许的 direct readback；它不改写已经形成的 upstream facts。
- 保留: `AbortSignal` 在 admission commit 前停止新 work、已 admitted Tasks 协作 drain、已启动工作按普通 settlement 闭合；未 admitted cancellation 继续使用 `cancelled-before-start`，不复用 dependency `blocked`。
- 不采用: 第五种 public Check status、把 Task engine 变成 Check data/reason interpreter、通过 AbortSignal 表达 prerequisite failure、执行 consumer callback 来补造 blocked outcome，或让 blocked 覆盖已形成的 settlement。
