---
title: 将 executable Check 直接投影到已验证 Task graph
status: archived
alignment: aligned
createdAt: 2026-08-17T15:47:47Z
purpose: 让 Check 只声明 Task 输入，由唯一静态 Task graph 负责依赖、互斥、并发和关系合法性。
background: Information-only Check 不形成 Task；在 Check traversal 中展开依赖目标会复制并扭曲 generic Task graph 的责任。
decision: 每个 executable Check 投影一个 Task 并透传调度字段；Task graph 在执行前统一拒绝缺失依赖、环和其它非法结构。
tags:
  - product-contract
relations:
  - type: 修订
    target: execute-recursive-checks-through-one-task-graph.md
---

## 目的

- 让 Check authoring 只声明 Task 所需的稳定输入，不在 Check normalization 中实现第二套 dependency graph 语义。
- 让所有 Product Tasks 继续由唯一静态 Task graph owner 统一验证和执行。
- 保持 recursive `checks` 只负责 composition 与 inheritable configuration，不成为 dependency alias 或调度实体。

## 背景

- 每个带 `execution` 的 Check 只形成一个独立 Task；没有 `execution` 的 information-only Check 不形成 Task。
- `checkId`、effective `dependsOn`、`mutex` 与 `maxParallel` 已足以投影 executable Task identity 和调度约束。
- generic Task graph 已在任何 work 前验证 Task identity、unknown dependency、dependency cycle、scope membership 与 parallel limits；在 Check 层展开 group descendants 会重复这些责任，并让同一个 `dependsOn` 值因目标 Check shape 改变含义。

## 决策

- 采用: invocation 先递归展开 Definition；每个 execution-bearing Check 恰好投影一个独立 Task、Check outcome 与 RecordSink，information-only Check 不投影 Task 或伪造 terminal。
- 采用: Task `id` 来自 executable Check 的 `checkId`；effective `dependsOn`、`mutex` 与 `maxParallel` 作为 Task graph 输入直接投影，不在 Check normalization 中按 information node、containment 或 descendants 改写关系。
- 采用: recursive containment 不产生 Task edge、order、wait、completion、aggregate 或 dependency alias。
- 采用: 完整静态 Task graph 在任何 Task work 前统一验证；duplicate Task id、引用不存在 Task 的 dependency、dependency cycle、非法 scope/cap 等结构使 graph planning 失败且不执行合法子集。
- 采用: `dependsOn` strings 只在投影后的 Task collection 中解析。information-only/空 Check 不贡献 target，也不展开为 descendants；若没有同名 executable Task，该 string 按 unknown Task dependency 拒绝。
- 采用: 当前 public execution contract 每个 Check 只有一个 callback；不建立 per-Check TaskPlan、leaf Tasks、completion protocol 或 execution-time graph expansion。
- 不采用: Check-specific dependency resolver、group-to-descendants dependency expansion、containment scheduler，或等到部分 Task 已运行后才检查静态图错误。
