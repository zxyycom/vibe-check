# Proposal

本 Draft 评估并选择能够更有效利用 learned duration prediction 的 admission 算法，同时把“是否采用候选算法”交给可重复的同输入比较证据，而不是预先承诺替换当前策略。

## Why

当前 `learned-critical-path` 使用 deterministic bottom-level critical-path score 做 greedy list scheduling：每轮优先选择当前 selection layer 中分数最高的 Task；该 Task 暂时不能通过 capacity admission 时可以选择等待。这个启发式已经改善本仓 Gate，但它不考虑较低分可运行 Task 的安全回填、预测不确定性、downstream unlock impact 或 mutex/capacity contention，也不保证任意 workload 的 makespan 最优。

学习模型与 admission 算法若同时变化，A/B 结果无法说明收益来自新的时长 estimate 还是新的调度决定。算法实验还可能只优化单一仓库拓扑，却增加其它图上的 idle slot、tail、饥饿或波动。因此需要一个独立 Change：先依赖 [`separate-duration-learning-from-admission-strategy`](../separate-duration-learning-from-admission-strategy/proposal.md) 提供的 private composition seam，固定同一 prediction input，再比较当前算法与有明确假设的候选策略。

## Outcome

项目拥有一组可重复、同 candidate、同 workload、同 duration prediction input 的调度算法对照证据。当前 strict greedy critical-path 策略作为 baseline；capacity-aware backfill 是首个候选，只有在代表性 dependency、observation、scope、mutex 与 capacity workload 上满足预先确定的正确性、进展和性能门槛时才成为生产策略。

若没有候选满足门槛，Product 保留当前算法并交付可复核的不采用结论。无论是否采用候选，Scheduler 的 readiness、mutex、capacity、cancellation、settlement hard guards，以及 Check/Record、aggregation、machine publication 和 Run result contract 都不改变。

## Change Boundary

本 Draft 的唯一 algorithm owner 是 `src/project-run/task-scheduler/**` 的 Product-private learned admission selection；duration model 只提供 frozen prediction input，Scheduler 仍独占 readiness、capacity、mutex、cancellation、settlement 与 hard guards。

- **进入 Plan 的全部前置**：冻结至少一组真实/可重放 corpus、baseline/candidate、同输入 comparison protocol、指标定义、采样与交错顺序、排除规则和候选前的阈值；明确 capacity-aware backfill 的安全条件及不采用出口；复核 fail-fast/named capacity 的实际状态。Plan 可把 1A seam 验收保留为 Implementation Readiness；在该 seam 未稳定前不得切换生产策略或把无可重放的临时实现当作实验基线。
- **硬依赖 / 非依赖**：生产策略实施硬依赖 `separate-duration-learning-from-admission-strategy` 已验收的 private seam。simulation 的 public contract 不是前置；如存在，可只复用 private machine/harness。与 simulation 的推荐顺序是协调，而不是算法语义依赖。
- **固定边界**：只比较同 immutable graph、frozen duration prediction、initial state 与 settlement/timing script 上的 algorithms；本 Change 不修改本地重复运行学习、history schema/model、sample window、statistics、recording 或 storage，且绝不新增 `expectedDurationMs`。
- **公共 / 验收边界**：默认实验和候选保持 private。`admissionPriority` 仍只在策略自身 score 相同后作 tie-break，不能成为 override；模型/score 细节可在既有观察中说明，但不是跨版本 admission order 或性能兼容承诺。验证出口是预先冻结的 correctness/progress/performance evidence；未过门槛即保留 baseline 并交付不采用结论。
