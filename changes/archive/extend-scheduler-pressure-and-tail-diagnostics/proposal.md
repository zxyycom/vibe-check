# Proposal

本 Plan 在既有 invocation-local human `scheduler.summary` 内增加可准入队列压力、准入延迟事实分解、完成尾段参与项和可比较声明身份；它不改写已归档 Change，也不扩大公共或自动化 telemetry 契约。

## Why

当前 summary 已证明 Scheduler control path 不是本机 Gate 的主要耗时，并显示高 slot utilization、accepted wait、top admission delay 与 completion tail；但这些数值仍不能直接回答三个后续问题：等待中的 Task 是受 mutex/capacity 硬约束还是已经可以准入，top delay 的时间由哪些事实状态构成，以及最后一次准入后哪些 Task 共同形成 tail。已有 matching evidence 还缺少 Product 已拥有的 declarative fingerprint，维护者难以先排除声明配置不同的样本。

这些问题都能由 Scheduler shell 和 Invocation 已拥有的私有事实回答，无需引入 OS profiler、policy reason、跨 invocation store 或第二套调度状态。继续依赖 decision 次数、last settled Task 或单个总 delay 会诱导不受事实支持的 capacity、priority 或性能归因。

## Outcome

effective diagnostic logging enabled 的 Scheduler invocation 在既有 terminal `scheduler.summary` 中报告 admission-viable pending queue 的总 task·ms、三类互斥分量及 total/分类 peak count；top admission delay 使用同一分类给出可求和的事实分解；completion tail 保留最后一次 admission boundary 的逻辑 post-state active Task 总数，并有界列出随后 settled 的主要 contributors；summary 复用 Invocation 的 exact declarative fingerprint 作为声明配置比较身份。

所有新增观察仍是 invocation-local human diagnostic。clock/integral fault 不伪造 timing；pure decision、custom policy 和 hard guard 不取得 clock、accumulator 或比较身份；summary 不进入 public `RunResult`、Core/Check/Record facts、machine、progress、warning、autotune、parser/schema/version 或通用 telemetry。

## Scope

### Intended Change

- 在 diagnostic accumulator constructor 及每次真实 Scheduler mutation 完成后的 `captureState`，从唯一 execution state 原子安装 post-state admission-pressure projection与新 Task delay accumulator；下一次既有 boundary 同源累计 global/per-Task interval，projection安装本身不采样 clock。universe 只包含仍 pending、`dependsOn` 全 completed 且 `observes` 全 settled 的 admission-viable Task；failed prerequisite 后等待 blocked settlement 的 broader graph-ready Task 不计 queue pressure。
- 按互斥硬事实顺序将每个 universe member 分类为 `mutex-blocked`、`capacity-blocked` 或 `admissible-pending`，以顶层 `admissionViablePendingTaskMs` 和三个分类 task·ms 积分表达 total/分量，并以四个顶层 peak Task count 表达 total/分类峰值。分类复用 Scheduler 的 canonical relation、mutex 与 `canAdmit` 判断；diagnostic accumulator 不重演调度规则或持有可驱动 execution 的状态。
- 为现有 top-three `topAdmissionDelays` item 平铺同三类毫秒分解，并在有效 timing 的 sampled-boundary 模型内保持分解之和等于 `admissionDelayMs`；custom policy 的同步决策期间按调用前的事实分类累计，不记录 policy reason。
- 在现有 `completionTailMs` 旁以 `discrete.completionTailActiveTaskCount` 保留最后一次 admission boundary 的逻辑 post-state active Task 数（此前仍 running 的 Tasks 加新 admitted Task），并以 `topCompletionTailContributors` 至多列出三个随后 settled 的 Task，按相对最后 admission 的 settlement delay 降序、Task ID 升序。
- 将 Invocation 已计算的 exact `declarativeFingerprint` 通过 enabled-only private handoff 原样交给 summary；不重算 graph fingerprint、不新增 `policyVersion`，也不读取 custom callback identity。

### Resulting Impacts

- `src/project-run/task-scheduler/**` 需要让 constructor/post-mutation state capture 原子安装只读 pressure projection，复用既有 boundary 的 interval accumulator，并形成 per-admitted delay breakdown、tail active snapshot/contributor projection及其确定性 flat summary shape；execution state 继续是 pending/running/settlement 唯一事实源。
- `src/project-run/invocation.ts` 与 `src/project-run/check-execution/**` 的 enabled-only handoff 需要携带已有 declarative fingerprint；disabled path 不创建新增 accumulator或 projection，enabled queue diagnostics 也不增加独立 clock sample。
- `src/project-run/task-scheduler/**` 的测试与 Test Evidence Case owner需要证明分类互斥/闭合、task·ms/peaks、delay 求和、tail bound/order、fingerprint 原样交接、zero span/unavailable、cancel/policy-fault drain 与 public/machine/progress 不变。
- `docs/architecture.md`、`docs/api-mechanics.md`、`docs/testing.md` 和 `docs/testing/cases/**` 需要说明 admission-viable 与 broader graph-ready 的差异、字段单位、边界、截断及比较身份的有限含义。
- 后继 active + unaligned Decision `extend-invocation-local-scheduler-performance-summary.md` 修订并承接原 performance summary 长期边界；原 Decision 作为直接前序归档，已归档 Change `add-scheduler-performance-diagnostics` 不修改或重新验收。

## Success Criteria

- 每个 admission-viable pending Task 在每个 sampled interval 恰好属于 mutex-blocked、capacity-blocked 或 admissible-pending 一类；三个分类 task·ms 非负有限且之和等于 total，total/分类 peak count 来自同一事实投影，且不把分类 peak 相加为同时发生的总量。
- 每个 actually admitted top delay entry 的三类 breakdown 之和精确等于 `admissionDelayMs`；failed-dependency blocked Task 和 cancelled-before-admission Task 不伪造 admission delay。
- `discrete.completionTailActiveTaskCount` 只统计最后一次 admission 后实际 active 的 Task；`topCompletionTailContributors` 只包含其中随后 settled 的 Task，输出至多三项并稳定排序；它们不被描述为 critical path 或瓶颈归因。
- summary 中的 declarative fingerprint 与当前 Invocation exact value 相同；相同值只证明 canonical declarative Definition identity 相同，覆盖声明的 Check membership/options/relations、outputs 与 Scheduler declarative fields，但不能单独证明 actual execution selection、terminal outcomes、RunControls、代码/candidate/tool/runtime/host 或 custom callback 算法相同；没有 `policyVersion` 或另造 identity。
- timing unavailable 保留 declarative fingerprint、total/分类 peak counts 与 `discrete.completionTailActiveTaskCount`，但不产生假的 queue task·ms、delay breakdown 或 tail contributor timing；合法 zero span 仍与 unavailable 区分。
- disabled diagnostics、normal/cancelled/admission-policy-failed terminal、writer containment 与 existing public/machine/progress bytes/shape 保持既有契约；无通用 telemetry、OS resource 或自动调优路径。
- 目标测试、Test Evidence closure、typecheck、lint/format、文档与 Decisions 检查、required 和 full workspace verification 全部通过；一次本机 diagnostic Gate observation 能直接看到新增指标并按其有限语义解释，不据单次样本作性能优化或 capacity 因果结论。

## Affected Owners

- `docs/architecture.md`、`docs/api-mechanics.md`、`docs/testing.md`、`docs/testing/cases/**` 与 `docs/coding-style.md`。
- `src/project-run/task-scheduler/**`、`src/project-run/check-execution/**`、`src/project-run/invocation.ts` 与相邻 diagnostic/progress/machine boundary tests。
- `docs/decisions/**` 的 Scheduler performance summary、human diagnostics、stateless policy 与 declarative fingerprint 长期边界。
- `.codex/skills/ai-ready-docs/**` 与编码规范审查流程只作为最终优化方法，不成为新的产品 owner。
