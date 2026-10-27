# scheduler-runtime

## Case CHECK-SCOPED-CONCURRENCY-001: Check parallel limits use the shared engine

Owner: `docs/development/scheduler.md#admission-state-与-real-shell`
Entities:

- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > keeps a scope cap active through terminal settlement and prioritizes its continuation`
- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > recomputes tighter-scope selection after capacity becomes available`
- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > does not activate a cap for a scope with no activation task`
- `bun|src/project-run/task-scheduler/admission-core/static-selection-query.test.ts|static admission group frontier > switches scope ties without backfilling blocked constrained work or mutating captured forks`
  Proves:
- Effective Check parallel limits project to generic graph scope metadata. The shared engine uses the active minimum without preemption and does not make a non-executing scope consume capacity.
- 静态选择在 inactive/active/closed scope 之间保留 ordinary 声明顺序与 constrained lexical tie 的切换；受约束层选中被资源阻塞者时返回 wait，不以 ordinary work backfill。

## Case WB-RUNTIME-ADMISSION-GRAPH-001: Immutable AdmissionGraph shares Scheduler legality without control capability

Owner: `docs/guides/simulating-admission.md#模拟-admissiongraph`
Entities:

- `bun|src/project-run/task-scheduler/admission-core/graph.test.ts|immutable admission graph > validates exact input and returns frozen opaque branching successors`
- `bun|src/project-run/task-scheduler/admission-core/graph.test.ts|immutable admission graph > uses canonical catalog order, dedicated validation reasons, binary settlements, and scope lifecycle`
- `bun|src/project-run/task-scheduler/admission-core/graph.capacity.test.ts|immutable admission graph capacity > keeps duplicate blocker payloads and global active-scope capacity for every candidate`
- `bun|src/project-run/task-scheduler/admission-core/graph.capacity.test.ts|immutable admission graph capacity > atomically holds and releases weighted claims across named resources`
- `bun|src/project-run/task-scheduler/admission-core/transitions.test.ts|admission core transitions > admission core settles in the selected implementation`
- `bun|src/project-run/task-scheduler/admission-core/transitions.test.ts|admission core transitions > keeps persistent forced-frontier priority and closed scope roots across a 80-by-80 cascade`
- `bun|src/project-run/task-scheduler/admission-core/trace.test.ts|admission core trace > traces public and private binary/failed/cancellation transitions through one reducer`
- `bun|src/project-run/task-scheduler/admission-core.scheduler-integration.test.ts|Scheduler admission core integration > replays canonical failed and forced effects through shell diagnostics and measurement`
- `bun|src/project-run/task-scheduler/admission-core/graph.test.ts|immutable admission graph > supplies callback lookahead without reserving or starting a real Task`
  Proves:
- The standalone and callback seeds expose one frozen opaque state contract. Its canonical catalog, inspection, validation precedence, binary settlement, forced block, scope lifecycle and named-resource occupancy return successors without mutating a retained predecessor. Static resource/claim input fails closed, and selection rejection reports every insufficient resource without granting reservation capability.
- The private trace invokes the same reducer for public and real-only failed/cancellation actions. An instrumented real Scheduler pairs every canonical effect with its immutable Core post-state; legacy snapshot mutex facts remain additive with dynamic holders through their settlement, and an 80-by-80 failed cascade keeps every newly ready child in descending declared-slot frontier order and retains a frozen closed-scope root. Direct running settlement precedes forced effects. For each forced blocked effect, the shell preserves this observable order: pending-measurement flush, matching immutable post-state, shell blocked settlement, state capture, blocked-effect record, conditional diagnostic projection, then Core observer. Custom policy measurements retain the direct-then-forced order; synthetic blocked diagnostics retain the direct failed-source `task-settled` trigger; terminal last-settled facts retain that order. Callback lookahead cannot start, reserve, settle or otherwise control real Task lifecycle, whose callback proposal remains Scheduler-hard-revalidated.

## Case WB-RUNTIME-ADMISSION-COMPILED-GRAPH-001: Prepared graph compilation retains Scheduler static indexes

Owner: `docs/development/scheduler.md#admission-state-与-real-shell`
Entities:

- `bun|src/project-run/task-scheduler/admission-core/compiled-graph.test.ts|prepared admission graph compiler > compiles static indexes from a prepared graph without rematerializing it`
  Proves:
- The Product-private compiler rejects invalid root caps and builds Scheduler lookup tables from a prepared graph without rematerializing it or its frozen snapshot. Task/scope/mutex/resource declaration slots, capacities and per-Task claim units, duplicate mutex/relation occurrences, reverse dependency/observation/terminal mappings, activation membership and lexical public catalog order stay exact.
- A wide prepared scope reads each activation declaration once instead of searching the whole activation list per Task; the exact activation flags still distinguish activation Tasks from the terminal.
- The compiled object, its relation indexes, and tested slot lists retain their existing Object.freeze guards; this Case does not claim deep `Map` immutability or a public API. Forced reverse-slot priority and active-scope cap/ID ordering remain separately owned by the existing admission-core and Scheduler evidence.

## Case CHECK-NAMED-RESOURCE-CONCURRENCY-001: Check Tasks atomically share named resource capacity

Owner: `docs/guides/scheduling.md#限制-named-resource-并发`
Entities:

- `bun|src/project-run/task-scheduler/admission-core/graph.capacity.test.ts|immutable admission graph capacity > atomically holds and releases weighted claims across named resources`
- `bun|src/project-run/task-scheduler/task-engine.admission.test.ts|static task engine > limits named resource concurrency without withholding unrelated root slots`
  Proves:
- A Task acquires all weighted named-resource claims atomically at admission, holds them in the shared immutable state until satisfied, unsatisfied or failed settlement, and then releases every unit. Unknown and oversized claims fail static graph validation.
- The real static Scheduler admits no more resource consumers than configured capacity while still filling an available root slot with unrelated ready work. Its blocker observation distinguishes named-resource shortage, and a failed holder releases capacity for later work.

## Case WB-RUNTIME-SCHEDULER-PERFORMANCE-DIAGNOSTICS-001: Enabled Scheduler diagnostics retain bounded honest timing projections

Owner: `docs/development/scheduler-observation.md#调度观察与终态交付`
Entities:

- `bun|src/project-run/task-scheduler/measurement/diagnostics.test.ts|Scheduler performance diagnostics > keeps control-path and decision observation separate while integrating real running slots`
- `bun|src/project-run/task-scheduler/measurement/diagnostics.test.ts|Scheduler performance diagnostics > bounds top admission delays and breaks equal delays by Task ID`
- `bun|src/project-run/task-scheduler/measurement/diagnostics.test.ts|Scheduler performance diagnostics > classifies a named resource wait as capacity blocked`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-waits.test.ts|Scheduler performance diagnostics > records an accepted explicit policy wait`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-waits.test.ts|Scheduler performance diagnostics > retains an accepted wait count when timing becomes unavailable`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-boundaries.test.ts|Scheduler performance diagnostics > distinguishes a valid zero-span summary from unavailable timing and retains discrete facts`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-waits.test.ts|Scheduler performance diagnostics > excludes a passive running drain with a null proposal`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-boundaries.test.ts|Scheduler performance diagnostics > contains terminal writer failures`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-terminal.test.ts|Scheduler performance diagnostics terminal drains > contains a policy diagnostic writer failure while draining admitted work`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-terminal.test.ts|Scheduler performance diagnostics terminal drains > emits exactly one summary after caller cancellation drains admitted work`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Package Run diagnostic logging output > hands enabled diagnostics to the Scheduler for one terminal human summary`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Package Run diagnostic logging output > does not sample Scheduler diagnostics when diagnostic logging is disabled`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-hooks.test.ts|Scheduler terminal effects > awaits ordered hooks over exact immutable terminal views without exposing Task values`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-hooks.test.ts|Scheduler terminal effects > continues after synchronous and asynchronous hook failures`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-hooks.test.ts|Scheduler terminal effects > delivers the internal summary Hook before caller terminal effects through one runner`
- `bun|src/project-run/task-scheduler/measurement/diagnostics-hooks.test.ts|Scheduler terminal effects > contains summary writer failure while preserving caller terminal effect failure delivery`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Scheduler terminal effect output > keeps settled facts while making Hook failures visible`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Scheduler terminal effect output > marks all successfully settled configured Hooks as succeeded`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Scheduler terminal effect output > preserves execution cancellation when a terminal effect fails after drain`
- `bun|src/project-run/progress-rendering/invocation-diagnostic-runtime.test.ts|Scheduler terminal effect output > preserves an admission-policy failure when a terminal effect fails after drain`
- `bun|src/project-run/task-scheduler/measurement/queue.test.ts|Scheduler incremental queue measurements > matches independent per-Task classification through resources, mutex sources, scopes and cancellation`
- `bun|src/project-run/task-scheduler/measurement/queue.test.ts|Scheduler incremental queue measurements > excludes unsatisfied prerequisites from seed peaks and preserves tiny late waits after huge category prefixes`
  Proves:
- An explicitly enabled Scheduler-only diagnostic handoff emits one bounded human summary after terminal drain. It separates shell control work from decision observation, integrates Scheduler slot/capacity state without claiming wall/CPU utilization, and records accepted policy waits rather than passive drains.
- 依赖均 completed 且观察均已终结的 pending Tasks，在每个 interval 互斥归类为 mutex-blocked、capacity-blocked 或 admissible；root/scoped/named-resource 不足共用 capacity 类。peak/interval 共读增量组分类，global gate 不逐 pending retag；精确非负累计在输出时一次舍入，保留小数 task·ms、peaks 与完整三分量 admission delay；这些事实只描述队列压力，不推断 policy 原因。
- The last admission boundary's logical post-state active snapshot retains its complete discrete count and at most three settlement-delta contributors, including the newly admitted Task. These contributors explain the observed completion tail but do not claim dependency critical-path ownership. The invocation-owned declarative fingerprint remains only a declarative-configuration matching signal and does not identify RunControls, code/candidate/tool/runtime/host, terminal outcomes, or a custom callback.
- Named scripted clock phases distinguish valid zero spans from invalid clock samples; timing failure retains the fingerprint, admitted and accepted-wait counts, max-running, last-settled Task ID, queue peaks, and tail active count without fabricating time. With a static policy, disabled diagnostics and no terminal consumers, Scheduler adds no measurement collector or clock reads; custom callbacks enable only the declared cumulative or action-history group, independently of terminal consumers. Summary writer failures cannot revise the settled Scheduler result.
- Internal default summary Hook and each caller terminal effect share one ordered terminal runner; the default wrapper contains writer failure before caller failure/output policy applies. Each caller terminal effect receives its exact recursively frozen terminal view after admission stops and started work drains. Declared fields expose canonical graph, admitted/settled kind-only observations, Run measurement and/or separate Task timings without Task values/errors/callbacks, summary top-N projections, mutable internals, or an interval event log. Sync/async generic terminal effects run in configuration order and all settle. When they are the only output participants, their all-successful sequence marks `terminalEffects` succeeded; a generic throw/rejection still gives later generic terminal effects their chance and marks the aggregate failed. A normal completed Run with that failure becomes the facts-preserving `scheduler-terminal-effects-failed` output result; cancellation and admission-policy failure retain their primary result/diagnostic with the Hook status still visible.

- 增量分类以 raw graph 逐 Task oracle 独立核对 counts、peaks 与三类 delay；异量 resource claim、多 mutex 来源、共享 root/active-scope gate、inactive activation cap 与取消净 delta 保持分类一致。非 completed prerequisite 的 pending Task 从 seed 起不计 admission-viable；巨大 prefix 后的微小本地 delay 仍保留。

## Case WB-RUNTIME-SCHEDULER-HISTORY-001: Local Scheduler history remains bounded and failure-contained

Owner: `docs/development/package-tools.md#learned-critical-path-helper-owner`
Entities:

- `bun|src/package-tools/learned-critical-path/duration-model/scheduler-duration-recording.test.ts|scheduler duration recording > retains bounded admitted samples`
- `bun|src/package-tools/learned-critical-path/duration-model/scheduler-duration-recording.test.ts|scheduler duration recording > does not create samples when timing is unavailable`
- `bun|src/package-tools/learned-critical-path/duration-model/scheduler-duration-recording.test.ts|scheduler duration recording > evicts the oldest series beyond capacity`
- `bun|src/package-tools/learned-critical-path/duration-model/scheduler-duration-storage.test.ts|scheduler duration storage > round-trips closed digest-only history`
- `bun|src/package-tools/learned-critical-path/duration-model/scheduler-duration-storage.test.ts|scheduler duration storage > contains read and write faults with concurrent writers`
- `bun|src/project-run/invocation/learned-scheduling.test.ts|Package Run learned Scheduler admission > learns admitted Task durations through a caller-owned absolute state directory`
- `bun|src/project-run/invocation/learned-scheduling.test.ts|Package Run learned Scheduler admission > uses caller-owned observations and contains local history write failure`
  Proves:

- Caller-owned learned history accepts only valid admitted-to-settled intervals, retains settlement kind and monotonic observation sequence, applies the configured sample/series bounds, and persists digest-only closed state through same-directory atomic replacement. The Run integration uses its existing private clock to persist exact 2/30 ms admitted durations and observes the next Run reverse admission order without wall-clock sleeps.
- Missing, malformed, incompatible, and read-failed state forms an empty model; post-drain write failure and concurrent last-writer activity only reduce future samples. Caller-owned identity projections and optional observations do not expose Product options, flags, or a Product diagnostic channel. The tool/API owner, not this Case, defines static fallback when prediction cannot be formed.

## Case WB-RUNTIME-SCHEDULER-PREDICTION-001: Frozen duration predictions use a deterministic bounded prior

Owner: `docs/development/package-tools.md#learned-critical-path-helper-owner`
Entities:

- `bun|src/package-tools/learned-critical-path/duration-model/scheduler-duration-prediction.test.ts|scheduler duration prediction > forms a frozen digest-only summary`
- `bun|src/package-tools/learned-critical-path/duration-model/scheduler-duration-prediction.test.ts|scheduler duration prediction > uses learned means before a median project prior and cold start`
  Proves:

- An identity derived from model version, Check ID, canonical authored options, and canonical effective flags yields a frozen digest-only prediction snapshot. Its learned estimates retain sample count, arithmetic mean, and nearest-rank p90 without retaining source options or flags.
- The snapshot selects learned estimates first, then one median of the Run's learned estimates for unknown Tasks, and finally common positive cold-start weight `1`; unavailable timing does not revise it or create a sample.

## Case WB-RUNTIME-SCHEDULER-CRITICAL-PATH-001: Directed readiness relations form one reverse critical-path score

Owner: `docs/development/package-tools.md#learned-critical-path-helper-owner`
Entities:

- `bun|src/package-tools/learned-critical-path/critical-path-ranking.test.ts|critical-path ranking > scores both dependency and observation downstream paths once`
  Proves:

- Before admission, the immutable score table adds each Task estimate to the maximum downstream score across both `dependsOn` and `observes` relations, including a transitive path mixing both relation kinds. It is frozen and does not reinterpret Task priority or runtime capacity facts.

## Case WB-RUNTIME-SCHEDULER-LEARNED-ADMISSION-001: Public learned strategy preserves generic Scheduler legality

Owner: `docs/development/package-tools.md#learned-critical-path-helper-owner`
Entities:

- `bun|src/package-tools/learned-critical-path/strategy.test.ts|public learned critical-path strategy > uses the public scope layers and returns wait for an unavailable learned preference`
- `bun|src/package-tools/learned-critical-path/strategy.test.ts|public learned critical-path strategy > rejects a non-absolute history path and contains rejected caller observations`
- `bun|src/package-tools/learned-critical-path/strategy.test.ts|public learned critical-path strategy > orders score, priority, canonical IDs, constrained scope caps, continuations, and static fallback through public data`
- `bun|src/project-run/invocation/learned-scheduling.test.ts|Package Run learned Scheduler admission > learns admitted Task durations through a caller-owned absolute state directory`
  Proves:

- 公开 learned factory 用调用方提供的 history 位置和 identity 构造普通 prepared custom strategy；在 admission 前捕获 immutable graph/prediction，fallback 在同次 preparation 后复用静态索引。各层以原 comparator 线性取首并保留稳定 tie；learned 首选不可准入时返回 wait，fallback ordinary 优先选择可准入者而非受阻的高 priority 候选。relation、mutex、capacity、取消和 drain guards 始终决定最终合法性。

## Case WB-RUNTIME-SCHEDULER-LEARNED-DIAGNOSTICS-001: Learned caller observations stay bounded and non-quality-bearing

Owner: `docs/development/package-tools.md#learned-critical-path-helper-owner`
Entities:

- `bun|src/project-run/invocation/learned-scheduling.test.ts|Package Run learned Scheduler admission > uses caller-owned observations and contains local history write failure`
  Proves:

- A real file-as-directory history write failure emits `recording-unavailable` to the caller-owned observer. The Run still completes with exactly the expected passed Check facts and a passed aggregate. Observations omit private options, flags, identity digests and history samples.

## Case WB-RUNTIME-ADMISSION-STRATEGY-LIFECYCLE-001: Invocation-scoped strategies preserve terminal delivery

Owner: `docs/development/scheduler.md#public-prepared-admission-strategy-lifecycle`
Entities:

- `bun|src/project-run/admission-strategy-provider/provider.test.ts|admission strategy provider > prepares one closed static or custom policy without widening public configuration`
- `bun|src/project-run/admission-strategy-provider/provider.test.ts|admission strategy provider > does not project graph for empty preparation and fixes prepared needs before execution`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > prepares once, decides synchronously, and completes after terminal effects on normal execute`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > completes after terminal effects when cancellation drains started work`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > completes after terminal effects when an admission policy fault drains`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > does not complete when pre-terminal task-engine setup fails`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > keeps a prepared terminal effect output enabled but not-run without a sealed context`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > keeps prepared policy closures independent across overlapping Runs`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > runs a public prepared strategy once and completes after generic terminal effects`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > keeps public prepared closures isolated across overlapping Runs`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > fails public preparation before Scheduler start and preserves its output boundary`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > aggregates public terminal-effect failures without rewriting a sealed primary result`
- `bun|src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts|Package Run admission strategy lifecycle > enables measurement output only for generic terminal effects or an actual prepared terminal effect`
- `bun|src/project-run/invocation/learned-scheduling.test.ts|Package Run learned Scheduler admission > prepares before admission and records only after terminal effects settle`
- `bun|src/project-run/invocation/learned-scheduling.test.ts|Package Run learned Scheduler admission > records a cancelled Run only after its terminal terminal effect settles`
- `bun|src/project-run/run-prepared-facts.test.ts|Package Run prepared facts > shares one immutable graph through strategy preparation decision and terminal delivery`
- `bun|src/project-run/run-scheduler-context-needs.test.ts|Package Run Scheduler context demand > rejects malformed prepared-return needs before admission and leaves generic effects not-run`
  Proves:

- Graph-ready public prepared authoring prepares once per Run from frozen graph facts and returns an isolated closure; normal, cancelled and admission-policy-failed Runs keep Scheduler decisions synchronous and deliver terminalEffect at most once after admission stops, started work drains and generic terminal effects settle. Preparation failure forms `admission-strategy-preparation-failed` before Scheduler start; pre-terminal task-engine failure has no terminal-effect delivery.
- Generic terminal effects all receive their chance before public `terminalEffect`. Invocation awaits the prepared effect's asynchronous completion before settling. Actual effect settlement is the sole input to `terminalEffects`: generic-only no-context stays enabled/`not-run`; simple and prepared-without-terminalEffect do not independently enable it; a terminal-effect failure cannot overwrite sealed primary facts, and later terminalEffect success cannot overwrite a generic failure.
- A learned factory is an ordinary public prepared strategy: it prepares immutable prediction before Scheduler decisions and records its terminal sample only after terminal delivery, without a private Invocation lifecycle.
- Preparation, synchronous decisions and generic/prepared terminal delivery observe the same frozen static graph identity with inherited scope/resource facts and the validated root cap; flag-excluded providers still block dependents while terminal observations can proceed.
- Empty preparation skips graph projection; returned decision needs are copied before Scheduler execution and later caller mutation does not change the delivered fields.
- Malformed demand in a prepared result fails as `admission-strategy-preparation-failed` before Check execution; configured generic effects remain enabled but not-run because no terminal context was sealed.

## Case WB-RUNTIME-SCHEDULER-CONTEXT-DELIVERY-001: Terminal demand projects exact consumer views from one sealed boundary

Owner: `docs/development/scheduler-observation.md#terminal-effects-与-delivery`
Entities:

- `bun|src/project-run/task-scheduler/scheduler-context-needs.test.ts|Scheduler context demand > projects exact graph/execution/none terminal views from one sealed boundary`
- `bun|src/project-run/task-scheduler/scheduler-context-needs.test.ts|Scheduler context demand > retains none terminal delivery after cancellation or policy fault drains admitted work`
- `bun|src/project-run/run-scheduler-context-needs.test.ts|Package Run Scheduler context demand > delivers exact generic and prepared terminal views while keeping phases independent`
- `bun|src/project-run/run-scheduler-context-needs.test.ts|Package Run Scheduler context demand > delivers independently declared terminal groups and frozen empty function contexts`
  Proves:

- Generic and prepared consumers receive separately projected frozen terminal views containing only their own declarations. Functions and omitted/undefined/empty needs receive frozen empty views; independently declared Run measurement and Task timings do not leak their phase union.
- Graph/execution-only consumers run without requiring measurement collection; admitted IDs contain real starts in order and exclude pre-admission settlements, while settled execution facts retain those settlements. A throwing consumer does not prevent later consumers, and the prepared consumer runs after generic effects.
- Explicit-none effects still run once after admitted work drains on cancellation or policy fault, with pending work cancelled before start.

## Case WB-RUNTIME-ADMISSION-CORE-QUERIES-001: Core memberships 支持执行与推演查询

Owner: `docs/development/scheduler.md#admission-state-与-real-shell`
Entities:

- `bun|src/project-run/task-scheduler/admission-core/scheduler-queries.test.ts|shared admission Core queries > shares ordered memberships and readiness across transitions without scanning the whole graph`
- `bun|src/project-run/task-scheduler/admission-core/static-selection-query.test.ts|static admission group frontier > consumes wide equivalent heads without materializing candidates and prunes arbitrary selections in transitions`
- `bun|src/project-run/task-scheduler/admission-core/static-selection-query.test.ts|static admission group frontier > switches scope ties without backfilling blocked constrained work or mutating captured forks`
- `bun|src/project-run/task-scheduler/scheduler-blocker-summary.test.ts|Scheduler blocker summary > aggregates independent Core blockers even when primary scope or root capacity hides resources`
- `bun|src/project-run/task-scheduler/admission-core/incremental-trace.test.ts|incremental admission state > matches an independent full-scan oracle for every action, rejection, effect, static tie and retained fork`
- `bun|src/project-run/task-scheduler/admission-core/incremental-trace.test.ts|incremental admission state > publishes actual counter thresholds, membership changes and net cancellation without rediscovery`
  Proves:
- 声明顺序的 pending/running/settled 与 lexical catalog/inspection 共读 immutable memberships；重复关系更新 readiness，mutex occurrence 动态读取同源 occupancy，resource 不足仍保留 candidate。ordinary transition 和 inactive terminal closure 复用未变 active-root 数组且不搜索其成员，真实 activation/active closure 仍更新完整 roots；前序状态、独立 fork 与取消 successor 互不影响。
- indexed consumer reads 用 whole-graph traversal guard 证明不重扫全图构造 memberships；query、public projection、transition 与 cancellation 仍返回完整有序事实。此结构证据不宣称 wall-clock 收益。
- static head 消费保留两类规模证据：宽等价组读取不枚举 relation-ready members，异构组按有序前缀跳过 ordinary 资源阻塞而不枚举全部 groups。非 head selection 与取消在 transition 闭合 live heads；release 恢复优先 head，旧 fork 保持。
- 延迟读取的完整 candidates/eligibleCount 仍冻结于原 captured Core，其它 fork 的推进不改变已捕获事实。
- summary 的 dependency → mutex → resource priority 直接聚合 Core facts，即使 primary root/scoped rejection 遮住 resource reason 仍计入 shortage；measurement 使用同源 capacity classification。

- 低优化 raw-graph oracle 不导入被测 reducer/index，逐 action 比较 rejection、effect 顺序和各 effect 的完整投影；scope/resource/mutex/重复关系、两类同 priority tie、三层选择、非 head 移除及保留 forks 均保持语义。counter 2→1 不改变 readiness/frontier identity，后续1→0 的真实 membership delta 直接推进 head；取消批事务只发布净 membership，已取消依赖不再 forced 二次结算，真实双 running abort 后正常 drain。

## Case WB-RUNTIME-PREADMISSION-SEED-001: Pre-admission 初始化保持回调与错误顺序

Owner: `docs/development/scheduler.md#public-prepared-admission-strategy-lifecycle`
Entities:

- `bun|src/project-run/task-scheduler/execution-state.test.ts|Scheduler pre-admission initialization > initializes terminal facts while preserving input validation and satisfaction callback order`
  Proves:
- 静态校验先于 satisfaction callback；unknown/duplicate ID 在对应 callback 前拒绝，callback throw 优先于后续非法 ID。成功值按输入顺序映射 completed/prerequisite-unsatisfied，与 Core 图顺序的 terminal membership 一致且不产生 admission/running work；剩余 pending 按声明顺序取消结算，保留已按输入顺序记录的 settlements。

## Case WB-RUNTIME-SCHEDULER-MEASUREMENT-DEMAND-001: Scheduler measurement groups have independent production and shared validity

Owner: `docs/development/scheduler-observation.md#调度观察与终态交付`
Entities:

- `bun|src/project-run/task-scheduler/measurement/demand.test.ts|Scheduler grouped measurement production > starts only declared producers and never materializes aggregate views for task-only consumers`
- `bun|src/project-run/task-scheduler/measurement/demand.test.ts|Scheduler grouped measurement production > keeps per-task delay maintenance independent of aggregate and action interval integrals`
- `bun|src/project-run/task-scheduler/measurement/demand.test.ts|Scheduler grouped measurement validity > shares one first fault across enabled groups without revising older decision snapshots`
- `bun|src/project-run/task-scheduler/measurement/exact-time.test.ts|Scheduler exact timing arithmetic > rounds exact interval sums and local differences at binary64 boundaries`
- `bun|src/project-run/task-scheduler/measurement/exact-time.test.ts|Scheduler exact timing arithmetic > preserves exact sampled values under an invocation-local quantum`
- `bun|src/project-run/task-scheduler/measurement/exact-time.test.ts|Scheduler exact timing arithmetic > rounds exact utilization quotients through halfway, underflow and unit boundaries`
- `bun|src/project-run/task-scheduler/measurement/numerical-checkpoints.test.ts|Scheduler numerical checkpoints > keeps action-only local intervals accurate when unrelated private prefixes are huge or overflow`
- `bun|src/project-run/task-scheduler/measurement/numerical-checkpoints.test.ts|Scheduler numerical checkpoints > seals derived summary faults before terminal getters regardless of field read order`
- `bun|src/project-run/task-scheduler/measurement/numerical-checkpoints.test.ts|Scheduler numerical checkpoints > keeps an invocation-local exact quantum through binade crossings and clock faults`
  Proves:

- 四组需求在首个采样前独立固定；none/execution-only 不采 measurement clock 或读取 graph DTO，只有 execution 需求记录 admission-order ledger。cumulative 不维护 action history 或逐 Task delay；task-only 不物化 aggregate snapshot，逐 Task delay 表只在 taskTimings 组维护，Run aggregate 与 history interval 不隐式维护它。
- 已启用的 timing 组共用 first-fault validity；非有限 clock 使 Run 与 Task terminal timing 同时不可用而保留 Run 离散计数，不伪造 timingFacts/admissions。先前取得的 cumulative availability 和 history prefix 不被后来故障或追加修改。

- 独立 binary64 exact oracle 覆盖 interval 正确舍入、local prefix 差、halfway/underflow ratio 与 invocation-local quantum；action-only 私有无关 prefix 超限不误损可用字段，实际请求的 terminal 派生故障在 seal 前按固定检查顺序发布 first fault，不受 getter 读取顺序影响，旧 cumulative/history prefix 不被回写。
