# Proposal

在 0.0.2 发布前，利用当前模拟器与命名资源能力重新设计简单的 learned 调度启发式。本 Draft 确定问题范围；算法与验收标准仍待收敛，不授权实现。

## Why

当前 learned helper 使用历史时长与依赖关键路径排序，所选层的第一名不可准入时直接等待。命名资源通过 `canAdmit` 影响合法性，但 helper 尚未利用 `admissionState` 比较等待与其它合法选择的后果。这可能留下空闲槽位，也可能使简单回填延迟关键任务；尚无本轮收益测量。

用户选择先做简单优化，再发布；更深算法另议。[旧比较计划](../optimize-learned-admission-strategy/proposal.md)继续暂停，不作为本次依赖、算法选择或实验授权。

## Outcome

以当前公开策略为基线，形成并验证复杂度有界、资源感知的简单算法：在代表性 workload 上改善整体完成时间，并满足预先确定的关键任务延迟与决策成本门槛。收益、反例和预测偏差均留有证据；模拟合法或槽位更满不等于优化有效。

若小范围候选没有通过预先确定的验收标准，保留当前算法并交付不采用的依据；是否以该结果解除发布前置，由用户确认，不自动扩大到更深算法研究。

## Scope

### Intended Change

- 重设计 `src/learned-critical-path/**` 内的选择启发式，使用现有 public prepared strategy、命名资源事实及 immutable AdmissionState；保持时长模型不变以隔离算法效果。
- 优先比较等待与少量合法替代选择，不预设“总是回填”或评分公式。[设计草案](design.md)承接候选方向、常见问题和进入 Plan 前的待定项。
- 不引入深层搜索、强化学习、新预测模型、动态资源预约、抢占、跨 Run 公平服务或新的公共调参体系。

### Resulting Impacts

- 调整 helper 选择可能改变 admission 顺序与观察事件；同步用户指南、内部 owner、受影响 JSDoc 和测试证据，不改变 Scheduler 的硬约束或 Check/Record/aggregation 契约。
- 在同一公开接线、可比较 history 与输入下完成模拟及真实 workload 对照，再运行 package consumer 与完整 Gate 验收。
- 本 Change 的收尾结果是 [0.0.2 发布](../release-0-0-2/proposal.md)的前置；与旧算法计划不并行修改同一 owner。
