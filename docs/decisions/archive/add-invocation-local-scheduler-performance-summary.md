---
title: 将 Scheduler 性能汇总限定为 invocation-local 人读诊断
status: archived
alignment: aligned
createdAt: 2026-09-01T16:13:40Z
purpose: 让一次 Scheduler 运行提供安全、可解释的性能汇总，而不扩大公共或自动化契约。
background: 人读诊断、Check 时长、优先级与 custom policy 已各有独立边界，新的汇总必须只补充 Scheduler 自有观察。
decision: 以 Scheduler shell 安全采样并输出一次人读 summary，保持计时失败与调度、公共结果和自动调优隔离。
tags:
  - product-contract
  - workflow-policy
relations: []
---

## 目的

- 本记录保留基础 Scheduler summary 的形成时判断；它现已由 `extend-invocation-local-scheduler-performance-summary.md` 修订并归档，不再作为当前长期依据。当前 runtime 事实仍由稳定 owner、源码与测试承接。
- 让维护者在同一次 invocation 的既有人读 diagnostic 中检查 Scheduler control path、Task slot/capacity 积分、准入等待和 drain tail，而不从逐次 decision 手工重建这些有界观察。
- 保持该 summary 只服务人工诊断：不成为 public `RunResult`、Core/Check/Record facts、machine publication、progress、warning、autotune 或跨 invocation telemetry。

## 背景

- `organize-project-run-and-gate-diagnostics-for-human-inspection.md` 已确立 diagnostic log 是无 parser/schema/version 兼容承诺的一次性人读时间线；本记录只为其中增加一个 terminal Scheduler summary。
- `report-per-check-duration-without-changing-check-facts.md` 的 `durationMs` 仍是每个实际执行 Check 的 public execution summary；Scheduler 的 admission、active、slot 和 capacity 观察不改写它，也不成为新的 Check fact。
- `configure-project-gate-admission-priority-by-repeated-comparative-evidence.md` 继续要求任何 Gate priority 来自匹配 workload 的重复对照证据；summary 只帮助解释样本，不能从单次 invocation 反推或自动调整 priority/capacity。
- `expose-stateless-custom-admission-policy-to-callers.md` 保持 custom callback 是同步 pure policy。clock access 是 imperative side effect，只允许 Scheduler shell 的 diagnostic accumulator 安全采样；pure decide、policy 和 hard guard 均不接收或读取 clock，且不建立 per-policy timing。
- 现有 shared invocation clock 的失败语义不因诊断改变。sampler throw、非有限值、倒退、负区间或无法证明的 integral 只使本次 summary 的 timing projection unavailable，不影响 admission、settlement、cancellation、policy fault drain 或既有 clock owner 的失败处理。

## 决策

- 采用: effective diagnostic logging enabled 时，Scheduler shell 建立 invocation-local accumulator，并在每个 admit、settle、graph-ready、accepted wait 和 terminal state mutation 前取逻辑 boundary sample：先 flush 旧区间，再变更 state/phase。未启用时不创建 accumulator 或新增采样。
- 采用: terminal summary 的 `schedulerControlPathMs` 准确表示 Scheduler shell 内 snapshot、同步 decision path（包括 custom callback）、state transition 的累计控制路径耗时；它不包含 Promise await、Task callback、diagnostic observation，也不声称是 pure Scheduler CPU。每次 `scheduler.decision` observation 单列 `schedulerDecisionObservationMs`，而 `scheduler.summary` 自身不递归计入。
- 采用: Task 与 capacity 使用 slot·ms 积分，`rootSlotUtilization` 和 `effectiveSlotUtilization` 为 ratio；accepted wait 仅在 proposal.kind 为 `wait` 时累计，proposal 为 `null` 的被动 drain 不计 wait。各投影允许重叠，绝不相加重建 wall time。
- 采用: timing unavailable 显式携带 availability/reason，不伪造 `0` 或空集合；合法零跨度与 clock fault 必须可区分。离散 counts 仍可在 timing unavailable 时形成，但任何依赖 timing 的 projection 保持 unavailable。
- 采用: Scheduler 已进入后，无论 normal、caller cancellation 或 admission-policy failure 的 drain 结局，terminal path 都尝试恰好一次 `scheduler.summary` observation。writer containment 继续可使该观察为 no-op；pre-work/planning failure 不伪造 summary。
- 保留: fail-fast 与 named resource capacity 仍为 Draft，均不阻塞本次基于当前 root/scope capacity model 的实现；若以后激活或改变 hard guard/capacity model，必须重新审阅 summary 字段、interval boundary 与 Plan。
- 不采用: pure decision/policy/hard guard 中的 clock、per-policy callback timing、OS/CPU profiler、public/machine/progress telemetry、diagnostic parser、warning/hard gate，以及由 summary 自动改变 priority、capacity 或 admission。
