# Design

本设计把二阶 schedule reference 作为公共终态事实的普通消费者，以纯函数拥有计算语义，并用价值证据决定是否公开及是否增加薄 Hook adapter。

## Context

- [`SchedulerMeasurementContext`](../../src/project-definition/scheduler-policy.ts)公开 frozen graph、kind-only execution 与 `SchedulerRawMeasurement`。raw 承接一阶事实，并在 timing unavailable 时保留不可用状态。
- [`summaryFromSchedulerMeasurement(...)`](../../src/project-run/task-scheduler/measurement/summary.ts)从 raw facts 投影 span、utilization、delay totals、top delays 与 tail。[`defaultSummaryHook()`](../../src/project-run/task-scheduler/measurement/diagnostics.ts)通过内部 terminal list 接收与 caller Hook 相同的 context，但 projector 和 hook 都不是 public API。
- active Decision `260902-unify-default-summary-with-terminal-measurement-hooks` 当前不支持 public summary API；若本 Change 公开窄 schedule reference，需要显式修订该边界。active Decision `260907-provide-learned-admission-through-public-strategy` 同时要求 optional helper 只通过普通 public graph/context 工作。
- [Scheduler owner](../../docs/development/scheduler.md#measurement-collector-与-immutable-context)与 [human output owner](../../docs/development/human-output.md#scheduler-summary-projections)定义现有 integrals、queue/delay 分类和可重叠边界；新的 reference 需要直接从公共一阶事实建模，而不是把现有摘要值相加重建 wall time。
- `changes/optimize-learned-admission-strategy/` 拥有特定 admission 候选的预注册比较与采用条件；本 Change 的 reference 在形成公共契约前不进入该候选的既有验收。
- `changes/isolate-public-contract-consumers/` 将决定 public-contract consumer 的最终目录和静态依赖门禁；本 Change 独立拥有指标语义与价值证据，但最终源码归属须服从该边界结论。

## Goals / Non-Goals

目标是定义一个小而稳定的 reference result，只用 public context 计算，让 internal diagnostic 和 external consumer 复用同一公式，明确 full-graph 或 realized-work coverage、timing unavailable 与模型假设，并用可复现虚拟场景和重复真实 workload 验证其独立信息价值。

边界限定为一次 Run 内、固定 observed task duration 的约束参考。private diagnostic summary、日志 parser、machine publication、默认 Hook 安装、exact solver 和跨 workload/host 比较均不属于本 Change；lower-bound gap 也不定义为可消除开销、optimality 或 Scheduler efficiency。

## Decisions

### Intended Change

以下暂定设计须由价值证据收敛：

1. 首选随包纯函数而非有副作用 Hook 作为唯一计算 owner，例如 `deriveSchedulerScheduleReference(context)`；输入仅为 public `SchedulerMeasurementContext`，输出为递归冻结的判别联合。
2. available 结果声明固定 observed-duration 模型、`full-graph` 或 `realized-work-only` coverage、constraint floor、各组成下界、dominant constraint、gap-to-floor 与中性命名的 floor-to-observed ratio。timing 或 coverage 不足时返回封闭的 unavailable/not-comparable reason。
3. 初版候选下界取互不相加组成项的最大值：precedence longest path、root work/capacity、mutex serialized load 与 named-resource weighted load。scope activation/capacity 仅在 public context 足以证明下界时纳入。
4. internal diagnostic summary 在相同 public context 上调用该 projector，并选择性呈现 reference；日志专属 top-N 与格式继续由 internal summary 拥有。
5. caller 通过普通 `measurementHooks: [context => consume(derive...(context))]` 显式接线。只有至少两个真实 consumer 共享 lifecycle/failure 代码时，才增加接受显式 sink 的薄 Hook factory。普通 static Run 的 collector laziness 与现有 sink failure 语义保持不变。
6. public API value gate 同时验证：代表性虚拟场景中的下界不超过 observed span（容许明确的浮点 epsilon）、dominant constraint 符合场景设计、故意较差的合法 schedule 能产生现有单一 utilization 或 tail 无法稳定表达的 gap，以及重复真实 workload 中该信号能支持可说明的调度判断。任一项不能成立时，保留现有 raw/context 与内部 summary，不增加 public root 导出。

### Resulting Impacts

- **Public API owner:** value gate 通过后增加窄 projector 与 result types，并同步 `src/index.ts`、public inventory、declarations、JSDoc 和外部 consumer acceptance；未通过时不增加 public root 导出。
- **Scheduler/human output owner:** projector 只能消费 sealed public context；internal summary 改为相同 projector 的普通 consumer，同时保留 diagnostic writer containment 与 caller Hook failure 的差异。
- **Decision owner:** 公共 projector 会修订 `260902-unify-default-summary-with-terminal-measurement-hooks` 的“不采用 public summary API”边界；新判断应明确只公开窄 schedule reference，不公开完整 human diagnostic summary。
- **Documentation owner:** 调度指南说明公式、coverage、假设、显式 Hook 用法、failure 与不可比较边界；不得把 reference 描述为 performance budget、exact optimum 或跨 Run telemetry。
- **Testing/evidence owner:** 使用 chain、parallel、mutex、weighted resource、suboptimal ordering、zero-span、timing-unavailable 和 partial execution fixtures；按测试证据流程维护新增或修改的测试，并以重复真实 workload 审查解释价值。
- **Existing optimization Change:** `optimize-learned-admission-strategy` 保持独立 Outcome 和验收口径；该 Change 只有显式修订并重新预注册时，才可把已公开 reference 作为附加归因指标。
- **Package-tool boundary:** 实现位置与 import validation 服从 `isolate-public-contract-consumers` 的结果；本 Change 不借新增能力预先决定全局 `tool` 目录。

## Risks / Trade-offs

observed Task duration 会受 contention、cache 和 host 状态影响，同一公式仍可能产生不稳定 reference；较松下界会夸大 gap-to-floor，过多组成指标会增加日志认知成本。公开 projector 会形成长期类型和语义兼容责任，因此价值证据必须先于 public root 承诺，并允许以“不公开”结束候选验证。

## Open Questions

- v1 coverage 是只接受完整 admission/settlement graph，还是同时提供明确的 `realized-work-only` 分支？
- root capacity 与 scope lifecycle 能否只用现有 public facts 形成可信下界，还是需要扩充一阶 measurement contract？
- 哪组重复真实 workload、判断任务和判定阈值足以闭合 value gate？
- 最终公共命名如何避免暗示 exact optimum；通过 gate 时是否已有足够 consumer 支持 Hook factory？
