# Scheduler Core 状态、索引与传播普查材料

本材料属于 Investigation `261015-audit-scheduler-incremental-state-model`，保存逐文件、逐字段与传播链依据，供复核
[报告正文](../../audit-scheduler-incremental-state-model.md)的关键判断。
形成时源码为 `main` 的 `d9f346fde00d0ec9b57cccdbc21c9f1cefff5927`；读取时
`git diff --name-only -- src/project-run/task-scheduler src/project-definition/scheduler-policy.ts` 无输出。
下文“当前”均指该版本的结构调查，现行执行安排沿报告正文进入 Change。

Core 目录指 [`src/project-run/task-scheduler/admission-core`](../../../../src/project-run/task-scheduler/admission-core)。
源码用 CodeGraph `codegraph_files` / `codegraph_node` 完整读取；字段消费者另用限定 `src` 的属性/符号 `rg` 核对。
无读取命中的结论限于该源码范围。

## 覆盖账本

Core 共 27 个 `.ts` 文件，排除 7 个 `.test.ts` 和 1 个 `.test-support.ts`，其余 19 个逐文件完整读取。`trace.ts` 虽只被测试入口消费，仍按非测试文件纳入，避免从文件名误判生产热路径。

| Core 文件 | 本轮完整读取的职责与检查对象 |
| --- | --- |
| [input.ts](../../../../src/project-run/task-scheduler/admission-core/input.ts) | standalone exact-record grammar、Task/Scope/resource 输入转换、root cap 与 prepared graph 入口。 |
| [compiled-graph.ts](../../../../src/project-run/task-scheduler/admission-core/compiled-graph.ts) | 全部 compiled 字段、slot catalog、mutex occurrences、claims、reverse relations、scope activation/terminal、公开 lexical ranks。 |
| [compiled-graph-lookup.ts](../../../../src/project-run/task-scheduler/admission-core/compiled-graph-lookup.ts) | dense slot 必需读取与缺失错误；不另建状态。 |
| [constraint-groups.ts](../../../../src/project-run/task-scheduler/admission-core/constraint-groups.ts) | 分组等价关系、Task→group、scope→groups、ordinary/constrained global ranks。 |
| [selection-index.ts](../../../../src/project-run/task-scheduler/admission-core/selection-index.ts) | 17 个 selection 字段、persistent List/Set/Map、counter 批次聚合、forced queue。 |
| [selection-seed.ts](../../../../src/project-run/task-scheduler/admission-core/selection-seed.ts) | status seed、全部 counter、partition/ready memberships、active roots、三类 frontier 的初建。 |
| [selection-transition.ts](../../../../src/project-run/task-scheduler/admission-core/selection-transition.ts) | 单 Task status transition、running occupancy、relation reverse fanout、forced 阈值、scope lifecycle、partition 与 ready 更新。 |
| [selection-frontiers.ts](../../../../src/project-run/task-scheduler/admission-core/selection-frontiers.ts) | ready/static 接线、active array→membership Set 的再发现、changed scopes。 |
| [ready-frontier.ts](../../../../src/project-run/task-scheduler/admission-core/ready-frontier.ts) | relation-ready 两套顺序、affected groups、共享 backing 条件、非 head tombstones 清理。 |
| [static-frontier.ts](../../../../src/project-run/task-scheduler/admission-core/static-frontier.ts) | 三层 global group-head queues、revision、head/layer 比较、scope 组重分类、stale root 清理。 |
| [persistent-task-queue.ts](../../../../src/project-run/task-scheduler/admission-core/persistent-task-queue.ts) | frozen persistent leftist heap、merge 复制右脊、rank/revision/slot/node lifecycle。 |
| [selection.ts](../../../../src/project-run/task-scheduler/admission-core/selection.ts) | immutable Core wrapper、正常与 snapshot seed、select/settle transition、forced pop。 |
| [state-query.ts](../../../../src/project-run/task-scheduler/admission-core/state-query.ts) | status/count/member 查询、声明排序、inactive/active/closed、effective global cap。 |
| [selection-query.ts](../../../../src/project-run/task-scheduler/admission-core/selection-query.ts) | blocker stage/payload、动态 mutex/capacity、resource fits、queue 分类、完整 candidate 顺序。 |
| [static-selection-query.ts](../../../../src/project-run/task-scheduler/admission-core/static-selection-query.ts) | 三层按必要前缀消费 heads、ordinary admissible-first、query-local blocked-head 跳过。 |
| [scheduler-queries.ts](../../../../src/project-run/task-scheduler/admission-core/scheduler-queries.ts) | capacity、active IDs、partition IDs 的薄投影。 |
| [projection.ts](../../../../src/project-run/task-scheduler/admission-core/projection.ts) | lexical catalog/inspection、Scheduler inspection、resource occupancy DTO、binary settlement 映射。 |
| [core.ts](../../../../src/project-run/task-scheduler/admission-core/core.ts) | public opaque factory/handle、validation 顺序、canonical effects/effectStates、forced closure、取消。 |
| [trace.ts](../../../../src/project-run/task-scheduler/admission-core/trace.ts) | action replay 与全量 pre/post/effect projections；复用 reducer，不是独立 legality oracle。 |

相邻完整读取如下；shell、measurement 与公开类型的消费切面见
[消费者资源](./consumer-cost-inventory.md)。测试正确性与 Case 完整性不在本轮审阅范围。

- graph/validation：[`graph.ts`](../../../../src/project-run/task-scheduler/graph.ts)、[`graph-validation.ts`](../../../../src/project-run/task-scheduler/graph-validation.ts)。
- shell/lifecycle：[`execution-state.ts`](../../../../src/project-run/task-scheduler/execution-state.ts)、[`scheduler.ts`](../../../../src/project-run/task-scheduler/scheduler.ts)、[`scheduler-task-lifecycle.ts`](../../../../src/project-run/task-scheduler/scheduler-task-lifecycle.ts)、[`forced-block-effect-replay.ts`](../../../../src/project-run/task-scheduler/forced-block-effect-replay.ts)。
- decision/policy：[`scheduler-decision.ts`](../../../../src/project-run/task-scheduler/scheduler-decision.ts)、[`scheduler-admission-decision.ts`](../../../../src/project-run/task-scheduler/scheduler-admission-decision.ts)、[`admission-selection-policy.ts`](../../../../src/project-run/task-scheduler/admission-selection-policy.ts)、[`admission-scope-layers.ts`](../../../../src/project-run/task-scheduler/admission-scope-layers.ts)。

## 身份、生命周期和成本记法

- 外部 `TaskID` 是字符串；内部 status、counter、membership 和 queue identity 是 declaration dense `taskSlot`。二者由 `taskSlotsById` 与 `graph.tasks[slot]` 映射。统一索引不必把所有内部身份改回字符串。
- `compiled` 在一次 factory/Run 内共享，所有 successors/forks 共享静态图。`selection` 每个 boundary 新建 frozen 外壳，List/Set/Map 更新与 queue spine 保持 persistent sharing；查询不修改旧 state。
- native Map 只在编译/临时 batch 内写入，compiled 对外是 `ReadonlyMap` 且不暴露给 public AdmissionState；这依赖私有所有权，不是 `Object.freeze` 赋予 Map/Set 深不可变。后续若改成原生可变动态集合，仅 freeze 外壳不能满足旧 snapshot；逐 successor clone 又会复制所选集合全部成员。
- 记 `N/E/M/C/S/R/U/G` 为 Task/relation occurrences/mutex occurrences/resource claim occurrences/scope/resource/unique mutex/group 数；`P/V/A` 为当前 pending/relation-ready/current active-root 数。`Dₜ` 为变更 Task reverse relation occurrences，`mₜ/cₜ` 为它声明的 mutex/claim occurrences，`F` 为本次 forced block 数，`Kₛ` 为变动 scope 的 groups 数。`G` 可等于 `N`；不能假设组数、约束数或 fanout 为常数。
- 下文操作量是源码循环和逻辑访问数，不包含 Immutable 库哈希树/List 的每次读写常数、GC、heap merge 分配或输出字节。persistent queue 由 leftist invariant 将一次 merge 的右脊限制为 logarithmic；一批 stale nodes 清理可能远大于单次 merge。局部访问量不构成整个 Run 的上界，更不是 timing 实测。

## 静态事实与编译索引清单

全部 compiled 字段只在 `compilePreparedAdmissionGraph` 构建，不在 successor 更新。静态源事实是 validated `graph` 与绑定的 `maxParallel`；其它字段均可由它们推导。

| 字段 / 结构 | 来源、初建与读取成本形状 | 真实消费者、生命周期与重构判断 |
| --- | --- | --- |
| `graph`, `maxParallel` | normalization/validation 后的 immutable graph 与正 safe integer root cap。 | metadata、合法性、public graph DTO、effects、终态都依赖；不是 membership index。 |
| `taskSlotsById` | `N` 个 ID→slot。 | validation、seed、relation compile、scope/ID 查询；必要身份桥梁。 |
| `taskById` | 又保存 `N` 个 ID→同一 graph Task 引用，不复制 Task payload。 | 本轮限定 `src` 的读取检索没有发现 compiled 字段的非测试读取；数组+slot 可达同一 Task。是 retained backing 删减候选，不是已执行删除。 |
| `scopeSlotById`, `scopesById` | 各 `S` 个映射，ID→slot / ID→同一 scope。 | 前者服务 lifecycle/compile；后者唯一读取在 `admission-scope-layers.ts`，该文件符号在限定 `src` 检索只内部自用，CodeGraph 也无 dependents。后者连同该适配是待复核清理候选，不能用“同名”把所有 scope map 都合并。 |
| `mutexSlotById`, `taskMutexSlots` | 首次 occurrence 分配 mutex slot，保留每个 Task 的重复 occurrences，总 `M`。 | holders seed/update、dynamic readiness 与 rejection payload。occupancy 计 occurrences，而 group key 去重；不能一概改成 Set。 |
| `resourceSlotById` | `R` 个 ID→slot，编译 claims 时查找。 | claims 转 dense 后仍留在 compiled；检索未发现后续生产读取，是 compile-local 化候选。 |
| `resourceCapacityBySlot`, `taskResourceClaims` | `R` capacities 与 `C` 个 `{resourceSlot,units}`。 | occupancy、原子取得/释放、fit/rejection/inspection。值与单位不能被布尔 tag 替代。 |
| `relationIndexes.reverseDependencies`, `reverseObservations` | 扫描全部 relation occurrences `E`，生成每 source→target slots；保持声明 occurrences。 | settlement 直接定位 fanout，避免每次扫描全图；两类关系的满足条件不同。 |
| `scopeSlotsByTerminalTaskSlot` | `N` 个数组壳，追加每 scope terminal 对应 slot。 | terminal settlement 只关闭相关 scopes；无需扫描全 `S`。 |
| `taskScopeSlots`, `taskActivatesScope` | `N` 个所属 scope / activation boolean；先每 scope 建 activation ID Set，再按 Task 读取，activation 标记逻辑量为 activation declarations + `N`。 | activation、capacity、group compile、scope 查询；静态 facts，不是 dynamic active membership。 |
| `taskIdsInPublicOrder`, `taskPublicRanksBySlot` | lexical sort `N` 后建立 rank inverse。 | public projection 用 ranks 排 partition；IDs 列表只在 `trace.ts` 全量校验入口读取。前者可评估按测试/trace 需求生产，而非默认整个 runtime 永久保留。 |
| `constraintGroups.taskGroupSlots` | `N` Task→group；临时 native `groupSlotsByKey` 用 JSON key 编译后丢弃。 | ready/static 更新和查询的共同身份。key 是 tighter scope ID+activation、去重排序 mutex IDs、canonical resource claims；无动态 state。 |
| `groupScopeSlots`, `groupActivatesScope`, `scopeGroupSlots` | `G` 个组的 tighter scope/activation 与 scope→group fanout。 | active-root 变化时仅重分类对应 groups。non-tighter scope 可合组，不代表它们真实 activation/close effects 消失。 |
| `ordinaryPreferenceRanks`, `constrainedPreferenceRanks` | 全局 immutable order 派生 ranks：普通按 priority 降序/声明；constrained 按 cap 升序/priority 降序/scope ID/Task ID。需一次排序。 | ready 内部与 static global queues 共用 ranks；不是另一套 priority source。 |
| normalized `schedulerGraphSnapshot` | `graph.ts` 创建完整 public graph DTO 并复制 relation/activation arrays。 | 同 Run preparation/decision/terminal 的共享 frozen graph identity；这是公开表示映射，不是另一套 admission state。 |

graph validation 本身还有临时 `taskById/scopeById`、resource capacities Map、visited/visiting、per-task observation Set、tasksByScope Map、per-scope reachable Set。它们只在建立 immutable graph 期间存在，不进入 dynamic successor。多 scope terminal reachability 为每个需要检查的 scope 独立遍历一次可达子图，逻辑量为 `Σ(Vₛ+Eₛ)`，不是每 scoped member 重走，也不是全 graph 一次。跨 scope 的可达子图可能重叠；它属于 compile/validation 优化问题，typed dynamic membership index 不会自动消除。

## 动态状态逐字段清单

本表列尽 `AdmissionSelectionIndex` 的 17 个字段。“源事实”表示 transition 的规范事实输入；其余虽有消费权威性，仍是可由 facts 推导的物化索引/聚合。多个 backing 可以有用，但不能由“都有消费者”直接证明全部最优。

| 字段 | 来源/性质 | 写入入口与影响 | 消费者 / 读写成本 / 生命周期 |
| --- | --- | --- | --- |
| `statuses` | 每 slot 的 pending/running/settled(kind)，私有 partial snapshot 另有 absent；最小动态源事实。 | seed 整表；单事件 `withStatusAt` 更新一项。 | validation、lifecycle、projection、relation seed、forced payload；indexed persistent List。settlement kind 必须保留，单一 settled tag 丢失 prerequisite satisfaction。 |
| `taskSlotsByStatus` | status 三个互斥 partition 的物化反向索引；absent 不入 partition。 | seed 扫 statuses；transition 从旧 kind delete、向新 kind add。 | ID、inspection、catalog、cancellation、measurement；成员读不扫描 `N`，但声明/lexical 枚举每次 `toArray+sort`。与 statuses 是同事实多 backing，换取反向枚举。 |
| `pendingDependencies` | 未 settled 的 dependency occurrences 数，并非只数 kind=pending。 | seed 遍历 dependsOn；每个首次 settlement 向 reverse dependents -1。 | readiness 和 forced 阈值；多来源不能用一次 delete blocker tag。 |
| `nonCompletedDependencies` | 已 settled 且非 completed 的 dependency occurrences 数。 | seed 分析 settlement kinds；非 completed settlement 向 reverse dependents +1。 | forced closure 与 summary；不等同 pendingDependencies，二者共同表示“全部结束但至少一项失败”。 |
| `pendingObservations` | 未 settled 的 observes occurrences 数，不要求 completed。 | seed 遍历 observes；首次 settlement 向 reverse observers -1。 | readiness/queue classification；与 dependency 保留语义差异。 |
| `relationReadyTaskSlots` | pending 且前两类 unresolved counters 为零的派生成员，不检查 nonCompleted/mutex/capacity。 | seed filter pending；每事件重判 changed Task+reverse fanout 去重集合。 | custom candidates、inspection select-existence、ready groups；failed-dependent 可能在 reconcile 中短暂满足 relation-ready，边界由 forced closure 清理。不能在未闭合 intermediate effect state 上把它等同可执行。 |
| `mutexHolders` | running status × mutex occurrences 的物化计数。 | running admission +occurrences；任意 running settlement -occurrences。 | dynamic readiness/payload/summary；不更新 mutex cohort 的 ready tags。重复 mutex occurrences 仍计数，group 等价却按 ID 集合。 |
| `resourceInUse` | running status × claim units 的物化和。 | admission 对全部 claims 同一 successor 加 units；settlement 同时释放。 | fit/shortage/inspection；更新量随 `cₜ`，不扫描全部同资源 Tasks。 |
| `runningTotal` | running partition 数量聚合。 | seed 计数；pending→running +1，running→settled -1。 | root/global scope capacity、wait/drain/complete；可由 `taskSlotsByStatus.running.size` 得到同事实，是标量 backing 整合候选。 |
| `remainingTaskCount` | pending+running 数量聚合，absent/settled 不计。 | seed；pending/running→settled -1。 | complete/pending count；同 partition.size 的另一聚合 backing，保留并非逻辑必需。 |
| `activeScopes` | 实际为 once-activated 0/1 marker，而非当前 running/active 计数；动态 lifecycle 源信息。 | snapshot seed active IDs；首次 activation +1，close 不减。 | `scopeLifecycleForCore` 先检查 terminal settled，未 closed 才读 marker；正常 API 通过 activation 推进，私有 snapshot 可直接 seed。closed 后 marker 与 current roots 确实不同。若改成显式 lifecycle union 可替代，不应把它与 current Set 直接混为一份。 |
| `activeScopeSlots` | activated 且 terminal 未 settled 的 current roots，按 cap/ID 排序。 | seed filter/sort；activation includes 后 copy+sort；active terminal close filter。 | global tightest cap 读首项；有序 active IDs 投影；真实 activation 最坏 `A log A` 排序，close `A` 扫描/复制。 |
| `activeScopeSlotSet` | current roots 同一 membership 的反向查询 backing。 | seed 从 array 建 Set；array identity 变后根据 terminal/activation candidates、array.includes 重判后 persistent add/delete。 | group layer、active terminal close guard；与 array 是相同事实双 backing，可统一更新输入或选 ordered/set/min 结构。 |
| `readyGroupFrontier` | `Map<group, {ordinary,constrained}>`，relation-ready 成员两套有序 heap。 | seed insert each ready；transition 再比较 previousReady/nextReady，增量插入并清理受影响组根。 | static 获取组头，非 head 删除留 tombstone；两种顺序相同时共享同 heap identity，否则两 backing 有独立排序义务。旧 branches 保留自己的 heaps。 |
| `staticGroupFrontier` | `{queues:{tightening,continuation,ordinary},revisions:Map<group,number>}`，所有组 live heads 的二级有序派生视图。 | seed 每组入一层；每次 affected slots→groups，scope changes→groups，比较前后 layer/head；变则 revision+1 并入新 entry，清理三队列 stale roots。 | static 查询只消费必要有序前缀；revision 防止 head 相同但旧 entry 复活。和 ready 不是同一成员集：一个存组内成员，一个存全局组头。是否更好地融合两级有序视图须实验，不由同形判冗余。 |
| `forcedQueue` | pending 且 pendingDependencies=0、nonCompletedDependencies>0 的待强制 block 工作队列，按 descending taskSlot。 | seed 全图筛选；settlement reverse dependents 阈值检测并去重 enqueue；forced settlement 先 pop 再更新。 | `core.ts` reconcile 逐个 drain，生成 dependencyIds/effectStates；不是 ready queue，也不是长期事件账本。取消走单独批次流程，不将 cancelled 重写成 blocked。 |
| `legacyRunningMutexes` | 私有 snapshot seed 的额外 mutex 名称快照，可能无对应 graph running Task。 | 仅 seed copied/frozen，successors 透传。 | fallback mutex includes；正常 real shell 没有这份外部事实。不能要求所有场景的 occupancy 仅由 graph statuses 复原，须区分 partial adapter variant。 |

`PersistentTaskQueue` 各节点的 `taskSlot/preferenceRank/revision/left/right/nullPathLength` 是派生存储和维护不变量：前两者表示 identity/order，revision 表示 entry generation，其余是 persistent heap 结构。ready、static、forced 共用实现但有不同成员合法性、顺序与淘汰规则，不应统一成无区别的一条队列。

## 全部事件到消费边界的传播

### seed / pre-admission

1. raw Scheduler 经 `prepareExecutableTaskGraph` 绑定 validated graph/root cap；standalone `createAdmissionGraph` 经 exact input→prepare→compile。prepared Scheduler 不重新 normalize 输入。编译一次建立全部 static indexes。
2. shell 先检验 frozen private policy，再按输入顺序处理 pre-admission results：pending ID get 检验 unknown/duplicate、删除 payload、执行 prerequisite callback、保存 value/kind。全部结果处理后才一次传 settlement kinds 建 Core seed；不能把 bulk seed 优化成改变 callback/非法输入的首错顺序。
3. Core 构造 statuses、全部 counters/partitions/ready/active roots/frontiers/forced queue。seed 本身不派 effects；`scheduler.ts` 首次 `reconcileAdmissionCore` 再按 canonical forced order replay，调用 blocked callback 后 observer 才能被后续 admission。
4. private `SchedulerSnapshot` adapter 可 seed running/active/legacy mutex、未出现 Task=absent；它是明确全量重建入口，不是 real shell 每轮都执行的默认路径。

### select

1. single validation 依次 complete→unknown→not-pending→unresolved depends→unresolved observes→mutex→scope cap→root cap→resource shortage。stage 只形成首个 public rejection，payload 按需扫描并 lexical 排序相关 occurrences。
2. accepted select 产生 running status；若 Task 是 inactive scope activation candidate，附带 activatedScopeSlot。runningTotal、mutex occurrences、resource units 更新；partition 从 pending 移到 running，relation-ready 移除这个 slot。不触发 reverse relation decrements，因为关系等终态，不等 admission。
3. 若 activation，更新 historical marker 与 current active roots。全局 effective cap 可能改变所有 pending Task 的 `canAdmit`，但它们不会被 bulk retag；scope groups 的 static layer 另行重分类。此处不能把“scope→成员”误当全部受影响 legality 集合。
4. frontier 从 affected membership 与 scope 变化更新；效果为一个 admitted + immutable post-state。real shell 再取 pending payload、安装 Promise/running entry、记录 admission sequence；collector 只在 demand 存在时对边界采样。public hypothetical successor 不执行任何真实任务。

### running settle / forced cascade

1. 校验 complete/ID/running 后写 settled kind，running occupancy 一并释放，remainingTaskCount -1；任何 kind 都解除 observes 等待，只有 completed 满足 dependency。
2. 使用 reverseDependencies/reverseObservations 更新 counters，去重 affected candidates；查 reverse dependents 的 forced 阈值，加入 descending-slot 工作队列。同一 source 的 occurrences 被聚合 numeric delta，不用无来源布尔删除。
3. terminal settlement 对编译 terminal→scope slots 关闭 current roots；once-activated marker 不减。维护 affected relation memberships、组 heads、scope layers 与 stale entries。
4. `reconcileForcedBlocks` drain forced queue；每个 forced Task 额外按它的 declared dependsOn 过滤非 completed settlement IDs，生成 payload，再产生 blocked transition；继续传播下游和观察者。输出 `effects` 与每 effect `effectStates` 一一对应，不仅是最终状态。
5. real shell 先交付 direct settlement state，再逐 forced effect 安装相应 Core、取得 pending payload、保存 settlement、调用 onTaskBlocked、采集/通知。把整个 closure 合并成只暴露最终 state 会改变当前观察边界。

### cancellation / policy fault

Core 一次取得初始 pending partition 的 declaration-order slots；逐个执行 pending→cancelled-before-start transition，不在这个批次中 drain forced queue。每项更新 status、relation counters、roots/frontiers，形成对应 effects/states。shell 的 cancellation 与 policy-fault 路径取得最终 cancellation Core 后按 pending payload 的声明顺序逐个结算；已经 started 的 Promise 仍 drain。完整 pending 枚举有取消全部工作的义务，但逐项重复 frontier 更新可评估 bulk-builder；改变 intermediate effects、顺序或错误优先级不能作为无成本实现细节。

### ready/static 与公开观察

`transitionIndexedSelection` 已知 affected slots，却只传候选集合；`transitionReadyFrontier` 再对 previous/next ready `has` 判断真正 membership diff 并收集 groups；`transitionStaticFrontier` 又从所有 affected slots 收 groups，再比较前后 layer/head。scope 路径也先改 sorted array，再由 `transitionActiveScopeMembership` 对有限 candidates 做 `array.includes` 才得真实 Set diff。这两条是已确认的重复**影响发现**；它们不证明 ready/static 的排序结果应被合成无序集合。

static 查询按 tightening→continuation→ordinary 取 global group heads。mutex blocked head 跳过；constrained 层找到第一个无 mutex 的 head 就返回，capacity 不足则 wait，不 ordinary backfill；ordinary 在 root 有空闲时寻找首个能运行 head 并保留第一个容量阻塞 fallback。每组约束相同使组头代表 fit，但 `G=N` 或大阻塞前缀时仍可能访问很多组，query-local heap merge 也有分配；同一 captured state 重读会重走被动态阻塞前缀。

完整 custom candidates 从 relation-ready `toArray+declaration sort` 后动态 mutex/capacity 判断。公开 catalog 对所有 pending 形成首要 rejection；inspection 投影 running/settled/scopes/resources，并可能遍历全部 relation-ready 才知道无可 select Task。它们读同源 counters/occupancy，但 materialization 并不缓存。公开 getter 每次重读重做 DTO；shell 自己的部分 captured inspection/candidate facts 有局部 lazy cache，不能把它外推为 Core wrapper 的 cache。

## 非增量工作逐项归因

| 路径 | 形成时全量/排序/重复工作与原因 | 输出义务与替代条件 |
| --- | --- | --- |
| input normalize / validation / compile | 接受全 graph 并建立静态身份/关系/约束与排序；存在 `N/E/M/C/S` 输入下界。 | 必须读取完整输入，但多份 retained lookup、public graph 关系数组副本、跨 scope traversal 与 ranks 排序分别可审视；dynamic index 不自动替代 validation。 |
| seed | 全 statuses/counters/partition/frontier 初始化；forced queue 初筛。 | 初建必要，但有多遍 graph/ready/group 遍历；可共用 builder；不能承诺零额外遍历或线性 heap 建表，因为当前逐个 heap insert。 |
| affected relation readiness | changed slot+reverse fanout counter 更新后逐候选重判。 | 局部且有必要发现 predicate 跨零；可当场产出 membership add/remove，不让下游再比较集合。 |
| ready/static propagation | 两次收 groups、二次 head/layer 比较；scope array→Set diff。 | 是统一 delta owner 的直接对象；每种 view 的专属排序/entry revision 依然须明确拥有者。 |
| scope activation/close | active array includes/copy/sort/filter；有限 candidates 再 includes 检测 membership。 | 不是必要全 `N` 广播；候选 ordered persistent structure/min gate、直接 lifecycle delta。是否值得替换取决 `A`、频率和内存。 |
| partition ID 查询 | 每次 member array+declaration sort，公开另用 lexical rank sort。 | 输出 Ω(K)，排序并非 Ω(K) 下界；ordered membership 或 snapshot-local memo 是替代。不同 order 是合法语义，不等于两份源事实。 |
| candidates | 每次完整 relation-ready 排序并动态 mutex/claims/capacity 查询。 | 完整列表有成员输出成本，但 private custom seam 即使 callback narrow/none 仍构内部 candidates，是可重新讨论的 hard-guard/admission-boundary 设计。 |
| catalog | 全 pending 首要 reason/payload 与 lexical 排序。 | 返回全 nonselectable evidence 有真实输出下界；可共享状态级判断/memo，但不把 summary classification 与 primary reason 误合并。 |
| inspection | running/settled 输出、scopes copy+lexical sort、resources 全表、select-existence `.some`。 | 输出是义务；scopes 静态排序可编译，existence 可增量计数或有界查询，代价为 blocker fanout/物化。 |
| resource/mutex query | 每待查 Task 逐 claims/mutex；legacy mutex 使用 includes。 | 有意 occupancy+query gate，避免每 occupancy 变化广播 cohort；可比较 reverse cohorts 与 typed index，但不能仅凭“全面增量”要求所有表达式物化。 |
| static prefix query | 对动态 blocked heads 每次重判；query-local pop，旧 snapshot 不变。 | 必须在“query 成本”与“cohort 更新+保留 snapshot 内存”间比较；当前不是普适最优证明。 |
| forced closure | 每 forced task 按 declared dependsOn 构造 dependency IDs；每项完整 persistent successor/frontier 更新；effect 数组最终复制冻结。 | effects/payload Ω(F+输出 IDs)，但 builder/batch 内部工作可讨论，须保留 descending order 和每 effect state 语义。不是旧版每次倒扫全图找 block。 |
| cancellation | 初始 pending sort+逐 Task transition、shell 逐 payload 移除。 | 枚举所有取消项必要，逐项构造所有派生 frontier 是否必要可讨论；不能偷偷改成 forced kind 或顺序。 |
| private snapshot adapter | full statusesForSchedulerSnapshot、compile、seed/reconcile。 | 外来 partial boundary 必须恢复事实；正常 real shell 持有 live Core，不以此代表每决策成本。 |
| trace projections | 全 actions 的 pre/post/effect catalog/inspection 与逐 Task validation。 | 仅测试入口辅助观测；不是 product 常态热路径，不把其全量成本计入薄执行。 |

shell/measurement 中每边界 pending 分类、每 interval delay 累加、Promise.race、终态输出等另见消费者资源；本表与该表合起来才是本轮范围内的非增量普查。

reverse fanout 本身也被分阶段多次消费：dependencies 分别用于 affected 集合、pending decrement、非 completed 时的 failed increment、forced threshold；observations 分别用于 affected 与 pending decrement。之后 affected 集合再被 ready predicate 与两级 frontier 消费。这证明可共用一次受影响事件/阈值发现的机会，但不证明把所有循环融合就降低渐近量；仍须触及真实 fanout 并执行不同的数值更新。

## 三类“重复”与统一候选边界

1. **同一变化重复发现：** affected slots→ready diff→groups→static head/layer diff；active roots array→Set diff。可由一次 transaction 产生 typed status/membership/counter-threshold/lifecycle delta，再由 view 输出 head/layer delta。delta 是 successor 构造期短命值，不增加持久 event ledger。
2. **同一事实多 backing：** statuses+partition；partition sizes+两个 scalar counts；current roots array+Set；ready 两 heap 在不同顺序时双存；编译冗余 ID maps。前四类需要比较读写/枚举/min/顺序/快照义务才能决定保留几份；无消费者 compiled fields 是更独立的删减候选。
3. **含义确实不同：** unresolved dependencies/nonCompleted/observations；mutex occurrences/resource units；historical activation/current root/closed；relation-ready/canAdmit；组内成员/global 组头；primary rejection/independent summary facts/measurement 互斥分类；Core 事实/shell 真实 payload/clock。统一成一类 tag 会丢失来源、单位或消费优先级，不是结构简化。

逻辑统一对象可覆盖 transition facts、typed member 维度、聚合、lifecycle 与派生 view 输入。
上述清单支持报告中的 A/B/C 比较：A 统一变化传播；B 在共同契约下重选 backing，保留 count、weighted occupancy、ordered frontier 等显式视图；
内部通用 `Map<Key, MemberSet>` 可作为 B 的实现，动态 query 框架则另有表达能力要求。形成时均属候选，具体比较结论由报告正文承接。
