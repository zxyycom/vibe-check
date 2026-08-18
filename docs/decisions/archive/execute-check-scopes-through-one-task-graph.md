---
title: 通过单一 Task graph 执行 Check scope
status: archived
alignment: aligned
createdAt: 2026-08-15T03:46:59Z
purpose: 让 direct Check 与 TaskPlan Check 由同一静态 Task engine 执行，并通过 scoped capability 提交 Core facts。
background: 该决策形成时，shared scheduler 已能结算静态 Task，另设 work-handle acknowledgement 和 CheckManager 会重复记录同一执行完整性。
decision: Check 是静态 Task graph 的 execution scope；Task settlement 是唯一执行记账，scope 内 Task 只通过受控 RecordSink 提交记录。
tags:
  - product-contract
relations:
  - type: 归并
    target: use-static-check-task-plans-with-shared-scheduling.md
  - type: 归并
    target: settle-check-execution-before-availability.md
---

## 目的
- 让所有 Product work 共享同一个 dependency、mutex、bounded parallelism、cancellation 与 settlement owner。
- 让任意属于 Check scope 的 Task 能提交 QualityRecord，同时只有受信 adapter 能结算对应 Core Check。

## 背景
- 该决策形成时，direct Check、TaskPlan leaves 与 completion 已经进入 shared scheduler，但 Check orchestration 仍另外维护 CheckManager、work handles、acknowledgement ports 和 terminal lifecycle。
- 当时的 Work-handle acknowledgement 不是 UI progress；它要求执行方预先声明逻辑工作单元并在结束前逐个确认。静态 Task graph 已经拥有 planned work 与 terminal settlement，继续保留两套机制会产生重复完整性状态。
- Project Definition 需要公开 typed TaskPlan authoring，但 scheduler Task identity、retry 和 admission bookkeeping 不应成为 package 或 machine contract。

## 决策
- 采用: 一个 invocation 只构造并执行一个预先验证、冻结的静态 Task graph。direct Check 映射为一个 executable Check root Task；TaskPlan Check 映射为一个 Check graph scope、其 child Tasks 与一个 trusted completion Task。
- 采用: Check scope 是 Task graph 内的 ownership boundary，承载 `checkId`、RecordSink ownership、terminal relation 与已验证调度 metadata；它不形成第二 scheduler、独立 queue 或 public entity。
- 采用: Task engine settlement 是 planned execution 的唯一记账来源。Core、public result 和 machine output 不再保存 `workHandles`、acknowledgement ports、planned/acknowledged work counts 或由它们派生的 completeness lifecycle。UI progress 如需存在，只从 transient Task events 派生。
- 采用: Core 为每个 Check scope 创建绑定 `checkId` 与 Record 类型的 RecordSink。scope 内 Task 可提交 Record candidate，但调用方不能伪造 Check ownership；scope 外、关闭后或非法 Record submission fail closed。
- 采用: 只有受信 direct wrapper 或 TaskPlan completion adapter 持有 single-use Check settle capability。它在返回 prerequisite availability 前关闭 settle port 与 RecordSink、冻结 Check/Record facts并据此返回 availability；late 和 duplicate calls 不得改写事实。
- 采用: TaskPlan authoring types 由 Definition owner 提供 contextual typing；scheduler-private Task、TaskRun、worker、capability 与 retry identity 不导出为 npm API、policy operand 或 machine identity。
- 不采用: execution-time graph expansion、每 Check scheduler、第二 queue、work-handle acknowledgement、以 mutex 模拟 scoped cap，或把每个 child Task 提升为 Core Check。
