# Proposal

在虚拟平台可用后，以典型场景和反例形成轻量准入候选，完成采用或保留现有算法的证据交接。

## Why

当前 learned helper 使用历史时长、关键路径和 layer ordering，首选受阻时等待。是否应回填、调整层序或保持现状，应由可复现的场景结果回答，不能在测量平台尚未可用时预先决定最终算法。

[虚拟评估方向](../../docs/decisions/evaluate-admission-heuristics-with-seeded-virtual-workloads.md)要求整体完成时间优先、资源累计占用其次，不建立用户关键任务概念。平台承接低成本重复比较，少量真实运行证明最终接线，不要求真实加速百分比。[旧比较计划](../optimize-learned-admission-strategy/proposal.md)继续暂停，不作为依赖或并行实施入口。

## Outcome

在冻结的场景和评估口径上，交付有规则依据、无约定明显退化且决策成本可接受的轻量算法，或以证据保留现有算法。具体候选由平台暴露的问题产生；不把候选或采用结论当作开始规划的前置。

采用或不采用均完成验证和稳定提交后，解除本 Change 对 0.0.2 的发布前置；不自动授予发布权限。

## Scope

### Intended Change

- 消费[资源配置](../configure-project-gate-named-resources/proposal.md)和[虚拟平台](../build-admission-simulation-workbench/proposal.md)的稳定输入，先运行基线、定位反例，再提出和比较小范围候选。
- 必要时只修改 `src/learned-critical-path/**` 的选择启发式；保持公开 prepared strategy、duration/history 模型、Scheduler legality 与资源生命周期。
- 比较范围限于可解释的局部规则，不预定回填或层序改动一定胜出；不引入深搜索、强化学习、新预测模型、预约、抢占、跨 Run 公平或新配置选项。

### Resulting Impacts

- 采用时 admission 顺序及 observation trace 可能变化，须同步实际受影响的用户指南、内部 owner、JSDoc 和测试；不采用时不制造行为变更。
- 策略只能读取公开上下文与可比较预测，不得读取虚拟真实时长或随机未来；真实决策成本与模拟结果分别记录。
- 平台和 Gate 配置不由算法反向修改以取得胜出结果；比较输入变化后，基线与候选都必须重跑。

## Success Criteria

- 保存冻结输入、基线结果、代表性反例，以及比较前固定的候选定义、回归口径和计算预算。
- 合法性、确定性和有限进展无回归；逐场景审查 makespan，不用总平均掩盖明显退化；主指标不更差时比较 slot·time 与各资源 unit·time。
- 真实宿主开销和少量真实接线验证单独通过；收益或依据不足时，保留基线并说明停止理由。
- 完成实际文档影响、测试证据及稳定提交交接，不承诺普遍加速。

## Affected Owners

- [learned helper](../../src/learned-critical-path/strategy.ts)、相邻测试与 duration/history owner：候选和保持不变的模型边界。
- [用户指南](../../docs/guides/learned-scheduling.md)、[调度指南](../../docs/guides/scheduling.md)与[内部 helper owner](../../docs/development/architecture.md#learned-critical-path-helper-owner)：实际采用后的影响。
- 虚拟平台：场景、证据和共享闭包集成；[发布 Change](../release-0-0-2/proposal.md)：继承采用或不采用的稳定结论。
