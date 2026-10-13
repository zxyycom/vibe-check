# Scheduler admission 与终态交付

本文拥有 `src/project-run/task-scheduler/**` 的 admission reducer、real shell、measurement collector 与终态 handoff 不变量；[Architecture](architecture.md#组件如何协作)说明它在 Run 中的位置。公开配置、custom callback 和 measurement 语义由[调度指南](../guides/scheduling.md)定义，独立模拟见[模拟调度分支](../guides/simulating-admission.md)，用户输出状态由[输出指南](../guides/run-outputs.md#输出状态与失败处理)定义。

## Admission state 与 real shell

### Core 状态与查询职责

`admission-core/**` 一次编译 immutable graph、named-resource slots 和公开排序 ranks，以 persistent List statuses/counters 与 Set memberships 保存 immutable dynamic state，同一 pure reducer/canonical effects 完成 selection transition。running seed、admission 与任意 settlement 都经过它更新 occupancy，使 static/custom proposals、standalone simulation 和 real shell 使用同一 legality。

raw Task graph 入口先校验 root cap 并执行 `prepareTaskGraph`；内部 prepared 入口只接受绑定 immutable graph 与
同一 validated root cap 的私有 capability。Invocation 的已准备图由 strategy、execution 和 Scheduler 在本 Run 内复用；
独立 simulation 与 raw Scheduler 各自关闭其输入。

`createAdmissionGraph` 从独立 static input 建立 initial state；custom callback 的 `admissionState` 从 live Core boundary 取得同型 immutable handle。二者只投影 frozen inspection/catalog/validation 和 hypothetical `select` / binary `settle` successor。静态 capacities/claims 用 canonical `{ resourceId, units }[]`；inspection 投影 occupancy，不提供 mutable counter 或资源操作 capability。同一 callback 重读保持 handle identity；旧 state 不随真实调度变动。

Core 的查询职责分为两层，消费者直接读取所需事实或判断：

| 查询 owner | 责任与消费者 |
| --- | --- |
| `state-query.ts` | status、成员与 scope lifecycle 事实，供 selection、projection、ID 查询和 measurement 使用。 |
| `selection-query.ts` | 基于状态事实完成 selection、readiness/capacity 判断与 rejection payload，供执行、推演和观察使用。 |

Core 独占 pending/running/settled task-slot memberships、relation+mutex-ready candidate membership、scope lifecycle 与 constraint occupancy。
seed 以同一 relation/mutex predicate 建立 candidate membership；transition 只刷新变更 Task 与已有 relation/mutex reverse fanout。
capacity 不进入 candidate membership：root count、active/activating scope 与 resource units 每次查询动态判断，因此暂时容量阻塞者
不会永久退出 ready 集合，scope/资源 release 不需要另一套失效规则。persistent successor 不改旧 state 或另一个 fork。

### Shell 执行与准入边界

real shell 拥有实际 pending Task 队列、runningById 的 Task/Promise、settlement value/error、signal、diagnostic、
measurement 与 RunResult；admission/cancellation 从这些负载中取得实际工作。scope lifecycle、mutex holders 与容量事实
由 Core 提供。Shell 应用 reducer effects 后仍执行 callback-return hard guards。

Scheduler 负责 graph validation、readiness、dependency/mutex admission、root/scoped budget、atomic named-resource accounting、cancellation、blocked settlement 与 Task lifecycle。每次 proposal 后重检 pending/candidate membership、capacity 与 lifecycle cutoff；`wait` 仅在 running work 可 drain 时合法。priority 是 immutable graph metadata，不存在旁路 map/list；static policy 在相同 priority 规则下优先考虑 `canAdmit` candidate，避免被资源阻塞的 Task 浪费 root slot。

policy 只返回决定，Scheduler 不解释公平、防饥饿或等待理由；static tightening/continuation 每轮重算，不保存 reservation、sticky target 或策略状态。Task engine 不解释 Check terminal grammar、Records、scanner payload 或 aggregation。

static/no-observer 直接查询同一 core 的候选、active scopes 与容量，不构造完整 inspection、历史 DTO 或观察专用 candidate facts。diagnostic decision 的 blocker 与 candidate projection 延迟到该 captured boundary 的观察消费，不能读后来状态；启用 diagnostics 时完整动态 evidence 不因策略声明 subset 而削减。

### 观察与公开投影

blocker summary 直接聚合 Core 的 pending/non-completed dependency、observation 与 held-mutex counters，resource claim fit
与 selection 共用同一判断，不从 inspection DTO 重建 Map/Set。summary 的 dependency → mutex → resource 分类独立于
public primary rejection：root/scoped capacity reason 不能遮住 resource shortage。measurement 同样直接读取 Core pending
membership、readiness 和 capacity classification，不先构完整 inspection 或 public rejection payload。

execution candidates 与 running/settled IDs、public catalog/inspection、Scheduler inspection、cancellation 共读 Core memberships，
只遍历所需成员而非每种 kind 重扫全图。candidate `canAdmit` 不缓存；public catalog 对全部 pending 投影 reason 是必要读取。
声明顺序与 public lexical rank 排序、DTO 冻结、running mutex 去重呈现是合法边缘投影，不是新的状态/判断 owner。
只有实际读取 `admissionState` 才构造 opaque public wrapper，catalog/inspection DTO 各自在 getter read 时物化；
普通运行不为未消费的推演视图付出构造成本。
static scope selection 复用当前 compiled graph 的 scope/activation 索引，
仅为当前 active scopes 建 Set；候选 fold 保留 cap、priority、scope ID、Task ID 顺序和相等时的声明顺序。

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

Core 查询按所需 memberships 访问成员，transition 按变更 Task 和 reverse fanout 更新 readiness；成本包括 seed、
persistent Set backing 与 fanout update。边缘投影另承担排序、member DTO/freeze 与 catalog reason 物化。
结构证据只证明这些访问与更新路径；具体 workload 的 wall-clock 或内存收益需要对应测量。
collector 的 clock、integrals、history、delay 与 Shell 的执行 payload 按上文职责独立维护。
