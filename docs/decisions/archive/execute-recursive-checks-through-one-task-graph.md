---
title: 通过单一 Task graph 执行递归 Check
status: archived
alignment: unaligned
createdAt: 2026-08-15T15:31:30Z
purpose: 让每个递归 Check node 在既有单一静态 Task graph 中独立执行、提交事实和结算，而 containment 不增添调度协议。
background: 父、子都是正常 Check 后可复用既有 direct/TaskPlan scope；containment 不改变 admission 或 settlement 协议。
decision: recursive Check 复用现有 scope 与 graph；只有显式 fields 影响 admission，不新增 containment-specific 调度协议。
tags:
  - product-contract
relations:
  - type: 修订
    target: execute-check-scopes-through-one-task-graph.md
---

## 目的

- 让任意顶层、父级、中间级或叶级 Check 都通过同一个已验证、冻结的 Task graph 执行，并独立形成 Core Check 与 QualityRecords。
- 保持 generic Task engine 对 Check identity、outcome、Record ownership 和 recursive containment 都透明，避免为 tree composition 创建第二种 scheduler protocol。

## 背景

- 现有 direct Check 与 TaskPlan Check 已经以 Check scope 形式进入同一静态 graph，Task settlement 是 execution accounting 的唯一来源。
- recursive containment 的价值是选择、共享可继承配置和结构化 authoring；它不要求父、子 Check 之间出现默认先后、等待或结果归约。
- 现有 `dependsOn`、`mutex`、scoped `maxParallel` 和 cancellation 已定义实际 admission 与 settlement 边界；containment 不需要平行的 scheduling 或 closing mechanism。

## 决策

- 采用: invocation 继续预先构造、验证并执行一张静态 Task graph。每个 canonical Resolved Check node 恰好注册一个 Core Check；applicable node 复用现有 direct 或 TaskPlan scope，not-applicable node 复用既有可信非执行关闭路径。
- 采用: direct 与 TaskPlan 继续是单个 Check 的 private execution layouts。direct Check 使用其现有 executable Task；TaskPlan 使用 leaves 与现有 trusted completion Task；普通 TaskPlan child Task 不成为 Core Check。
- 采用: 每个 Check 通过同一 trusted private construction/binding handoff 形成 Normalized Check 和 Resolved Check；direct/TaskPlan layout 从该共同 handoff 得到，不按 Check 来源、`kind` 或 `checkId` lookup 分支。
- 采用: recursive containment 不投影 implicit Task dependency、order、wait 或 aggregate terminal。parent 和 child 的 actual admission 只受既有显式 `dependsOn`、`mutex`、effective `maxParallel`、root capacity 与 invocation cancellation 影响。
- 采用: 显式 Check `dependsOn` 继续通过现有 Check terminal projection 表达 availability prerequisite；`mutex` 继续只表达资源互斥。TaskPlan completion 保持现有 local success dependency contract；recursive composition 不改写 generic relation、readiness、cancellation taxonomy 或 Task settlement kinds。
- 采用: 每个 scope 保持自己的 RecordSink 和 single-use settlement capability。父、子 outcome 互不聚合，Records 不跨 scope 复制；direct wrapper、TaskPlan completion 和既有 cancellation finalizer 保持当前可信 closure ownership。
- 采用: Core snapshot 与 machine contract 继续只表达独立 Checks、Records 和既有运行 metadata；不发布 hierarchy、parent aggregate、containment-derived order 或 Task identity。
- 不采用: 由 containment 导出的调度或 terminal entity、execution-time graph expansion、来源专属 scheduler，或对 generic Task engine 的额外重写。
