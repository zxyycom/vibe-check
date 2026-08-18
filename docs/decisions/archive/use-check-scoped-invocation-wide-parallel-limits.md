---
title: 使用 Check scoped invocation-wide 并行上限
status: archived
alignment: aligned
createdAt: 2026-08-14T13:50:48Z
purpose: 让单个 Check 能在自己的执行 span 内安全收紧整次 invocation 的 task 并行上限。
background: root scheduler 只有固定上限，无法表达一个 Check 执行期间要求更低全局容量，同时不能以第二 scheduler 破坏已有依赖和 mutex 协调。
decision: Check 可声明 maxParallel；同一 scheduler 在 active span 内取最小 cap，并用非抢占 reservation/drain 收紧。
tags:
  - configuration
relations: []
---

## 目的

- 让需要低并发资源预算的 Check 在执行时收紧整次 invocation 的 Product task slots，而不要求项目把其它 Checks 改为串行或重复实现调度器。
- 保持 Task dependency、named mutex、TaskPlan completion、Check availability 与现有 shared scheduler 由各自唯一 owner 继续管理。

## 背景

- top-level scheduler 的 `maxParallel` 是 invocation 的默认上限，但有些 Check 只在自身实际执行期间需要更低的全局容量。
- 一个 Check 可以贡献 direct work 或多个 TaskPlan leaves 及 completion；局部限制每个 leaf 不能保证其它 Check 不会同时占用 slots。
- 已启动 task 不能安全地由调度策略抢占或取消。若低上限 Check 只等待普通 slot 而 scheduler 继续填充其它 ready work，它缺少可解释的启动保证。

## 决策

- 采用: Check tree 的 group 与 leaf 都可以声明 `maxParallel`。未声明的 node 继承最近父 group 的 effective value；只有整条 path 都未声明时才使用 top-level `SchedulerPolicy.maxParallel`。child scalar 覆写 parent；`1` 表示该 resolved Check active span 内整个 invocation 的 Product task slots 串行。每个声明值必须是正安全整数且不得大于 top-level 上限；无效值在任何 Check work 前 fail fast，而非静默 clamp。
- 采用: Check 的 span 从其第一个 executable Product task 被 scheduler admitted 时开始，到该 Check terminal task settle 时结束。direct Check 的唯一 task 同时是首个与 terminal task；TaskPlan Check 从首个 executable leaf 开始，直到 completion settle。没有 executable work 的 Check 不激活 cap。已激活 TaskPlan Check 的 span 包含其 leaves 与 completion。
- 采用: shared scheduler 在任意时刻以 top-level 上限与所有 active Check `maxParallel` 的最小值作为有效 task capacity。新 Check 的首个 task 只有在 prospective active count 不会超过其加入后的最小上限时才能 admitted；已运行 task 不被抢占。
- 采用: 若 ready 的未 active Check 会把 capacity 收紧到当前无法容纳其首 task，scheduler 在同一 invocation 内建立一个 deterministic reservation，并停止 admission 让既有 task drain；达到 prospective capacity 后立即 admission。多个候选按更低 target cap、再按稳定 `(checkId, orchestrationTaskId)` 选择。该 reservation 优先于较宽 active Check 的 continuation；没有更低 reservation 时，当前最小-cap active Check 的 ready continuation 优先获得 capacity，避免其 leaf/completion 在间隙中饥饿。
- 采用: 限制只作用于 Product shared scheduler 管理的 task slots，包括 direct work、TaskPlan leaves 与 completion。它不承诺限制 Check 自身 adapter、subprocess、worker、thread 或 custom runner 内部另外创建的并发。
- 采用: 依赖 readiness、named mutex、pending queue、active count、reservation、task admission 与 settlement 都由同一个 shared scheduler 协作完成；Project Definition normalization 与 Check orchestration 只通过独立 private map 提供已验证的 task-to-Check cap metadata，不把 cap 写入 Core catalog、CheckDefinition 或 TaskDefinition。不得建立 per-Check scheduler、第二队列、worker protocol 或以 mutex 伪造全局并发上限。
- 不采用: 在 planning 时让所有 selected Check 的最低值永久压低整个 invocation、以 `parallel: false` boolean 表达该能力、允许 Check cap 提升 root capacity，或把 adapter 内部并发宣称为 Product scheduler 已控制的 slots。
