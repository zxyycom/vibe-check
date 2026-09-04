---
title: 以无状态 Scheduler context 保持完整 Gate Run 证据
status: active
alignment: aligned
createdAt: 2026-09-01T14:54:27Z
purpose: 让单次高信噪 Gate invocation 保留可独立复核的完整 Scheduler decision evidence，而不记录已删除的 reservation 状态。
background: reservation 已从 Scheduler Core 移除；诊断必须解释本轮无状态 select 或 wait 及其 hard-guard facts，而不能保留退休字段。
decision: 保留单核心诊断边界，修订 Scheduler evidence 为无状态 hard-guard context。
tags:
  - configuration
  - testing
  - workflow-policy
relations:
  - type: 修订
    target: consolidate-project-gate-run-evidence.md
---

## 目的

- 让一次 Gate invocation 的可读日志和 terminal Check facts 形成自包含证据：每个被启动的 Check 都对 Gate 聚合或其必要验证有明确贡献。
- 让维护者可从 test-owned fixture 的 diagnostic evidence 恢复一次 Run 的 resolution 和无状态 Scheduler 决策，而不污染普通 Project Run 日志目录或依赖嵌套 process wrapper。

## 背景

- 在本决策形成时，`repository-quality` 运行已准备 candidate 的 scan-only Project Run，但其 quality findings 不阻断 Gate；外层 Gate 只消费该 process completed 的事实，不能把其内部 Run、Check 或 Record facts转化为 Gate 结论。
- 一次性 diagnostic logging 是 Product core-owned、人工可读且无 parser/schema/公共 observer 的 output；它仍须覆盖 Gate evidence location、preflight resolution、完整 Scheduler context 与 closing 状态投影。
- 无状态 admission policy 每轮从 immutable full graph、当前 relation/mutex candidates、capacity 与 runtime facts重算 `select` 或 `wait`。Core 不再保存或解释 reservation、sticky、fairness 或 starvation 状态；保留 reservation diagnostic field 会把已退休机制误写为当前运行事实。
- 继续保留无消费者的 `bun run quality` 短命令会把已删除的 Gate wrapper 暗示为一个仍受支持的 workflow；是否另行提供观察 workflow 需要独立目标和方案。

## 决策

- 采用: Project Gate 只启动会提供自身 aggregate、required/complete `--all` assurance 或明确 Gate-owned verification 的 Checks；移除不阻断且只贡献 process completion 的 `repository-quality` 外层进程及其 catalog/tag/selection 语义。
- 采用: 暂不保留 `bun run quality` 短命令。后续若要恢复独立 quality observation，必须先确定真实消费者、结果语义、目录 owner 与验证路径，而不是复用已删除的 Gate wrapper。
- 采用: 每个启用的 Product Run 仍只产生一个 core human-readable diagnostic log，且不提供 parser、schema、稳定 event grammar、verbosity 或多文件协议。Gate bound Run 保持其 invocation directory；测试产生的该证据进入 test-owned fixture，而非普通 `.log/project-run`。
- 采用: preflight 的每条结果路径都以一次 resolution 表达，不再为同一 resolution 重复生命周期标记。每个 Scheduler decision 保留解释本轮选择所需的 immutable full graph identity、relation/mutex candidate、capacity、blocker、`select(taskId)` 或 `wait` 结果，以及 Scheduler 对 selected-or-wait 所应用的 hard-guard context；给人的摘要可以演进，但不能因数值相同而丢失这些决策事实。diagnostic 不保存 reservation、sticky target、await reason 或任何 Core-owned fairness/starvation state。具体 event 文本和 details 布局仍是私有实现。
- 采用: diagnostic closing 在关闭前只投影该 logging output 的一个临时状态，不与其初始状态并列；关闭后的真实 status 仍由 `RunResult.outputs` 表达。临时状态的名称和日志布局不是公共协议。
- 不采用: 将非阻断 observation 重新包装成 Gate Check、把日志正文升级为公共协议、仅以相同数值压缩 Scheduler evidence、将 reservation 或其它已删除策略状态写回 diagnostic，或用普通 Project Run 目录承接测试生成的 evidence。
