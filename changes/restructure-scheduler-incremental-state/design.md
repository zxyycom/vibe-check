# Design

采用“源事实 + typed 多维索引 + 显式派生视图”，让同一次状态变化只发现一次，再服务选择、观察和统计。

## Context

当前事实由 [Scheduler](../../docs/development/scheduler.md)、[调度指南](../../docs/guides/scheduling.md)和
[模拟分支](../../docs/guides/simulating-admission.md)拥有。
[结构普查](../../docs/investigations/audit-scheduler-incremental-state-model.md)在
`d9f346fde00d0ec9b57cccdbc21c9f1cefff5927` 完整覆盖 Scheduler 43 个非测试模块；关键链路是：

- `selection-transition.ts` 更新 membership，`ready-frontier.ts` 重比前后成员，`static-frontier.ts` 再收组并比较 head/layer。
- `selection-frontiers.ts` 从已变更的 active-root array 再发现 Set diff；多份 backing 的必要性需按消费义务判断。
- `state-query.ts` 按 partition 枚举排序；`scheduler-observation.ts` 分类 pending；`measurement/integrals.ts`
  逐 interval 更新每 Task delay。完整 candidates/catalog/per-Task 输出另有结果大小下界。

Core 拥有合法性、成员、relation counters 与 occupancy；shell 拥有 Task/Promise/value/error 和真实执行事实；
collector 拥有 clock、区间归属与 timing。immutable successor 同时服务真实执行和推演分支。

本项在[上下文 Change](../adopt-declarative-callback-contexts/design.md)完整交付后实施：先核对新的字段、
固定需求时点和按需生产边界，再获取 baseline。该顺序避免用本项补前项迁移，也不把旧源码成本冒充新基线。
阶段需求与 immutable 方向分别遵循[需求 Decision](../../docs/decisions/declare-scheduler-context-demand.md)和
[状态 Decision](../../docs/decisions/provide-immutable-admission-graph-state.md)；具体 API 以届时已交付 owner 为准。

## Goals / Non-Goals

目标是统一事实更新和影响传播，收敛重复 backing，并降低已请求统计的反复分类与逐 Task 累加成本。
选择路径、完整观察和 retained fork 分别计成本，按[规模收益原则](../../docs/decisions/weigh-performance-costs-against-scaling-benefits.md)采用。

范围限于 Scheduler Core 及兑现模型所需的 shell、query/projection、measurement 消费端。
上下文 API 和需求开关由前项拥有；默认策略、Promise completion 顺序、learned 算法、Analyzer、缓存与 Gate 调优保持现状。

## Decisions

### Intended Change

**模型采用 B：源事实、typed 多维成员索引与显式派生视图。** 物理表示从现有 persistent collections 起步，
按下述实验决定局部替换。仅统一 delta 的 A 用于隔离收益，不作为削减本项 Outcome 的默认出口；
通用 typed backing 可以承接 B 的共同操作，动态查询语言不属于本项。

#### 事实、索引与派生视图

| 责任层 | 共同操作与保留义务 | 表示决定 |
| --- | --- | --- |
| Task status / relation-ready | identity、add/remove、count、enumeration；ready 必须蕴含 pending 与关系谓词。 | typed 成员更新统一，status 与反向索引各有用途；重复标量优先由可直接读取的索引计数派生。 |
| Relation / mutex / resource / scope | 来源、阈值、units、activation/close；供唯一 legality 查询。 | 数值与生命周期显式建模；动态 occupancy/gate 保持共享，不扁平化为布尔 Task 标签。 |
| Ready / static frontier | 两类组内排序、三层 group-head 顺序、任意非 head 移除、revision 和必要前缀读取。 | 消费统一 delta；独立排序 backing 按其义务保留，可共享实际相同的排序。 |
| Measurement / public projection | 分类计数、区间积分、等待、peaks、完整输出和 frozen snapshot。 | 增量聚合与惰性结算归 collector；边缘按消费物化，完整输出规模单列。 |

内部身份继续以已编译 task slot 为起点，外部 Task ID 映射在边界完成；typed key 保留维度和合法组合。
逐项复核 compiled lookups、status partitions、counts 与 active-root backing，移除或 compile-local 化无后续消费者的存储。

#### 一次 transition 的传播

1. Core 从 canonical action 计算 status、relation counter、occupancy 与 scope lifecycle 变化。
2. 同一事务更新 typed membership，产出实际 add/remove、counter threshold、constraint 和 active-root delta。
3. Ready view 直接消费 membership delta 并返回 head 变化；static view 消费这些变化及 scope layer delta。
4. 查询读取新状态；按需启用的观察/统计消费者读取同源变化及动态 gate。构造完成后发布 immutable successor。

Delta 仅属于当前 successor 构造事务，不留作第二份历史账本。多来源 blocker 保留来源/计数；移除一个来源时，
其它来源仍能维持阻塞。全局 root 和 active-scope cap 通过共享 gate 约束全局 running 数量，避免给全部 pending 重打标签。

#### 分类、等待与物化

先分开分类 membership/count、interval totals 与 per-Task delay。relation-ready 是稳定增量入口；
mutex/resource 变化由受影响约束或组定位，global capacity 由共享 gate 表达。统计分类按组或有意义的共享条件聚合，
仅为已声明统计维护其额外索引，避免把全部观察工作转移到每次 Core 写入。

等待候选采用类别累计时间与 Task 进入/离开类别的标记，在类别变化、admission/settlement、快照检查点或终态结算。
全局 gate 切换优先更新共享累计状态，而不是逐 Task 重写。实验须同时覆盖异量 resource claims、多来源 mutex 与 scope 变化，
证明分组能保持真实分类；无法共享的变化按实际受影响成员处理，并如实记录 fanout。

排序采用保序索引、snapshot-local memo 或边缘排序中成本最小且隔离成立的方案。冷 seed、完整 public 输出、
terminal per-Task 输出保留必要全量工作；实际查询、排序、维护和保留分支分别计量。

### Resulting Impacts

#### 保持与允许变化

| 边界 | 保持的语义 | 允许的实现变化与证明 |
| --- | --- | --- |
| 执行 | relation/mutex/capacity/scope legality、atomic resource accounting、callback-return hard guards。 | 状态与索引表示可改；以独立 trace oracle 验证每个 action/rejection/effect。 |
| 顺序与失败 | pre-admission callback 优先级、forced effects、取消声明顺序、drain、static 层级与 tie、primary failure 优先级。 | 内部 batching 仅在可观察 effect 和 boundary 不变时采用；保留现有 Promise completion tie。 |
| 观察 | candidate/catalog 顺序、rejection precedence/payload、完整 diagnostics、captured prefix、终态交付。 | 按已交付上下文需求生产，缓存与物化可改；旧 snapshot 和 fork 始终稳定。 |
| 统计 | admission-viable 集合、mutex → capacity → admissible 互斥分类、单位、区间归属、peaks、delay/tail 含义。 | 累加顺序与最后几位可不同，允许有界误差；数值检查见下节。 |
| Availability | 合法 zero span、clock throw/non-finite/backward 分类、离散事实与 peaks 保留、timing fault 不改变执行。 | 算术检查按可观察检查点确定；不要求复刻旧逐次累加在哪一项首次溢出。结果与读取顺序无关。 |

统计含义完整定义仍由 Scheduler 与 Human output owner 承接。不同真实 Run 的时间本来不同；固定 trace 的计算正确性
和机器负载下的性能测量分开验证。上下文默认字段、精确视图与跨 callback identity 采用前项交付结果，不在本项重开。

#### 数值与 availability 验收

输入固定为采样值、状态变化、需求和 action/effect trace。保持采样归属；建立测试专用的独立参考计算，
按 Number 输入的精确值以高精度或精确二进制有理数计算非负区间贡献，分别核对乘法、积分和分类等待。
旧实现用于离散语义对照，不作为数值真值。

准确性准则独立于候选冻结：对同一采样、同一结果所覆盖的区间贡献，采用直接非负累计的标准前向误差保证作为基准，
并纳入区间差值、乘法和最终 Number 转换的误差及溢出、下溢等适用条件。逐结果、逐局部段比较，
候选的误差保证不得劣于该基准；类别切换和 prefix subtraction 引入的误差也计入候选保证。
基准适用域之外须另证满足同等准确性目标的回退；无法证明时拒绝该候选，不以放宽自有误差界通过。

用精确参考、确定性边界及长序列 trace 复核上述保证。有效贡献很小、共享 prefix 很大时，
只按该结果的实际贡献与局部运算建立基准；不能用全 Run 累计量的宽界放行局部 delay 被消减为零。
该准则是内部工程采用门禁，不要求复刻旧加法结果，也不引入固定经验容差或新的公开时间分辨率。

每个实际交付的 online/terminal 检查点必须完成其所请求统计的有效性判定：available 才交付 finite、non-negative 数值；
无法有效表示时使用既有 unavailable reason，并保留首次已确定的失败原因。私有累计表示先溢出但真实目标仍可表示时，
应调整表示、分块或采用受验证的回退，不能仅因该内部溢出削减可用性。getter 不推进 clock、不回写旧 snapshot、
不让不同字段读取顺序改变 availability。数值策略或其边界不能得到证明时，该候选不进入产品替换。

#### Owner 交接

同步 Scheduler 状态与 collector 说明、受影响公开指南、Human output 的统计解释及相邻测试/Case；
回归 learned terminal consumption、Invocation/output failure 与独立模拟。涉及公开类型或材料时沿
[文档导航](../../docs/navigation.md)进入其 owner。共享写入按[协调入口](../../docs/governance/change-coordination.md)串行安排。

## Risks / Trade-offs

- 增量化可能把读成本移到写入，尤其是共享 constraint cohort、global cap 与复杂交集；采用时报告总成本和实际 fanout。
- 多份 persistent backing、typed key 和 retained branches 会增加内存；dense/bitset 也可能不利于稀疏枚举，实验只替换有证据的部位。
- 惰性等待引入消减误差和延后检查风险；数值证明、检查点确定性与旧快照稳定是采用门禁。
- 小输入可付出可解释的常数开销换取规模收益；当前没有候选计时或内存结论，预算不由计划凭空设定。

## Open Questions

无待用户裁决的设计问题。物理 backing、聚合分组和数值表示由任务 1.2 的有界实验选定，输入、判据与失败出口见下节。
若所有候选均无法在已确认语义内兑现 Outcome，停止替换并报告具体反例，重新审查范围；不通过默默放宽语义完成任务。

## Validation Strategy

### 可执行实验与采用门禁

1. 在上下文交付后的同一源码基线冻结 workload 与需求；使用现有 persistent 表示先实现 B 的统一 delta 最小切片。
   以 select、settle、scope activation/close 贯穿事实—成员—frontier—统计，A 仅作为操作量对照。
2. 输入覆盖小/中/大规模的独立宽图、`G=N`、共享 mutex/resource、异量 claims、深关系/reverse fanout、多 active scopes、
   非 head 移除、长 blocked 前缀和 retained forks。分别运行 static/no observer、最小/完整 custom、diagnostics、
   online/terminal 与混合需求；具体字段来自开始时的已交付契约。
3. 记录 touches/edges/groups、实际 membership/head/layer delta、query 前缀、排序、分配和 retained/peak memory。
   只在某项证据指向 backing 成本时，比较 native/persistent/dense/bitset 或通用 typed backing 的对应替代。
4. 数值 trace 包含零区间、长短交替、巨大累计后微小区间、类别反复切换、接近表示边界，以及 invalid/backward/non-finite/throw clock。
   交付误差推导、参考结果、最坏样例与 availability 检查点；随机差异测试作为补充，不代替证明。
5. B 必须消除重复影响发现，并说明 retained backing 与新增观察索引的独立义务；惰性统计必须通过固定 trace、数值和读取顺序验证。
   性能采用综合规模趋势、绝对代价、内存和维护风险，记录采用/不采用理由。失败候选保留为证据，不进入运行时。

### 回归与性能测量

正确性以独立低优化 oracle 按 boundary/action/effect 对照，覆盖 seed/pre-admission、select、running/forced settlement、取消、
multi-source blockers、资源原子性、scope lifecycle/global cap、拒绝无 successor、旧 state/multiple forks、排序/payload、
captured prefix 和 terminal delivery。测试与 Case 按项目策略维护。

Node 与 Bun 的性能测量各在独占串行窗口进行，与测试、profile、构建和 Gate 分离；记录 source revision/tree、输入、
命令/API、runtime/version、demand、warm/cold、重复次数与噪声。分别报告 seed、transition、query、观察、局部与公开 Run
端到端时间，不把固定 trace 数值比较或源码操作量写成真实加速。

最终按[交付验证](../../docs/navigation.md#交付验证)运行最窄测试、Product typecheck/lint/dependency、文档/Case 校验和
`bun run check -- --all`，由非实施代理反查实际 diff 与公开/内部 owner。
