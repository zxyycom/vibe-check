---
title: 在 Task scope 中承载 Check 并行上限
status: active
alignment: aligned
createdAt: 2026-08-15T03:47:07Z
purpose: 让 Check maxParallel 由同一 Task graph 的 scope metadata 进入唯一 scheduler，而不依赖按 ID 重组的 side map。
background: scoped cap 行为已成立，但 keyed task-to-Check metadata 与 canonical Task scope 目标重复表达 ownership。
decision: 保留 active-span 最小 cap 与 reservation/drain，并由 planned Task scope 直接拥有 validated cap metadata。
relations:
  - type: 修订
    target: configuration/use-check-scoped-invocation-wide-parallel-limits.md
---

## 目的
- 让单个 Check 在自己的执行 span 内收紧整次 invocation 的 Product Task slots，同时保持 dependency、mutex、admission 和 settlement 由唯一 Task engine 协作。
- 让 cap ownership 成为 canonical Check Task scope 的结构化属性，不再通过第二个 keyed map 重建。

## 背景
- Check tree 已允许 group/leaf 声明并继承 `maxParallel`；shared scheduler 已实现 active cap、non-preemptive reservation/drain 和 deterministic admission。
- 旧 handoff 将 cap metadata 放在独立 task-to-Check map，因为当时 TaskDefinition 不拥有 Check scope；目标 Task graph 已直接表达该 scope 和 terminal relation。
- 保留 side map 会让 `checkId`、task identity、cap owner 与 terminal span 在 graph 之外再次关联，削弱单一 planning truth source。

## 决策
- 采用: Check tree 的 group/leaf `maxParallel` 继续按最近声明继承，child scalar 覆写 parent；全部缺席时使用 top-level scheduler limit。值必须为不大于 root limit 的正安全整数，并在任何 work 前 fail closed。
- 采用: canonical Resolved Check 将 effective cap 投影到 planned Task graph 的 Check scope metadata。Task engine 从同一 graph 读取 scope、首个 executable Task、terminal Task 与 cap，不接收 keyed task-to-Check side map。
- 采用: Check active span 从首个 executable Task admitted 开始，到 terminal Task settled 结束；direct root 同时是首个和 terminal，TaskPlan completion 是 terminal，没有 executable work 的 Check 不激活 cap。
- 采用: 有效 capacity 为 root limit 与所有 active Check caps 的最小值。收紧候选使用 deterministic non-preemptive reservation/drain；已运行 Task 不抢占，达到 prospective capacity 后立即 admission。
- 采用: 多个 reservation 按更低 target cap、再按稳定 Check/Task identity 排序；reservation 优先于较宽 scope continuation，没有更低 reservation 时最小-cap active scope 的 continuation 优先。
- 采用: 该限制只约束同一 Product Task engine 管理的 slots，不宣称限制 subprocess、worker、thread 或项目函数内部未声明的并发。
- 不采用: per-Check scheduler、第二 queue、keyed cap side map、用 mutex 或 boolean parallel 模拟 cap，或让 Check cap 提升 root capacity。
