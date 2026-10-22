# Scheduler 全量测试质量审查

## 结论与范围

已逐体审读 **31 个测试文件、73 个当前 Bun 实体、6,099 行测试正文**，以及它们实际委托的 **11 个 helper/fixture 文件、1,522 行**，不是抽样。
发现 **5 组局部整改候选，涉及 6 个实体**：1 个实体的终态关键断言会被产品边界捕获而失去失败信号，
2 个实体缺少 writer failure 确实触发的证据，1 个实体只计共享 callback 总次数而不验证各 Run，
1 个实体的差异比较同时改变多项字段，1 个实体含 fixture 自证断言。
其余 **67 个实体保留**；这 6 个实体也都有有效义务，**没有证据支持无条件删除任何整个实体**。

本轮仅写本报告与本地 scratch，没有修改测试、Case 或 Product；以下均是后续实施建议，不表示已生效。

### 依据与完整性

- 已读 AGENTS、文档导航、测试策略、Case 维护、编码规范及 `test-evidence-review` skill。
  主要 owner 为 `/workspace/vibe-check/docs/development/scheduler.md`，公开 owner 为
  `/workspace/vibe-check/docs/guides/scheduling.md`、`/workspace/vibe-check/docs/guides/simulating-admission.md`、
  `/workspace/vibe-check/docs/guides/learned-scheduling.md`；summary 另核对
  `/workspace/vibe-check/docs/development/human-output.md#scheduler-summary-projections`。
- 逐实体读取当前 Case Owner / Proves，包括 admission strategy lifecycle、pre-admission seed、Core queries、
  immutable admission graph、named/scoped concurrency、measurement demand、context delivery、diagnostics 与 parallel runner。
- CodeGraph 先定位 `runTaskGraph` 的实际 graph preparation / prepared shell 路径，随后读 policy adapter、
  strategy preparation、decision/hard guard、Core reducer/input/trace、execution/forced replay、terminal runner、
  observation/collector、exact-time 和 summary 实现。静态 trace recorder 与独立 oracle 的职责分别核对，未因它们共用类型而误判复制实现。
- 31 个目标文件 SHA-256 均与派发 scope 一致。全部精确 keys、逐实体 verdict、Case IDs 及委托材料记录在
  `/workspace/vibe-check/.log/test-quality-audit/20261022-full-02N0Mb/scheduler/coverage.json`；
  `reviewedEntityKeys` 为 73，`unreviewedEntityKeys` 为空。此 scratch 不提交，不建立第二套实体账本。
- 使用主线程已经执行的完整 registration / Case closure，不重复运行；闭合只证明身份与映射，不证明正文通过。

## 局部整改候选

### SCH-001：把终态 first-fault 断言移出会捕获异常的 callback（高把握，优先）

- **完整测试名：** `Scheduler grouped measurement validity > shares one first fault across enabled groups without revising older decision snapshots`。
- **位置：** `/workspace/vibe-check/src/project-run/task-scheduler/measurement/demand.test.ts:194-251`，尤其 `225-234` 与 `240-249`。
- **Case / owner：** `WB-RUNTIME-SCHEDULER-MEASUREMENT-DEMAND-001`；
  `/workspace/vibe-check/docs/development/scheduler.md#measurement-collector-与-immutable-context`。
- **义务：** 已启用组共享 first fault；Run/Task terminal timing 不可用时省略伪造数值、保留离散计数，旧 cumulative/history 不回写。
- **缺陷：** callback 在 `terminalCalls++` 之后断言 unavailable reason、共享 timing identity、无 `timingFacts`、
  无 `admissions`、admittedCount=2。terminal runner 在
  `/workspace/vibe-check/src/project-run/task-scheduler/scheduler-terminal-measurement.ts:78-83` 捕获 callback throw；
  测试不观察 `onTerminalEffectFailure` 或成功通知。上述任一断言失败都可被吞掉，而外部的调用次数、
  `admissionPolicyFault` 与旧 reader 断言仍可成立。`admissionPolicyFault` 并非 terminal-effect failure 的承接字段。
- **最小动作：重写局部，不删实体。** callback 只保存 terminal context，`await` 后对实际保存值统一断言；
  或另外外部断言 failure=0 且 successful delivery=1。旧 reader 的外部断言有效，应保留。
- **替代证据边界：** numerical-checkpoints 的 first-fault/read-order 测试是 collector 层证据，不能代替真实 shell 的终态字段交付；
  此实体仍有独立价值。未做动态 mutation 反证，结论来自已读取的确定性 catch/control flow。

### SCH-002：writer failure 要证明 summary writer 确实被调用，不能只证明 Run 结束（高把握）

涉及两个实体，均映射 `WB-RUNTIME-SCHEDULER-PERFORMANCE-DIAGNOSTICS-001`，owner 为
`/workspace/vibe-check/docs/development/scheduler.md#measurement-collector-与-immutable-context`，
具体 summary obligation 另见 `/workspace/vibe-check/docs/development/human-output.md#scheduler-summary-projections`。

1. **完整测试名：** `Scheduler performance diagnostics > contains terminal writer failures`。
   **位置：** `/workspace/vibe-check/src/project-run/task-scheduler/measurement/diagnostics-boundaries.test.ts:94-113`。
   同一 always-throw writer 同时进入 graph/decision 与 performance summary，外部只断言一个 Task completed。
   即使 terminal summary 根本没有尝试，断言也成立；前面的 graph/decision throw 不能证明 terminal writer containment。
2. **完整测试名：** `Scheduler terminal effects > contains summary writer failure while preserving caller terminal effect failure delivery`。
   **位置：** `/workspace/vibe-check/src/project-run/task-scheduler/measurement/diagnostics-hooks.test.ts:85-118`。
   caller callback 记录调用并 throw，外部验证 caller failureCount=1，但 summary writer 没有任何调用记录。
   跳过整个 summary hook 仍满足当前 assertions，因此未单独锁定“summary writer 已失败但不占 caller failure 计数”。

**最小动作：局部重写。** 在注入 writer 中只对 `scheduler.summary` 累加外部 attempt 并 throw，外部断言 attempt=1、
Task completion、后续 caller 及 caller failure 计数；若还要覆盖普通 graph/decision writer，把那类 attempt 分开记录。
现有正向实体 `Scheduler terminal effects > delivers the internal summary Hook before caller terminal effects through one runner`
证明 summary→caller 顺序，但不证明 throw 分支；`contains a policy diagnostic writer failure while draining admitted work`
有显式 policyDiagnosticAttempts=1，却是不同 event，不能直接承接 summary throw。
只有先把 summary 负向义务补强并保留普通 writer 的独立目的，才可讨论合并局部重复部分；当前不建议直接删任一整个实体。

### SCH-003：共享 callback 两次计数不等于两个 Run 都成功消费，也不证明重叠边界（高把握）

- **完整测试名：** `task engine admission policy > preserves the caller closure across overlapping custom Runs without a Scheduler callback lock`。
- **位置：** `/workspace/vibe-check/src/project-run/task-scheduler/task-engine.admission-policy-failures.test.ts:21-63`。
- **Case / owner：** `AUX-PARALLEL-RUNNER-001`；
  `/workspace/vibe-check/docs/development/scheduler.md#admission-state-与-real-shell`。
- **缺陷：** `Promise.all` 丢弃两个 Run 的返回值，唯一外部断言是 `callbackCalls===2`。
  因 callback 同步，串行调用也得到 2；其中一个 Run admission 失败或取消并不必然 reject，当前也不检查。
  该信号不能区分每 Run 恰好一次与单个 Run 重复调用、另一 Run 未消费。
- **最小动作：重写，而非删除。** 用可控 deferred 暂停第一 Run 的 admitted executor，在它仍未释放时确认第二 Run
  已执行自己的 callback/executor；保存带 task ID 的 callback trace，最后分别断言两个 Run 无 policy fault、非取消且 settlement completed。
  不要求同步 callback 真正同时进入，也不把 private“无 lock”结构升级为新的公开契约；测试名应描述可观察的跨 Run 正常消费。
- **替代证据边界：** 同文件其它 4 个实体覆盖 fault 分类/drain/public result，均不覆盖同一 policy closure 跨 Run 的隔离消费，不能整实体删去。

### SCH-004：graph identity 差异比较应隔离变量（高把握）

- **完整测试名：** `static task engine > distinguishes full graph identities with identical Task IDs but different scheduler semantics`。
- **位置：** `/workspace/vibe-check/src/project-run/task-scheduler/task-engine.graph-observation.test.ts:68-109`。
- **Case / owner：** `AUX-PARALLEL-RUNNER-001`；
  `/workspace/vibe-check/docs/development/scheduler.md#admission-state-与-real-shell`，尤其完整 graph diagnostic identity。
- **缺陷：** baseline→changed 同时改变两个 priority、mutex、`observes`→`dependsOn` 与 scope cap，最后只 `notDeepEqual`。
  只要任一字段仍被投影就能通过；不能据此判定每个调度语义都进入 identity。它仍能排除“只保留 Task IDs”，所以不是全无价值。
- **最小动作：局部重写为单变量矩阵。** 分别只变 priority、mutex、relation、scope cap，直接断言对应 DTO 字段；
  若要证明 fingerprint 跟随该变化，再经 logger 读取真实 fingerprint。不需要把每行拆成新实体或 Case。
- **当前承接：** 同文件 `records one graph and references its fingerprint from every scheduler decision` 对 relation 单变体
  验证真实 SHA-256 引用；`task-engine.admission-policy.test.ts` 的 full-graph context 与
  `task-engine.admission.test.ts` 的 root graph assertions 提供具体字段 expected，但不能从本实体的大杂烩差异中推导各维度完备。
  优先收窄/合并局部重复，未证明整个实体安全删除。

### SCH-005：删除 fixture 自己已经保证的 frozen/fresh assertions（低风险局部清理）

- **完整测试名：** `immutable admission graph > validates exact input and returns frozen opaque branching successors`。
- **位置：** `/workspace/vibe-check/src/project-run/task-scheduler/admission-core/graph.test.ts:31-36`。
- **Case / owner：** `WB-RUNTIME-ADMISSION-GRAPH-001`；
  `/workspace/vibe-check/docs/guides/simulating-admission.md#模拟-admissiongraph`。
- **缺陷：** 第二次调用 fixture 后，测试直接断言两份 input 不同、input/tasks/task frozen；这些发生在 SUT 调用之前。
  `/workspace/vibe-check/src/project-run/task-scheduler/scheduler-graph-snapshot.test-support.ts:7-60`
  自己创建新对象并逐层 `Object.freeze`，这些 assertions 只证明 fixture 构造，不证明 Product 的 opaque immutable successor 契约。
- **最小动作：删除 `secondInput` 与上述局部自证断言。** 保留 input fixture，保留本实体 `43-56` 对 SUT graph/state/methods/
  projections 冻结、opaque keys、旧 state 与 successor running IDs 的全部检查。
  若另有“接收 mutable input 后不受调用方 mutation 影响”的当前义务，应另构 mutable input 做真实干扰；不要把现有 frozen fixture 当作该证据。
  不删实体，也不移除 Case。

## 逐文件普查判断

下表路径相对仓库根。

下表 count 是当前 runner 实体数，不是 assertion、fixture 行或矩阵行。表内“保留”指审读后未形成有依据的清理候选，
不代表已运行正文。

| 测试文件 | 实体 | 主要判断 |
| --- | ---: | --- |
| `src/project-run/admission-strategy-provider/provider.test.ts` | 2 | 保留。static/custom closed handoff、零需求不读 graph、prepared needs 后续 mutation 不改投影；直接调用 provider policy 时 assertion 不被 shell 吞。 |
| `src/project-run/task-scheduler/admission-core.scheduler-integration.test.ts` | 1 | 保留。canonical effects→shell 实际 replay、blocked callback/diagnostic/Core 顺序、measurement effects 与 last-settled；这是接线一致性，不冒称独立 reducer oracle。 |
| `src/project-run/task-scheduler/admission-core/compiled-graph.test.ts` | 1 | 保留。exact indexes/重复 occurrence、prepared identity、activation 单遍结构 guard 与明确 cost owner 相符。 |
| `src/project-run/task-scheduler/admission-core/graph.capacity.test.ts` | 2 | 保留。public binary settlement weighted release、atomic multi-resource rejection、duplicate payload 与全局 active scope；不与真实 shell resource admission 混同。 |
| `src/project-run/task-scheduler/admission-core/graph.test.ts` | 3 | 保留有效 public opaque/catalog/scope/lookahead/hard guard；SCH-005 仅删 fixture 自证局部。lookahead 的 callback assertion 另受外部无 policy fault/执行顺序约束。 |
| `src/project-run/task-scheduler/admission-core/incremental-trace.test.ts` | 2 | 保留。4 组 scripted corpus、8 个生成 seed 全读；raw full-scan oracle 核 rejection/effect/projection/static tie/forks，delta 与 shell abort 各有独立信号。 |
| `src/project-run/task-scheduler/admission-core/scheduler-queries.test.ts` | 1 | 保留。ordered memberships、relation thresholds、resources、fork/cancel 与 whole-graph traversal guard；不是 wall-clock 性能测试。 |
| `src/project-run/task-scheduler/admission-core/static-selection-query.test.ts` | 2 | 保留。tie/layer切换、blocked constrained不backfill、旧捕获视图、revision/active-root稳定；128/512等价与异构组分别锁定不同访问路径。 |
| `src/project-run/task-scheduler/admission-core/trace.test.ts` | 1 | 保留。trace recorder 的 private failed/cancel 与 public binary adapter，hardcoded effect/rejection，真实 shell settlement 对照；不因与增量 corpus 交叉就删 recorder 义务。 |
| `src/project-run/task-scheduler/admission-core/transitions.test.ts` | 2 | 保留。legacy external mutex 与 dynamic holder additive；80×80 cascade 的每effect post-state/descending priority及 closed scope。规模触及声明义务而非删测理由。 |
| `src/project-run/task-scheduler/execution-state.test.ts` | 1 | 保留。root/ID/callback错误优先级与输入/graph两个顺序；pending payload与terminal facts并非仅重复membership counts。 |
| `src/project-run/task-scheduler/measurement/demand.test.ts` | 3 | 两实体保留。四组生产互斥、execution ledger/no clock/no graph及delay与aggregate职责明确；first-fault实体按SCH-001改外部断言。prototype spy有finally恢复，不据此删除。 |
| `src/project-run/task-scheduler/measurement/diagnostics-boundaries.test.ts` | 2 | zero/empty/unavailable与quarter-ms三分类保留；writer-failure实体按SCH-002补失败触发观察。 |
| `src/project-run/task-scheduler/measurement/diagnostics-hooks.test.ts` | 4 | ordered await、immutable/no Task value、summary先行与sync/async继续均保留；summary负向分支按SCH-002补attempt。 |
| `src/project-run/task-scheduler/measurement/diagnostics-terminal.test.ts` | 2 | 保留。policy writer attempt已显式计数；caller abort→drain→单summary、accepted wait与tail discrete含义不同。 |
| `src/project-run/task-scheduler/measurement/diagnostics-waits.test.ts` | 3 | 保留。accepted wait、null passive drain、timing fault后离散count是不同observable；最后一项不应被解释为证明Run正常完成。 |
| `src/project-run/task-scheduler/measurement/diagnostics.test.ts` | 3 | 保留。控制/观察/真实running积分、top-three tie/queue/tail与named shortage；helper内压力和post-mutation任务均读，不是只看顶层测试名。 |
| `src/project-run/task-scheduler/measurement/exact-time.test.ts` | 3 | 保留。边界/overflow/local subtraction、10,000项累计、2,000固定seed样本、quantum、ratio half/tie/underflow，独立oracle不调用Product decoder/rounding求expected。 |
| `src/project-run/task-scheduler/measurement/numerical-checkpoints.test.ts` | 3 | 保留。collector action-only巨大私有prefix、小local interval、seal fault/read order、binade与三种clock fault不等同纯数值函数测试。 |
| `src/project-run/task-scheduler/measurement/queue.test.ts` | 2 | 保留。独立逐Task分类/精确delay与incremental groups比对，resource异量/multi-mutex/scope/global gate/cancel与seed viability/tiny wait均有具体输入。 |
| `src/project-run/task-scheduler/scheduler-blocker-summary.test.ts` | 1 | 保留。root/scoped primary reason遮挡resource时仍独立统计，另核queue分类与retained predecessor。 |
| `src/project-run/task-scheduler/scheduler-context-needs.test.ts` | 3 | 保留。dynamic精确字段/无implicit measurement、graph/execution/none各自投影、取消/fault下零需求终态；预期throw数量在外部核对，断言不会静默成功。 |
| `src/project-run/task-scheduler/task-engine.admission-observation.test.ts` | 2 | 保留。pure immutabledecision/blocker与real shell decision序列；不以和执行测试使用相同graph为重复依据。 |
| `src/project-run/task-scheduler/task-engine.admission-policy-failures.test.ts` | 5 | 4实体保留：bounded categories/no raw value、cancel+drain、public result/no artifacts。shared closure实体按SCH-003补各Run与重叠证据。 |
| `src/project-run/task-scheduler/task-engine.admission-policy-measurement.test.ts` | 3 | 保留。40上下文共享graph/captured prefix、settled-cohort interval、三类clock fault保留effects；断言由保存context外部运行。 |
| `src/project-run/task-scheduler/task-engine.admission-policy.test.ts` | 2 | 保留。pure static snapshot重算无reservation，custom精确full-graph/candidates/runtime、freeze与mutation refusal；不能由priority执行顺序替代。 |
| `src/project-run/task-scheduler/task-engine.admission.test.ts` | 3 | 保留root/dependency/mutex实际并发、priority/tie/no-preemption与resource root-slot填充/failed release。短timer只让work持有期间重叠，不靠耗时大小推断scheduler正确性。 |
| `src/project-run/task-scheduler/task-engine.graph-observation.test.ts` | 2 | graph record/真实hash引用保留；多变量identity差异按SCH-004改矩阵/expected。 |
| `src/project-run/task-scheduler/task-engine.scope-capacity.test.ts` | 4 | 保留。terminal gate期间不启动wide、tighter重算/overlap minima、cap→priority→lexical与无activation的真实并发各有目的；非单凭delay(2)断言正确性。 |
| `src/project-run/task-scheduler/task-engine.settlement.test.ts` | 4 | 保留。execute throw、unsatisfied、pre-admission不执行、同signal cancellation/drain及ordered observations是不同生命周期入口。 |
| `src/project-run/task-scheduler/task-engine.static-validation.test.ts` | 1 | 保留。完整malformed矩阵、首错顺序、稀疏chain≤3N lookup、131,072重复relation与root/scope一致性，不能因大矩阵或实现内部guard整体删除。 |
| **合计** | **73** | **31文件，全部实体及实际委托材料已读。** |

## 必须保留的证据边界

- **public simulation / private reducer / real shell不可互相替代。** public state 的opaque/frozen/branching与binary outcome，
  private failed/cancellation/reconciliation，以及真实payload启动、Promise drain、blocked hook、resource release分别有独立义务。
  shell integration拿同一reducer trace作expected是有意锁接线；它另有hardcoded order/diagnostic/measurement expected，
  reducer语义另由独立full-scan oracle承接，不属于复制SUT生成唯一oracle。
- **数值 oracle保留。** `/workspace/vibe-check/src/project-run/task-scheduler/measurement/exact-time.test-support.ts`
  用算术幂/有效数解码，按相邻Number距离和tie parity判定舍入，不复用Product DataView decode/rounding。
  其中DataView只用于求相邻可表示值/奇偶，不构成同算法expected。
- **queue oracle保留。** `/workspace/vibe-check/src/project-run/task-scheduler/measurement/queue.test-support.ts`
  消费canonical effects，但分类与delay expected由raw graph全扫描独立计算；因此证明collector而非重复证明reducer。
  effects本身的正确性由incremental trace独立oracle覆盖。
- **结构guard不等于无价值实现耦合。** 编译/selector/query的禁止全图扫描、activation single pass、revision/active-root reuse、
  validation lookup bound是当前owner明确声明的内部不变量，且同时检查实际选择/投影结果。保留但不宣称wall-clock或memory收益。
- **terminal failures仍需独立覆盖。** caller sync/async throw、summary writer throw、policy diagnostic writer throw及pre-terminal无context
  是不同failure owner，不能仅按都“contains failure”而合并。本分区provider只证明prepared handoff，
  public prepared lifecycle和learned persistence的其它实体由对应分区审读，不把本报告冒称其全量覆盖。

## 委托材料与未验证边界

完整读取的11个文件：

- `/workspace/vibe-check/src/project-run/task-scheduler/scheduler-graph-snapshot.test-support.ts`
- `/workspace/vibe-check/src/project-run/task-scheduler/task-engine.test-support.ts`
- `/workspace/vibe-check/src/project-run/task-scheduler/task-engine.graph-fixtures.test-support.ts`
- `/workspace/vibe-check/src/project-run/task-scheduler/task-engine.admission-policy.test-support.ts`
- `/workspace/vibe-check/src/project-run/task-scheduler/admission-core/selection.test-support.ts`
- `/workspace/vibe-check/src/project-run/task-scheduler/admission-core/incremental-trace.test-support.ts`
- `/workspace/vibe-check/src/project-run/task-scheduler/admission-core/incremental-trace-selection.test-support.ts`
- `/workspace/vibe-check/src/project-run/task-scheduler/admission-core/incremental-trace-fixtures.test-support.ts`
- `/workspace/vibe-check/src/project-run/task-scheduler/measurement/diagnostics.test-support.ts`
- `/workspace/vibe-check/src/project-run/task-scheduler/measurement/exact-time.test-support.ts`
- `/workspace/vibe-check/src/project-run/task-scheduler/measurement/queue.test-support.ts`

未执行测试正文、mutation probe、benchmark、Gate、build、install、网络或Git stage/commit。
静态分析能指出具体缺少失败信号的路径，不能证明当前测试在此环境通过、实际删改安全、并发运行的prototype spy隔离或性能收益。
局部graph.test.ts自带`waitFor`无deadline，主要依赖runner timeout；这是失败定位/清理风险，不是整实体删除理由。
后续获准实施时，先完成上述最小改写，再执行最窄目标测试、全树Test Evidence closure与按文档入口选择的验证；
只有新的承接证据实际成立后，才考虑删除整个实体或合并Case映射。
