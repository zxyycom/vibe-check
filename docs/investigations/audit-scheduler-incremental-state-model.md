---
title: "Scheduler 增量状态与统一索引模型普查"
id: "261015-audit-scheduler-incremental-state-model"
formedAt: "2026-10-15T09:34:30Z"
question: "当前 Scheduler 的增量维护有哪些重复，非增量工作为何保留，统一多维索引应覆盖哪些职责与契约？"
tags:
  - "algorithmic-complexity"
  - "architecture"
  - "performance"
  - "scheduler"
relations:
  - type: "复查"
    target: "260903-assess-admission-state-performance-and-selection-index"
    summary: "在现有增量实现上复核统一索引与剩余全量成本"
---

## 形成时背景

本轮由用户要求“先完整结构普查，再讨论”而形成，服务当时处于 Draft 的 Change
[`restructure-scheduler-incremental-state`](../../changes/restructure-scheduler-incremental-state/proposal.md)。
用户提出 `Map<string, Set<TaskID>>`，希望状态集合、约束分组与 frontier 不再各自重复维护同一变化，
并允许重新讨论公开观察与统计语义。本报告记录调查当时的候选和待确认边界；底层重构的执行安排由
[Scheduler Change](../../changes/restructure-scheduler-incremental-state/proposal.md)承接。
声明式上下文 Change 已结项，其 Plan 可从
`git show de9cf844534b1b799b9c7e0dd75f7ff0dfba7c14:changes/adopt-declarative-callback-contexts/proposal.md`
恢复。当前上下文契约见 [API 机制](../api-mechanics.md#声明式-callback-context)，不以本报告的形成时认识代替。

直接前序 [260903-assess-admission-state-performance-and-selection-index](./assess-admission-state-performance-and-selection-index.md)
记录了 2026-09-03、`ff9b40bc7b650c224a3462048fa7692af93d5957` 的 parent+delta 表示、同机回退信号，
以及单一 selection index 的可行性与测量缺口。本轮检查的是 2026-10-15、
`d9f346fde00d0ec9b57cccdbc21c9f1cefff5927` 的 persistent/index 实现，
两轮版本与表示不同，须分别复核复杂度和性能证据；旧 benchmark 只说明前序条件下的结果。

公开行为由[调度指南](../guides/scheduling.md)、[模拟分支指南](../guides/simulating-admission.md)与类型拥有，
内部不变量由 [Scheduler owner](../development/scheduler.md)拥有；本报告只保存形成时认识。
调查时以 [immutable state](../decisions/provide-immutable-admission-graph-state.md)、
[阶段需求](../decisions/archive/declare-scheduler-context-demand.md)与
[规模收益取舍](../decisions/weigh-performance-costs-against-scaling-benefits.md)为判断基线。

## 调查目的

本轮完整盘点所声明范围，回答三个问题：

1. 列尽 Core 的源事实、成员索引、聚合、分组与队列，追踪 seed/pre-admission、select、settle、forced cascade、
   cancellation、scope activation/close 到执行和公开观察的传播。
2. 区分重复发现同一 diff、同事实多 backing、有独立义务的不同视图；逐项解释非增量工作为什么存在，
   以及可替代的维护方式。
3. 回答“全面增量应该统一什么”，比较 A（只统一 delta）、B（源事实+typed 多维索引+派生视图）、
   C（更通用 tags/query），识别选型依赖的契约和实验问题。

交付是结构普查与决策输入；实施、选型采用和实测验证留给后续工作。

## 调查范围与依据

### 实际覆盖与方法

- 核对 `main` HEAD 为上述 `d9f346f…`；读取前后，限定 Scheduler 与公开 policy 类型的源码 diff 均无输出。
- 完整读取 `admission-core/**` 的 **19 个非 test/test-support TypeScript 文件**，包括只有测试入口消费的 `trace.ts`；
  列尽 `AdmissionSelectionIndex` **17 个字段**与全部 compiled 字段。逐文件、逐字段、事件链与非增量清单见 Core 随附资源。
- Scheduler 目录共 74 个 TypeScript 文件，其中 **43 个非 test/test-support 文件全部覆盖**：Core 19 个、外层与 measurement 24 个；
  后者包括 graph/validation、real shell/replay、decision/custom context、观察、measurement 全部 5 个文件和终态交付。
  另沿公开类型/指南、Definition 需求验证、Invocation 与 learned 实际消费者追踪。逐文件覆盖与字段责任见两份随附资源；
  这不是整个 Product、全部 learned 模型/持久化或测试实现的普查。
- 使用 CodeGraph 文件目录与全文节点读取；节点依赖不足以判断属性消费者时，使用限定 `src` 或 Scheduler 路径的 `rg` 核对属性/符号引用。
  结论依据源码控制流、容器形状与逻辑访问量，不依赖采样时长或简化容器实验。

### 证据强度与未覆盖

下文“当前”均指形成时版本。“事实”指该版本源码与 owner 核对结果；“推断”指由它们支持的可行性/成本判断；“建议”指调查当时的候选方向。
操作量不包含 Immutable 库每次读写的实现常数、哈希分布、GC、分配与运行时调度，不能称为实际时延、全 Run 上界或收益。
`N/P/V/A/G` 分别表示 Task/pending/relation-ready/current active-root/group 数；group 数 `G` 可以等于 `N`，
mutex/claim occurrences、relation fanout、scope 数和每 Task 约束数也不假定常数。

本轮未运行产品测试、Case 审计、Gate、timing/profile、内存 profiler、候选 prototype、Node/Bun 对照或端到端 Run。
结论限于静态结构：任一候选的正确性、速度、净内存和生产分布均未验证，也未由本轮采用或实施。

## 调查结果与边界

### 核心结论：以 typed 变化契约连接事实与派生视图

**事实：当前已有一个 legality/reducer owner，但还没有一个贯穿事实—成员—frontier—观察的共同变化契约。**
同一状态有多种 backing，有些是有价值的反向/有序索引，有些确有消重空间。
“全面增量”应覆盖整个传播链与 backing 数量，并逐项决定 `canAdmit`、统计等表达式的物化边界。

**推断：可共同依赖的最小边界是一次原子 transition 的 typed facts/delta 与明确派生视图。**
status、settlement kind、activation/close 等事实只由 Core 改写；同一事务计算 member add/remove、counter threshold、
occupancy 与 lifecycle 变化；有序视图再产出 head/layer 变化，聚合与观察消费者不重新猜测同一 diff。
delta 是 successor 构造期的短命值；物理容器、身份编码与持久化表示仍是独立选型。

### 对前序认识的复核

前序指出的 parent-chain status lookup 已由 persistent indexed statuses 取代；running/remaining counts 不再每次扫全图，
mutex holders/resource units 已在 admission/settlement 增量维护，关系 readiness 使用 counter/reverse fanout，
forced closure 已不是每次倒扫全图寻找下一项，active scopes 也不再每个 candidate 重新筛选排序。
当前 static 还能按全局有序 group-head 必要前缀选择。因此旧报告中的 delta-depth 变量、旧最坏组合公式与回退数字不描述当前实现。

保留的原问题是“同一 boundary 应由同源事实服务各消费者”，但当前表现变为多份 persistent backing、重复影响发现、
成员排序/动态 gate 查询、demand-enabled 统计的反复分类与数值累积。性能判断需要基于本轮版本、规模和需求重新测量。

### 三类重复及其不同处理方式

1. **重复影响发现。** `selection-transition.ts` 重判 affected slots 的 ready membership；`ready-frontier.ts`
   再比较 previous/next membership 并收 groups；`static-frontier.ts` 又收 groups 并比较 layer/head。
   active-root 先改有序 array，再由 `selection-frontiers.ts` 用 `includes` 发现 Set diff。
   typed delta 可携带精确 membership/lifecycle 变化，由 ready view 向 static 返回 changed heads；真实 reverse fanout 仍须访问。
2. **同事实多 backing。** statuses 与三 partition、partition sizes 与 `runningTotal/remainingTaskCount`、current roots 的
   sorted array 与 Set、组内 ready 的两种 order、compile 的多套 ID 查找，应逐项按 lookup/enumerate/count/min/order/snapshot 义务裁剪。
   status 与反向成员的双存服务枚举，标量 count 和其它 Map 则须独立说明价值。
3. **表面同形、语义不同。** dependencies 与 observations、mutex occurrences 与 resource units、historical activation 与 current roots、
   relation-ready 与 `canAdmit`、组内成员与全局组头、primary rejection 与 summary/measurement 分类、Core 与 shell/clock，
   各自的来源、单位、合法组合、顺序与时间语义须保留。它们可共享 typed 更新机制，由同一事实派生不同视图。

另有可独立复核的 retained-backing 候选：`compiled.taskById` 保存 `N` 个重复可达引用、
`resourceSlotById` 在 claims 编译后仍留存，本轮 `src` 非测试引用检索未发现后续读取；
`taskIdsInPublicOrder` 仅 trace 使用；`scopesById` 的读取只在无外部源码消费者的 `admission-scope-layers.ts`。
这些是局部清理或 compile-local 化候选。

### 事件链与增量边界

1. **seed：** graph/validation/compile 建立静态 facts；shell 按输入顺序完成 pre-admission value 和 prerequisite callback 后，
   Core 一次 seed 全部 statuses/counters/members/frontiers。seed 不派 forced effects，首次 reconcile 才形成 ordered blocked 效果。
2. **select：** 单 Task pending→running 更新 partition、mutex occurrences 与全部 resource units，移除 relation-ready；
   activation 还更新 lifecycle/current roots 与相关 scope groups。**active scope cap 约束全局 running 总数**，不只影响 scope 成员；
   当前不向全部 pending 广播合法性 tag，而是查询共享 gate。
3. **settle/forced：** 释放 occupancy，沿 reverse depends/observes 更新计数并检查 forced 阈值；forced 队列按 descending taskSlot 逐项产生
   blocked settlement、dependency payload 与对应 immutable effect state。观察者等终态，dependency 还区分 completed；二者不能合成一种关系满足 tag。
4. **cancel：** 按原 pending 声明顺序逐个 cancelled transition，再由 shell 结算 payload 并 drain started work；不是把这些 Task 改写成 blocked。
   bulk builder 可以研究，但需显式保留或批准改变 intermediate effect/观察顺序。
5. **views：** ready 是 relation-ready 成员的组内两种有序 heap；static 是三层全局 group-head queues。
   前者支持任意非 head 移除，后者支持只读必要有序前缀；revision 防止旧 head entry 复活，persistent sharing 保留旧 snapshot/forks。
   替代表示须同时覆盖两层排序与快照义务。

一个新模型至少须明确证明：status 互斥、ready 蕴含 pending 及关系谓词、occupancy 等于 running 声明的计数/units、
closed 优先于 activation marker、frontier head 属于当前 membership 且 entry generation 有效、forced reconciliation 顺序，
以及旧 state/fork 和 shell hard guards 不受新状态写入影响。`Object.freeze(new Set(...))` 本身不能提供动态集合快照；
逐 state 完整 clone 则把成本移向写入与 retained branches。

### 非增量工作：输出义务与维护选择

- **初建读取：** input/validation/compile/seed 必须读完整输入，但多遍构建、冗余 retained lookup、静态排序与跨 scope 重复 reachability 仍可单独评估。
  当前 reachability 已是一 scope 一遍可达子图，不再逐 member 重走；多 scope 重叠不自动变成全 graph 一次。
- **成员输出：** 完整 catalog、custom candidates、inspection、diagnostic 的完整 member evidence 与 terminal per-Task 输出有结果大小下界；
  这不证明每次 `toArray+sort`、重复分类、重复 DTO/freeze 必要。Core public catalog/inspection getters 重读会重建；
  ordered index、snapshot-local memo、静态 scope order 等是不同替代，不应混作一种缓存。
- **动态 gate：** mutex/resource fit 与 global root/active-scope cap 保留查询时判断，避免每次 occupancy 变化广播整个 cohort/全局 pending。
  static 动态阻塞前缀可能反复重走，但全部物化也会付出 cohort 更新/阈值索引/分支保留成本；需比较总写入+读取，而非只看 Set 查询。
- **局部维护：** current active-root array 的 includes/copy/sort/filter、frontier tombstone 清理、forced 逐项 state 与 payload、cancel 逐项 transition 均有明确现状与替代问题。
  forced payload/effects 输出不可凭索引消除，内部 builder 和 head/layer 传播则可讨论。
- **非 live 入口：** private snapshot adapter 全量重建与 trace 全量投影不代表 real shell 每次 decision；当前 live shell 直接持有 Core。
  不把未被当前 seam 读取的 legacy inspection getter 成本计入 static 薄路径。

消费端还存在两项不同于输出下界的事实：**narrow/none custom 在 private `decideAdmission` 仍先完整构造内部 candidates**，
仅 callback DTO 按需求裁剪；**collector 每个 capture boundary 对 pending 复制排序并分类，interval 又逐 pending 累计每 Task delay**。
后者可随多个 boundary 保留累计二次工作，不能由 Core 局部消重声称已经消除。
完整需求、无采集需求与 diagnostics 必须分轨，不能为统一索引让原 no-observer 路径开始维护昂贵观察集合。

### 消费者普查补充：共同底座之外仍有独立重构问题

- **需求粒度：** online-only 需求虽不构造 terminal per-Task DTO，collector 仍维护 delay、chronology 与 tail。
  learned 实际 decision 不读 measurement，其 duration recording 也不读分类 delay，但当前返回可直接调用的 function，
  兼容 full 契约触发完整 decision/terminal 采集。能否细分 raw/online 采集或修改 helper 返回形状，是需求/类型契约问题，
  不会因统一成员索引自然消失。needs 含 `admissionState` 时即创建 wrapper，只有 catalog/inspection 是 JS getter 延迟物化。
- **统计与终态：** classification counts/peaks 为标量，无完整 Task 输出下界；per-Task delay 保留进入过 viable 集合者，
  不只实际 admitted 者。last-admission tail 目前每 admission 复制 running IDs，summary top-three 对全部 eligible 项排序，
  terminal 还执行 table 复制/union/lexical 排序；这些分别可比较聚合、persistent 快照或 bounded selection。
  lexical admissions 顺序实际影响 learned sample observationSequence 与窗口保留，不能当作纯人读任意顺序删除。
- **Promise 与 payload：** shell pending/running/settlement Maps 持有 Task/Promise/value/error，与 Core membership 不同义务。
  每次 await 重新 `Promise.race` 全部 running completions，reaction 注册数随各 wait 的 running 数量之和增长。
  一次订阅的 completion queue 是独立候选，但已 fulfilled 并发完成的 tie 可能由当前 Map/race 顺序改为 arrival FIFO；
  未测内存，也未证明替换等价。它不应被塞进 typed Task membership 索引。
- **时间与交付：** clock/first-unavailable 原因、合法 zero span、accepted wait 与 passive drain、captured history prefix、
  drained/sealed 同一 terminal context 与失败续交仍归 collector/shell/交付 owner。消费资源另指出 controlPath 计时注释与实际包围 custom callback 存在张力；
  本轮未将其确诊为 Bug，后续若改采样范围须先确认 metric 定义。

### A/B/C 比较与形成时建议

- **A：保留表示，只统一 typed delta。** 直接处理 ready/static、active-root 的重复发现，较容易保留既有行为；
  statuses/partitions/counts 与 roots 的多份 backing 仍在，measurement 还须接入局部变化。
- **B：源事实 + typed 多维索引 + 显式派生视图。** 共同维护 member 更新、count 与查询，覆盖事实源、backing 数量、frontier/聚合与 demand。
  须逐维证明物化边界，并比较 gate 与反向 cohort、交集枚举/排序、cold seed、persistent branch sharing 和内存；
  count、weighted occupancy、ordered queue 仍有独立表示义务。
- **C：更通用 tag/query。** 内部 `Map<Key, MemberSet>` 可作为 B 的物理实现，按 typed key、合法组合、来源/units、
  更新/枚举/交集/分支与调试成本比较。扩展为动态查询框架则属于新增能力，需另有真实表达需求。

**形成时建议：统一 typed 变化契约，对 B 的全部维度逐项判定物化、派生或移除，并保留 A 作为较小候选。**
本轮证据足以支持这组比较，尚不足以选择物理容器或证明 B/C 更快。

### 调查当时识别的契约与验证问题

下列问题记录当时的交接依据，后续确认结果与任务由 Change 承接：

- **行为基线。** candidate 声明顺序、public lexical 顺序、rejection precedence 与完整 payload、每 effect 观察边界、
  captured prefix、frozen snapshot 和 terminal 交付均有实际消费者。pending primary 顺序为
  depends→observes→mutex→scope→root→resource，summary 独立事实与 measurement 互斥分类各有不同定义。
- **观察与数值。** raw 需求粒度、helper authoring、diagnostic 证据和指标定义属于契约。
  逐 Task delay 改为类别时钟、prefix 或 lazy 结算时，须明确舍入、overflow 与 timing-unavailable 时点；
  仅减少分类、排序或 counts 遍历则可在原行为内选型。
- **工程选择。** 维度物化、count/order/min backing、typed 通用维护、缓存与 persistent 表示由实现方比较和证明。
  narrow/none 路径的裁剪须覆盖无候选时不调用 callback、candidate 定义、hard guards 和 lifecycle 顺序；
  只有具体改变行为或扩张动态查询能力时，才产生新的用户取舍。

下一轮实验需在冻结的源码上建立新 baseline：

- 小/中/大 `N`，独立宽图、`G=N`、大共享约束 cohort、异量 claims、深关系/reverse fanout、多 active scopes、
  任意非 head 移除与长动态 blocked 前缀；记录触及 slots/edges/groups、membership 变更、head/revision 变化、query 前缀、排序与分配。
- 对 A/B 分别测 seed、select/settle/forced/cancel、cold/warm 查询、完整输出与 retained snapshot/fork 内存；
  保留 static/no-observer、custom narrow/none、legacy/full、diagnostics、online/terminal raw 及 mixed phase 需求。
- 同语义候选按 boundary/action/effect 做差异验证；批准改变的语义用新 spec 与独立 oracle 验证。
  Node/Bun、局部/公开 Run 端到端、同机串行测量分别报告，允许有说明的小规模代价，不要求每种输入更快。

源码、契约或真实负载改变，或者实验发现写入 fanout、动态前缀、retained memory 与预期不同，均需重新核对相应判断。

## 随附资源

- [消费者、统计与契约成本清单](./_resources/261015-audit-scheduler-incremental-state-model/consumer-cost-inventory.md)
- [Core 逐文件状态与传播清单](./_resources/261015-audit-scheduler-incremental-state-model/core-state-inventory.md)
