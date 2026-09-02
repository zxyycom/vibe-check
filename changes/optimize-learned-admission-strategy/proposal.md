# Proposal

本 Draft 评估并选择能够更有效利用 learned duration prediction 的 admission 算法，同时把“是否采用候选算法”交给可重复的同输入比较证据，而不是预先承诺替换当前策略。

## Why

当前 `learned-critical-path` 使用 deterministic bottom-level critical-path score 做 greedy list scheduling：每轮优先选择当前 selection layer 中分数最高的 Task；该 Task 暂时不能通过 capacity admission 时可以选择等待。这个启发式已经改善本仓 Gate，但它不考虑较低分可运行 Task 的安全回填、预测不确定性、downstream unlock impact 或 mutex/capacity contention，也不保证任意 workload 的 makespan 最优。

学习模型与 admission 算法若同时变化，A/B 结果无法说明收益来自新的时长 estimate 还是新的调度决定。算法实验还可能只优化单一仓库拓扑，却增加其它图上的 idle slot、tail、饥饿或波动。因此需要一个独立 Change：先依赖 [`separate-duration-learning-from-admission-strategy`](../separate-duration-learning-from-admission-strategy/proposal.md) 提供的 private composition seam，固定同一 prediction input，再比较当前算法与有明确假设的候选策略。

## Outcome

项目拥有一组可重复、同 candidate、同 workload、同 duration prediction input 的调度算法对照证据。当前 strict greedy critical-path 策略作为 baseline；capacity-aware backfill 是首个候选，只有在代表性 dependency、observation、scope、mutex 与 capacity workload 上满足预先确定的正确性、进展和性能门槛时才成为生产策略。

若没有候选满足门槛，Product 保留当前算法并交付可复核的不采用结论。无论是否采用候选，Scheduler 的 readiness、mutex、capacity、cancellation、settlement hard guards，以及 Check/Record、aggregation、machine publication 和 Run result contract 都不改变。
