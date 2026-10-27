# Scheduler 准入与执行

本文拥有 `src/project-run/task-scheduler/**` 的 admission reducer、real shell 与策略交接不变量；观察和终态交付由[观察专题](scheduler-observation.md)拥有；[Architecture](architecture.md#组件如何协作)说明它在 Run 中的位置。公开配置、custom callback 和 measurement 语义由[调度指南](../guides/scheduling.md)定义，独立模拟见[模拟调度分支](../guides/simulating-admission.md)，用户输出状态由[输出指南](../guides/run-outputs.md#输出状态与失败处理)定义。

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

按需采集、固定 reader 与 availability 的职责见[调度观察与终态交付](scheduler-observation.md#measurement-collector-与-immutable-context)。观察消费同源 Core facts 和 delta，不成为第二状态真相或回写执行；精度及 oracle 由[测量精度](scheduler-measurement-precision.md)拥有。

### 精确计算、精度与 availability

数值目标、有效域和检查点见[测量精度](scheduler-measurement-precision.md)。

## Terminal effects 与 delivery

停止 admission、drain 后 seal，先交付内部 summary 与 Definition effects，再返回 Invocation 交付 prepared `terminalEffect`；没有 collector 也不能跳过 effects。完整按需投影、顺序与失败隔离见[调度观察与终态交付](scheduler-observation.md#terminal-effects-与-delivery)。

## 准入索引实现细节

### Constraint groups 与静态 frontier

compiled graph 将动态 mutex/resource fit 和静态 scope layer 相同的 Task 编入同一 constraint group；
tighter-than-root 指 scope 的 maxParallel 小于 root maxParallel：

| 分组维度 | 等价条件 |
| --- | --- |
| Mutex | mutex ID 集合相同；occurrence 数量仍由 occupancy 和公开 rejection 各自保留。 |
| Resource | canonical resource claims 相同。 |
| Scope | tighter-than-root scope ID 与 activation 标记相同；non-tighter scope 可合组，实际 activation/close effects 仍按被选 Task 产生。 |

frontier 维护 relation-ready 成员的 ordinary 与 constrained 顺序，并消费同一 transition 的 membership 变化；它不拥有独立 readiness 或 legality。任意 selection、forced settlement 和 cancellation 都可移除非 head；旧 state 与 fork 保持独立且合法。static selection 按前文三层顺序查询同源 mutex/capacity，动态阻塞的前缀仍需逐项判断。

索引采用 persistent backing；更新与查询不得修改既有快照，forced 队列也不得重复结算已取消 Task。具体 queue、revision 和清理机制以相邻源码为准，其成本边界见下文。

## 验证边界

独立低优化 trace oracle 核对 action/rejection/effect、seed viability、取消单次结算及 fork。graph/core/shell evidence 证明 claims validation、atomic accounting、无关 work 可填充 root slot 和 settlement release。观察、queue/delay 与终态交付的证据见[观察专题](scheduler-observation.md#验证边界)。

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
collector 的 clock、integrals、history、delay 与 Shell 的执行 payload 按[观察专题](scheduler-observation.md)独立维护。

### 静态图校验

静态 validation 的 direct overlap 在完成两类引用校验后以 observation Set 查询，仍按 dependsOn 声明顺序报告首个 overlap。
每个 multi-task scope 从 terminal 沿 depends/observes 做一次完整 reachability，再按该 scope 的 Task 声明顺序验证 membership；
singleton terminal scope 不遍历关系。若 scope 可达子图为 Vₛ/Eₛ，reachability 为 O(Vₛ+Eₛ)，不再逐 member 重走；不同 scope
仍独立校验，不宣称整个多 scope validation 为 O(V+E)。首错仍遵守 scope cap → terminal → activation → reachability 的原顺序。

### Shell 与状态更新

Shell 通过 pending Map 按 ID 查找/删除被准入、forced-block 或 pre-admission 的 Task；取消以剩余 declaration
顺序逐个移除和结算。该 Map 只拥有 payload，不替代 Core membership。active-root 变化需要维护有序视图；动态 blocked head 前缀仍在查询时重新判断，并计入实际成本。

### 完成顺序

running completion 仍逐 wait 使用 Promise.race：多个 completion 已 resolved 时，按当前 running Map 的注册顺序取首；
completion FIFO 不能替代这一行为。
