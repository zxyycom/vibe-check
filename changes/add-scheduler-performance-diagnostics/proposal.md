# Proposal

本 Change 为 Product-private Task Scheduler 增加一次 invocation 的有界性能诊断汇总，让维护者区分槽位占用、policy `wait` 区间、执行长尾与调度器自身开销，而不把 Task 并发误称为 CPU 或线程利用率。

## Why

当前 diagnostic log 已逐次记录 Scheduler decision 的 elapsed、capacity、blocker、selected Task 或 wait 与 hard-guard facts，`RunResult` 也提供每项 Check 的执行时长，但一次运行结束后仍需人工重建并发槽位、ready-to-admission 延迟、`wait` 区间和尾部 drain。已有 admission priority 对照进一步证明，显著提前一个长 Check 的启动时间并不保证所有 profile 的总 wall time下降；只有执行耗时或单项启动顺序不足以解释实际瓶颈。

把 `running / maxParallel` 直接称为多线程或 CPU 利用率同样不可信：一个 Product Task 可以执行 JavaScript、等待 I/O、启动一个进程，或在其内部创建多个 worker。通用 Product 只能可靠报告自己拥有的 Task admission 与 settlement 时间线；OS 进程树资源属于项目 benchmark/profiler，而不是 Scheduler 可推导事实。

## Outcome

启用且成功写入 diagnostic logging 的 Project Run 在 Scheduler 结算后得到一条 `scheduler.summary` 人读事件。它用明确单位报告调度跨度、调度器自身处理时间、Scheduler decision observation 时间、Task 槽位占用与 root/effective capacity、最大运行 Task 数、接受的 `wait` 区间计数/时长、ready-to-admission 长延迟和尾部 drain。逐次 decision 继续保留该轮 candidate/capacity/blocker hard-guard facts；汇总不把 wait 归因为 policy 理由。指标名称和文档明确说明 Task slot utilization 不是 CPU、线程或 OS 资源利用率。

该汇总只帮助维护者诊断和建立后续性能证据，不进入 public `RunResult`、Core、Check/Record facts、machine publication、progress rendering、aggregation 或自动 priority/capacity 调整。没有匹配 workload baseline 时，Product 不根据这些值产生 warning 或失败。

## Scope

### Intended Change

- 在 imperative Scheduler shell 中使用 invocation 的 monotonic clock，累计从首次 decision 到 terminal decision 的 `schedulerSpanMs`，以及不含 Promise await、Task callback 和 diagnostic observation 的 Scheduler decision/state-transition 自有耗时。
- 将每次 `scheduler.decision` observation 的同步调用耗时单列为 `schedulerDecisionObservationMs`，避免把 diagnostic observer 的序列化、可用时的同步写入及失败后的 no-op 调用误判为纯调度算法成本；`scheduler.summary` 自身的 observation 不递归计入该值。
- 以 event-driven 区间积分计算 `taskSlotMs`、`rootCapacityMs`、`effectiveCapacityMs`、root/effective slot utilization 与 `maxRunning`。slot utilization 只描述 Product-managed Task 槽位占用。
- 当无状态 policy 提议的 wait 经 Scheduler 确认可由 running settlement 推进时，累计 interval 次数和毫秒数；逐次 decision 保留当轮 candidate/capacity/blocker hard-guard facts，但汇总不把 interval 分类或归因为 policy wait reason。该区间与正在运行的 Task 执行时间可以重叠，不把它表述为调度器 CPU 开销。
- 对每个最终 admitted Task 记录 graph-ready、admission 与 settlement 的 monotonic 点；按 `admission - graphReady` 形成 `admissionDelayMs`，稳定输出延迟最高的三项，并报告最后 admission 到 Scheduler completion 的 tail 与最后 settlement Task。没有 directed readiness relation 的 Task 在 Scheduler 启动时 graph-ready；永不 admission 的 blocked/cancelled Task 不伪造执行时间。
- effective output configuration 中的 diagnostic logging 启用时才创建性能累计状态。clock throw、非有限值或倒退不得改变 Task admission、settlement、Check outcome 或 Run result；时间型汇总保守标记 unavailable，仍可保留不依赖时钟的 decision/task counts。
- 在现有人读 diagnostic owner 中记录一条有界、确定性 `scheduler.summary`；不建立 parser、schema/version、跨 invocation discovery、retention 或稳定 telemetry stream。

### Resulting Impacts

- `src/project-run/task-scheduler/**` 的 execution state、imperative shell 与 tests 需要拥有 timing interval、Task chronology、counts 和 summary calculation；pure `decideScheduler` 继续只根据 immutable snapshot 形成下一动作。
- invocation/check-execution 的 private handoff 需要把同一个 monotonic clock 和 effective diagnostic-enabled 状态交给 Scheduler，不新增 public clock、lifecycle hook 或 author callback capability。
- diagnostic logging tests 需要验证 summary 的有界安全渲染与事件顺序；日志失败或 timing unavailable 继续由现有 output containment 处理。
- 依赖/观测、fail-fast 与 named resource capacity 的 active Changes 都可能改变 readiness、hard-guard facts 或 capacity state。实施前必须确定顺序并审阅它们的最终模型；本 Change 不复制这些图或 admission 规则，只从 Scheduler 的最终事实派生指标。
- `docs/architecture.md` 与 `docs/api-mechanics.md` 需要说明指标定义、重叠区间、输出边界和不可推导的 OS 资源；`docs/testing.md` 与语义 Case owner需要覆盖 deterministic timing evidence。
- 现有 diagnostic、人读 timing、per-Check duration 与 priority Decisions 需要在实现前演进，明确 summary 是 invocation-local observation，且不撤销 no-machine/no-cross-run-telemetry 边界。

## Success Criteria

- 一个 scripted monotonic workload 可以精确验证 `schedulerSpanMs`、Scheduler own/observation time、`taskSlotMs`、root/effective capacity 积分、两种 utilization、接受的 `wait` intervals、admission delay、maximum running 与 completion tail。
- 并行 Task 的 `taskSlotMs` 可以大于 wall span；文档、字段与测试均不把它解释为 CPU、线程或 event-loop utilization，也不把 Check duration 相加后与 wall time机械比较。
- wait intervals 只累计经 Scheduler 接受的次数和时长；逐次 decision 保留当前 candidate/capacity/blocker hard-guard facts，汇总不保存或推断 policy reason。它们明确允许与 Task execution overlap，不能被重复解释为 Scheduler own cost。
- delay top list 只包含实际 admitted Task，按 `admissionDelayMs` 降序和 Task ID 升序稳定排序，最多三项；空图、单 Task、依赖释放、mutex/capacity wait、priority、scope tightening、running/cancellation drain 均有明确结果。
- diagnostic logging disabled 时不创建 summary 或新增 Scheduler timing collection；enabled 且 writer 可用时恰好写入一条 terminal `scheduler.summary`。writer setup/append 失败继续只形成既有 output failure；summary observation 不改变 admission trace、Task settlement、Check facts、progress、machine bytes 或 public `RunResult` shape。
- clock throw、NaN、infinity 或倒退只使 timing facts unavailable；不得让 invocation 变成 `execution` failure，也不得伪造负时长或超过 100% 的 effective utilization。
- Scheduler pure decision owner不获得 clock、logger、performance policy 或历史状态；实现不引入公共 telemetry service、event bus、OS sampler、自动 priority/capacity、性能 warning 或硬门禁。
- 代表性 required/full Gate 前后运行保持相同 Task membership、terminal outcomes 和配置语义，并记录 instrumentation 对 wall time与 diagnostic size 的观察；只有匹配既有 workload baseline 时才作 advisory 比较。

## Affected Owners

- [`docs/architecture.md`](../../docs/architecture.md)：Project Run、private Scheduler 与 diagnostic owner 边界。
- [`docs/api-mechanics.md`](../../docs/api-mechanics.md)：一次性 diagnostic logging 的消费者语义和指标解释。
- [`docs/testing.md`](../../docs/testing.md)、`docs/testing/cases/**`：Scheduler/Run diagnostic 的语义证据。
- `src/project-run/task-scheduler/**`：Scheduler 状态、时间区间、汇总计算和 terminal observation。
- `src/project-run/check-execution/**`、`src/project-run/invocation.ts`：private monotonic clock 与 diagnostic-enabled handoff。
- `src/project-run/diagnostic-logging/**`：人读 summary rendering、failure containment 与事件顺序。
- `docs/decisions/**`：diagnostic、duration、priority 与 public telemetry 边界的长期判断。
- `scripts/project/gate/runtime/**`：代表性 workload 的非阻断性能与日志体积观察。
