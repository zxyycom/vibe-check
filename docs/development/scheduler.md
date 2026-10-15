# Scheduler admission 与终态交付

本文拥有 `src/project-run/task-scheduler/**` 的 admission reducer、real shell、measurement collector 与终态 handoff 不变量；[Architecture](architecture.md#组件如何协作)说明它在 Run 中的位置。公开配置、custom callback 和 measurement 语义由[调度指南](../guides/scheduling.md)定义，独立模拟见[模拟调度分支](../guides/simulating-admission.md)，用户输出状态由[输出指南](../guides/run-outputs.md#输出状态与失败处理)定义。

## Admission state 与 real shell

### Core 状态与查询职责

`admission-core/**` 一次编译 immutable graph、named-resource slots 和公开排序 ranks，以 persistent List statuses/counters、Set memberships 与 Map 分组 frontier 保存 immutable dynamic state，同一 pure reducer/canonical effects 完成 selection transition。running seed、admission 与任意 settlement 都经过它更新 occupancy，使 static/custom proposals、standalone simulation 和 real shell 使用同一 legality。

raw Task graph 入口先校验 root cap 并执行 `prepareTaskGraph`；内部 prepared 入口只接受绑定 immutable graph 与
同一 validated root cap 的私有 capability。Invocation 的已准备图由 strategy、execution 和 Scheduler 在本 Run 内复用；
独立 simulation 与 raw Scheduler 各自关闭其输入。

`createAdmissionGraph` 从独立 static input 建立 initial state；custom callback 的 `admissionState` 从 live Core boundary 取得同型 immutable handle。二者只投影 frozen inspection/catalog/validation 和 hypothetical `select` / binary `settle` successor。静态 capacities/claims 用 canonical `{ resourceId, units }[]`；inspection 投影 occupancy，不提供 mutable counter 或资源操作 capability。同一 callback 重读保持 handle identity；旧 state 不随真实调度变动。

Core 查询区分状态事实与选择判断，消费者直接读取所需内容：

| 查询 owner | 责任与消费者 |
| --- | --- |
| `state-query.ts` | status、成员与 scope lifecycle 事实，供 selection、projection、ID 查询和 measurement 使用。 |
| `selection-query.ts` | 基于状态事实完成 selection、readiness/capacity 判断与 rejection payload，供执行、推演和观察使用。 |
| `static-selection-query.ts` | 按既有策略层级消费全局有序 group heads，复用同源 mutex/capacity 判断。 |

Core 独占 pending/running/settled task-slot memberships、relation-ready membership、scope lifecycle 与 constraint occupancy。
seed 与 transition 以同一 relation predicate 维护 pending 且 depends/observes 已解决的成员；transition 只刷新变更 Task 与
relation reverse fanout。mutex holders 按变更 Task 的声明 occurrences 更新，query 读取同源 holders 与 legacy external mutex
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
inactive/active/closed lifecycle，once-activated counter 不能代替当前 active root。

frontier 与 memberships 在同一 seed/transition owner 中维护，不拥有另一套 readiness 或 legality。任意 custom selection、forced
settlement 与 cancellation 可移除非 head 成员；transition 当场推进受影响组的 live heads，延后留存的非 head tombstone 以后
只在 transition 中弹出，query 不重复从旧 head 扫描。每条单调分支中，每个 Task 至多进入 relation-ready frontier 一次，各排序
heap 中的对应节点至多弹出一次；旧 state/fork 保持自己的 persistent 分支。

`static-frontier.ts` 为 tightening、continuation、ordinary 各保存一条全局有序 group-head queue。
`selection-frontiers.ts` 在 relation 变更时更新受影响组，在实际 active-root 变化时重分类该 scope 的组；
current active-root Set 与原有有序 roots 同步，历史 once-activated counter 仍只承接生命周期。
每次 head 或 layer 改变推进 group revision，旧节点即使再次成为同一 Task head 也不能复活；transition 清理失效 roots，
query 在跳过动态阻塞 head 时只处理所需有序前缀，保留旧 state/fork。

ready、static 和 forced frontier 共用 Scheduler-private persistent Task queue 的不可变 backing。
ready/static preference 来自 compiled 全局 ranks，仍保留每组相同的 ordinary/constrained 内部顺序；
forced 保留 descending task-slot 顺序。revision 是 entry identity，不是 Task priority 或另一套 legality。

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
public primary rejection：root/scoped capacity reason 不能遮住 resource shortage。measurement 同样直接读取 Core pending
membership、readiness 和 capacity classification，不先构完整 inspection 或 public rejection payload。

execution candidates 先从 relation-ready membership 动态筛除 held mutex；它与 running/settled IDs、public catalog/inspection、Scheduler inspection、cancellation 共读 Core memberships，
只遍历所需成员而非每种 kind 重扫全图。candidate `canAdmit` 不缓存；public catalog 对全部 pending 投影 reason 是必要读取。
声明顺序与 public lexical rank 排序、DTO 冻结、running mutex 去重呈现是合法边缘投影，不是新的状态/判断 owner。
只有实际读取 `admissionState` 才构造 opaque public wrapper，catalog/inspection DTO 各自在 getter read 时物化；
普通运行不为未消费的推演视图付出构造成本。
static scope selection 复用 compiled graph 的 scope/activation/rank 索引与 persistent active-root membership。
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

消费者需求按 preparation、decision、terminal 分别验证并合并，只生产对应 phase 请求的字段与必需依赖。同一 phase 共享冻结对象，类型只保证自身声明字段；其它消费者可能增加字段，因此需求不是权限隔离。未声明的 legacy callback 保留 full；none 只是不增加字段需求，不取消调用。各次 decision boundary 的动态投影 detached，静态 graph 可在同一 Run 复用。

存在 effective diagnostics、decision measurement 或 terminal rawMeasurement demand 时才创建 invocation-local collector。它通过 private handoff 接收 clock 和已有 declarative fingerprint；static 或 opt-in custom 无采集需求时不创建 collector、不读取其额外 clock。terminal none/graph/execution 不因此启动完整采集，另一 phase 的 raw demand 也不强迫 decision 构建未请求的历史 DTO。原 function 的 full 需求与 diagnostics 仍保留完整采集成本。

每次请求在线 measurement 的实际 custom callback 前，collector flush open interval、append 已完成 action observation，再创建 captured-prefix reader。一个 Run 只冻结一次 graph DTO；context 的 `measurementCount` 固定 end-count，`measurementAt(index)` 同步读取此前 prefix，越界返回 undefined，旧 context 不能看见以后 append。cumulative view 只含 bounded scalar/peak/discrete facts，避免每轮复制 graph、完整 per-Task table 或 history。

每条 observation 从 accepted select/wait 的 post-state 延续到下次实际 custom callback 前，包含期间 admitted/settled effects，只描述占用状态而不宣称 action causality。interval 使用 closed timing union：available 才有数值 contribution，unavailable 只有 reason；合法 zero span 不等于 timing fault。

collector 在 admission、pending/running settlement、accepted wait 和 terminal boundary 采样，独占 interval attribution、mutex/capacity/admissible 分类、slot/capacity integral、wait accumulator、per-Task admission table、peaks 和 tail active sequence。它不创建第二套 Scheduler state 或 boundary event ledger。clock throw、non-finite/backward sample、invalid interval/integral 只令 raw timing unavailable，不改变 admission、取消或 settlement。

可选 `ShellAdmissionFacts` 由 execution owner 在成功 pending-to-running 且安装 running entry 后记录 first-admission 顺序，
是 terminal execution 与 collector admittedCount 的共同来源；pre-admission、blocked 和 pending cancellation 不算 admitted。
settled terminal projection 以既有 settlements 为唯一来源。无 execution/raw/online demand 时不采集 admission 顺序。

terminal raw facts 保留 declarative fingerprint、离散 lifecycle、queue peaks；timing 可用时另含 shell/slot/capacity/wait accumulations、每个 admission-viable Task 的分类 delay table 与 admission/settlement boundaries。Task value/error/callback、clock、mutable collection 和 human summary projections 不进入 raw facts。summary 的 top-N、ratio、queue total 与 tail contributor 由[人读输出 owner](human-output.md#scheduler-summary-projections)推导。

## Terminal effects 与 delivery

停止 admission 且全部 started work drain 后，Scheduler 一次形成并冻结 terminal phase union：按需包含 canonical graph、admitted/settled kind-only execution 与 raw measurement。交付与 collector 是否存在分离，none/graph/execution-only effect 仍取得 sealed context；没有 collector 不能作为跳过 effect 的条件。diagnostic-enabled internal summary wrapper 与 caller terminal effects 使用同一 ordered runner 和**同一 context object identity**，prepared effect 也消费该对象；summary wrapper 包含 projection/writer failure，runner 只执行各 wrapper 的 failure policy，不识别 summary identity。

sync/async terminal effects 逐个 await，effect elapsed 不计 raw measurement；一个 caller terminal effect throw/reject 不阻止后续 terminal effect，也不改写 sealed facts。Scheduler 返回完成 delivery 的 context 后，Invocation 才交付 `terminalEffect`；成功 terminalEffect 不能覆盖已记录的 generic terminal effect failure。

nonempty caller terminal effects 或 successful prepared result 实际含 terminalEffect 才启用 terminalEffects output；无 sealed context 时 enabled output 保持 not-run。所有实际 participants 成功才 succeeded，任一失败即 failed。无 primary failure 时按输出指南形成保留完整 facts 的 output failure；已有 cancellation、policy fault 或其它 primary failure 时只记录 terminal effect status，不覆盖 primary kind/diagnostic。pre-work/planning 没有 context，不交付 terminal effects；summary writer failure 属于 diagnostic writer containment，不是 caller terminal effect failure。

terminal effect identity/source/closure 与 contextNeeds 不进入 fingerprint；该 seam 不创建 effect registry、machine/progress/Check facts 或自动学习。修改此链路时核对相邻 scheduler、invocation 与 output tests；capacity/hard-guard 变动还须同步审查[summary denominator、queue 分类与 boundary](human-output.md#scheduler-summary-projections)。

## 验证边界

Scheduler diagnostic Case 只证明 shell-owned human observation。scripted clock 分别证明 timing unavailable 与有效 zero span、single terminal summary attempt、writer containment、declarative-configuration matching、离散 facts，以及 capacity/wait/queue/delay/tail 投影。

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

measurement 的 peak 与 interval 三类计数各用一次遍历，不创建三个 filter 数组；每个 pending Task 的 delay 仍按原 interval 顺序
逐项相加和检查 finite/non-negative，保留浮点累计、overflow 与 timing-unavailable 边界。因此 demand-enabled measurement
仍可能有累计二次的 pending classification/delay 工作，不能把这个常数改进描述为整体降阶。running completion 仍逐 wait 使用
Promise.race：多个 completion 已 resolved 时，它按当前 running Map 的注册顺序取首；completion FIFO 不能替代这一行为。
