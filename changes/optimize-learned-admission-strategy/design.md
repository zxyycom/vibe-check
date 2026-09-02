# Design

本设计把 admission 算法优化定义为固定 learned duration model 输入的独立实验与采用决策；它依赖先行 [`separate-duration-learning-from-admission-strategy`](../separate-duration-learning-from-admission-strategy/proposal.md)，在进入 Plan 前仍需闭合 workload、候选算法和验收阈值。本文只支持后续设计与取舍，不授予生产策略实施权限。

## Context

- 当前实现和行为 owner 位于 `src/project-run/task-scheduler/**`、`docs/architecture.md` 与 `docs/api-mechanics.md`；`learn-check-task-durations-for-critical-path-admission` Decision 规定 static 默认、显式本地 learned mode、effective priority 同分语义、模型可演进及 history failure 不改变质量结算。
- 当前 estimate 来自同一 identity 最近 32 项 admitted-to-settled duration 的 arithmetic mean；未知 Task 使用本轮 learned estimates 的 median，完全 cold start 使用共同正权重 `1`。这些输入属于 duration model，不在本 Change 中调整。
- 当前 score 为 `estimate(task) + max(score(direct downstream), 0)`，downstream 包含 `dependsOn` 与 `observes`。每个 invocation 的 prediction 和 score snapshot 在 admission 前冻结。
- 当前 policy 保留 tightening、constrained continuation 与 ordinary 三个 selection layer；同层先比较 critical-path score，再比较 effective `admissionPriority` 和 canonical ID。最高候选本轮 `canAdmit=false` 时可以返回可 drain 的 `wait`。
- 已归档 `schedule-checks-from-learned-durations` 只保存当前算法的形成时实现与 Gate A/B 证据，不能作为本 Change 的新实施授权或直接复用的新 candidate baseline。

## Goals / Non-Goals

**Goals**

- 在同一 graph、duration prediction 和动态 Scheduler facts 上独立运行或模拟 baseline 与候选 admission strategy，使算法差异成为唯一主要实验变量。
- 先检验 capacity-aware backfill：最高 critical-path 候选暂时不可 admission 时，判断能否选择较低分且当前可 admission 的 Task，而不破坏 scope 收紧、有限进展或高分 Task 的可启动时机。
- 用包含 dependency、observation、scope capacity、mutex、并行短 Task、长 downstream chain 和时长波动的 workload 证明正确性与性能边界。
- 保持算法为 deterministic pure selection；Scheduler 继续独占 hard guards、Task lifecycle、等待和 settlement。
- 为候选采用和不采用都提供明确出口，不因已经投入实验而强制替换当前算法。

**Non-Goals**

- 不同时修改 history identity、sample window、mean/project prior/cold-start 规则、storage schema 或 recording lifecycle。
- 不在本 Draft 中承诺公开任意算法 callback、通用 optimizer framework、跨机器 history 或固定跨版本 admission 顺序。
- 不以单次 wall time、单一 Gate topology 或 synthetic graph 的局部胜出证明全局最优。
- 不在缺少收益证据时引入整数规划、无界搜索、抢占、运行时迁移或新的外部依赖。

## Decisions

### Intended Change

1. **先行依赖**：只有 `separate-duration-learning-from-admission-strategy` 已提供行为等价的 private duration-model/strategy seam，并且当前 baseline 可通过同一 seam 重放时，本 Change 才能进入算法实施。
2. **固定实验轴**：每组比较复用相同的 immutable graph、duration prediction snapshot、initial Scheduler state 和 scripted settlement/timing input；duration estimator 与 persistence 不作为候选变量。
3. **baseline**：保留当前 strict greedy bottom-level critical-path policy，包括 selection-layer 顺序、score、priority 和 ID tie-break，以及最高候选不可 admission 时的现有 wait 行为。
4. **首个候选**：设计 capacity-aware backfill。候选只能从 Scheduler 已给出的 relation/mutex eligible candidates 中选择，并必须定义何时 backfill 不会推迟受保护的高分候选；不能用绕过 `canAdmit`、scope 或 hard guard 获得表面并行度。
5. **后续候选门禁**：只有 workload 证据指出独立问题时，才依次评估 uncertainty-aware ranking、downstream unlock impact、contention-aware score 或 bounded lookahead。每个候选必须声明新增输入、状态、时间复杂度、确定性和有限进展义务；不建立空的通用算法注册表。
6. **采用出口**：先冻结 corpus、样本协议和阈值，再生成候选结果。候选未同时通过行为等价边界、算法正确性和性能门槛时，生产配置继续使用 baseline，并记录不采用理由。
7. **公共契约**：实验先保持 private。若胜出算法仍属于 critical-path greedy 家族，可在当前非算法兼容承诺内评审替换；若不再以 critical path 为核心，或两个算法都需要由 consumer 稳定选择，则另行评审 public kind、兼容映射和 fingerprint，不能把新语义静默放入旧名称。

### Resulting Impacts

- `src/project-run/task-scheduler/**` 需要让 baseline 与候选消费同一 private strategy input，并为 select/wait、tie-break、scope layer 和 backfill 边界提供直接测试；算法不得读取 history file 或可变 learning session。
- benchmark/evidence owner 需要保存 workload graph、固定 prediction、settlement script、candidate、环境、运行顺序、原始样本和排除项。真实 Gate A/B 与 synthetic deterministic scheduling evidence 证明不同义务，不能互相替代。
- 性能判断至少需要区分 makespan、关键链 admission delay、空闲 slot/capacity utilization、accepted wait 和 tail；指标定义与阈值必须在候选结果形成前固定。
- 若策略改变 diagnostic 中可见的 selection/wait 序列，只能更新现有有界 observation；不得新增第二个 machine/public result 协议来解释算法。
- 若最终方向改变当前长期策略或 public mode 含义，需要通过新的 Decision 演进现有 learned-admission Decision；Change artifact 不直接改写已对齐记录的语义。
- `add-invocation-fail-fast-policy` 与 `add-named-resource-capacity` 会改变候选集合、capacity 或进展条件；本 Change 进入 Plan 前必须根据它们的实际状态确认并行边界和结果归因。

## Risks / Trade-offs

- backfill 可以减少当前空闲，但也可能占用高分 Task 即将需要的 capacity，反而增加关键链 tail；“当前可 admission”不足以证明“不会延迟关键任务”。
- synthetic graph 容易稳定复现算法差异，却可能遗漏真实工具时长波动；真实 Gate 能证明仓库收益，却只有少量 topology。采用判断需要两类证据。
- uncertainty、contention 和 lookahead 会增加策略输入与复杂度；没有独立 workload 证据时把它们一次组合，会再次失去归因并建立不必要抽象。
- 当前模型只给 point estimate，sample count 与 p90 是诊断事实；让算法消费它们会改变 duration model 与 strategy 的最小公约数，必须由候选需求和测试证明。
- admission 算法是启发式；成功标准应要求代表性 workload 改善和无回归，而不是无法兑现的全局最优证明。

## Open Questions

1. 哪些真实或可复现 workload 构成采用 corpus，除本仓 required/full Gate 外是否需要第二种 consumer topology？
2. 每个 profile 的样本数、交错顺序、warm/cold history、允许波动、主要指标和“不得退化”阈值分别是什么？
3. capacity-aware backfill 如何定义受保护候选和安全窗口：只看当前 `canAdmit`，还是需要受限 reservation/预计释放事实？
4. 首轮是否只比较 strict baseline 与一个 backfill candidate，还是已有证据要求同时加入其它候选？
5. 是否需要专门的 deterministic scheduler simulator，还是现有 task-engine tests 与真实 Project Run harness 已足以重放固定输入？
6. 若候选胜出，算法仍能否诚实使用 `learned-critical-path` 名称；若不能，兼容配置和 fingerprint 由哪个后继 Change 承接？
7. 哪些结果会要求建立或演进长期 Decision，哪些只属于当前实现可自由优化的非兼容模型细节？
