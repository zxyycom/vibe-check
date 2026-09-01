# Design

本设计把性能分析限定为 Scheduler 已拥有的单次运行时间线，并用 event-driven 累计区分槽位占用、admission 阻塞、调度器自有工作与 diagnostic observation 成本。

## Context

`runTaskGraph` 当前由一个 imperative loop 驱动：pure `decideScheduler` 从 immutable snapshot 返回 `admit`、`settle-blocked`、`cancel-pending`、`await-running` 或 `complete`，shell 负责观察 decision、改变 execution state、启动 executor、等待 Promise settlement 和释放运行资源。每条 decision diagnostic 已包含 elapsed header 和 `capacity`、`blockers`、`reservation` 等事实，但日志没有稳定 parser，也没有 terminal Scheduler summary。

Product 的 `CheckExecutionClock` 是 invocation-private monotonic seam，现用于 Check duration、progress 与 diagnostic elapsed。`RunResult.checkDurations` 只测量实际 Check callback 执行，不包含 Task graph-ready 后的排队，也不等于 Scheduler wall time。Scheduler Task 又可能把工作交给子进程或 worker，因此 Task active interval 只证明 Product 槽位被占用。

当前 priority evidence 已记录 ready-to-start delay、execution duration 和 wall time：目标 Check 的 delay 全部显著下降，但 full profile 的 tuned wall median 反而上升。这说明新的诊断必须同时回答“容量是否被利用”“为何不能继续 admission”“长 Task 何时 ready/admit/settle”和“调度器本身花了多少时间”，不能从单项 duration 自动生成调度政策。

相关 active Changes 正在重新定义 `dependsOn`/`observes`、fail-fast admission cutoff 和 named resource capacity。它们拥有图语义与 admission 行为；本 Change 只能观察最终 Scheduler state，不能提前复制其候选规则或建立平行状态机。

本文件描述目标实现契约，不证明当前 runtime 已经输出这些指标。当前事实仍由源码、稳定 owner 文档和测试拥有；任务 checkbox 只按后续实际证据勾选。实施者先使用以下术语恢复整体模型，再进入计算细节：

| Term | Intended meaning | Must not be interpreted as |
| --- | --- | --- |
| `schedulerSpanMs` | 首次 Scheduler cycle 到 terminal transition 的 monotonic span | Scheduler 自身 CPU 耗时 |
| `schedulerOwnMs` | decision 与 state transition 的同步处理时间 | executor、Promise await 或 diagnostic observation 时间 |
| `schedulerDecisionObservationMs` | `scheduler.decision` observer 调用时间；writer 可用时包含序列化与同步写入 | 所有 diagnostic events 的总成本或已成功写入的证明 |
| graph-ready | Scheduler 的 directed readiness relations 已满足 | 已取得 mutex/capacity 或已经 admission |
| `admissionDelayMs` | graph-ready 到 admission 的差值 | Check callback duration |
| `taskSlotMs` | 各 Task admission-to-settlement active interval 的总和 | CPU、线程或 event-loop utilization |
| blocked-admission interval | `await-running` decision 到下一项 running settlement 的区间 | Scheduler idle/CPU 时间；该区间可与 Task execution 重叠 |
| root/effective slot utilization | `taskSlotMs` 相对 root 或 scope-adjusted capacity integral 的比例 | OS 或 Task 内部资源利用率 |
| completion tail | 最后一次 admission 到 Scheduler completion 的区间 | 理论 critical path |

## Goals / Non-Goals

**Goals**

- 用稳定术语和可复核公式汇总一次 Scheduler execution。
- 让维护者区分工作量本身、并发槽不足、图或互斥阻塞、尾部 drain、调度算法和同步 decision observation 开销。
- 只在现有 diagnostic logging 明确启用时付出累计和输出成本。
- 保持 pure decision、Task execution、Check settlement 与 public/machine contracts 不变。

**Non-Goals**

- 不测量或推断 CPU percent、线程数、event-loop utilization、load average、RSS、I/O、context switch 或子进程树资源。
- 不发布 per-Task wall-clock timestamps、公共 telemetry DTO、machine schema、lifecycle hook 或跨 invocation metrics store。
- 不根据一次 summary 自动设置 priority、mutex、maxParallel、resource claim、timeout、warning 或 Gate status。
- 不建立 diagnostic parser、performance daemon、sampling loop、event bus、第二 Scheduler 或通用 observability framework。
- 不用该 Change 重新定义 dependency/observation、fail-fast、mutex、scope capacity 或 named resource语义。

## Decisions

### Intended Change

#### 1. 一个 Scheduler-owned invocation accumulator

只有 effective diagnostic logging enabled 时，`runTaskGraph` 获得同一 invocation monotonic clock并创建一个 Product-private accumulator。该状态与当前 SchedulerState 同生命周期，只接收已经形成的 decision、transition 和 settlement facts。若直接放入 execution state 能清楚维护不变量，就不额外建立 service/interface；只有独立的区间积分与 summary calculation 证明单独模块有明确 owner 时才拆文件。

pure `decideScheduler`、inspection 与 admission selector 不接收 clock、logger 或 accumulator。计时只包围 imperative shell 已拥有的阶段：

- `decisionMs`：调用 `decideScheduler` 的同步区间；
- `transitionMs`：应用 admit、blocked settlement、cancellation、reservation update、running settlement 与 terminal result construction 的同步区间；
- `schedulerOwnMs = decisionMs + transitionMs`；
- `schedulerDecisionObservationMs`：调用 `observeSchedulerDecision` 的同步区间，不包含最后 `scheduler.summary` 自身 observation；writer 可用时该区间包含序列化与同步写入，writer 已失败时可能只是 no-op；
- `schedulerSpanMs`：从首次 Scheduler cycle 开始到 `complete` transition结束，包含 executor await 和 drain，因此绝不等同于 Scheduler own cost。

clock sampling与 accumulator update属于 instrumentation 本身，并包含在实际 observer effect 中，不能假装为零成本；代表性 before/after evidence负责观察其影响。实现不得为了得到“纯 CPU 时间”引入 profiler或线程采样。

#### 2. 用状态区间积分槽位与容量

Accumulator 在每次 Scheduler 状态改变后保存当前 `running`、root `maxParallel` 和当前 `effectiveMaxParallel`，在下一次有效 monotonic sample 到来时累计：

```text
taskSlotMs += elapsedMs * running
rootCapacityMs += elapsedMs * maxParallel
effectiveCapacityMs += elapsedMs * effectiveMaxParallel
```

`maxRunning` 是任一已观察区间的最大 running count。terminal summary 计算：

```text
rootSlotUtilization = taskSlotMs / rootCapacityMs
effectiveSlotUtilization = taskSlotMs / effectiveCapacityMs
```

分母为零时结果为 `null`。结果以 `[0, 1]` ratio 表达并可由人读 renderer展示；若由于无效 timing 或不一致状态无法证明边界，则整个 timing projection unavailable，不 clamp 或伪造正常值。`taskSlotMs` 可以高于 `schedulerSpanMs`，因为并行 Task 的 active intervals相加；utilization 不表示 Task 内部实际执行资源。

effective capacity 只积分 Scheduler 当时真正采用的 root/scope capacity。named resource capacity 若未来实施，应以独立字段扩展，而不能混入这个 scalar denominator；本 Change 实施时必须审阅最终 capacity model并修订 Plan或形成后续 Change。

#### 3. 区分 graph-ready、admission 与 settlement

每个 pending Task 在全部 Scheduler-directed readiness relations 已满足时取得一次 `graphReadyAt`。没有 directed relation 的 Task 在 Scheduler span 起点 ready；关系未成功满足而直接 blocked 的 Task 不形成 admission delay。mutex、root/scope capacity、reservation和同层 priority selection 都发生在 graph-ready 之后，因此：

```text
admissionDelayMs = admittedAt - graphReadyAt
taskActiveMs = settledAt - admittedAt
```

`taskActiveMs` 用于 slot integration；它与 Check callback `durationMs` 是不同 owner。Task admission 后即使主要 executor 在等待 I/O，槽位仍保持 active直到 settlement。

Summary 只列 admission delay 最大的三项，按 `admissionDelayMs` 降序、Task ID 升序稳定排序。每项含 Task ID、delay 和 active duration；不复制 author options、process command 或 outcome data。另记录 `lastSettledTaskId` 与 `lastAdmissionToCompletionMs`，用于定位所有 admission 机会耗尽后的尾部，但不把最后结算者命名为理论 critical path。

`dependsOn`/`observes` Change完成后，graph-ready 必须使用其最终 directed relation owner；本 Change不得用 Core Check status或 dependency reader在 Scheduler 外重建 readiness。

#### 4. blocked-admission intervals 是并行重叠观察

每个 `await-running` decision 表示 Scheduler 当前无法继续 admission 并将等待下一项 running settlement。Accumulator 从该 decision 到实际取得 settlement 的区间，按 decision 的闭合 `reason` 累计 `count` 和 `durationMs`。第一版沿用当前 reason vocabulary：dependency-or-mutex、root capacity、active scope capacity、reserved tightening scope、running drain 与 cancellation drain。

这些 reason 对单个 await interval互斥，因此不会在 summary 内重复累计；但 interval 期间已有 Task 正在运行，所以它会与 `taskSlotMs` 和 Task active duration 重叠。文档不得将 blocked-admission duration 与 executor duration相加以重建 wall time，也不得称其为 Scheduler idle/CPU time。`blockers` count仍留在逐次 decision trace，summary不尝试从同时存在的 blockers分摊比例。

若 fail-fast或named resource Change新增 await reason，TypeScript exhaustive handling和语义测试必须迫使本 summary显式分类；不得静默并入最接近的旧类别。

#### 5. timing 不得成为执行失败源

所有 telemetry clock access与算术由 owner-local containment保护。任一次 clock throw、非有限 sample、负向倒退、负 interval或不可能的capacity integral都会把 timing projection切换为 `unavailable`，并保留稳定 reason；后续不再用错误 sample累计。decision/admission/settlement counts仍从离散事实形成，并可与 `timing.availability` 一同写入 summary。

Telemetry failure不得 throw到 Scheduler loop，不得改变 cancellation observation，不得跳过 decision log，也不得修改已有 diagnostic output status。若 diagnostic writer自身已经失败，现有 logger containment继续拥有 output failure；Scheduler不重试、缓存或另写 summary。

#### 6. 只增加一条人读 terminal summary

正常、blocked settlement和execution-phase cancellation只要实际进入 Scheduler，均在 terminal decision后尝试观察一条：

```text
[SCHEDULER] [SUMMARY] scheduler.summary ...
```

writer 可用时，日志中恰好出现一次该事件；writer setup/append 已失败时，现有 logger containment 可以使 observation 成为 no-op，并由 diagnostic output status报告失败。Scheduler不另写文件或把缺失 summary视为执行失败。

summary details使用有界普通对象：counts、timing、capacity/utilization、blockedAdmissionByReason、topAdmissionDelays和tail。顺序由对象字段及数组稳定构造；不输出完整 Task chronology，逐次 decision已拥有原始过程。pre-work/planning cancellation或graph validation failure没有 Scheduler execution，因此不伪造 summary。

该事件继续服从 diagnostic log “人读、无 parser/schema/version、无跨版本兼容”的现有契约。它不进入 `RunResult`、machine v4、progress或Gate performance observer；需要自动比较时，consumer必须先获得独立结构化契约与对应长期决策，不能解析此日志。

### Resulting Impacts

- Scheduler shell需要把同步 decision、observation、transition与async await的边界写得连续清楚；计时代码不得交错到 pure selector或executor callback。
- execution state需要保存 admission/settlement chronology与当前积分状态，但不得形成第二套 pending/running事实源；已有 `pending`、`runningById`、settlements和scope state仍是运行真相。
- private clock handoff应复用 invocation的 `CheckExecutionClock`，同时显式携带 diagnostic-enabled selection，避免仅从 logger对象形状猜测配置。
- scripted clock tests必须按每次 sample的明确调用顺序构造，且通过领域 helper表达时间阶段；不得用脆弱的大型数字数组掩盖计时语义。
- diagnostic formatting tests只证明安全、有界、稳定文本；Scheduler metric formulas由task-scheduler tests拥有，避免日志字符串成为第二个计算实现。
- [`organize-project-run-and-gate-diagnostics-for-human-inspection.md`](../../docs/decisions/organize-project-run-and-gate-diagnostics-for-human-inspection.md)、[`report-per-check-duration-without-changing-check-facts.md`](../../docs/decisions/report-per-check-duration-without-changing-check-facts.md)、[`retain-running-parallel-limits-and-order-ready-admission-by-priority.md`](../../docs/decisions/retain-running-parallel-limits-and-order-ready-admission-by-priority.md) 与 no-public-check-telemetry 边界需要形成一致的长期演进；Change artifacts不替代该 owner。
- Gate benchmark只保存匹配 workload 的原始 before/after wall、diagnostic bytes与summary观察。没有性能预算时结果保持 observation，不能因为指标新增而建立 required failure。

## Risks / Trade-offs

- 每个 decision与transition增加 monotonic clock读取和少量状态更新，可能对大量极短Task产生可见observer effect；通过diagnostic opt-in、代表性before/after evidence和不做默认性能门禁控制。
- effective capacity随active scope变化，错误的区间切点会产生超过100%的利用率；纯fixture必须覆盖scope activate/release与simultaneous settlement。
- graph-ready语义受依赖/观测Change影响；并行实施若不先确定顺序，可能把短命中间模型固化进字段名称和测试。
- top-three摘要方便人工定位但不是完整trace；原始decision日志继续负责逐项复核，summary不得演变成通用report reducer。
- diagnostic logging同步写入本身会影响被测wall time；单列decision observation只帮助解释observer cost，不证明未启用日志时的Scheduler性能。

## Open Questions

无。首版指标、计算边界、失败containment、输出层和非目标均已确定；实施顺序由Readiness任务根据相关active Changes的实际状态闭合。
