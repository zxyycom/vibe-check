---
title: 在 Task scope 中承载递归 Check 并行上限
status: archived
alignment: unaligned
createdAt: 2026-08-15T15:31:20Z
purpose: 让每个递归 Check 的 maxParallel 沿用现有 Task scope 进入唯一 scheduler，而不让 containment 改变 scope 或 cap 机制。
background: recursive Check 让每个 parent 和 child 都可执行，现有 Task scope 已覆盖这一情形。
decision: 每个 applicable Check 以现有 Task scope 承载 inherited maxParallel；递归 containment 不改变 scope 或 cap。
tags:
  - configuration
relations:
  - type: 修订
    target: carry-check-parallel-limit-in-task-scope.md
---

## 目的

- 让顶层、父级、中间级和叶级 Check 在同一 Task engine 中以相同方式收紧 invocation-wide Product Task slots。
- 保持 scoped cap 的 ownership、active-span、reservation/drain 与 non-preemption 语义，不把 recursive containment 变成新的调度层。

## 背景

- 每个 recursive node 都是一个独立的 applicable Check，因此可以直接复用现有每 Check Task scope，而不需要 parent scope 包含 child tasks。
- `maxParallel` 是 scalar scheduling field；它与可集合化的 dependency/resource fields 有不同的 nearest-explicit 继承规则。
- containment 本身不产生 Task edge 或 wait，因而不需要为父子 composition 新增调度协议。

## 决策

- 采用: 每个 Check 的 `maxParallel` 继续取最近 ancestor 或自身的明确值；整条 path 缺失时使用 root scheduler limit。值必须是大于零、不超过 root limit 的安全整数，并在任何 work 前 fail closed。
- 采用: 每个 applicable Resolved Check 将自己的 effective cap 投影到一个现有 planned Task scope。direct Check 以现有 direct Task 为 activation 与 terminal；TaskPlan Check 以其 leaves 为 activation、以现有 completion Task 为 terminal；没有 executable work 的 Check 不激活 cap。
- 采用: scope 只包含该 Check 自己的 Tasks，parent 不拥有 descendant Tasks，任何 Task 也不属于多个 Check scopes。containment 不扩大 active span，也不创建 closure terminal 或其它额外 Task。
- 采用: effective capacity 继续为 root limit 与全部 active Check scopes cap 的最小值；deterministic reservation/drain、non-preemption 与既有 constrained continuation priority 保持不变。
- 采用: scoped cap 只约束同一 Product Task engine 管理的 slots，不宣称限制 subprocess、worker、thread 或项目函数内部未声明的并发。
- 不采用: 额外 scheduler、queue 或 scope mapping、Task 的多 scope 归属、containment-specific terminal Task，或用 mutex/boolean parallel 模拟 cap。
