---
title: 用本地 Check Task 时长历史估计准入关键路径
status: active
alignment: aligned
createdAt: 2026-09-02T08:13:42Z
purpose: 让显式启用的调度策略从本地真实 Task 时长形成关键路径估计，同时不改变执行正确性或承诺固定算法。
background: 静态 priority 需要人工维护且不能表达完整下游路径，而 Scheduler 已能在不接管跨运行状态的前提下消费不可变预测。
decision: 交付显式本地 learned-critical-path 能力，保持 static 默认、现有 priority 同分语义和可演进的公开模型说明。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations: []
---

## 目的

- 让 package consumer 通过一次项目级设置，使用实际 admitted-to-settled Check Task 时长改善长关键路径过晚启动造成的尾部，而不逐项手工估时。
- 让跨 Run 可变历史由 Scheduler 外的单一 owner 管理，并让 Scheduler 继续只执行无状态策略结果和硬合法性检查。
- 公开说明当前学习与调度模型，支持消费者理解和诊断，同时保留后续优化统计与算法的空间。

## 背景

- 静态 `admissionPriority` 可以调整 ready Task 顺序，但要求项目作者持续测量和维护数值；单项长 Task 也不必然属于最长 downstream path。
- 当前 Scheduler terminal raw measurement 能在 timing available 时提供每个已 admitted Task 的 admission 与 settlement monotonic timestamp；该区间覆盖 task-local preflight、execution 与 Product settlement，是实际槽位占用事实。公开 `RunResult.checkDurations` 不包含完整 Task active lifecycle，不能替代该样本。
- `use-stateless-admission-policies-with-hard-scheduler-guards.md` 已确定跨 Run 历史位于 Scheduler 外，并以 invocation-local immutable prediction snapshot 进入纯 policy；本决策为该通用边界选择首个 Product-defined learned policy，不演进或替代原边界。
- 本仓 Project Gate 是该能力的验证与可选采用者，但通用 package 能力和本仓采用是两个结果：Gate 只有在重复同工作负载 A/B 证据不退化时才启用。
- 时长随硬件、toolchain、cache 与外部输入变化；本地滚动历史是启发式优化状态，不是跨环境 workload identity 或执行时间保证。

## 决策

- 采用: 在 closed Definition Scheduler policy union 中增加 `learned-critical-path`。省略 policy 与显式 `static` 保持 canonical 等价且不产生 history I/O；learned 必须显式提供 caller-managed `stateDirectory`，不存在隐藏的 HOME、repository 或用户级默认写入。
- 采用: `stateDirectory` 是类似 cache、可整体删除的受信本地状态空间，首版只服务同一项目在相近运行环境中的重复执行；不承诺跨机器、remote、distributed 或共享 CI history，也不提供 secret storage、tamper resistance 或跨进程合并保证。
- 采用: 第一版不增加 `expectedDurationMs` 或其它 per-Check 手工估时与 learned override。全部 executable Check 从各自历史、project prior 或共同 cold-start 值形成 estimate；真实例外消费者出现后再独立评审公共 override。
- 采用: Product-private history owner 从有效 terminal raw measurement 保存有界 admitted-to-settled duration，并在下一 Run admission 前形成 versioned immutable prediction snapshot。Scheduler 不读写文件、不更新统计，也不解释 model state。
- 采用: learned policy 在既有 relation/mutex candidate、capacity facts 与 selection layer 内先比较 estimated downstream critical-path score。仅在 score 相同时比较 owning Task 的现有 effective `admissionPriority`，随后使用 canonical tie-break；学习模型不修改、吸收或重新解释 priority 的 authoring、继承或 Task metadata 语义。
- 采用: 公共文档直接说明当前样本窗口、统计、prior 和 score 算法，以便消费者理解当前行为与诊断；这些模型细节不构成跨 model version 的兼容承诺，也不保证跨版本、环境或 Run 产生相同 admission 顺序或性能结果。稳定契约是显式启用、状态边界、硬调度正确性与故障隔离。
- 采用: history envelope 使用内部 model version；missing 或不兼容版本正常 cold start，malformed、read/write failure、clock anomaly 与并发 last-writer 样本丢失只降低优化质量。它们不改变 Task membership、Check/Record facts、aggregation、machine publication 或 Run result kind；第一版仅以有界 diagnostic 解释，不新增 public history-health DTO。
- 采用: learned policy 是通用 package 能力；本仓 Project Gate 仅在 exact candidate、相同 Task membership 与 terminal outcomes 的重复交错 A/B 中，required/full 均不退化且至少一个 profile 改善时采用，否则 Gate 保持 static 而不否定 Product 能力。
- 不采用: 隐式 learned 默认、逐项手工 duration 配置、history 进入 Scheduler mutable state、用 learned score 绕过 dependency/mutex/capacity/cancellation、priority hard override、稳定算法或精确顺序承诺、remote/shared history、history failure 质量结算或首版 public telemetry DTO。
