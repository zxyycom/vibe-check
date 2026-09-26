---
title: 以本机手动硬阈值约束标准 Project Gate
id: 260923-enforce-manual-local-project-gate-time-budget
status: archived
alignment: aligned
createdAt: 2026-09-23T10:39:50Z
purpose: 让标准 Gate 耗时退化成为显式失败且不自动改写预算
background: 原 advisory observer 与仅消息贡献无法阻断已超过用户预算的 Gate
decision: 以本机只读基线和单一受限 resultContributor 阻断标准 workload 的超时、缺失或不可比较状态
tags:
  - configuration
  - performance
  - workflow-policy
relations:
  - type: 归并
    target: 260829-monitor-project-gate-performance-advisory
    summary: 由 advisory 比较改为本机硬门槛
  - type: 归并
    target: 260830-refine-project-gate-context-timing-phases
    summary: 保留三段连续 timing 解释并改为硬门槛
  - type: 归并
    target: 260914-narrow-project-gate-to-result-contribution
    summary: 保持单一贡献者并加入仅降级权限
---

## 目的

- 让 `bun run check` 的总墙钟耗时成为调用者可见的失败条件，而不是只在日志里显示 advisory warning。
- 保持预算由本机维护者明确设定；慢运行、Definition 变更和工具升级都不能自动抬高阈值或默默失配放行。
- 保留单一 Gate 结果、exact candidate 绑定和 Product Check/aggregate 的事实边界。

## 背景

- 前序 advisory 和 timing phase 决策只比较历史标准 workload 并发 warning；用户观察到 35.5 秒的默认 Gate 时，原逻辑因没有匹配的 baseline 而不能阻断。三段 phase 仍提供解释，但不单独形成阈值。
- 前序 result-contributor 决策只允许追加消息；硬预算需要对初步 passed 作受限降级，不需要授予改写 Product 结果的权限。
- required 现在按变化增量选择；`--all` 仍为完整验收，二者不能共享一个时间阈值。形成本决策时，用户为本机默认 required 明确选择 20 秒；15 秒可作为后续优化目标，而非自动生效的阈值。

## 决策

- 采用: 本机被 Git 忽略的 `.cache/vibe-check/project-gate/performance-baseline.json` 存放只读 JSON 基线，按 required / all、platform、architecture、Bun version 与 64 个小写十六进制字符的 declarative fingerprint 精确匹配。每条记录只含显式正整数 `maxElapsedMs`；Gate 不创建、学习、修订或放宽记录。
- 采用: required 与 `--all` 在 candidate preparation 前必须有合法文件和当前 profile/runtime 记录；缺失、无效或不可读即失败。初步 passed 后必须有 exact fingerprint 且 timing/Run facts 完整；无匹配或从 Gate 启动到初步结果的 `elapsed-to-initial-result` 超过阈值，同样失败。focused preset 不适用总时间预算。
- 采用: 形成本决策时，本机 required 由用户明确记录 `20000` ms；该值不成为其它工作区的默认阈值，各工作区从本机文件读取人工选择。`--all` 需独立决定并记录阈值，缺少本机记录时 fail closed。fingerprint 变动时只可由维护者在核对 workload 后手动更新；将来改变阈值也须重新作出人工决定，不能把动态测量当作预算。
- 采用: context 仍提供 Gate started、initial-result timestamp、总 elapsed，以及 candidate preparation、adapter/setup、Product Run 三段连续 phase；总值唯一决定超时与否，phase 只解释耗时，不包括 contributor 自身时间。
- 采用: `definition.ts` 仍配置唯一 `resultContributor`；它返回闭合的 `{blocks,messages}`，adapter 验证后只允许初步 passed 降为 failed，不提升失败，不改写 Check facts、RunResult、Product aggregate、candidate 或 context。贡献者 throw/reject/非法输出仍映射为 unavailable；最终状态唯一映射 process exit。
- 不采用: checked-in 跨主机统一计时预算、自动更新基线、失配时跳过比较、将 Check duration 相加为墙钟耗时、解析 scheduler 诊断作预算输入、额外 Product lifecycle API 或第二个结果贡献者。
