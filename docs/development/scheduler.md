# Scheduler admission 与终态交付

本文拥有 `src/project-run/task-scheduler/**` 的 admission reducer、real shell、measurement collector 与终态 handoff 不变量；[Architecture](architecture.md#组件如何协作)说明它在 Run 中的位置。公开配置、custom callback 和 measurement 语义由[调度指南](../guides/scheduling.md)定义，独立模拟见[模拟调度分支](../guides/simulating-admission.md)，用户输出状态由[输出指南](../guides/run-outputs.md#输出状态与失败处理)定义。

## Admission state 与 real shell

### Core 状态与查询职责

`admission-core/**` 一次编译 immutable graph、named-resource slots、constraint groups 和排序 ranks。
动态状态按事实、成员索引和派生视图分工，使用 persistent backing 发布 immutable successor；同一 pure reducer/canonical effects
服务 static/custom proposals、standalone simulation 和 real shell。running seed、admission 与任意 settlement 都经该 owner 更新 occupancy。

| 状态责任 | 保存内容与消费义务 |
| --- | --- |
| `AdmissionSourceFacts` | Task status、relation counters、mutex/resource occupancy 与 scope lifecycle；拥有 readiness/legality 的源事实。 |
| `AdmissionMembershipIndex` | pending/running/settled 与 relation-ready task-slot Sets；支持成员查询、枚举和直接 `.size` 计数，不另存相同 count。 |
| selection frontiers | ready 组内顺序、static group-head 顺序、forced 队列与当前 active-scope 有序 slots；只拥有选择与枚举视图。 |

`selection-transition.ts` 是一次 successor 构造事务的唯一事实更新入口。它记录实际 status/counter/scope 变化，
`membership-index.ts` 同时更新成员并产出实际 add/remove，ready frontier 消费这些成员变化并产出 head delta，static frontier
再消费 head 与 active-scope layer delta。各层不重新比较前后完整 memberships 或 roots 来发现同一变化。
`AdmissionStateDelta` 只描述当前事务，不是累积历史或第二套事实；collector 消费相邻真实 Core boundary 的同源 delta。
批量 pending cancellation 向 collector 提供净变化，canonical effects 仍逐项保留各自 post-state 与声明顺序。

raw Task graph 入口先校验 root cap 并执行 `prepareTaskGraph`；内部 prepared 入口只接受绑定 immutable graph 与
同一 validated root cap 的私有 capability。Invocation 的已准备图由 strategy、execution 和 Scheduler 在本 Run 内复用；
独立 simulation 与 raw Scheduler 各自关闭其输入。

`createAdmissionGraph` 从独立 static input 建立 initial state；custom callback 的 `admissionState` 从 live Core boundary 取得同型 immutable handle。二者只投影 frozen inspection/catalog/validation 和 hypothetical `select` / binary `settle` successor。静态 capacities/claims 用 canonical `{ resourceId, units }[]`；inspection 投影 occupancy，不提供 mutable counter 或资源操作 capability。同一 callback 重读保持 handle identity；旧 state 不随真实调度变动。

Core 查询区分状态事实与选择判断，消费者直接读取所需内容：

| 查询 owner | 责任与消费者 |
| --- | --- |
| `state-query.ts` | status、成员与 scope lifecycle 事实，供 selection、projection、ID 查询和 measurement 使用。 |
| `selection-query.ts` | relation/mutex readiness、候选与统计分类，组合 selection rejection，供执行、推演和观察使用。 |
| `capacity-query.ts` | root/scope/named-resource capacity 判断、独立 blocker facts 与容量 rejection payload，供 selection、static query 和观察共用。 |
| `static-selection-query.ts` | 按既有策略层级消费全局有序 group heads，复用同源 mutex/capacity 判断。 |

Core 独占 pending/running/settled task-slot memberships、relation-ready membership、scope lifecycle 与 constraint occupancy。
seed 与 transition 以同一 relation predicate 维护 pending 且 depends/observes 均已 settled 的 relation-ready 成员；
这不等于 admission-viable：后者还要求所有 dependsOn completed，初始 pre-admission seed 同样检查该条件。
transition 只刷新变更 Task 与 relation counter 跨越 ready 阈值的 reverse fanout。mutex holders 按变更 Task 的声明 occurrences 更新，query 读取同源 holders 与 legacy external mutex
判断当前 mutex readiness；重复 occurrences 的 accounting 与公开 rejection payload 完整保留。

root count、active/activating scope 与 resource units 也在查询时动态判断。暂时被 mutex、scope 或 resource 阻塞的 Task
保留 relation-ready membership，因此 release 后直接重判 readiness/capacity，无需广播 mutex cohort 或恢复成员。
persistent successor 不改旧 state 或另一个 fork。

### Constraint groups 与静态 frontier

compiled graph 将动态 mutex/resource fit 和静态 scope layer 相同的 Task 编入同一 constraint group；
tighter-than-root 指 scope 的 maxParallel 小于 root maxParallel：

| 分组维度 | 等价条件 |
| --- | --- |
| Mutex | mutex ID 集合相同；occurrence 数量仍由 occupancy 和公开 rejection 各自保留。 |
| Resource | canonical resource claims 相同。 |
| Scope | tighter-than-root scope ID 与 activation 标记相同；non-tighter scope 可合组，实际 activation/close effects 仍按被选 Task 产生。 |

每组 frontier 保存 relation-ready 成员的 ordinary/constrained 两种 persistent priority 顺序：priority 从高到低，随后分别按 declaration
slot 或 lexical Task ID；相同顺序的 backing 可共享。tighter scope 的 non-activation Task 在 inactive 时走 ordinary，
active 后走 continuation，故两类 tie order 必须分别维护。static layer 读取当前 active roots；真实 activation 读取
inactive/active/closed lifecycle。

frontier 与 memberships 在同一 seed/transition owner 中维护，不拥有另一套 readiness 或 legality。任意 custom selection、forced
settlement 与 cancellation 可移除非 head 成员；transition 当场推进受影响组的 live heads，延后留存的非 head tombstone 以后
只在 transition 中弹出，query 不重复从旧 head 扫描。每条单调分支中，每个 Task 至多进入 relation-ready frontier 一次，各排序
heap 中的对应节点至多弹出一次；旧 state/fork 保持自己的 persistent 分支。

`static-frontier.ts` 为 tightening、continuation、ordinary 各保存一条全局有序 group-head queue。
`selection-frontiers.ts` 消费实际 membership delta 更新受影响组，static frontier 在实际 active-root 变化时重分类该 scope 的组；
当前 active roots 由 lifecycle facts 与有序 slot 视图承接，不另维护同内容的 active-root Set。
每次 head 或 layer 改变推进 group revision，旧节点即使再次成为同一 Task head 也不能复活；transition 清理失效 roots，
query 在跳过动态阻塞 head 时只处理所需有序前缀，保留旧 state/fork。
`static-selection-query.ts` 首先检查 persistent queue 的首节点；只有需要继续遍历时才建立 query-local Mnemonist Heap，
保存不可变节点引用，按 preference rank best-first 取下一节点、按 revision 排除 stale entry，再查询同源 mutex/capacity。
读取不通过 persistent merge 生成 successor copies，不修改 frontier；查询局部的 mutable heap 不进入 retained state 或 fork。

ready、static 和 forced frontier 共用 Scheduler-private persistent Task queue 的不可变 backing。
ready/static preference 来自 compiled 全局 ranks，仍保留每组相同的 ordinary/constrained 内部顺序；
forced 保留 descending task-slot 顺序，并在 transition 清理已不再 pending 的 stale root，避免取消后再次 forced settlement。
revision 是 entry identity，不是 Task priority 或另一套 legality。

### Shell 执行与准入边界

real shell 以 declaration-order `Map<TaskId, Task>` 拥有实际 pending payload，另拥有 runningById 的 Task/Promise、settlement value/error、signal、diagnostic、
measurement 与 RunResult；admission/cancellation 从这些负载中取得实际工作。scope lifecycle、mutex holders 与容量事实
由 Core 提供。Shell 应用 reducer effects 后仍执行 callback-return hard guards。

Scheduler 负责 graph validation、readiness、dependency/mutex admission、root/scoped budget、atomic named-resource accounting、cancellation、blocked settlement 与 Task lifecycle。每次 proposal 后重检 pending/candidate membership、capacity 与 lifecycle cutoff；`wait` 仅在 running work 可 drain 时合法。priority 是 immutable graph metadata，不存在旁路 map/list；static ordinary 层优先考虑 `canAdmit` candidate，避免被资源阻塞的 Task 浪费 root slot。

policy 只返回决定，Scheduler 不解释公平、防饥饿或等待理由；static tightening/continuation 每轮重算，不保存 reservation、sticky target 或策略状态。Task engine 不解释 Check terminal grammar、Records、scanner payload 或 aggregation。

static/no-observer 单轮消费同一 Core 的 layer-specific 有序 group heads、active scopes 与容量，
完整 candidates、inspection、历史 DTO 和观察专用 facts 按消费需求构建。

### 观察与公开投影

blocker summary 直接聚合 Core 的 pending/non-completed dependency 与 observation counters，并查询同源动态 mutex readiness；resource claim fit
与 selection 共用同一判断，不从 inspection DTO 重建 Map/Set。summary 的 dependency → mutex → resource 分类独立于
public primary rejection：root/scoped capacity reason 不能遮住 resource shortage。measurement 通过同源 readiness/capacity 查询与 transition delta 维护自己的分类聚合，
不先构完整 inspection 或 public rejection payload；具体维护边界见下文 collector。

execution candidates 先从 relation-ready membership 动态筛除 held mutex；它与 running/settled IDs、public catalog/inspection、Scheduler inspection、cancellation 共读 Core memberships，
只遍历所需成员而非每种 kind 重扫全图。candidate `canAdmit` 不缓存；public catalog 对全部 pending 投影 reason 是必要读取。
声明顺序与 public lexical rank 排序、DTO 冻结、running mutex 去重呈现是合法边缘投影，不是新的状态/判断 owner。
有序成员按 immutable membership identity 惰性 memo；public lexical memo 另绑定 compiled graph ranks，WeakMap 不强留旧 snapshot。
缓存只复用已请求的顺序，不缓存动态 `canAdmit` 或把不同 fork 的事实混用。
只有实际读取 `admissionState` 才构造 opaque public wrapper，catalog/inspection DTO 各自在 getter read 时物化；
普通运行不为未消费的推演视图付出构造成本。
static scope selection 复用 compiled graph 的 scope/activation/rank 索引与 immutable active-root 有序视图。
三条 group-head queue 按 tightening → constrained continuation → ordinary 消费：

- **tightening / continuation：** 先按 cap 从小到大、priority 从高到低、scope ID / Task ID lexical 顺序选择，再判断 admission；被选 head 暂时不能运行时 wait，不以 ordinary work backfill。
- **ordinary：** 先考虑 canAdmit，再按 priority 从高到低与声明顺序选择。

custom seam 消费完整 declaration-order、frozen 的 relation/mutex candidates。diagnostic blocker、candidate facts 与 eligibleCount
从同一 captured Core 延迟完整投影，后续 boundary 或其它 fork 的推进不改变这些事实；diagnostics 的完整动态 evidence
不因策略声明 subset 而削减。

graph diagnostic fingerprint 在 Scheduler invocation 内惰性计算一次，仍使用 immutable graph DTO 的原始 `JSON.stringify` 字节和 SHA-256；
graph record 与后续 decision 引用同一值，不跨 Run 缓存，也不从 logger shape 推断事实需求。

## Public prepared admission-strategy lifecycle

完整 graph 已验证且未在 pre-work/planning 取消时，调用顺序如下：

```text
Invocation: graph ready → simple closure | await prepared prepare once
                                        │
                                        ▼
Scheduler: receives frozen synchronous policy → decide 0..N times → stops admission → drains
                                        │
                                        ▼
Scheduler: seals terminal context → enabled internal summary → configured generic terminal effects
                                        │
                         terminal context returned? ── no → no terminal-effect delivery
                                        │ yes
                                        ▼
Invocation: public prepared terminalEffect once → aggregate output
```

Invocation 为每 Run 解析一次 simple closure 或 prepared result；prepare failure 在 Scheduler 前形成 `admission-strategy-preparation-failed`。Scheduler 只收到 frozen synchronous policy，不接触 public `prepare` / `terminalEffect`。它停止 admission 并 drain started work，交付 sealed context 后，Invocation 才至多一次交付 `terminalEffect`。跨 Run 学习由[learned helper](package-tools.md#learned-critical-path-helper-owner)承接，不获得 Scheduler 特权。

同一 Run 中需要 graph 的 strategy preparation、decision 与 terminal delivery 复用同一个 frozen graph snapshot；pre-admission settlement 不重建静态图，继承的 scope/resource facts 与 root cap 保持同一次验证结果。

在任何 admission 前，Invocation 先处理 cancellation precedence，再完成[唯一 flag selection/control](project-definition.md#flag-enabled-checks)。这些 pre-admission settlements 留在同一 graph；Scheduler 仍负责 dependent blocking 和 observation readiness，不另建传播图。

Shell 的 frozen-policy 检查与 static compile 先于 pre-admission work。随后按输入顺序处理每项 settlement：
先拒绝该项 unknown/duplicate ID，再调用 prerequisite satisfaction callback 并记录实际 value。全部输入处理后，
一次建立包含这些 settlement kinds 的 Core seed。因此 callback throw 优先于后续输入的非法 ID；
首次 reducer reconciliation 拥有 ordered blocked effects 与 observer 通知，seed 本身不派发 forced effects。

custom throw、thenable、malformed proposal、illegal select 或不可 drain wait 都是 policy fault：停止新 admission、受控取消 pending Tasks、drain started work，最后以 `admission-policy-failed` 结束，绝不 fallback static。诊断仅记录 bounded fault category 与 hard-guard facts，不接收 raw callback value、stack 或 caller data。public callback 虽收到 frozen context，仍是 trusted host code，不是 sandbox。

## Measurement collector 与 immutable context

消费者需求按所属边界验证和固定，在 Scheduler 启动前收齐并汇总真实依赖及执行/诊断义务，形成不可变生产配置。
function、缺省/undefined needs 和 [] 均为零需求；生产并集不作为交付字段集合。
每个消费者只取得自己声明的 own data fields，外层冻结且不保证跨消费者 identity 相同。
同 Run graph 按需构造一次并复用，同 boundary 不可变投影可共享；旧 state/fork/reader 不随后续执行改变。

存在 cumulative、actionHistory、runMeasurement、taskTimings 或 effective diagnostics 的真实依赖时才创建
invocation-local timing collector，通过 private handoff 接收 clock 与既有 declarative fingerprint。
仅 execution/state 或零需求且无诊断义务时，不创建 collector、不读额外 measurement clock；Check duration clock 属既有结算义务。

| 启用组 | 维护与物化边界 |
| --- | --- |
| cumulative | 保持 bounded counters/peaks、accepted wait 与 slot/capacity integrals；decision 前 flush、固定 view；不维护 history、逐 Task delay/chronology 或 Run tail。 |
| actionHistory | 首个 accepted action 前启用 sequence/effects/post-state interval；下一实际 callback 前 append frozen observation，交付 captured end-count reader；不建逐 Task delay 表。 |
| runMeasurement | 保持 Run counters/peaks、Run timing、control/diagnostic timing 与 tail，seal 时物化；不含 admissions，也不启用 history 或逐 Task delay 表。 |
| taskTimings | 从首个采样前启用 admission-viable 分类 delay 与 admission/settlement chronology；seal 时按原顺序物化；不启用 history、Run tail 或无消费者 aggregate DTO。 |

组间只因真实生产依赖共享中间量，不能先 full 后裁剪。diagnostics 的完整 decision/summary 证据是独立固定义务，
但不无条件启用无人使用的 actionHistory。字段与统计公开含义由[调度指南](../guides/scheduling.md#在线选择时读取-observation-prefix)定义。

每次实际 custom callback 前，启用的 history flush open interval、append 已完成 action observation，再创建固定 prefix reader。
它从 accepted select/wait 的 post-state 延续到下次实际 callback 前，包含期间 admitted/settled effects，不宣称 action causality。
blocked/cancel/settlement 不创建 callback，只有 pending action 才形成 since-action effect；policy fault 不形成有效 action。

所有启用 timing 组共享唯一 collector clock、原采样边界与 first-fault validity。clock throw/non-finite/backward 或
启用计算的 invalid interval/integral 使后续 timing 不可用；关闭组不为发现 fault 而计算。合法 zero span 仍有效。
cumulative/runMeasurement 保留离散事实和 peaks，taskTimings 不交付伪造数值，history 保留离散 action/effects 并以不可用 interval 继续。
每个 reader 固定自身边界的 availability、数值与 prefix，之后 fault/append 不回写旧 view。保持原单位、采样边界与 interval 归属；
累加算法与最后几位舍入可变化，精度及检查点由下节定义。getter 不推进 clock，也不通过读取顺序改变 availability。

shell 继续拥有真实执行离散事实，collector 独占 clock、interval、积分和 history，不创建第二 Scheduler state 或 admissions truth。
可选 ShellAdmissionFacts 在成功 pending-to-running 且安装 running entry 后记录 first-admission 顺序；pre-admission、blocked、
pending cancellation 不算 admitted，settled projection 只消费既有 settlements。只有 execution 或其它真实顺序依赖才建此 ledger。

terminal runMeasurement 保留 fingerprint、离散 lifecycle、queue peaks 和可用时的 Run timing；taskTimings 单独交付
closed timing union 与可用时的 admissions。Task value/error/callback、clock、mutable collections 和 human summary projection 不进入观察 facts。
summary 的 top-N、ratio、queue total 与 tail contributor 由[人读输出 owner](human-output.md#scheduler-summary-projections)推导。

### 增量分类与惰性等待

`measurement/queue.ts` 拥有分类聚合与惰性等待，协同 `measurement/queue-constraints.ts` 仅在 collector 已启用时建立
measurement-only 反向索引。后者只编译索引并定位 delta 影响的组，分类与合法性判断仍由 Core 查询拥有。
分组复用 Core constraint groups 的等价关系：
完整 mutex-ID 集合、canonical resource claims（含 units）以及 tighter-scope/activation 维度。异量 claims 不能仅按 resource ID 合组。
分类顺序仍为 mutex-blocked → capacity-blocked → admissible-pending；admission-viable 与分类含义见
[summary owner](human-output.md#scheduler-summary-projections)。

组保存成员数与 local kind，root/当前 active-scope capacity 用一个共享 global gate 表达。mutex 只在 holders 跨零时定位相关组，
resource 与 inactive activation cap 用有序 threshold 索引定位实际跨越阈值的组；membership 直接消费 Core delta。
shared gate 翻转只改变全局 open/closed 时钟与计数解释，不给所有组或 pending Tasks 重新打标签，多来源 blocker 仍由 Core 完整 accounting。

逐 Task delay 以组类别累计时钟与进入标记惰性结算：组 local kind 改变时先结清该组时钟，成员离开、admission 或终态物化时
减去自己的精确进入标记。每个 interval 只推进共享 elapsed/open/closed 时钟，不逐 pending Task 累加。
只请求 peaks/counts 时不建立逐 Task delay marks；无 collector 时不维护这些观察专用索引。

### 精确计算、精度与 availability

`measurement/exact-time.ts` 以 BigInt 保存 Run-local 二进制时间单位。首次有效 sample 为 positive normal 时，
由 DataView 的 binary64 exponent bits 取其 binade exponent E，固定单位为 `2^(E-52)`；首 sample 非正或 subnormal 时使用 `2^-1074`。
单位只从既有首个 clock call 选择，随后保持不变；不得用有舍入的 `Math.log2` 推断。
clock guard 保证后续有效 sample 不小于首值，因此所有 sample 都可在该单位精确表示，不发生采样量化。
该表示不是新公开时间分辨率；独立 Run 不共享单位。

对有限 binary64 sample 的精确实值做差、乘非负整数 count/capacity、累计与 prefix subtraction，全部采用精确整数运算。
每个被交付结果完成本地运算后一次 round-to-nearest/ties-to-even 转回 Number；巨大共享 prefix 不吞掉微小局部区间，
private prefix 即使超出 Number range，也不决定真实有限差值的 availability。summary 的精确合计、跨度与商同样在最终结果处一次舍入，
而非把已舍入的 DTO 再相加或相除；投影含义由[人读输出](human-output.md#scheduler-summary-projections)拥有。

采用门禁以每个结果自己的贡献区间为准：令 `S = Σ wᵢ(bᵢ-aᵢ)`，n 为该结果的非零贡献数，
与直接非负逐项 Number 累加 `fl(Σ fl(wᵢ fl(bᵢ-aᵢ)))` 比较。
在有限且无中间 overflow、`(n+2)u < 1`（`u = 2^-53`）时，直接基准前向误差不超过 `γ_(n+2) S`，
其中 `γ_k = ku/(1-ku)`；精确累计后一次舍入的 normal 结果误差不超过 `uS`，subnormal 积分/等待结果精确。
空结果精确为零。由于整数权重与 sample 均为 `2^-1074` 的整数倍，这些运算的 subnormal 精确结果不会另有下溢损失。
超出该相对误差域时，仍以精确目标的正确舍入和可表示性判定，不放宽经验容差，也不按全 Run 的巨大累计量放宽局部 delay 误差。

utilization 的精确分子/分母先形成有理商，再用整数 div/rem 与 ties-even 舍入；normal 商误差不超过 `uR`，
subnormal 商的绝对误差不超过 `2^-1075`。零分母或数学比值不在 `[0,1]` 内仍投影为 null。
若直接累计分子/分母的相对误差界分别为 `γ_a`、`γ_b`，且 `γ_b < 1`，再做一次 normal Number 除法的保守相对界为
`(1+γ_a)(1+u)/(1-γ_b)-1`；subnormal 商还须计入绝对半个最小单位的舍入项。
精确商的一次舍入不劣于该基准；零分子精确为零，不能假设比值也是时间单位的整数倍。

availability 在实际请求的生产检查点确定：state/online checkpoint 验证所需 aggregate，action observation append 前验证该局部 interval，
terminal seal 前验证逐 Task 及实际启用 summary 的全部派生结果（含 control/wait/span）。available 的时长、等待与积分均为 finite、non-negative；
无法有效表示使用既有 `integral-invalid`，clock throw/non-finite/backward 与非法 interval 保留各自首次已确定原因。
全部 terminal 数值先统一验证，再交付任一字段或 effect；getter 只读已固定事实，后续 fault 不回写旧 reader。

## Terminal effects 与 delivery

停止 admission 且全部 started work drain 后，Scheduler seal 同一终态事实边界，按需要生产 graph、admitted/settled kind-only execution、Run measurement 与逐 Task timings，再为每个消费者分别投影精确冻结视图。交付与 collector 是否存在分离，none/graph/execution-only effect 仍取得 sealed context；没有 collector 不能作为跳过 effect 的条件。diagnostic-enabled internal summary wrapper 与 caller terminal effects 使用同一 ordered runner，不保证外层 context identity 相同，prepared effect 也按自己的需求取得精确视图；summary wrapper 包含 projection/writer failure，runner 只执行各 wrapper 的 failure policy，不识别 summary identity。

sync/async terminal effects 逐个 await，effect elapsed 不计已 seal 的 measurement；一个 caller terminal effect throw/reject 不阻止后续 terminal effect，也不改写 sealed facts。Scheduler 返回完成 delivery 的 sealed terminal facts 后，Invocation 才交付 `terminalEffect`；成功 terminalEffect 不能覆盖已记录的 generic terminal effect failure。

nonempty caller terminal effects 或 successful prepared result 实际含 terminalEffect 才启用 terminalEffects output；无 sealed context 时 enabled output 保持 not-run。所有实际 participants 成功才 succeeded，任一失败即 failed。无 primary failure 时按输出指南形成保留完整 facts 的 output failure；已有 cancellation、policy fault 或其它 primary failure 时只记录 terminal effect status，不覆盖 primary kind/diagnostic。pre-work/planning 没有 context，不交付 terminal effects；summary writer failure 属于 diagnostic writer containment，不是 caller terminal effect failure。

terminal effect identity/source/closure 与 contextNeeds 不进入 fingerprint；该 seam 不创建 effect registry、machine/progress/Check facts 或自动学习。修改此链路时核对相邻 scheduler、invocation 与 output tests；capacity/hard-guard 变动还须同步审查[summary denominator、queue 分类与 boundary](human-output.md#scheduler-summary-projections)。

## 验证边界

Scheduler diagnostic Case 只证明 shell-owned human observation。scripted clock 分别证明 timing unavailable 与有效 zero span、single terminal summary attempt、writer containment、declarative-configuration matching、离散 facts，以及 capacity/wait/queue/delay/tail 投影。
独立低优化 trace oracle 核对 action/rejection/effect、seed viability、取消单次结算及 fork；独立数值 oracle 不复用 Product 的
DataView decode/rounding，而以二进制有理数及相邻 Number 距离/tie parity 验证精度、极值、局部消减和读取顺序。

queue evidence 使用同一 admission-viable pending 集合，证明 mutex/capacity/admissible 三类互斥 task·ms 与各自 peaks；named shortage 与 root/scoped shortage 共用 capacity 分类。graph/core/shell evidence 另证明 claims validation、atomic accounting、无关 work 可填充 root slot 和 settlement release。delay 三类 breakdown 必须完整组成 delay；tail 证明 last-admission post-state active count 与有界 contributors，不把结果解释为 policy 原因或 critical path。

formula/state-boundary tests 属于 Scheduler；logger formatting tests 只证明 bounded safe rendering，machine/public/progress tests 证明 summary 不扩张原契约。future fail-fast 或 capacity/hard-guard 变化后，须重审 denominator、queue classification、boundary 和 wait evidence。

learned helper 的 history/model tests 单独证明 local-state read、closed parser、prediction、record/atomic write 的 empty-model 与 persistence-failure 边界；无法预测时单次 static fallback 以[helper owner](package-tools.md#learned-critical-path-helper-owner)及公开指南为准。模型参数不因此变成稳定 API，也不扩张 Check/Record/machine/progress/RunResult 契约。

## 状态索引与投影的成本边界

Core 查询按所需 memberships 访问成员，transition 按变更 Task 和 relation reverse fanout 更新 readiness；mutex occupancy 不承担
cohort fanout。scope activation 编译先为每 scope 的 activation IDs 建 Set，再按 Task 查所属 scope。
A 为 activation 声明总数、N 为 Task 数，标记阶段为 O(A+N)；graph validation 与其错误顺序不变。

static 查询按 rank 消费必要的 group-head 前缀并读取其 constraint 项；有可运行高优先级 head 时，即使 G=N
也无需枚举全部组。rank 编译承担一次全局排序，frontier 承担 persistent heap/Map/Set 更新、scope 重分类与 tombstone 清理。
暂时阻塞的前缀仍需动态判断；全阻塞、复杂共享资源、custom/full observation 和 active-root 数量分别计成本，
这一索引不构成整个 Scheduler 的普适复杂度上界。
query-local heap 仅在继续遍历时分配，但其合法 root ESM `Heap` import 随 Product 模块加载，冷启动和模块 retained memory
仍需计入整体成本，不能把按需构造误写成按需加载依赖。
custom/public/diagnostic 完整读取另承担 relation-ready 遍历、mutex 筛选、排序、member DTO/freeze 与 catalog reason 物化；
measurement 与 Shell payload 的成本独立保留。结构证据只证明这些访问与更新路径；具体 workload 的 wall-clock 或内存收益需要对应测量。
collector 的 clock、integrals、history、delay 与 Shell 的执行 payload 按上文职责独立维护。

### 静态图校验

静态 validation 的 direct overlap 在完成两类引用校验后以 observation Set 查询，仍按 dependsOn 声明顺序报告首个 overlap。
每个 multi-task scope 从 terminal 沿 depends/observes 做一次完整 reachability，再按该 scope 的 Task 声明顺序验证 membership；
singleton terminal scope 不遍历关系。若 scope 可达子图为 Vₛ/Eₛ，reachability 为 O(Vₛ+Eₛ)，不再逐 member 重走；不同 scope
仍独立校验，不宣称整个多 scope validation 为 O(V+E)。首错仍遵守 scope cap → terminal → activation → reachability 的原顺序。

### Shell 与状态更新

Shell 通过 pending Map 按 ID 查找/删除被准入、forced-block 或 pre-admission 的 Task；取消以剩余 declaration
顺序逐个移除和结算。该 Map 只拥有 payload，不替代 Core membership。active-root 数组未变化时，transition 不重新搜索 active
membership；关闭一个 inactive terminal 也不复制数组。真正 activation/active terminal closure 仍维护原有有序数组，动态 blocked
head 前缀仍在查询时重新判断；它们的成本没有由本次局部消重消除。

### Measurement 与完成顺序

collector seed 与索引建立保留按 Task/constraint 的必要工作；每个 interval 的 count/integral 更新不再扫描 pending，
局部分类变化按实际受影响组、阈值跨越及 membership 计成本。完整 terminal per-Task 表仍需枚举并按公开顺序排序；
启用 summary 才在该必要输出工作中形成精确 queue/delay 合计。BigInt 的位宽与 prefix 增长影响运算及 retained memory，
不能把常数次精确算术称为与位宽无关的 O(1)，也不能据此声称所有 demand/workload 都更快。

running completion 仍逐 wait 使用 Promise.race：多个 completion 已 resolved 时，按当前 running Map 的注册顺序取首；
completion FIFO 不能替代这一行为。
