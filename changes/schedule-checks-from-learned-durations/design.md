# Design

本设计把自动学习拆成Scheduler外的持久观测模型和Scheduler内的纯选择策略；项目只启用一个全局设置，Check逐项配置只作为可选估值覆盖。

## Context

Project Run当前在每个实际执行Check callback前后使用invocation-private monotonic clock，并在settlement后形成`RunResult.checkDurations`。该duration不包含graph-ready后的排队时间，但包含callback、Record validation和terminal settlement前的active execution，适合作为Task占用Product槽位的历史观测。

当前static `admissionPriority`是Definition-owned signed integer，按nearest-explicit inheritance进入fingerprint和Task metadata。它在无状态 static tightening/constrained/ordinary 算法的同轮比较中排序。本仓重复A/B evidence显示，手工把一个长Check提前并未稳定改善full wall time；自动策略需要估计完整downstream chain，而不是把“单项更长”直接等同于“先运行更优”。

`cacheJsonByKey`只计算或读取一个caller已经完整定key的immutable JSON result，允许同key并发重复compute。Scheduler learning却需要读取旧样本、追加本轮duration、淘汰窗口外样本并再次发布，因此必须有独立的mutable-state owner；共用canonical JSON/atomic write低层helper可以评审，但不能把现有cache contract改名复用。

目标调用关系为：

```text
explicit Definition setting + effective project root
  -> Definition normalization + invocation controls
  -> load and validate bounded duration history
  -> build immutable prediction snapshot
  -> pure admission-selection policy
  -> task-local preflight, execute and settle Checks with real active duration
  -> update bounded history after Scheduler closure
```

## Goals / Non-Goals

**Goals**

- 一次项目级设置自动覆盖所有实际执行Check，不要求逐项手工估时。
- 从真实active duration形成可解释、可衰减到新数据的跨运行estimate。
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

state path进入closed Definition与declarative fingerprint。Product只拥有该目录内一个versioned scheduler-history文件；目录仍是调用方选择、可整体删除且不提供secret storage、sandbox或remote cache保证的本地状态。

#### 2. Per-Check override是例外，不是主路径

executable Check可以声明`expectedDurationMs?: number`。字段必须是positive safe integer，不继承，container声明视为invalid；省略表示使用learned或prior estimate。它进入normalized declaration和fingerprint，但不进入Check options、execution context、Check/Record facts或machine publication。

在learned mode中，override是该Task duration estimate的最高来源。现有`admissionPriority`不再作为独立于预测的首要层级：只有critical-path score及既有cap tie-break相同时才按priority降序。需要纠正已知时长时使用带单位的override，不能靠扩大priority长期压制model。

static mode继续完整保留现有priority行为，支持无持久状态、只运行一次或需要当前兼容语义的项目。dependency只表达必须等待的directed relation，不能用于伪造“希望更早”的性能偏好。

#### 3. History identity在admission前形成

Scheduler history schema拥有独立model version。每项normalized executable Check的identity digest至少覆盖：

1. model version；
2. stable Check ID；
3. canonical authored-options digest；
4. canonical effective project flags。

task-local preflight function identity、prepared options、任意外部文件和toolchain不能在admission前由Product可靠序列化或发现，不进入默认identity。若这些因素改变时长，rolling samples会逐步适应；存在稳定分桶需求后再评审显式identity hook，本Change不预置任意key callback，也不为取得prepared options恢复全局preflight barrier。

history只保存digest、bounded numeric samples、对应outcome分类和内部observation sequence；不保存raw authored/prepared options、flags、messages、Records或callback output。digest是本地identity，不宣称保密或content correctness。

#### 4. 所有实际started duration都是事实样本

Check execution measurement需要同时保留“用于现有public duration projection的数值”和“该monotonic interval是否可作为history sample”的内部事实。只有started、clock samples有限且未倒退的active interval进入history；现有public duration若为兼容而把clock anomaly投影成`0`，该fallback不能被学习器误收为真实`0ms`。无论terminal status为`passed`、`failed`、`not-applicable`或`unavailable`，有效interval都记录duration和status；prediction使用最近32项duration的arithmetic mean，status distribution与nearest-rank p90只用于解释波动。

preflight block、dependency block、fail-fast/caller cancellation before admission及其它未started Check的duration为`null`，不产生`0ms`样本。Scheduler admission delay、mutex/resource wait和diagnostic observation不进入duration window，避免把调度结果反向训练为executor耗时。

每个identity第一项真实样本在下一Run立即参与estimate。新样本append后只保留最后32项，因此一次异常值会作为真实观测参与有限窗口，但不会永久固定权重。history最多保存4096个identity series；超过上限时按内部observation sequence淘汰最久未更新series，避免Check ID或options长期变化造成无界文件。

#### 5. Cold start使用明确prior

prediction snapshot按以下唯一顺序选择每项duration：

| Source | Trigger | `estimatedDurationMs` |
| --- | --- | --- |
| `override` | Check声明`expectedDurationMs` | authored value |
| `learned` | 当前identity至少一个valid sample | 最近32项arithmetic mean |
| `project-prior` | 当前identity无样本，但本轮其它Tasks有override/learned estimate | 这些estimate的中位数 |
| `cold-start` | 本轮没有任何override/learned estimate | 常数`1` |

常数`1`只提供相同正权重，不声称Task需要1ms。所有Task都cold-start时，graph path length、priority tie-break和canonical order决定首轮；实际执行后下一轮使用真实样本。unknown Task永不被当成`0`或永久放到已知Tasks之后。

snapshot包含model version、每Task source、sample count、mean、p90与estimate，并形成稳定digest。它在Scheduler启动前deep-freeze；同次Run的后续settlement不能修改本轮选择分数。

#### 6. Greedy critical-path是heuristic而非最优证明

在最终directed readiness graph上反向计算：

```text
criticalPathScore(task) =
  estimatedDurationMs(task)
  + max(criticalPathScore(each direct downstream task), 0)
```

success dependency与outcome observation都要求downstream等待upstream terminal fact，因此都形成score edge；outcome predicate只影响最终是否执行，不改变本轮静态score公式。graph必须已经通过acyclic validation。

policy仍按以下顺序保证正确性和进展：

1. 每轮从同一immutable graph、prediction snapshot、candidate和runtime facts重算 tightening scope；先按更严格effective cap，再按critical-path score、priority和既有ID tie-break。
2. 然后重算 constrained continuation；使用同样的score、priority和既有tie-break。
3. 最后 ordinary ready按critical-path score、priority和canonical order。

policy读取Scheduler给出的relation/mutex eligible candidates和per-candidate capacity facts并返回select/wait；当前capacity不能准入的candidate不被预先移除，因而可形成可drain的wait。Scheduler在select后只守pending/readiness/mutex/capacity/lifecycle hard conditions，并对wait守drain；不保存或解释reservation/fairness/starvation state。该list-scheduling heuristic可在代表性graph降低makespan，但dependency、mutex、capacity、variance和未来执行时间不确定时不保证全局最优。

#### 7. History I/O与执行失败隔离

state directory内只使用一个固定文件名和versioned closed JSON envelope。读取顺序是missing、parse、schema/model validation；missing形成empty model，invalid或read failure也降级empty model并记录不同diagnostic status。历史不可信，不把malformed data直接传入policy。

Run在Scheduler闭合并已取得duration/outcome后，把本轮samples合并到内存model，应用32-sample与总series上限，再在同目录写完整temporary file并atomic replace。write failure不回滚Check settlement、不重跑Tasks、不改变aggregate或Run result kind。并发invocation各自使用启动时snapshot；atomic replace保证文件完整，但last writer可能覆盖另一轮尚未合并的样本，这只降低统计质量，不影响正确性。

`cacheJsonByKey`不提供read-modify-write、history merge或series enumeration，本Change不修改它。只有现有canonical snapshot或atomic file helper可在不扩大cache owner时机械复用。

#### 8. Diagnostic解释选择，不成为第二个结果协议

diagnostic logging启用时，新增有界事件说明：history read/write status、loaded/retained series count、model version/digest，以及每次admit所选Task的estimate source、sample count、estimated duration和critical-path score。raw samples只在有界summary中给count/p90，不逐项输出；raw identity input永不输出。

第一版不增加public `RunResult.schedulerLearning`、machine schema或progress字段。history failure是性能优化降级，不是质量事实；需要程序化监控的真实consumer出现后，再以独立Change评审结构化read/write observation，而不把diagnostic log承诺为稳定parser输入。

#### 9. 实施顺序与长期Decision

本Change在以下Readiness完成后实施：

1. `extract-scheduler-admission-selection-policy`已归档并提供private select/wait contract；
2. `expose-custom-admission-selection-policy`已归档并建立closed static/custom public union；
3. `separate-passed-dependencies-from-settled-observations` Decision 已闭合directed readiness graph；
4. `add-scheduler-performance-diagnostics`已实施，或同一分支提供等价的slot/admission/tail A/B证据；
5. 已审阅fail-fast和named resource当前状态，确认它们只改变cutoff、candidate legality或started samples；
6. 已用successor Decision演进“静态priority且不基于history调权”的现行判断。

长期Decision采用static mode作为兼容默认、learned mode显式启用、priority在learned mode仅为同分tie-break、history I/O不改变质量结算。对齐只在实现、public docs与tests共同成为当前事实后标记。

### Resulting Impacts

- Definition新增policy union与Check override会改变declarative schema；省略与显式static必须规范化为同一snapshot。若新增canonical默认使fingerprint算法输入相对变更前发生变化，实施者必须显式重建对应baseline，而不是承诺旧digest不变。
- admission前history identity构造需要复用Definition的canonical authored-options boundary，但不能调用preflight，也不能把authored/prepared options写入history或diagnostic。
- history read发生在Scheduler前，write发生在已闭合execution facts后；两者时间可由Scheduler外层diagnostic观察，不得混入Check duration或Scheduler own time。
- estimated critical path需要final graph提供downstream adjacency；不要在policy每次选择时重复遍历完整图，应在immutable snapshot构造时一次计算score。policy仍接收完整 graph、relation/mutex eligible candidates 与 capacity facts；priority只存在于Task metadata，不设旁路输入。
- Project Gate若采用learned mode，其state directory、忽略/清理policy和performance baseline需要由Gate owner维护；Product文档只说明通用state lifecycle。

## Risks / Trade-offs

- 相同Check ID和authored options在preflight结果、不同硬件、toolchain、cache状态或外部输入下仍可能有不同时长；bounded rolling window提供适应性但不是workload identity证明。
- arithmetic mean对重尾样本敏感；第一版同时输出p90但不把variance自动变成第二个score。只有跨项目证据证明需要置信区间后再演进模型。
- required state directory增加明确配置，但避免默认偷偷写HOME或repository；这是一次项目级成本，不是per-Check成本。
- diagnostic-only failure observation意味着未启用diagnostic的调用方不能程序化判断history health；第一版接受该边界以避免为优化状态扩大所有RunResult branches。
- 本 Change 的 non-goal 是扩大或重定义既有 public `custom` callback：它继续是由相邻 Change 拥有的 trusted select/wait contract。`learned-critical-path` 是 Product-defined policy variant，不把 history、prediction snapshot 或持久状态管理能力暴露给 custom callback。

## Open Questions

无阻塞问题。Plan采用“learned setting必须提供state directory”“learned mode下priority仅作同分tie-break”“第一版history failure只进入diagnostic”三个默认取舍；公共custom selector由相邻Change承接。若项目需要隐藏默认路径、hard priority override或public history health DTO，必须在实施任务1.1前明确修订本Plan与对应Decision，不能以局部代码例外加入。
