# Proposal

本 Plan 的 Intended Change 是为 Product-private Task Scheduler 增加一次 invocation 的有界性能诊断汇总；稳定 owner、源码与测试才证明当前实现。它让维护者检查 Scheduler control path、Task slot/capacity、准入延迟与 drain，而不把并发 Task 误称为 CPU、线程或 OS 资源利用率。

## Why

逐次 `scheduler.decision` 已记录候选、capacity、blocker、selected/wait 与 hard-guard facts，per-Check `durationMs` 也已存在，但一次运行结束后仍需手工重建 Scheduler 在何处等待、何时准入、槽位占用多少以及最后 drain 的边界。单项启动顺序或 duration 不能单独解释 wall-time 瓶颈，且并行 Task 的 active 时间相加也不等于 wall time。

本 Change 只观察 Product Scheduler 已拥有的 state transition 和同步 control path。OS CPU、线程、event-loop、I/O、进程树与跨 invocation performance history 均没有可由该 owner 安全推导的事实来源。

## Outcome

effective diagnostic logging enabled 的 Scheduler invocation 在实际进入 Scheduler 后，终态路径尝试一次有界人读 `scheduler.summary`。它报告明确单位的 `schedulerControlPathMs`、decision observation、Scheduler span、slot·ms/capacity、utilization ratio、接受的 policy wait、admission delay 和 completion tail；所有 time projection 都明确不可相加以重建 wall time。

summary 是 invocation-local human diagnostic，不进入 public `RunResult`、Core、Check/Record facts、machine、progress、warning、autotune 或跨 invocation telemetry。未启用 diagnostic logging 时不创建 accumulator 或产生新增 clock sampling；若 timing 无法安全取得，summary 明确给出 unavailable，而不是伪造零值或空 timing。

## Scope

### Intended Change

- 只在 imperative Scheduler shell 建立 diagnostic-only accumulator，并在每个 admit、settle、graph-ready、accepted wait、terminal mutation 的逻辑 boundary **先**安全采样和 flush 旧区间，**再**变更 state/phase。clock.now 是 imperative side effect；pure decide、policy 与 hard guard 一律不取得 clock 或 accumulator。
- 以 `schedulerControlPathMs` 取代不准确的 `schedulerOwnMs`。它累计 Scheduler shell 内 snapshot、同步 decision path（包括 custom callback）及 state transition；不包含 Promise await、Task callback 或 diagnostic observation，且不建立 per-policy timing、更不声称纯 Scheduler CPU。
- 单列 `schedulerDecisionObservationMs`：每次 `scheduler.decision` observation 的同步调用（含 writer 可用时的 serialization/sync write 或 writer failure 后的 no-op）；`scheduler.summary` 自身不递归计入。
- 在有效 monotonic interval 上计算 `taskSlotMs`、`rootCapacitySlotMs`、`effectiveCapacitySlotMs`（单位均为 slot·ms）与 root/effective utilization ratio。Task slot 与 capacity projection 可以互相重叠，也可与 wait、active duration 重叠；任何 projection 均不得相加重建 wall time，utilization 不是 CPU/线程/OS utilization。
- 仅 proposal.kind 为 `wait` 且 Scheduler 接受时记录 wait interval；proposal 为 `null` 的被动 drain 不计入。graph-ready、admitted、settled 仅为实际 admitted Task 形成 chronology；top admission delays 按 delay 降序、Task ID 升序，至多三项。
- sampler throw、NaN/infinity、倒退、负 interval 或不能证明的 integral 只令 timing projection unavailable，并保留稳定 reason；合法零跨度必须与 clock fault 区分。离散 counts 可继续形成，既有 shared invocation clock failure 语义、admission、settlement、cancellation 和 policy-fault drain 均不改变。
- 只要 Scheduler 已进入，normal、caller cancellation 与 admission-policy failure 的 drain 完成均尝试一次 summary；writer containment 可令该 observation no-op。pre-work/planning failure 不伪造 summary。

### Resulting Impacts

- `src/project-run/task-scheduler/**` 的 shell/state 所有 timing interval、Task chronology、count、summary calculation；pure `decideScheduler` 仍只处理 immutable snapshot。
- `src/project-run/check-execution/**` 与 invocation private handoff 只在 effective diagnostic logging enabled 时把同一 monotonic clock 提供给 Scheduler；不新增 public clock、hook 或 author capability。
- diagnostic rendering/tests 必须证明有界、稳定的人读文本、event order 与 writer containment，不把日志字符串变成第二套 metrics implementation。
- 当前 root/scope capacity、directed readiness 和 selected/wait hard guard 是实现输入。fail-fast 与 named resource capacity 均仍为 Draft，不阻塞本 Change、也不预置字段；若以后激活，必须重审 capacity model、boundary sample、wait facts 和 Plan。
- `docs/architecture.md`、`docs/api-mechanics.md`、`docs/testing.md` 与语义 Case owner在实施时说明公式、overlap、output boundary 与 deterministic evidence。
- 新的 active + unaligned Decision `add-invocation-local-scheduler-performance-summary.md` 承接长期方向；diagnostic organization、per-Check duration、priority 和 custom-policy Decisions 仍独立 active/aligned，summary 不修改其 public、evidence 或 purity 边界。

## Success Criteria

- named scripted-clock fixtures 精确证明 control-path/observation 分离、slot·ms integrals、ratio denominators、zero span、timing unavailable、accepted wait 与 passive drain 的区别、admission delay、max running 和 tail。
- 全部 state mutation boundary 都先 flush 旧区间再切换；top list、tail 与 counts 只从 Scheduler-owned discrete facts 形成，不建立第二个 pending/running truth。
- disabled 时无 summary/accumulator/新增采样；enabled 且 writer 可用时 Scheduler entered 的每条 normal/cancelled/admission-policy-failed drain 路径恰好一条 summary，writer/clock failure 不改变 Run 行为。
- summary 仍是 human-only diagnostic，无 parser/schema/version 或 public/machine/progress/warning/autotune consumer；任何 time projection 都不被解释或测试为可相加的 wall/CPU/线程利用率。
- 已记录的 0.3/2.3 before/after 工作负载证据只作本机 advisory comparison；它不建立 budget、hard gate 或因果收益主张。未来没有满足同一 matching contract 的样本时，也不得从本 summary 推出 budget 或 hard gate。

## Affected Owners

- `docs/architecture.md`、`docs/api-mechanics.md`、`docs/testing.md` 与 `docs/testing/cases/**`。
- `src/project-run/task-scheduler/**`、`src/project-run/check-execution/**`、`src/project-run/invocation.ts`、`src/project-run/diagnostic-logging/**`。
- `docs/decisions/**`：invocation-local diagnostic、duration、priority、custom policy 与 no-public telemetry 边界。
- `scripts/project/gate/runtime/**`：后续匹配 workload 的 advisory wall/bytes observation。
