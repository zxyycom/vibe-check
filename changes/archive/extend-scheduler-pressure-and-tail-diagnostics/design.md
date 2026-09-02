# Design

本设计用 Scheduler-owned immutable pressure projection扩展现有 enabled-only accumulator，并复用 Invocation 声明指纹；所有新增字段只提高同一条 human summary 的事实分辨率，不建立第二 Scheduler、公共 telemetry 或性能调优控制面。

## Context

- `runTaskGraph` 在 accumulator construction 与每次真实 mutation 后拥有完整 execution state，`scheduler-decision-inspection.ts` 拥有 canonical directed relation、mutex 与 prospective capacity 判断；`scheduler-performance-diagnostics.ts` 只负责 invocation-local sampled intervals 和 terminal projection。
- broader graph-ready 只要求全部 directed relations settled。若 `dependsOn` 以非 completed 状态 settled，Task 随后 blocked-settle、永不 admission；因此 queue universe 必须收窄为 admission-viable pending，而不能把所有 broader graph-ready Task 称为可运行压力。实际 admitted Task 从首次 admission-viable logical state boundary 开始 delay accumulation；安装该 post-state projection 不采样 clock。
- 现有 summary 的 top admission delay 只含 total delay 与 active duration，tail 只有 `completionTailMs` 和 last settled ID。它们无法区分等待期间的硬约束与可准入状态，也不能显示 tail 的并发参与集合。
- `Invocation.declarativeFingerprint` 在任何 Scheduler execution 前由 normalized declarative Project Definition 计算，并进入现有 RunResult；scheduler policy 只以 `static | custom` kind参与该 identity，callback source/closure 不参与。enabled-only Scheduler handoff 当前只传 clock/logger，可以原样增加此已有值而无需新 identity owner。
- 原 `add-scheduler-performance-diagnostics` Change 已归档，只作为形成时历史。新工作由本 active Plan 及后继 unaligned Decision 承接，不修改历史 artifact。

## Goals / Non-Goals

**Goals**

- 以互斥事实分类量化 admission-viable pending queue 的时间面积与峰值。
- 用同一分类解释 actually admitted Task 的 graph-ready-to-admission delay，并以等式形成可测试闭合。
- 有界显示 completion tail 的实际参与 Task，并给出稳定排序和截断事实。
- 让本机或人工跨 Run 比较先核对 exact declarative fingerprint，同时明确该 identity 的有限覆盖范围。

**Non-Goals**

- 不改变 admission policy、priority、capacity、relation、mutex、cancellation、settlement 或 Scheduler progress。
- 不推断 custom wait reason、饥饿、公平、reservation、critical path、bottleneck 或优化收益。
- 不新增 OS/CPU/RSS/thread/event-loop/I/O/process profiler、跨 invocation metrics store、benchmark budget 或 hard gate。
- 不新增 public/machine/progress/warning/autotune/parser/schema/version、policy version、callback identity 或 Scheduler graph 旁路 fingerprint。
- 不修改 archived Change；不把 Change/Decision 文本当成 runtime 已实现证据。

## Decisions

### Intended Change

#### 1. Canonical admission-pressure projection

Scheduler 在 diagnostic accumulator constructor 与每次真实 state mutation 完成后的 `captureState`，从当前 immutable snapshot/inspection 形成并原子安装 diagnostic-only post-state projection。projection 只列出 admission-viable pending Task：

```text
dependsOn are all completed
and observes are all settled
and Task is still pending
```

每项只携带 Task ID 与一个判别值：

```text
mutex-blocked      when any Task mutex collides with running mutexes
capacity-blocked   when mutex-clean and canonical canAdmit is false
admissible-pending when mutex-clean and canonical canAdmit is true
```

顺序使分类互斥且覆盖该 universe。capacity 同时承接 root、active scope 与 prospective tightening scope 的 canonical hard fact，不另拆可能重叠的 root/scope “原因”。custom policy 在有 admissible candidate 时返回 `wait` 不改变事实分类，也不产生 reason 字段。

projection 必须复用 decision inspection owner 的 predicate；不得在 accumulator 复制 relation/mutex/capacity 算法。accumulator 只保留当前 post-state interval 的 immutable classification 与计数积分，不能影响任何 next action，也不建立额外 sampled observation。

#### 2. Boundary accounting, task·ms and peaks

现有 admission、pending removal、running settlement、accepted wait 与 terminal boundary先 sample/flush当前 projection；真实 mutation 完成后的 `captureState` 不采样，而是原子安装新的 performance state、admission-pressure projection及首次出现 Task 的 delay accumulator。下一次既有 boundary 使用这组同源 post-state facts累计 interval。constructor 对 initial state执行同一次安装，pressure projection不增加任何 sampled event或 clock read。每个分类按 Task 数积分：

```text
<category>TaskMs += elapsedMs * <category task count>
```

`admissionViablePendingTaskMs` 记录三个分类 task·ms 的总和；`peakAdmissionViablePendingTaskCount` 记录同一 observation 的 total。`peakMutexBlockedTaskCount`、`peakCapacityBlockedTaskCount` 与 `peakAdmissiblePendingTaskCount` 分别取每个 observation 的最大分类数量。这四个 peak 是不依赖 clock 的顶层离散 facts；即使 timing unavailable 仍可继续从安全 projection更新。各分类 peak 可能来自不同 instant，不提供或暗示三者之和等于 total peak。

上一次 constructor/post-mutation capture 安装的 projection 会持续到下一既有 boundary，因此同步 policy callback 时间按其调用前保持不变的 Scheduler facts累计。state mutation仍遵循 boundary flush old state → mutate → capture post-state；projection只从已变更的唯一 execution state 重新形成。

#### 3. Admission delay breakdown

对 actually admitted Task，其首次进入 admission-viable logical state boundary时建立零值 delay accumulator，后续既有 boundary按 Task ID累加当前分类 elapsed，admission boundary关闭该 accumulator。由于实际 admitted Task 不可能带 non-completed prerequisite，这个逻辑起点在语义上覆盖其 broader graph-ready-to-admission interval，而 projection安装本身不采样 clock。每个 `topAdmissionDelays` item 在现有字段旁平铺 `mutexBlockedMs`、`capacityBlockedMs` 与 `admissiblePendingMs`。

有效 timing 必须满足：

```text
admissionDelayMs
  = mutexBlockedMs + capacityBlockedMs + admissiblePendingMs
```

现有 top-three selection 仍按 total delay 降序、Task ID 升序；breakdown 不改变入选规则。failed prerequisite blocked Task 与 cancelled-before-admission Task 没有 admitted chronology，不进入列表。

#### 4. Completion-tail contributors

最后一次 admission 重新定义当前 tail boundary，并以此前仍 running 的 Tasks 加新 admitted Task 形成逻辑 post-state active snapshot。terminal summary 只保留此集合中随后 settled 的 Task，并计算：

```text
settledAfterLastAdmissionMs = settledAt - lastAdmissionAt
```

`discrete.completionTailActiveTaskCount` 表示完整 active 集合大小；`topCompletionTailContributors` 至多三项，按 `settledAfterLastAdmissionMs` 降序、Task ID 升序。相同 clock instant 仍以真实事件顺序形成集合，不能仅凭 timestamp 大小反推 membership。contributors 与 `completionTailMs` 只是 tail 观察，不声明 critical path；terminal observation/control overhead 也可能使 tail 大于最晚 contributor settlement delay。

#### 5. Comparison identity and output boundary

Invocation 在 enabled-only private Scheduler diagnostics input 中增加现有 `declarativeFingerprint`，accumulator 原样保存并在 summary 顶层输出。Scheduler 不重新 hash graph，不接收 normalized Definition，不查看 custom callback，也不创造 version。

新增 summary shape 固定为：

```text
declarativeFingerprint
admissionViablePendingTaskMs
mutexBlockedTaskMs
capacityBlockedTaskMs
admissiblePendingTaskMs
peakAdmissionViablePendingTaskCount
peakMutexBlockedTaskCount
peakCapacityBlockedTaskCount
peakAdmissiblePendingTaskCount
topAdmissionDelays[].mutexBlockedMs
topAdmissionDelays[].capacityBlockedMs
topAdmissionDelays[].admissiblePendingMs
discrete.completionTailActiveTaskCount
topCompletionTailContributors[].taskId
topCompletionTailContributors[].settledAfterLastAdmissionMs
```

fingerprint 相同只证明 canonical declarative Definition identity相同，覆盖声明的 Check membership/options/relations、outputs 与 Scheduler declarative fields；trusted function bodies 不进入该 snapshot。跨 Run 比较仍需人工核对 actual execution selection、terminal outcomes、RunControls、代码、candidate、tool/runtime、host条件与 custom callback算法。summary 保持 ordinary bounded human diagnostic，无 parser/schema 或 automated discovery contract。

timing unavailable 时 summary 继续输出 `timing` reason、既有 discrete facts（包含 `completionTailActiveTaskCount`）、total/分类四个 peak counts与 declarative fingerprint；全部 queue task·ms、top delay timing/breakdown、`topCompletionTailContributors` 和其它 time-valued projection保持 unavailable。合法 zero span则输出有效零值。

### Resulting Impacts

- private diagnostics input 与 invocation/check-execution handoff 增加一个已存在的 immutable identity；未启用 diagnostic logging 时仍不构造 Scheduler accumulator或 pressure projection。
- scheduler inspection需要提供一个可直接复用的 admission-viability predicate/projection owner；constructor/post-mutation capture只描述当前 snapshot，不成为 policy context、public DTO、独立 sampled event 或 state machine。
- accumulator需要按 Task ID累加分类 duration，并在 admission/pending removal关闭 chronology；所有 mutation都由 shell现有 boundary调用，diagnostic state不能驱动 execution。
- deterministic tests需要同时覆盖 projection规则和真实 Scheduler integration；logger formatting只证明有界安全渲染，不重复公式测试。
- stable docs只陈述实现后可恢复的 runtime事实；Decision保持 unaligned，直到源码、测试、stable owners和 required/full evidence共同证明完整方向已成为当前事实。

## Risks / Trade-offs

- enabled diagnostics 在 constructor 与每次真实 mutation 后增加一次只读分类投影，并在既有 boundary完成 per-Task interval accumulation；它不增加 clock sample。disabled path避免全部该工作，enabled overhead在本 Change验收时从本机 observation查看，但不预设优化收益或预算。
- `admissible-pending` 只说明当前 hard guards允许 admission，不说明 policy为何等待；这种保守命名牺牲解释性推断，换取事实准确。
- 单一 `capacity-blocked` 不区分 root/scope，可避免 overlapping cause与 prospective scope歧义；若 future named resource改变 `canAdmit`，必须重新审阅 universe、分类和公式。
- declarative fingerprint提升样本筛选能力，但不是完整 benchmark identity；过度依赖它仍可能把不同代码、依赖或host状态误认为匹配样本。
- tail contributor list有界为三项，会省略更早settled的参与者；总数和稳定排序使截断显式，raw chronology/decisions仍是更详细证据。

## Open Questions

无。Readiness 已确认 queue universe、互斥分类、delay闭合、tail membership/order、fingerprint owner及输出非目标；实现后字段存在性与最终证据仍由 tasks推进，不由本设计预先宣称完成。
