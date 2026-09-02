# Tasks

本 Plan 先完成长期边界与当前 Scheduler 依赖审阅；再在同一 shell/state owner 实现 enabled-only accumulator 和唯一 terminal human summary。0.3/2.3 的 matching-workload evidence 已记录为 advisory comparison；它不创建可复用 benchmark budget 或后续 Gate 任务。未勾选项仍表示尚未由本 Plan 的对应证据确认。

## Readiness

- [x] 0.1 使用 Decision Records 建立 active + unaligned `add-invocation-local-scheduler-performance-summary.md`，固定 summary 为 invocation-local human diagnostic；核对 duration、priority、custom policy 与 diagnostic organization Decisions 仍独立 active/aligned，不归档或改变其现有边界。
- [x] 0.2 审阅已归档 custom selector 与 directed readiness 基础、以及仍为 Draft 的 `add-invocation-fail-fast-policy` / `add-named-resource-capacity`；确认当前 root/scope capacity 与 Scheduler hard guards 是唯一实现模型，Draft 条件分支不阻塞也不预置字段，未来激活必须重审 Plan。
- [x] 0.3 已保存[三个 matching、passed/exit-0 diagnostic-enabled required before samples](baseline.md)：记录 baseline commit、readiness patch SHA-256、runtime、Task membership、terminal outcomes、Scheduler decision 数量、日志 bytes 与 wall samples。formal Gate artifacts 不提供 Product `declarativeFingerprint`，因此其值明确为 unavailable（不以 `recordsFingerprint` 替代）；该证据不声称瓶颈、budget 或预期优化。

## Implementation

- [x] 1.1 在 task-scheduler shell 实现 diagnostic-only invocation accumulator 与 owner-local safe monotonic sampling；只在 enabled 时创建，clock fault 只令 timing unavailable，pure decide/policy/hard guard 保持无 clock/logger/accumulator，且不改变 shared invocation-clock failure semantics。
- [x] 1.2 在每个 graph-ready、admit、settle、accepted wait 和 terminal state mutation 前 sample/flush 旧 interval 后切换 state；由唯一 execution state 派生 slot·ms、root/effective ratio、max running、actual admission chronology、accepted wait、tail 和 discrete counts，不建立第二套 pending/running truth。
- [x] 1.3 以 `schedulerControlPathMs` 累计 snapshot、同步 decision path（含 custom callback）和 state transition，单列 `schedulerDecisionObservationMs`；不建立 per-policy timing、不称 pure CPU，且不把任何 overlap projection 相加为 wall time。
- [x] 1.4 仅 proposal.kind=`wait` 且 Scheduler accept 时累计 wait；proposal null passive drain 不计。Scheduler entered 的 normal/cancelled/admission-policy-failed drain 终态恰尝试一条有界稳定的 `scheduler.summary`；writer/telemetry failure 维持 existing containment，summary 不进入 public/machine/progress/warning/autotune。
- [x] 1.5 更新 Architecture、API mechanics、Testing 与 semantic Cases，说明 availability、zero-span-vs-fault、slot·ms/ratio、overlap、human-only boundary 和后续 fail-fast/named-resource re-review trigger；不新增 machine schema、public declaration、progress field 或 Gate warning。

## Verification

- [x] 2.1 使用具名 scripted-clock fixtures 运行最窄 task-scheduler tests，精确证明每个 flush-before-mutate boundary、empty/single/parallel graph、directed readiness、mutex/root/scope hard guard、priority/custom select、accepted wait、passive drain、blocked settlement、cancellation/policy-fault drain、top-delay ordering、capacity denominator、zero span、unavailable 与 tail。
- [x] 2.2 运行 Run/diagnostic integration tests：disabled 时无 accumulator/summary；enabled/writer healthy 时 Scheduler entered 终态单 summary；writer failure 和 sampler throw/NaN/infinity/backward/negative integral 只保持 existing output/Run behavior 并显示 timing unavailable；admission trace、settlement、Check duration/result、progress 和 machine bytes 不变。
- [x] 2.3 按0.3同一 required diagnostic-enabled workload采集三个 matched、passed/exit-0 after samples；记录 implementation patch identity、summary、wall与日志bytes，并以本机advisory比较 before/after median/range，未建立budget、硬门禁或因果收益主张。
- [x] 2.4 按 Test Evidence 流程闭合 Cases，运行最窄测试、`bun run test-evidence -- check --root .`、typecheck、lint、format、docs、Decisions 与 `bun run verify:vibe-check-workspace:required`；范围扩大或发布验收才运行 full。
