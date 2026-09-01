# Design

本设计记录本 Plan 的 intended implementation；当前 runtime 事实由稳定 owner、源码与测试证明。其方向是用 Scheduler shell 的 diagnostic-only invocation accumulator 形成一条 terminal human summary；clock sampling 留在 imperative boundary，pure decision/policy/hard guard、shared invocation-clock failure semantics 和所有 public/machine contract 保持不变。

## Context

- `runTaskGraph` 是 Scheduler execution shell；snapshot、同步 decision（包括已确认的 custom callback）、hard-guard validation、state mutation、await 与 settlement 有不同 owner。只有 shell 可以安全调用 clock.now。
- `expose-custom-admission-selection-policy` 已完成并归档；其长期 Decision 仍要求 callback 是同步 pure policy，Scheduler 保留 hard guard、execution 与 settlement owner。自定义 callback 不取得 clock，也不单独测时。
- `require-passed-dependencies-and-observe-outcomes` 已归档并成为当前 directed readiness/blocked settlement 的实现基础；它不是本 Plan 的 current fact owner。现行 root/scope capacity model 是本次 slot-capacity denominator 的唯一输入。
- `add-invocation-fail-fast-policy` 与 `add-named-resource-capacity` 均为 Draft，没有 tasks 或已承诺模型；它们不阻塞实现、不预置 summary 字段。未来若激活并改变 admission cutoff/hard guard/capacity，必须重新审阅本 Plan。
- `add-invocation-local-scheduler-performance-summary.md` 为 active + unaligned 长期方向。它与 human diagnostics、per-Check duration、priority evidence、custom policy Decisions 一致，但后四者仍各自 active/aligned：没有将它们归并、替代或归档。

## Goals / Non-Goals

**Goals**

- 为一次 Scheduler execution 提供可复核的 control-path、state-interval、slot/capacity、wait、delay 与 tail observation。
- 让采样失败被 owner-local containment 吸收，只取消 time projection，不更改 Scheduler 或 shared-clock 行为。
- 保持 summary 有界、稳定、人读且只在 enabled diagnostic path 发生。

**Non-Goals**

- 不测量 CPU percent、thread/event-loop/RSS/I/O/OS process-tree resource，也不称 slot utilization 为上述任一值。
- 不测量 pure Scheduler CPU、不建立 per-policy/custom callback timing、不在 pure code injection clock/logger/accumulator。
- 不发布 public/machine/progress DTO、parser/schema/version、event bus、跨 invocation store、warning/hard gate、autotune 或 summary-driven admission changes。
- 本 Change 不定义或实施 fail-fast、named resources、可复用 benchmark budget/gate；产品代码和原生测试的实际完成状态只由 tasks checkbox 所列证据确认。

## Decisions

### Intended Change

#### 1. Shell-only safe sampling and explicit timing availability

effective diagnostic logging enabled 时，shell 创建 one invocation accumulator。每次 sampling 及 arithmetic 在该 owner-local containment 内执行。任一 clock throw、non-finite sample、backward sample、negative elapsed、negative/inconsistent integral 或无法证明 ratio bound 的情况，将整组 timing projection 标为:

```text
timing.availability = unavailable
timing.reason = <stable clock/integral reason>
```

后续不再用坏 sample 累计。discrete counts 仍从 Scheduler facts 形成；time-valued fields、top delays 和 tail 不用 `0`、空数组或假的 ratio 冒充正常数据。合法 zero span 是 sample 有效且所有相关 boundary 相同，必须不同于 unavailable。

该 containment 不捕获或改变 shared invocation clock 的现有失败途径，也不影响 policy fault、cancellation、admission、settlement、diagnostic decision observation 或 output status。

#### 2. State-boundary interval accounting

accumulator 维护当前已确认 state/phase 的 `running`、root `maxParallel`、effective root/scope capacity 与 boundary instant。每个下列 mutation 前都执行同一顺序：

```text
safe sample -> flush elapsed interval against old state -> mutate state/phase -> record new state
```

边界为 graph-ready、admit、settle、accepted wait 和 terminal。这样每一段 slot/capacity exactly 按此前真实 state 积分；不得在 mutation 后回写之前区间，也不得另建 pending/running source of truth。

```text
taskSlotMs          += elapsedMs * running
rootCapacitySlotMs      += elapsedMs * rootMaxParallel
effectiveCapacitySlotMs += elapsedMs * effectiveMaxParallel
rootSlotUtilization      = taskSlotMs / rootCapacitySlotMs
effectiveSlotUtilization = taskSlotMs / effectiveCapacitySlotMs
```

所有 capacity 值均为 Scheduler slots，积分单位是 slot·ms；ratio denominator 为 zero 时为 unavailable/null（按最终 summary shape 表示），不是 0%。若任何 timing fault 或 state/integral 不一致出现，相关 timing projection 全体 unavailable，不能 clamp。parallel active intervals、wait、delay、tail 与 control path 可重叠，全部只作不同诊断投影，不能求和重建 wall time。

#### 3. Control path versus observation

`schedulerControlPathMs` 是 imperative shell 从 snapshot、同步 decision path（含 custom callback）、hard-guard validation 到 state transition/result construction 的累计控制路径。它不包括 Promise await、author Task callback、`scheduler.decision` observation、`scheduler.summary` observation 或 instrumentation 自身以外部 profiler 推导的 CPU。

`schedulerDecisionObservationMs` 单列每个 decision diagnostic observation 的同步调用时间：writer 健康时可包含 serialization/sync append，writer failure 后可仅是 contained no-op。summary own observation 不被递归纳入。两者均不是 pure CPU metric，也不产生 custom-policy/per-policy timing。

#### 4. Chronology, wait and terminal emission

Task 在全部 current Scheduler-directed relations 满足时 graph-ready；没有 directed relation 的 Task 以 Scheduler span start 为 graph-ready。only actually admitted Tasks have:

```text
admissionDelayMs = admittedAt - graphReadyAt
taskActiveMs     = settledAt - admittedAt
```

blocked/cancelled unadmitted Tasks 不伪造 execution timing。top three 按 delay desc、Task ID asc 输出 Task ID、delay、active duration。tail 记录最后 admission 到 completion 与 last settled Task ID；不称其为 critical path。

wait interval 仅在 proposal.kind exactly `wait` 且 Scheduler accepts it 时开始，并在实际取得可推进 state 的 settlement 时结束。proposal `null` 的被动 drain 不创建 wait interval。wait 可以同 taskSlotMs/taskActiveMs overlap，不说明 policy reason、不分摊 blockers，也不计为 idle/CPU time。

只要 Scheduler 已进入，normal completion、caller-cancelled drain、admission-policy-failed drain 的 terminal path 均尝试一次 summary。writer containment 保持 no-op semantics；pre-work/planning failure 因没有 Scheduler execution 不产生 summary。

#### 5. Human-only summary shape

`[SCHEDULER] [SUMMARY] scheduler.summary` 是有界 ordinary object：discrete counts、timing availability、control/decision-observation/span projections、capacity/ratio、wait intervals、top admission delays 和 tail。字段和数组稳定构造，且只以人读 renderer 输出。

summary 不进入 RunResult、machine v4、progress、Gate observer 或 public API。没有 parser/schema/version、retention、discovery、warning、autotune；自动化 comparison 需另有独立 contract 和长期 Decision。

### Resulting Impacts

- implementation must retain Scheduler state as the sole pending/running/settlement truth and pass private clock + enabled selection only through existing invocation/check-execution boundary.
- tests must drive named clock samples at the listed mutation boundaries and distinguish valid zero span from timing unavailable; formatting tests prove safety/bounds only, formulas remain scheduler tests.
- future fail-fast/named-resource activation requires Plan/readiness review rather than silent reinterpretation of root/scope denominator or wait facts.
- resulting docs update stable owners only during implementation；this Plan records their required content but is not a substitute owner.

## Risks / Trade-offs

- enabled diagnostics add sampling and small state work to each listed boundary；已记录的 0.3/2.3 matching-workload evidence 仅为本机 advisory comparison，不能成为 implicit budget、hard gate 或因果收益结论。
- a boundary placed after mutation would misattribute a whole interval；the flush-before-mutate invariant makes the lifecycle cost explicit and testable.
- availability-first output preserves honesty but may provide fewer time values after a clock fault；discrete scheduler counts remain useful without hiding the fault.
- terminal summary is deliberately not a reducer for complete chronology；raw decisions remain the detailed evidence.

## Open Questions

无。Readiness 已确认 current root/scope model、custom policy status、Draft conditional branches及长期方向。future fail-fast/named-resource activation is an explicit re-review trigger, not an implementation blocker.

## Implementation Observations

- Readiness 0.3 的 [before workload evidence](baseline.md) 保存三项匹配的 diagnostic-enabled required samples；formal Gate artifact 未暴露 Product `declarativeFingerprint`，故该 fingerprint 为 unavailable，且没有以 machine `recordsFingerprint` 代替。
