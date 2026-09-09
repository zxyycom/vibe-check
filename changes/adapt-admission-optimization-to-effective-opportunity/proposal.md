# Proposal

本 Draft 将 Scheduler 调优从“先选择复杂算法”改为“先判断 effective graph 的调度机会、预测可信度和策略成本”，并把低数据、低调度机会作为一等 workload。

## Why

现有 admission 调优主要比较具有足够候选与竞争的图。Change-aware selection 预计会让常见 Run 更频繁地只保留一条或少数链路；Scheduler 仍须处理 dependency、capacity、mutex、cancellation 和 settlement，但 learned 或搜索策略可能缺少样本和可改变的 admission 顺序，其准备、history I/O 与决策开销反而可能超过收益。

窄增量与热缓存还可能让平均结果掩盖 wide/full change、cold cache、source unavailable 和强制全量运行的退化。在采用新算法前，需要先建立分层 baseline，再比较无搜索、有限穷举和启发式策略，而不是默认复杂策略总有足够调优空间。

## Outcome

本 Change 完成后，admission 优化会依据 selection 后的有效图、规划分支、预测可信度和自身成本选择策略：无选择空间时走最小确定性路径；有界小状态空间可比较穷举剪枝；较大且数据充分的场景再比较 learned/heuristic。分层 workload 分别证明常见收益、稀有路径退化和 fallback；证据不足的候选以 not-adopt 完成。
