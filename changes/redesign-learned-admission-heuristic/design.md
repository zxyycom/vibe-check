# Design

本 Draft 从“关键路径优先，资源受阻时比较等待与有限替代选择”开始设计；方向不是已采用算法，推演也不是收益证明。

## Context

- 当前基线由 [learned helper](../../src/learned-critical-path/strategy.ts)、[使用指南](../../docs/guides/learned-scheduling.md)和[内部 owner](../../docs/development/architecture.md#learned-critical-path-helper-owner)承接：按 tightening、continuation、ordinary 层序排序，首选不能准入便 `wait`。
- [模拟器](../../docs/guides/simulating-admission.md)可分支 select/settle，[Scheduler](../../docs/development/scheduler.md)仍拥有真实准入、资源占用和终态传播。模拟器不预测运行时间或结果，也不预留真实资源。
- 遵守[公共 learned strategy](../../docs/decisions/provide-learned-admission-through-public-strategy.md)、[immutable state](../../docs/decisions/provide-immutable-admission-graph-state.md)与[命名资源](../../docs/decisions/enforce-static-named-resource-capacities.md)的活动方向；不恢复 private provider 或特殊 Invocation 接线。
- [旧比较计划](../optimize-learned-admission-strategy/proposal.md)继续暂停；本 Change 不继承其候选、门槛或 private 性能结论。Draft 本身不授权实验、生产接线或旧目录删除。

## Goals / Non-Goals

目标是用少量可解释规则改善 Run 完成时间，控制关键任务延迟与决策开销；相同输入确定性选择，并保持有限进展。性能门槛在 baseline 后、候选比较前固定。

不追求最优调度或任意 workload 都更快；不修改 history identity、存储、预测统计模型、默认 static policy、公共配置或资源生命周期。深层树搜索、beam search、强化学习、复杂预约与抢占另议，不成为本轮依赖。

## Decisions

### Intended Change

已确认范围是简单算法重设计、预测模型不变、复用公开能力。以下选择规则仍待 baseline 与反例检验：

1. **保留可比较基线。** 使用当前关键路径、priority 同分和稳定 ID 排序。区分 selection layer 启发式与 Scheduler 硬约束，是否调整层序须单独说明依据。
2. **先做局部判断。** 重点处理首选受阻：比较等待与少量合法候选，优先判断资源冲突；必要时用共享 AdmissionState 推演资源与 scope 后果，不复制 legality reducer。
3. **前瞻保持有界。** 局部判断不足时才评估一层前瞻。模拟 settlement 的时间与结果来自显式预测假设或测试虚拟时序，不是模拟器给出的事实；比较预计完成时间和首选延迟风险，而非只看占用率。
4. **区分退化与故障。** 信息不足或计算预算耗尽时退回当前策略的合法选择；真实 callback fault 仍由 Scheduler 原规则处理。不得把无 running work 可 drain 的 `wait` 当退化路径。
5. **再收敛为 Plan。** 固定唯一候选、评分/排序、候选数与推演步数上限、wait/退化规则及验收门槛，再派生任务。不增加公共 knobs；需要更深算法才能获益时停止扩张。

### Resulting Impacts

设计和 corpus 至少覆盖以下常见问题；每个场景要有可核对的选择、终态与时间/开销证据，而非仅检查不会 throw。

| 场景 | 必须回答的问题 |
| --- | --- |
| 队首阻塞与独立任务 | 首选因资源受阻时能否利用闲置容量；仅在 running work 可 drain 时等待，无剩余工作时正常结束。 |
| 多资源、加权 claim 与 mutex | 替代任务是否占用首选即将需要的资源，造成更长阻塞；不得破坏原子获取与容量上限。 |
| 长短任务混合、关键链与扇入/扇出 | 回填是否拖延长关键链，短任务偏好是否反复推迟长任务；不宣称跨 Run 的防饥饿保证。 |
| root/scoped capacity 与 scope 激活 | 启动任务是否收紧有效容量、妨碍已有 scope 完成；保持 hard guard 与有限进展。 |
| 冷启动、稀疏 history、预测偏差 | 相同图在低估/高估时是否出现严重退化；不把点估计当硬时长上限。 |
| 失败、observes、取消与资源释放 | 假设成功不能改变真实 dependsOn/observes、blocked、drain 和终态 facts；取消后不新增 admission。 |
| 并列与极端形状 | 同分、单槽、空/单任务、宽图和长链下是否稳定、有界且无非法 wait？ |
| 决策成本 | 候选增多或模拟状态投影是否吞掉调度收益；无必要时不构造推演视图。 |

验证分两层，均使用当前公开接线，不沿用旧 private 性能结论：

- **确定性比较：** 冻结 graph、预测输入与代表性 fixtures，以虚拟时序记录完成时间、首选 admission delay、选择 trace 和终态；同时覆盖收益与退化场景。
- **真实成本：** 同环境、同 selection、同预测输入并隔离 history 写入，交错重复测量 Gate/workload，记录各自 exact candidate 和原始证据。整体 wall time 为主指标，利用率仅作解释；采样前固定样本数与采用门槛。

实施后按测试策略维护最窄策略/模拟/集成测试与 Case，运行受影响 package consumer 及 `bun run check -- --all`。分别反查 learned 用户指南、调度指南与内部 helper owner；非实施代理基于实际 diff 审查，不因没有新 API 而省略文档影响判断。仅改变 helper 行为时，不扩张 machine schema 或真实 Scheduler 职责。

## Risks / Trade-offs

历史时长不等于未来剩余时间；填满槽位可能延迟关键任务，一层推演也可能选错。安全硬约束必须始终成立，但性能只能在明确 workload 与预测偏差范围内证明。预先列出必须不退化的反例与允许权衡，不能在看到不利结果后改口径；收益不足则保留基线。

不承诺所有场景都不延迟首选或所有 workload 都更快；允许的性能权衡不能豁免安全、取消或结算规则。

## Open Questions

- 哪些真实 workload 与命名资源配置能代表这次优化；当前 Gate 不足以覆盖时采用哪组补充场景？
- 局部资源冲突判断是否足够，何时需要一层推演；running 剩余时长不可可靠取得时怎样比较等待？
- 是否保持现行层序；候选上限、评分与时间/开销退化门槛分别是什么？这些需在形成 Plan 前闭合。
