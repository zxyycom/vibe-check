# Tasks

本 Plan 先冻结 forced-only shell-order evidence，再以最小 private adapter move 实施并验证 quality Record 消失；不会以 focused evidence 代替 default/full Gate。

## Readiness

- [x] 0.1 阅读 Scheduler execution owner、编码规范、活动 Decision/Change 协调，并确认本 Change 不修改稳定策略或 public contract。
- [x] 0.2 运行完整 Test Evidence precheck，查询 forced-replay integration Case，并记录 focused quality 基线：6 条 Records，包含 `scheduler.ts` 的 320/300 file `code-lines` Record 与 5 条既有 `admission-core.ts` Records。

## Implementation

- [x] 1.1 新增仅拥有 canonical forced blocked effects 到 real Scheduler shell settlement 的 private adapter。对每个 effect 保持：pending-measurement flush → immutable post-state → blocked settlement → state capture → blocked-effect record → conditional diagnostic projection → Core observer；保留 cardinality、blocked-kind 与 post-state defensive checks。
- [x] 1.2 将 root Scheduler 改为调用该 adapter，保留 direct admission/running settlement、cancellation、policy fault、abort recheck、decision/measurement 与 terminal paths 的直接 ownership；不形成 generic replayer。
- [x] 1.3 强化同一 direct integration test 的 forced replay observable order，并复核/更新同一 semantic Case 的 `Proves`；保持 Case ID、Owner 和 entity key。

## Verification

- [x] 2.1 运行最窄 forced-replay、measurement、abort、policy-fault、Hook 和 wait Scheduler tests，以及 Test Evidence closure。
- [x] 2.2 运行受影响的 docs validation、product typecheck、lint 与 format checks。
- [x] 2.3 运行单项 Change Plan check 和 focused quality evidence：`scheduler.ts` file `code-lines` Record 消失，total Records 由 6 降至 5，且保留的 5 条为既有 `admission-core.ts` Records。该 focused evidence 不代表 Project Gate aggregate。
- [x] 2.4 已运行一次 default required Gate `bun run check`（不带 `--all`）：aggregate 通过，quality 仅保留 5 条既有 `admission-core.ts` Records，且没有 `scheduler.ts` target Record；已复核 9/9 Plan。未运行 complete Gate `bun run check -- --all`。
