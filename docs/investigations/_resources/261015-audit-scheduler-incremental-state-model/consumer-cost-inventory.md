# Scheduler 消费端、measurement 与公开契约清单

本文是 Investigation `261015-audit-scheduler-incremental-state-model` 的随附取证材料，保存消费切面、指标与交付约束，供复核
[报告正文](../../audit-scheduler-incremental-state-model.md)。以下“当前”均指形成时源码；现行执行安排沿报告正文进入 Change。

## 依据与阅读边界

- 源码时点：2026-10-15，`main` HEAD `d9f346fde00d0ec9b57cccdbc21c9f1cefff5927`；调查开始及写入前 `git diff --name-only -- src` 均为空。
- 方法：先用 CodeGraph search/callers 确认 `performanceState`、`admissionSelectionPolicyFor`、`runPreparedTaskGraph`、`decideScheduler` 与 inspection/scope helpers 消费者，再直接阅读文件。类名查询无结果及调用不充分处以限定 `src/project-run/**`、`src/project-definition/**`、`src/package-tools/learned-critical-path/**` 的 `rg` 补证。
- 已读稳定 owner：[Scheduler](../../../development/scheduler.md)、[调度指南](../../../guides/scheduling.md)、[推演指南](../../../guides/simulating-admission.md)、[Human output measurement](../../../development/human-output.md#scheduler-summary-projections)、[Definition context grammar](../../../development/project-definition.md#scheduler-terminal-effects)、[Run](../../../development/project-run.md)；并以当时的 Scheduler Draft 为问题背景。
- 本文覆盖 admission-core 外全部 production 模块（`graph-validation.ts` 的完整审计由本轮另一材料承接）、measurement 全部五个 production 模块，沿实际消费者追踪 context validation/types、Invocation、learned helper 和 summary。相邻 Core 文件仅为解释查询/投影成本而读，不替代主调查的 Core 状态清单。
- 证据限于源码和 owner 阅读，未运行测试、timing/profile、prototype 或 Gate，也未审阅测试 Case 全集。以下复杂度是条件化操作量分析，实测耗时、内存和候选正确性均待验证。

记号：`N`=静态 Task 数，`P/R/S`=当前 pending/running/settled 数，`V`=admission-viable pending 数，`Q`=relation-ready 数，`C`=过滤动态 mutex 后 custom candidates 数，`A`=active scope 数，`M`=named resource 数，`T`=scope 数，`B`=采样/状态边界数，`H`=在线 action observations 数。涉及 mutex/claim/relation 数组的检查另按实际声明长度计，不隐藏在“每 Task 常数”中。排序列指源码调用 `.sort`，不是断言引擎每种输入都达到某个时间上界。

## 文件覆盖与实际入口

| production 文件 | 当前责任、扫描与物化 | 消费/触发与判断 |
| --- | --- | --- |
| [graph.ts](../../../../src/project-run/task-scheduler/graph.ts) | raw graph closed-key、值、数组与 ID 归一化；resource mapping 按 ID 排序；task/scope lookup Map；静态 graph DTO 深冻结/数组复制；绑定 validated cap 的 capability | raw Scheduler / standalone 入口与 Invocation prepared graph。一次关闭输入的全量读取有必要；DTO/lookup 不是动态成员副本。完整结构约束委托 graph-validation。 |
| [graph-validation.ts](../../../../src/project-run/task-scheduler/graph-validation.ts) | 本文仅确认 graph.ts 的实际调用；不重复统计该文件内部循环 | 完整普查见 [Core 资源的编译索引清单](./core-state-inventory.md#静态事实与编译索引清单)。 |
| [execution-state.ts](../../../../src/project-run/task-scheduler/execution-state.ts) | seed `graph.tasks.map` 建 pending payload Map；pre-admission 输入顺序校验、删除、callback 与 settlement；Core 只接 kind；running payload、settlements payload、取消循环 | 每 Run seed 一次，之后执行/取消时更新；Task/Promise/value/error 是实际负载，不是同一 membership 索引。 |
| [shell-admission-facts.ts](../../../../src/project-run/task-scheduler/shell-admission-facts.ts) | optional admission ID 数组 append；count O(1)；读取 IDs 时 frozen copy | execution 或 collector demand 才创建。记录成功安装 running entry 后的首次 admission；不是计时或第二 settlement ledger。 |
| [scheduler.ts](../../../../src/project-run/task-scheduler/scheduler.ts) | 真实循环串接 Core transitions、hard guard、effects、Promise drain、collector boundary；admission 时复制 running keys；fault/cancel 时复制 pending IDs；forced effects slice | 每个动作/结算运行；collector 可选调用的参数也在 optional-call 短路下，无 collector 不计算 `performanceState` 或 tail 的 running copy。slice/replay 是 canonical effects 交付，不是重新做 legality。 |
| [scheduler-task-lifecycle.ts](../../../../src/project-run/task-scheduler/scheduler-task-lifecycle.ts) | Task 启动 Promise chain；`Promise.race([...runningById.values()].map(...))`；cancel 比较 pending IDs 后循环；终态按 graph 顺序 map 全部 settlements | 每次 await-running 复制/订阅 R 个 completion；build run 一次 N 输出。Promise 负载不属于多维成员索引；race 可替代但须决定并发完成 tie 语义，见下文。 |
| [forced-block-effect-replay.ts](../../../../src/project-run/task-scheduler/forced-block-effect-replay.ts) | 按 canonical effects 与对应 immutable post-state 顺序逐项 replay；每项 collector capture；有观察才构 decision context/freeze | 单次 settlement 可产生多 forced blocks，所以不能把一次 settle 当成仅一次 P 扫描。每项 callback/observer 的顺序具有实际意义，不宜一律合并边界。 |
| [scheduler-decision.ts](../../../../src/project-run/task-scheduler/scheduler-decision.ts) | live `decideSchedulerFromCore` 使用 authoritative state、scalar totals 与 lazy inspection；旧 `decideScheduler(snapshot)` 可 compile/seed/reconcile | live shell 不重建 snapshot。CodeGraph callers 与 scoped 源码检索只见旧入口被 tests/support 和旧报告 probe 使用；不应把旧入口重建成本归到当前每轮执行。 |
| [scheduler-decision-inspection.ts](../../../../src/project-run/task-scheduler/scheduler-decision-inspection.ts) | capacity scalar projection；blockers getter snapshot-local memo；inspection 类型声明 | 每 decision 构薄 context；blockers 未读不扫描 P。capacity 读取当前最紧 active root 而非重扫全部 Task。 |
| [scheduler-blocker-summary.ts](../../../../src/project-run/task-scheduler/scheduler-blocker-summary.ts) | `taskSlotsForCore(pending)` 后逐 P 读取 counters、动态 mutex、resource fit，依 dependency→mutex→resource 归类；另有 root/scope booleans | 诊断/decision blocker getter 首读才计算；当前 pendingBlockerFacts 会先算三个 boolean，不因 dependency 已真就避免后两项查询。输出是固定标量，无 Ω(P) 输出下界。 |
| [scheduler-decision-model.ts](../../../../src/project-run/task-scheduler/scheduler-decision-model.ts) | 冻结 trigger、blocked dependency/cancel IDs；decision candidates getter 缓存 DTO，eligibleCount getter 可重读共享 closure；forward lazy blockers | 这些是 detached boundary evidence，不是长期索引；冻结边缘副本有隔离义务，不证明所有复制均必要。 |
| [scheduler-admission-decision.ts](../../../../src/project-run/task-scheduler/scheduler-admission-decision.ts) | static 使用 group-head query；custom 无条件完整 `admissionCandidatesForCore`，非空才 callback；selected ID `.find`；candidate facts 为 lazy DTO；guard/fault shape validation | 即使 custom needs none，也先建立完整内部 C 集合；DTO 按需不等于内部候选发现按需。static/no observer 不物化完整候选；有诊断时 getter 被读取。 |
| [admission-selection-policy.ts](../../../../src/project-run/task-scheduler/admission-selection-policy.ts) | private policy contract 与 static singleton；static 同源 head query；私有 input 保留 inspection getter | main static 分支由 scheduler-admission-decision identity 快路处理。类型字段不意味着当前每轮读取 inspection。 |
| [custom-admission-policy.ts](../../../../src/project-run/task-scheduler/custom-admission-policy.ts) | descriptor normalization；按 needs 构 frozen context；candidates DTO map；running/settled IDs 经 status query；active scope IDs；proposal closed shape 与 thenable guard | callback 存在需求决定 requiresMeasurement；needs=[] 仍按正常可决策 boundary 调用。graph 引用复用；wrapper 与 DTO 的细节见需求表。 |
| `src/project-run/task-scheduler/admission-scope-layers.ts`（形成时文件，后续删除，见报告形成时源码版本） | scope lookup、tightening/continuation 辅助判断 | CodeGraph 未见 tighteningScopeForTask callers；限定 src 的 rg 确认全部三个函数仅本文件内部引用，无外部 production/test import。是未消费 helper 的清理候选，其成本不在每轮执行路径中。 |
| [scheduler-observation.ts](../../../../src/project-run/task-scheduler/scheduler-observation.ts) | graph `JSON.stringify`+SHA256 invocation-local lazy 一次；每 decision logger facts 展开触发 getters；`performanceState` 每 capture 排序/扫描 P 并 frozen 分类数组 | diagnostic logger 未启用时 observeDecision 早返回；collector 存在时 performanceState 不依赖有没有 logger。graph fingerprint 是 observation identity，不是 task membership。 |
| [scheduler-observation-setup.ts](../../../../src/project-run/task-scheduler/scheduler-observation-setup.ts) | 固定 terminal plan、collector 创建条件与 admissionFacts；collector 初始 `performanceState`；未请求则不采时 | terminal none/graph/execution-only 自身不创建 collector；raw/decision measurement/显式 diagnostics input 创建。生产 Invocation 会显式提供有效 diagnostics input。 |
| [scheduler-terminal-context.ts](../../../../src/project-run/task-scheduler/scheduler-terminal-context.ts) | phase union 类型与 full predicate | 无集合扫描；predicate 只是三个字段存在检查。 |
| [scheduler-terminal-measurement.ts](../../../../src/project-run/task-scheduler/scheduler-terminal-measurement.ts) | effects 归一化、阶段需求 union；drain 后按需 graph/execution/raw seal；execution 按 graph.tasks 输出 N 项；逐 effect await，包含 summary wrapper | effect 存在决定交付，不以 collector 存在决定；none effect 仍收 context。一个 sealed 对象依次交给所有终态消费者。 |
| [measurement/diagnostics.ts](../../../../src/project-run/task-scheduler/measurement/diagnostics.ts) | collector lifecycle、chronology Map、tail active ID copy、policy history collaborator；terminal perTask union Map/Set→map→taskId sort；cumulative 标量 | 无论 collector 由 online 还是 terminal raw 启用，均维护 timing/delay/chronology；仅 online demand 不构造终态 table，却仍承担该 table 所需基础累积。 |
| [measurement/timing.ts](../../../../src/project-run/task-scheduler/measurement/timing.ts) | clock samples、interval flush、control/observation counters、accepted wait、不可用状态、capture state 与 peaks | constructor、admission 前、settlement 前、wait、actual measured callback 前及 terminal 采样；不是异步事件账本。发生 unavailable 后额外 clock 停止，离散 facts/分类 peak 继续。 |
| [measurement/integrals.ts](../../../../src/project-run/task-scheduler/measurement/integrals.ts) | installPendingProjection 扫描 V 统计 counts、创建 delay 条目；每 interval 再次 pendingCounts(V)，再逐 V 累加 delay；totals 固定字段；take delay O(1)；pending table 读取复制 | 重复扫描不源于完整公开输出：counts 固定大小；perTask 精确逐 interval 加法是另一数值义务，不能与 counts 一起机械改写。 |
| [measurement/policy.ts](../../../../src/project-run/task-scheduler/measurement/policy.ts) | accepted action baseline、effects append、完成时差值、frozen history append；snapshot 捕获 endCount 并 O(1)reader 闭包 | H 条 observations 不是每轮复制 H；旧 reader 共享 append-only storage 但固定 prefix。effects 完成时复制是该 observation 输出成本；应保留旧 prefix 可见性。 |
| [measurement/summary.ts](../../../../src/project-run/task-scheduler/measurement/summary.ts) | terminal raw admissions 多次线性读取；top-three delays 排序全部 eligible admissions；tail 建全 admissions Map、对 tail members 排序取 3；ratio 与 total 投影 | 一次 terminal diagnostic summary；top-3 结果无全量排序下界，可 bounded-selection 替换，但 tie/浮点遍历顺序要另证。不是每次 decision 的扫描。 |

## 非增量成本：必要性与替代条件

### 分区、candidates、catalog 与 inspection

相邻事实源：[state-query.ts](../../../../src/project-run/task-scheduler/admission-core/state-query.ts)、[selection-query.ts](../../../../src/project-run/task-scheduler/admission-core/selection-query.ts)、[projection.ts](../../../../src/project-run/task-scheduler/admission-core/projection.ts)、[core.ts](../../../../src/project-run/task-scheduler/admission-core/core.ts)。

| 路径 | 源事实与实际操作 | 结果下界与可替代部分 |
| --- | --- | --- |
| `taskSlotsForCore(kind)` | persistent status Set → `.toArray().sort(slot)` → frozen array；每次调用均重做；没有 snapshot-local cache | 完整 IDs/records 输出Ω(K)，但 measurement 分类和 summary 计数不需要顺序；可无序 iterate 或专用 membership reader。ordered index/memo 可减少重复排序，代价是更新/retained snapshot 内存；不应以Ω(K)论证排序必需。 |
| `admissionCandidatesForCore` | relationReady Set → copy+declaration slot sort；逐 Q 动态 mutex 过滤，余 C 判断 scope/root/resource fit 并构内部 Task-bearing candidates | 真正完整 custom candidates 输出Ω(C)，但 Q 可能远大于 C；needs none 仍付此内部成本。可考虑 thin 存在性/selected ID 验证/按需求枚举，但不能改变无候选时不调用策略、候选定义或 hard guards；也不能让策略 proposal 绕过 callback 后 signal 检查。 |
| public catalog | pending membership 按 public rank 排序；逐 P 构完整 primary rejection，包含 relation/mutex 数组过滤+lexical 排序与 resource details | 完整 catalog 确有Ω(P+payload)下界。动态 reason 内容不能当静态 tag 缓存；一条 global root gate 变化可影响全部 pending reason，但不应为此必然 bulk retag。可缓存同一 immutable boundary DTO、维护有序 membership 或分类聚合；每次 getter 重建不是 API 所必需。 |
| public inspection | running/settled memberships 各 public rank sort；resources 逐 M；scope 静态列表每次 scopeId sort 并读 lifecycle；relationReady `.some` 动态 eligibility 判断 nextBoundary | 输出Ω(R+S+M+T)，找一个可选 Task 可提前退出，最坏查 Q；scope 排序可编译时完成；nextBoundary 不必等于构建 catalog；可 snapshot-local memo。 |
| Scheduler inspection | pending/running/settled 分别 declaration sort；running mutex 去重 Set；scope/resource DTO | getter 在 decideSchedulerFromCore 里 lazy 一次；当前 static/custom production path 未读取 input.inspection，因此此成本未实际进入当前薄路径。不能仅因函数存在就列为已触发热点。 |
| blocker summary | sorted pending + 全 P 独立 facts；仅输出计数和 global gate booleans | 无输出Ω(P)；可按 relation threshold 与 constraint-group 分类增量计数。需保留 dependency→mutex→resource 优先级，不能复用 public primary reason 直接统计。 |

这里有三个不同分类：

1. execution candidates：pending、relations 已解决且动态 mutex 无冲突；允许 `canAdmit=false`。
2. public primary rejection：`pendingRelationBlockerStage` 先处理 depends/observes，再 mutex，再 scope/root/resource；payload 保留当前来源、重复 occurrences 与 lexical 数组。它是一个主 reason，不表示其它 blocker 不存在。
3. diagnostic blockers / measurement queues：blockers 按 dependency→mutex→resource 单一计数，root/scope 另作全局 booleans；queues 只统计 admission-viable pending，按 mutex→capacity→admissible 互斥分类。把 public reason 当通用 tag 会丢掉同时存在的 resource shortage，也会把依赖未满足 Task 错计入 queue。

**推断：** 有真实共同责任的是“从同一 boundary 的源事实得到成员/分类变化”，不是把这三类消费者的输出强行做同一个集合。typed 索引可以表达 status/relation-ready 和 group 分类；多来源 blocker 计数、resource units、scope inactive/active/closed 仍须保留领域定义。root 及 active-scope cap 是全局 gate；shared mutex/resource 可影响大群 Task，物化每 Task`canAdmit` 可能把目前 query 工作搬成每次 transition 的 O(N) fanout。

### Collector 的重复分类、计时与逐 Task 累积

真实链路是：`scheduler.ts` / forced replay 在旧 interval 边界 flush → 执行 payload/Core effect 推进 → `performanceState` 读取新 Core → `captureState` 安装下一 interval 的分类。

- 初始 collector 建立一次 performanceState。每次 admission、pending/running settlement、取消/策略 fault 后和每个 forced block post-state 都 capture；不是仅“custom callback 调用时”才遍历 pending。
- `performanceState` 先 `taskSlotsForCore(pending)`，即 P 个成员复制+排序；再逐 Task `admissionQueueKindForCore`，读取 same Core counters/mutex/capacity，将 V 个 viable 项复制为 frozen `{kind,taskId}`。capture 的 integrals 又扫描 V 统计三类 count、peak，并为首次 viable 的 Task 建 delay 零值。
- 下次可用 timing boundary 的 `addInterval` 再扫描旧 V 得到 counts，计算六个非 wait totals；检查 finite/non-negative 后再逐 V 执行选中类别 `+= elapsedMs` 并校验每 Task 各字段。因而条件化总工作包含各边界 P 的排序/分类、各 interval V 的多次遍历。宽独立 pending 图可使这些和呈二次增长；这是操作量推断，不是本轮端到端速度测量。
- constructor 即使 clock 第一次采样失败，仍已安装初始分类与 delay；timing unavailable 后不再做有效 interval 累积或新增 delay，但每次 capture 仍分类并更新 queue peaks。raw unavailable 保留离散 facts、tail IDs、peaks，而不输出 timingFacts。优化不能以“clock 坏了”跳过仍承诺的 peak 观察。
- `beforeAdmission` 额外复制当前 running keys，collector 再复制为 `[...runningTaskIds,taskId]` 作为最后一次 admission 的逻辑 post-state tail。每次 admission 付 O(R)，最后 terminal 又 copy 一次；这是 tail 语义而非 status 索引。可讨论以 running persistent snapshot/sequence 保存最后 active set，或只维护 bounded top 贡献者，但 tail 完整 IDs 仍是 raw 公开字段，不能默默删除。
- chronology Map 记录已 admitted Task 的时间、取得的 delay 与 settled time；pending delay Map 则保存进入过 viable 集合但尚未 admit 的累计。Task 随后 blocked/cancelled 也可能仍在该 Map，terminal 要保留其 null admission/settlement timing，不得只输出实际 admitted Tasks。
- terminal available 时 pendingAdmissionDelays 先复制 Map 为 frozen records，collector 再建 Map，与 chronology keys union 成 Set，map 后按 taskId 排序。完整 table 有 Ω(U) 下界（U 为进入过 viable 集合的 Task 数），多轮复制/排序可讨论，不能以 admittedCount 代替 U。
- terminal-only raw 也创建 policyMeasurement 对象，但没有 online 需要时不 begin actions，recordEffect 为空操作，不保留 H 历史；反过来 online-only demand 虽不请求 terminal raw DTO，collector 仍维护 delay/chronology 等完整采集内部状态。目前需求裁剪的粒度是 collector 启用和 DTO 字段，不是所有内部累积器。

**可替代条件：** counts/peaks 和 perTask delay 应分开评估。分类 count 可以在同源 delta 上按 group/来源阈值维护，且只在需要 collector 时启用；root/scoped global gate 按组计数，避免全体 Task retag。保留逐 interval 数值契约时，可先减少 P 排序和重复 counts 遍历，不必同时改 delay 算术。若接受新的 numeric contract，category clocks/prefix 或 lazy Task 结算才是候选，而不是默认等价实现。

### 数值、clock 与历史的不可省略差异

以下是形成时源码事实与数值风险；调查当时尚未确认具体改变，后续契约由 Change 承接：

1. 每 Task delay 当前是每个 interval 按当前类别连续 `+=elapsed`。`prefixNow-prefixEntered` 改变加减顺序；浮点误差、catastrophic cancellation、finite overflow 及首次 unavailable 时点可能不同。数学积分相等不证明 JavaScript Number 结果相等；容差或更宽数值范围本身也是待确认契约。
2. interval 总量先乘 elapsed×count 再累加，并对每次 contribution 和累计 totals 做 finite/non-negative 检查；随后逐 Task delay 校验。lazy 算法只在读取或离开类别时校验可能推迟故障，甚至在全局 prefix overflow 而某 Task 短区间本可表示时提前故障。
3. `clock-threw`、`clock-non-finite`、`clock-backward`、`interval-invalid`、`integral-invalid` 是 closed unavailable 原因；第一次原因锁定。合法 zero span 有效。unavailable 不改变 admission、cancel 或 settlement，也不伪造 available contribution。
4. accepted wait count 即使 timing 坏了仍递增；beginWait flush，running settlement 或 terminal 关闭 wait。passive drain proposal=null 不是 accepted wait。不能改成“任何 await 都算 wait”。
5. online action contribution 当前已用累计 totals 减 baseline，并非每 action 另存独立积分；这不自动授权将 perTask delay 也改成 prefix。action completion 在下一次实际 custom callback 前或 terminal，将冻结 effects 与 interval append。
6. `SchedulerPolicyMeasurement.snapshot` 捕获 endCount，reader 仅接受 safe integer 且 `0<=index<endCount`；旧 context 不能看到未来 append。每个 context 的 cumulative 值也 detached。内部 array 可 append 并不意味着旧 snapshot 污染；它是有边界的共享 history。
7. 当前 `SchedulerPerformanceTiming.measureControlPath` JSDoc 说不含 author callback，但 scheduler.ts 把整个 `decideSchedulerFromCore` 包入该计时；custom 同步 callback 位于其内部。本轮仅指出该源码/注释张力，不把它当独立已验证 Bug，也不承诺“controlPathMs 已排除 custom callback”。重构若改计时包围范围应先确认 metric 定义。

### Shell Promise、执行顺序与不可被成员索引接管的负载

`pending: Map<TaskId, PlannedTask>` 按 graph declaration 插入；`runningById` 包含真实 Task 及 completion Promise；`settlementsByTaskId` 包含 opaque value/error 或 blocked 依赖。Core status/occupancy 是合法性事实，shell Map 是实际动作与产物事实；它们有同一 Task identity 但不同生命周期义务。用 `Map<TaskId, Task>` 与 `Set<TaskId>` 同时存在，不足以证明重复 owner。

- `nextRunningSettlement` 每次 await 重新收集全部 R 个 completion 并 `Promise.race`。还未 settle 的长任务可能被跨多次 race 重复注册 reaction；操作量随 `ΣR_at_wait` 增长，不只 O(N) 次订阅。race 落败 reaction 不会取消；本轮没有 heap profile 或 GC 实测，故不把理论 reaction 数等同于已测内存泄漏。
- 若两个 completion 在 race 前已 fulfilled，重新 race 的结果受当前 running Map 枚举/Promise reaction 排队影响；持续 FIFO completion queue 则按先前 arrival 记录选择。两者不是无条件等价，尤其长同步 custom callback 后多个结果已就绪、同 microtask 批次、取消/failed/drain 及 observer 触发次序场景。
- 替代为 completion queue 可以只订阅每 Task 一次，但须先决定 tie/default settlement ordering、队列生命周期、no lost wakeup、error 归一化、drain 与 signal cut-off；这些不能交给 typed membership index 猜测。方案优劣也与 R 上限和任务完成分布相关。
- `buildTaskGraphRun` 按 static graph 顺序输出 N 个 settlements 是完整结果义务；execution terminal 也输出 N 个 kind-only 记录，是不同 DTO 用途，可共享已有事实或 builder，不能让 value/error 泄漏到 measurement。
- cancel 前 ID 一致性比较和逐 Task 记录必须保留准确 payload 目标；批量取消可避免多次中间投影但不得省略 perTask 真实 settlement、once-only guard 和取消语义。pre-admission 按输入顺序先验证该项 ID 再 callback，不能改成先全局验证所有 ID 而改变 throw precedence。

## Full / narrow / none 真正触发的成本

需求 grammar 及验证 owner：[scheduler-context-validation.ts](../../../../src/project-definition/scheduler-context-validation.ts)、[scheduler-policy.ts](../../../../src/project-definition/scheduler-policy.ts)、[scheduler-context-callback.ts](../../../../src/project-definition/scheduler-context-callback.ts)。函数和 descriptor 省略/自有 undefined 为 full；显式 `[]` 为 none；按 phase known keys 验证 dense data array、去重、固定顺序冻结。需求不参与 declarative fingerprint，不是权限隔离或精确 physical pruning 承诺。

| consumer 形态 | 当前确实省掉/保留的工作 | 不可误报的边界 |
| --- | --- | --- |
| static + 无 diagnostics/effects | 无 collector/额外 measurement clock；无完整 candidates/inspection/blocker DTO；static head-prefix query | seed/compile、Core 更新、有序 frontier、Task Promise/race、完整 RunResult 仍存在。 |
| custom none / narrow 无 measurement | 无 collector（其它 phase 无 raw 且无 diagnostics 时）；不构未声明 running/settled/candidate 公开 DTO | 内部完整 candidates 仍先构造并排序；只要 C>0 仍 callback。需要“零候选扫描”须改 private decision seam，不是 descriptor 现有保证。 |
| decision 要求 admissionState | needs loop 直接调用 `admissionStateForCore(core)` 构 opaque wrapper，之后 catalog/inspection getter 才 lazy | 当前不是等调用方 JS 读取 `context.admissionState` 才构 wrapper。full 已声明该字段即构；旧 context wrapper 固定同一 Core。 |
| wrapper.catalog / inspection 读取 | 每次 getter 完整重投影，无 memo；select/settle 只推进新的 immutable successor | 同一 wrapper identity 不意味着 DTO getter identity 相同；缓存可讨论，但是否增强身份可观察性需注明。 |
| decision measurement / legacy full | collector 启用、callback 前 flush；bounded cumulative 与 captured reader，不复制完整 H、graph 或 perTask table | collector 仍维护 perTask delay、chronology、tail；不能写成“在线只付标量采集”。 |
| terminal none | 不增加字段需求，仍按 effect lifecycle 交付 frozen 对象；无其它需求可为 `{}` | none 不取消 callback；没有 collector 也不能跳过 effect。 |
| terminal graph | 复用已构建 frozen graph DTO | 不启动 collector，但 graph 本身准备时已关闭/物化，不是省掉 graph construction。 |
| terminal execution | 启用 ShellAdmissionFacts；terminal admitted IDs copy + N 个 settled kinds | 不启动 timing/delay collector；admission chronology 没有 clock。 |
| terminal raw | 从开始启用 collector；terminal 按需 build full admissions table | 不强迫 decision measurement/context 其它字段 full；无 online demand 也不建 action history。 |
| diagnostics 启用 | Invocation 输入带 clock/fingerprint/logger；terminal plan 强制 graph/execution/raw；每 decision 展开完整 dynamic evidence | narrow 策略不能削减 diagnostic 义务；诊断 formatter 输出 bounded 不代表上游完整 evidence 扫描也 bounded。 |
| 同 phase 多个 effects | terminal 需求 union，一次 sealed context；Definition effects 和 prepared terminalEffect 同 identity | 一个 full 保留该 phase 成本，不自动使其它 phasefull。失败不停止后续 effect，effect 时间在 sealed measurement 外。 |

生产链路：[Invocation scheduler](../../../../src/project-run/invocation/scheduler.ts)根据有效 diagnostics、Definition terminal raw 需求、prepared terminal raw 需求和 decision requiresMeasurement 决定显式 collector input；[custom preparation](../../../../src/project-run/admission-strategy-provider/custom-strategy-preparation.ts)在 prepare 前/后各自验证所属 descriptor 并保留 prepared terminal needs；[scheduled-check-run](../../../../src/project-run/check-execution/scheduled-check-run.ts)传递 prepared capability 及 execution callbacks；[Invocation terminal delivery](../../../../src/project-run/invocation/execution.ts)在 Scheduler generic effects 后才交付 prepared completion。它们不是每 Task 成员事实 owner。

## 实际下游：learned 与 summary

这里只沿真实 Scheduler 消费者追踪，不审计 duration 存储、Analyzer 或缓存性能。

- [learned strategy](../../../../src/package-tools/learned-critical-path/strategy.ts)返回具体 function prepare/decide/terminalEffect，而非 narrow descriptor；成功路径因此触发 full decision 及 full terminal 采集。fallback `createStaticDecision` 也返回 function，所以 fallback 仍 full decision，即使没有 terminalEffect。
- learned 每轮实际读取 candidates、activeScopeIds、capacity；[selection-layers](../../../../src/package-tools/learned-critical-path/selection-layers.ts)复用 prepare 建好的静态 task/scope/activation Map/Set，每轮 active scope Set 与候选分层扫描；`firstCandidateBy` 线性选最小而非每次全排序。它不读取 online measurement、settled IDs 或 public catalog，却因 function 兼容默认 full 承受这些生产义务。改 helper authoring 类型/返回形状可讨论，不能静默破坏当前保证 function 可直接调用的具体返回类型。
- [duration recording](../../../../src/package-tools/learned-critical-path/duration-model/recording.ts)实际消费 raw availability、admissions 的 admitted/settled 边界，以及 execution settled kind；不依赖 perTask delay 三类数值。但 raw token 目前是粗粒度完整采集，不能因单个 consumer 不读 delay 就削减其它 caller 的 raw 语义。
- recording 按 admissions 数组遍历给 sample 分配 observationSequence，保留 bounded history；当前 collector 的 taskId lexical 排序因此可影响 history sequence/窗口保留顺序，不能说“terminal table 只人读，排序随意”。其注释称 Scheduler order 不应替代实际 lexical 来源判断。是否保留该顺序应由公开/learned consumer 一起复核。
- [summary.ts](../../../../src/project-run/task-scheduler/measurement/summary.ts)的 total、top-three、tail 和 ratio 是 human owner 派生；它并非完整 raw 本身。若只需 summary 可设计专属 aggregate 采集，但现有 diagnostics 承诺保留完整动态证据，需先显式改该义务。现有 top3 full sort 可改为 bounded selection 而不改 top3 排序/lexical tie，但仍需读所有候选；一次 terminal 成本不能等同于每 boundary 成本。

## 形成时公开与内部契约

表中基线用于判断候选的行为影响；改变返回值、顺序、数值或交付语义时，需要对应的新契约和证明。

| 契约组 | 当前基线/影响消费者 | 可讨论的具体改变与必须补齐的证明 |
| --- | --- | --- |
| API/default/grammar | static 默认；maxParallel 正 safe、默认 4；priority 继承/default0；closed graph/proposal/descriptor；legacy function full；none 仍调用；phase 独立 | 调整默认 demand、加入细粒度 raw 需求、descriptor 返回形状须显式 migration 与 type compatibility 说明。索引内部重构本身不需要新 query 语言。 |
| 不可变与 identity | old Core/fork、public wrapper 不随 live 调度变；graph 同 Run 复用；每 decision detached；terminal 同一 sealed identity；measurement frozen prefix | 可 snapshot memo 或新 persistent representation，但不能浅 freeze mutable Set 伪造隔离。catalog/inspection DTO 当前每读新对象，是否缓存需记录；prefix 可见范围不得由 append 破坏。 |
| Ordering | custom 内部/公开 candidates 声明顺序；公开 catalog/inspection taskId rank lexical；resources/scope canonical；RunResult/execution settled static graph 顺序；static 层级/tie 与强制 effects 有序 | 有序 index、边缘 sort、unordered 内部统计是表示选择；改变返回排序、race tie、forced replay/callback 次序会改变消费者，不是机械容器替换。 |
| Legality/rejection | relation/mutex/capacity/Core 唯一；scope/root/resource precedence；rejection closed union 和完整 payload；多来源计数与 duplicate mutex accounting；guard recheck signal | 新模型必须证明 atomic acquire/release、settle/cancel/forced 合法、拒绝无 successor。可讨论 reason 优先级/形状，但不能把 one primary reason 当全部 blockers 来源。 |
| Diagnostic | graph fingerprint 相同 JSON bytes+SHA256 invocation-local；dependency→mutex→resource 计数与 root/scope facts；完整 dynamic evidence；writer fault containment | 可讨论改 summary 义务、聚合形式或 fingerprint 算法；此前不得以 narrow 策略/formatter 截断为依据删证据或换 hash 字节。 |
| Timing/numeric | per-interval 类别 delay、slot/capacity 积分；peaks 跨 boundary；first unavailable reason、valid zero；accepted wait 区别 passive drain；时间不是 action causality/CPU/critical path | prefix/lazy、舍入容差、overflow 与 unavailable 时点、采样/控制路径范围须逐项确认新 spec 与 scripted-clock 矩阵；不能只比较“最后大致相等”。 |
| Terminal/raw | full admissions 覆盖进入过 viable 者；kind-only execution 不含 value/error；tail last-admission post-state；summary top3 与 lexical tie；drain 后 seal、ordered await 失败续交 | 可讨论 table 排序/精度、raw 字段粒度、tail 表示；需追踪 learned sample 顺序与 caller effects。effect elapsed 不能回填进 sealed facts；none/graph/execution 仍要交付。 |

## 消费端对候选比较的约束

报告正文比较 A/B/C；消费端清单为比较增加四项条件：

1. **delta 必须进入真实消费者。** observation counts/frontier 可复用 Core 的影响发现；若每次 capture 仍完整重建
   `performanceState`，measurement 的分类与累计工作仍在。
2. **共同成员机制保留专属视图。** status/relation-ready、group 分类计数和按需枚举可共享 typed membership/delta；
   shell payload、constraint units/source counts、ordered frontier/revision、clock/integrals/history、rejection 与 terminal delivery 各有独立责任。
3. **读写成本一起比较。** global gate、mutex 或 resource 变动后重标全部 Task，或复制 retained snapshots，可能把查询成本移到
   fanout 和内存。应与 group-head 必要前缀查询对照，并独立保留无 measurement 需求的路径。
4. **内部通用 backing 与动态查询是两层能力。** `Map<Key, MemberSet>` 可按 update/iterate/intersect/branch/memory 比较；
   typed 门面负责合法维度、来源、单位和顺序。动态 tag/query 框架需要额外的表达需求。

## 形成时认识与验证边界

- **事实：** demand 隔离与 lazy edge projection 已存在；custom 内部候选、collector 每 boundary 分类/排序、per-interval delay 仍完整消费。
  thin 执行、full 观察与 snapshot 适配有不同触发条件。
- **推断：** counts、top-three 等固定大小结果有减少遍历或排序的空间；seed、完整 RunResult/catalog/raw、detached payload
  仍有输入、输出与隔离义务。共同 typed 变化可支持前者，不能替代后者。
- **未知：** Node/Bun 耗时、分配/retained memory、真实 demand 与 running 分布、A/B/C prototype、FIFO 等价性及新数值契约均未验证。
- **后续证据条件：** 依据已确认契约，分别测 static/no observer、custom narrow/none/full、online-only、terminal raw-only、diagnostics、
  shared constraints/global gate、多 forced blocks、retained contexts/forks。操作量、独占性能 baseline 与行为证据分别报告。
