---
title: 在 Check Task 运行期间应用并行上限
status: active
alignment: unaligned
createdAt: 2026-08-17T15:28:17Z
purpose: 让每个 executable Check 的 maxParallel 在其 Task admission 和运行期间约束 Product 总并发。
background: 一个 execution 只形成一个 Task；maxParallel 限制该 Task 活跃时的 Product 总并发，而非 descendant group size。
decision: 每个 Check Task 携带 inherited maxParallel；admission 加入自身后不得超限，运行期间该上限持续限制后续 Task。
tags:
  - configuration
relations:
  - type: 修订
    target: carry-recursive-check-parallel-limits-through-task-scopes.md
---

## 目的

- 让 `maxParallel` 对每个展开后的 executable Check 保持直接、可解释且可由唯一 Task scheduler 执行的语义。
- 让 information-only node 可以向 descendants 继承并行约束，而不创建 descendant ownership 或额外 execution scope。

## 背景

- 当前目标中每项 Check `execution` 只形成一个 Task，没有 per-Check leaf Tasks 或 completion span。
- 调用者对 `maxParallel: 2` 的预期是：当前 Task 加上已经运行的 Product Tasks 最多为两个，并且当前 Task 活跃期间总并发不能被后续 admission 抬高。
- `maxParallel` 是 nearest-explicit scalar field，与 set-like `dependsOn` / `mutex` 和 recursive containment 的含义不同。

## 决策

- 采用: 每个 execution-bearing Check 使用自身或最近 ancestor 明确声明的 effective `maxParallel`；整条 path 缺失时使用 invocation root limit。information-only node 只把该值传给 descendants。
- 采用: 每个 executable Check 投影一个只包含自身 Task 的 scope；该 Task 同时是 activation 与 terminal。
- 采用: scheduler 只有在当前 running Product Task count 加入候选 Task 后不超过候选 effective limit、root limit 和全部 active Task limits 时才可 admit 它。
- 采用: Check Task 从 admission 到 settlement 期间，其 effective limit 持续参与 invocation effective capacity；后续 Task 不能让总 running count 超过全部 active limits 的最小值。
- 采用: `maxParallel` 不表示 parent 拥有 descendants 的共享 pool，也不从 containment 创建 nested scope。每个 descendant 只在自己执行时激活继承后的 limit。
- 不采用: per-subtree Task ownership、一个 Task 属于多个 nested scopes、只在 admission 瞬间检查后允许后续超限，或用 mutex 模拟数值 cap。
