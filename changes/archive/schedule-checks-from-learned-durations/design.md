# Design

本设计把自动学习拆成 Scheduler 外的本地持久观测模型和 Scheduler 内的纯选择策略；项目只启用一个全局设置，第一版不要求或接受 Check 逐项手工估时。

## Context

Project Run当前在每个实际执行Check callback前后使用invocation-private monotonic clock，并在settlement后形成`RunResult.checkDurations`。该公开 duration 包含 callback、Record validation 和 terminal settlement，但不包含合并后已经进入 admitted Task lifecycle 的 task-local preflight，因此不能代表完整槽位占用。既有 Scheduler terminal raw measurement 在 timing available 时为每个 admitted Task 提供 `admittedAtMonotonicMs` 与 `settledAtMonotonicMs`；两者差值才是本 Change 的 Task active-duration 样本。

当前static `admissionPriority`是Definition-owned signed integer，按nearest-explicit inheritance进入fingerprint和Task metadata。它在无状态 static tightening/constrained/ordinary 算法的同轮比较中排序。本仓重复A/B evidence显示，手工把一个长Check提前并未稳定改善full wall time；自动策略需要估计完整downstream chain，而不是把“单项更长”直接等同于“先运行更优”。

`cacheJsonByKey`只计算或读取一个caller已经完整定key的immutable JSON result，允许同key并发重复compute。Scheduler learning却需要读取旧样本、追加本轮duration、淘汰窗口外样本并再次发布，因此必须有独立的mutable-state owner；共用canonical JSON/atomic write低层helper可以评审，但不能把现有cache contract改名复用。

目标调用关系为：

```text
explicit Definition setting + effective project root
  -> Definition normalization + invocation controls
  -> load and validate bounded duration history
  -> build immutable prediction snapshot
  -> pure admission-selection policy
  -> Scheduler admission + task-local preflight, execution and settlement
  -> derive valid admitted-to-settled Task intervals from terminal raw measurement
  -> update bounded history after Scheduler closure
```

## Goals / Non-Goals

**Goals**

- 一次项目级设置自动覆盖所有实际执行Check，不要求逐项手工估时。
- 从真实 admitted-to-settled Task duration 形成可解释、可衰减到新数据的跨运行estimate。
- 用estimated downstream critical path改善长尾，同时保持所有硬约束与有限进展。
- 让相同graph和prediction snapshot产生确定选择，并能从diagnostic恢复estimate来源。
- 让历史损坏或I/O失败只损失优化，不损失质量事实和执行正确性。

**Non-Goals**

- 不根据AST、文件hash、CPU/IO分类或外部监控自动发现workload identity。
- 不缓存或跳过Check execution，不重放outcome、Records、messages或side effects。
- 不提供deadline、preemption、在线强化学习、全局最优保证、remote/distributed history或跨项目共享模型。
- 不在本 Change 中重新定义公共 custom selector；它复用独立 Change 的 closed policy union与无状态 select/wait boundary，且任何 selector 都不能读取 Scheduler mutable state。
- 不用预测替代dependency、observation、mutex、capacity、fail-fast或final aggregation。

## Decisions

### Intended Change

#### 1. 一个显式全局设置启动整个能力

公共authoring形状以实现时类型命名为准，闭合语义如下：

```ts
scheduler: {
  maxParallel: 4,
  admissionPolicy: {
    kind: "learned-critical-path",
    stateDirectory: ".vibe-check/scheduler-state"
  }
}
```

`admissionPolicy` 省略时按当前 `{ kind: "static" }` 执行并保持零历史 I/O；显式 static 与省略形状必须得到同一 canonical declarative representation。learned variant 必须同时提供 non-empty `stateDirectory`；相对路径从 effective `projectRoot` 解析，绝对路径直接使用。设置本身就是对该 Product-owned state path 的明确授权，不另设初始化命令、enable flag 或每 Check enrollment。此扩展保留既有 `custom` callback 的 authoring、fingerprint 与 fault contract；它不把 learned history 暴露给该 callback，也不把 callback closure 变成 history state owner。

state path进入closed Definition与declarative fingerprint。Product只拥有该目录内一个versioned scheduler-history文件；目录仍是调用方选择、可整体删除且不提供secret storage、sandbox或remote cache保证的本地状态。第一版只承诺同一项目在相近运行环境中的本地重复使用，不承诺跨机器、distributed或共享CI history。

#### 2. 第一版只自动学习，不提供 per-Check 手工估时

第一版不增加 `expectedDurationMs` 或等价 per-Check override。learned mode 为全部 executable Check 从历史或 project prior 自动形成内部时长 estimate；它不是 authored Check 字段。出现真实、稳定且无法由 model 适应的例外消费者后，再由独立 Change 评审带单位的 override、authoring owner、继承和 fingerprint 影响。

现有 `admissionPriority` 保持独立的 immutable Task metadata、nearest-explicit inheritance 与 static mode 行为。learned mode 不修改、吸收或重新解释 priority；在每个既有 selection layer 内先比较 critical-path score，仅在分数相同时按 owning Task 的现有 effective priority 降序，再使用 canonical tie-break。dependency 只表达必须等待的 directed relation，不能用于伪造“希望更早”的性能偏好。

#### 3. History identity在admission前形成

Scheduler history schema拥有独立model version。每项normalized executable Check的identity digest至少覆盖：

1. model version；
2. stable Check ID；
3. canonical authored-options digest；
4. canonical effective project flags。

task-local preflight function identity、prepared options、任意外部文件和toolchain不能在admission前由Product可靠序列化或发现，不进入默认identity。若这些因素改变时长，rolling samples会逐步适应；存在稳定分桶需求后再评审显式identity hook，本Change不预置任意key callback，也不为取得prepared options恢复全局preflight barrier。

history只保存digest、bounded numeric samples、对应Scheduler settlement kind和内部observation sequence；不保存raw authored/prepared options、flags、messages、Records或callback output。digest是本地identity，不宣称保密或content correctness。

#### 4. 所有有效 admitted-to-settled interval 都是事实样本

learned mode 必须启用既有 Scheduler measurement collector，即使 diagnostic、caller measurement Hooks 和 custom policy 都未启用。history owner 只读取 terminal raw measurement；`timing.availability` 必须为 `available`，且 owning admission 同时具有有限、未倒退的 admission 与 settlement timestamp。二者非负差值是 Task active duration，覆盖 task-local preflight、execution 与 Product settlement。现有 public `RunResult.checkDurations` 保持 callback-only 契约，不被扩大，也不作为学习输入。

任何已经 admitted 且形成有效 interval 的 Task 都记录真实 duration 与 Scheduler settlement kind；这包括 preflight block、execution 非通过和 admission 后的 cooperative cancellation，因为它们都实际占用过槽位。flag-control pre-admission result、dependency block、fail-fast/caller cancellation before admission 及其它未 admitted Task 没有 admission interval，不产生`0ms`样本。Scheduler admission delay、mutex/resource wait和diagnostic observation不进入duration window，避免把调度结果反向训练为executor耗时。

每个identity第一项真实样本在下一Run立即参与estimate。新样本append后只保留最后32项，因此一次异常值会作为真实观测参与有限窗口，但不会永久固定权重。history最多保存4096个identity series；超过上限时按内部observation sequence淘汰最久未更新series，避免Check ID或options长期变化造成无界文件。

#### 5. Cold start 使用明确 prior

prediction snapshot 按以下唯一顺序选择每项内部时长 estimate：

| Source | Trigger | 内部 `estimatedDurationMs` |
| --- | --- | --- |
| `learned` | 当前identity至少一个valid sample | 最近32项arithmetic mean |
| `project-prior` | 当前identity无样本，但本轮其它Tasks有learned estimate | 这些estimate的中位数 |
| `cold-start` | 本轮没有任何learned estimate | 常数`1` |

`estimatedDurationMs` 是 immutable prediction snapshot 的内部字段，不是 public `expectedDurationMs` authoring 选项。常数 `1` 只提供相同正权重，不声称 Task 需要 1ms。所有 Task 都 cold-start 时，graph path length、priority tie-break 和 canonical order 决定首轮；实际执行后下一轮使用真实样本。unknown Task 永不被当成 `0` 或永久放到已知 Tasks 之后。

snapshot包含model version、每Task source、sample count、mean、p90与estimate，并形成稳定digest。它在Scheduler启动前deep-freeze；同次Run的后续settlement不能修改本轮选择分数。当前窗口、统计和score算法在公共文档中直接说明，以便消费者理解与诊断，但不构成跨model version的兼容承诺，也不保证跨版本、环境或Run产生相同admission顺序。

#### 6. Greedy critical-path是heuristic而非最优证明

在最终directed readiness graph上反向计算：

```text
criticalPathScore(task) =
  estimatedDurationMs(task)
  + max(criticalPathScore(each direct downstream task), 0)
```

success dependency与outcome observation都要求downstream等待upstream terminal fact，因此都形成score edge；outcome predicate只影响最终是否执行，不改变本轮静态score公式。graph必须已经通过acyclic validation。

policy仍按以下顺序保证正确性和进展：

1. 每轮从同一immutable graph、prediction snapshot、candidate和runtime facts重算 tightening scope；先按更严格effective cap，再按critical-path score、现有effective priority和既有ID tie-break。
2. 然后重算 constrained continuation；使用同样的score、现有effective priority和既有tie-break。
3. 最后 ordinary ready按critical-path score、现有effective priority和canonical order。

policy读取Scheduler给出的relation/mutex eligible candidates和per-candidate capacity facts并返回select/wait；当前capacity不能准入的candidate不被预先移除，因而可形成可drain的wait。Scheduler在select后只守pending/readiness/mutex/capacity/lifecycle hard conditions，并对wait守drain；不保存或解释reservation/fairness/starvation state。该list-scheduling heuristic可在代表性graph降低makespan，但dependency、mutex、capacity、variance和未来执行时间不确定时不保证全局最优。

#### 7. History I/O与执行失败隔离

state directory内只使用一个固定文件名和versioned closed JSON envelope。读取顺序是missing、parse、schema/model validation；missing、invalid、不兼容model version或read failure形成empty learned model并记录不同diagnostic status。若canonical prediction input、local setup、prediction或score table不能形成，则只让该 invocation回退static selection。历史不可信，不把malformed data直接传入policy。该目录按本地cache-like状态使用；调用方可整体删除，第一版不提供跨机器、remote、distributed或共享CI保证。

Run在Scheduler闭合并已取得terminal raw measurement与settlement kinds后，把本轮有效 Task intervals 合并到内存model，应用32-sample与总series上限，再在同目录写完整temporary file并atomic replace。record/write failure不回滚Check settlement、不重跑Tasks、不改变aggregate或Run result kind，只丢失未来样本。并发invocation各自使用启动时snapshot；atomic replace保证文件完整，但last writer可能覆盖另一轮尚未合并的样本，这只降低统计质量，不影响正确性。

`cacheJsonByKey`不提供read-modify-write、history merge或series enumeration，本Change不修改它。只有现有canonical snapshot或atomic file helper可在不扩大cache owner时机械复用。

#### 8. Diagnostic解释选择，不成为第二个结果协议

diagnostic logging启用时，新增有界事件说明：history read/write status、loaded/retained series count、model version/digest，以及每次admit所选Task的estimate source、sample count、estimated duration和critical-path score。raw samples只在有界summary中给count/p90，不逐项输出；raw identity input永不输出。

第一版不增加public `RunResult.schedulerLearning`、machine schema或progress字段。history failure是性能优化降级，不是质量事实；需要程序化监控的真实consumer出现后，再以独立Change评审结构化read/write observation，而不把diagnostic log承诺为稳定parser输入。

#### 9. 实施顺序与长期 Decision

本Change在以下Readiness完成后实施：

1. `extract-scheduler-admission-selection-policy`已归档并提供private select/wait contract；
2. `expose-custom-admission-selection-policy`已归档并建立closed static/custom public union；
3. `separate-passed-dependencies-from-settled-observations` Decision 已闭合directed readiness graph；
4. `add-scheduler-performance-diagnostics`已实施，或同一分支提供等价的slot/admission/tail A/B证据；
5. 已审阅fail-fast和named resource当前状态，确认它们只改变cutoff、candidate legality或started samples；
6. 已建立 learned-history 专项 Decision，固定通用 package 能力、显式本地状态、无 per-Check 手工估时、现有 effective priority 同分语义、模型公开但非兼容承诺，以及 history failure 非质量结算边界。

`learn-check-task-durations-for-critical-path-admission` 是上述长期方向的 owner；本 Change artifacts 是该方向的实施与验证计划。长期 Decision 采用 static mode 作为兼容默认、learned mode 通过 caller-managed local state directory 显式启用、不提供 per-Check 手工估时、现有 effective priority 在 learned mode 仅为同分 tie-break、当前模型公开说明但不承诺算法兼容，并且 history I/O 不改变质量结算。Decision 已在实现、public docs、direct/installed tests 与 Gate adoption 验收后标记为 `active + aligned`；该对齐不完成或归档本 Change，也不授予新的生命周期写入权限。

### Resulting Impacts

- Definition新增policy union会改变declarative schema；省略与显式static必须规范化为同一snapshot。第一版不修改Check authoring grammar。若新增canonical默认使fingerprint算法输入相对变更前发生变化，实施者必须显式重建对应baseline，而不是承诺旧digest不变。
- admission前history identity构造需要复用Definition的canonical authored-options boundary，但不能调用preflight，也不能把authored/prepared options写入history或diagnostic。
- history read发生在Scheduler前，write发生在已闭合execution facts后；两者时间可由Scheduler外层diagnostic观察，不得混入public Check duration或Scheduler Task active interval。learned mode启用既有 measurement collector，但不改变raw timestamp或public Hook contract。
- estimated critical path需要final graph提供downstream adjacency；不要在policy每次选择时重复遍历完整图，应在immutable snapshot构造时一次计算score。policy仍接收完整 graph、relation/mutex eligible candidates 与 capacity facts；priority只存在于Task metadata，不设旁路输入。
- Project Gate若采用learned mode，其state directory、忽略/清理policy和performance baseline需要由Gate owner维护；Product文档只说明通用state lifecycle。

## Risks / Trade-offs

- 相同Check ID和authored options在preflight结果、不同硬件、toolchain、cache状态或外部输入下仍可能有不同时长；bounded rolling window提供适应性但不是workload identity证明。因此第一版state只面向同一项目的相近本地运行环境，不能把共享目录解释为跨机器可比模型。
- arithmetic mean对重尾样本敏感；第一版同时输出p90但不把variance自动变成第二个score。只有跨项目证据证明需要置信区间后再演进模型。
- required state directory增加明确配置，但避免默认偷偷写HOME或repository；这是一次项目级成本，不是per-Check成本。
- diagnostic-only failure observation意味着未启用diagnostic的调用方不能程序化判断history health；第一版接受该边界以避免为优化状态扩大所有RunResult branches。
- 本 Change 的 non-goal 是扩大或重定义既有 public `custom` callback：它继续是由相邻 Change 拥有的 trusted select/wait contract。`learned-critical-path` 是 Product-defined policy variant，不把 history、prediction snapshot 或持久状态管理能力暴露给 custom callback。

## Open Questions

无阻塞问题。用户已确认：能力作为通用 package 功能交付而由本仓 Gate 独立决定是否采用；learned setting 必须提供 caller-managed local state directory；第一版不提供 per-Check 手工估时；现有 effective priority 仅在 critical-path 同分时保持自己的优先语义；当前模型公开说明但不作跨版本算法或顺序兼容承诺；history failure 第一版只进入 diagnostic。公共 custom selector 由相邻 Change 承接。若项目需要隐藏默认路径、hard priority override、per-Check estimate、public history health DTO 或跨机器/共享 CI history，必须建立新的明确方向，不能以局部代码例外加入。

## Implementation Observations

实现遵循本设计的 owner 链：Definition 规范化 `stateDirectory` 并把它纳入 declarative fingerprint；Run 在 author
preflight 前从 effective `projectRoot` 解析目录、加载 closed history、建立 frozen prediction/score；pure Scheduler 只消费
该 snapshot；所有 Task closure 后才从 terminal occupancy measurement 记录样本并 atomic replace。static 与 custom 保持原有
authoring/fingerprint/fault 语义；history/model 既不进入 custom callback 或 Check context，也不扩张 Check/Record/machine/progress/
`RunResult` public contract。

当前实现的 32-sample arithmetic mean、nearest-rank p90、4096-series bound、median project prior 和 cold weight `1` 都由
owner 文档公开以便理解与诊断，但不承诺模型、file envelope、admission order 或性能跨版本/环境兼容。最终实现、测试与 exact
candidate 的 Gate A/B evidence 见 [`acceptance.md`](acceptance.md)；它确认本仓 Gate 采用 learned policy，同时保留原始
local evidence 的位置、变体控制、排除样本和同环境限制，不能被解释成 package 的通用性能保证。
