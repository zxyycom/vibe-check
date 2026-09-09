---
title: 按有效调度机会约束 admission 优化
id: 260909-select-admission-optimization-by-effective-opportunity
status: active
alignment: unaligned
createdAt: 2026-09-09T13:17:14Z
purpose: 让调度策略只在有效图、数据可信度和选择空间支持时承担额外规划成本
background: 窄增量运行会减少调度空间和学习样本，并可能让热缓存掩盖宽图与冷路径退化
decision: 把低数据和低调度机会作为一等场景，以有界混合策略和确定性回退控制优化成本
tags:
  - performance
  - testing
  - workflow-policy
relations: []
---

## 目的

- 让 admission 优化只在 effective graph 存在选择空间、预测可信且收益覆盖成本时承担额外规划。
- 让窄增量、热缓存、低样本和无可重排空间成为一等验收场景。
- 保留 Scheduler 的统一合法性和生命周期责任，并按 workload 选择有证据支持的最小策略。

## 背景

- 普通 flag selection 已能在 admission 前结算无关 Check；计划中的 change-derived flags 预计会让常见 Run 更频繁地只剩一条或少数链路。
- 现有 learned helper 在完整静态图上准备 prediction 和 critical-path score，history 来自实际 admitted Tasks。有效图缩小后，完整图评分、低频样本和 workload-dependent duration 都可能降低预测价值。
- 窄增量和热缓存可以摊薄常见成本，也可能掩盖 wide/full、cold、source-unavailable 和强制全量路径的退化。Scheduler 的合法性职责保持不变，重新评估的是额外 planning 与 learned ordering。

## 决策

- 采用: 调度优化的 baseline、candidate routing 和 adoption gate 以 selection 后的 effective graph 为准；可重排 boundary、history coverage、prediction uncertainty 与策略自身成本共同决定采用价值。
- 采用: 性能证据分别覆盖 zero/narrow/wide/full、warm/cold、history missing/stale、change source unavailable 和 manual-force；不同 workload 不用汇总平均值互相抵消。
- 采用: 同时评估最小 deterministic path、有界 branch-and-bound 与 learned/heuristic。无选择空间时使用最小路径；状态空间可控时允许穷举剪枝；较大且数据可信时评估 heuristic。具体 router、阈值和算法由 baseline 决定。
- 采用: Exact search 只承诺给定 prediction、约束和 objective 下的 model-relative 结果，使用 rolling horizon、deterministic tie-break 及 state/time/memory guards；数据不可信、搜索超限或 candidate fault 时确定性 fallback。
- 采用: 所有候选只提出下一 admission，Scheduler 继续验证 legality 并拥有真实 lifecycle。策略只读取 source-neutral 的有效图与置信事实。
- 采用: 现有 learned optimization Plan 在完成 change-aware 重基线和本方向审阅前不进入 Implementation、Gate A/B 或 production wiring；证据可以支持重写、简化或 not-adopt，不以已有算法复杂度作为继续投入理由。
