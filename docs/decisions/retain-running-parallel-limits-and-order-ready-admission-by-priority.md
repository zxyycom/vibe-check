---
title: 保留运行期并行上限并按优先级选择 ready Task
status: active
alignment: aligned
createdAt: 2026-09-01T04:56:52Z
purpose: 在每个 Check Task 的运行期容量上限不变时，让作者能以静态优先级安排同一既有准入层级中的 ready Task。
background: 容量收紧 reservation 保证局部上限可达，而 Definition 顺序不能可靠表达 ready Task 的启动偏好。
decision: maxParallel 继续限制 admission 与运行期总并发；静态 priority 只在现有准入层级内打破 ready Task 的选择顺序，且不得抢占 reservation 或容量规则。
tags:
  - configuration
relations:
  - type: 修订
    target: apply-check-parallel-limit-while-task-runs.md
---

## 目的

- 保留每个 executable Check 的 `maxParallel` 从 admission 到 settlement 持续约束 Product 总并发的明确语义。
- 让项目作者可在不调整 Check tree 阅读和声明顺序的情况下，表达已 ready Task 的相对启动偏好。
- 维持唯一 Task scheduler 的确定性、容量正确性、有限进展与非抢占边界。

## 背景

- 每项 execution-bearing Check 只形成一个 Task；`maxParallel` 是 nearest-explicit scalar，限制该 Task 活跃时的 Product 总并发，而不是 descendant group size 或共享 pool。
- 当即将启动的 Task 会收紧有效容量时，scheduler 必须能够等待已运行 Task 排空；这个 reservation 解决合法 admission 与进展，不代表业务偏好。
- Definition 的稳定顺序同时服务于阅读、规范化与 fingerprint。用手工重排表达启动偏好会把这些职责与实际关键路径耦合。

## 决策

- 采用: 每个 execution-bearing Check 继续使用自身或最近 ancestor 明确声明的 effective `maxParallel`；整条 path 缺失时使用 invocation root limit。information-only node 只向 descendants 传递该值。
- 采用: 每个 executable Check 继续投影一个仅含自身 Task 的 scope；admission 必须同时满足 root limit、候选 effective limit 与全部 active Task limits，且该限制持续到 Task settlement。
- 采用: `maxParallel` 不表示 parent 拥有 descendants 的共享 pool，也不从 containment 创建 nested Task ownership；不得用 mutex 模拟数值 cap。
- 采用: Check 可声明 signed safe-integer `admissionPriority`。省略时规范化为 `0`；容器的显式值按 nearest-explicit scalar inheritance 传给后代，子节点显式值完整覆盖。
- 采用: priority 是 immutable normalized Task metadata，只在 dependency/mutex eligible Task 的既有选择层级内排序。层级顺序保持为有效 reservation、tightening scope、constrained continuation、ordinary ready；priority 不绕过 dependency、mutex、scope、root capacity 或 `canAdmit`。
- 采用: 多个 tightening 或 constrained Task 先按更严格的 effective scope cap，再按 priority 降序，最后按既有 scope ID 与 Task ID 顺序；ordinary ready Task 按 priority 降序后保留 pending 的稳定顺序。所有 effective priority 均为 `0` 时 trace 保持当前兼容顺序。
- 采用: 一个 tightening Task 已建立 reservation 后，reservation 保持至该 Task 被 admission、取消或不再 eligible；后来出现的高 priority Task 不得 steal、重排或抢占 reservation。scheduler 不维护 age、历史耗时、动态 priority、第二 pending 集合或 priority queue。
- 采用: admit diagnostic 记录被选择 Task 的 effective priority，供人读 scheduler evidence 解释该选择；priority 不进入 Check/Record facts、machine publication、最终结果或 progress 的排序协议。
- 不采用: 基于历史或当前 duration 的自动调权、aging、deadline、preemption、priority inheritance、per-subtree Task ownership、仅在 admission 瞬间检查 cap 后允许超限，或用 priority 代替 reservation/capacity 规则。
