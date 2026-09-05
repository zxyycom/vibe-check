# Proposal

本 Plan 将 Scheduler 的 forced-block effect replay 提取为私有 adapter，以移除一个超长文件质量 Record，同时保持既有 real-shell 时序和边界。

## Why

`src/project-run/task-scheduler/scheduler.ts` 的 focused quality 基线有一条 `code-lines` Record：320 行，限值 300。forced-block replay 是独立的 Core-to-shell 边界：它消费 canonical forced effects 及其逐项对应的 immutable post-state，再驱动 real Scheduler 的 blocked settlement、measurement、diagnostic 与 Core-observer 投影。将该责任留在根 Scheduler loop 会遮蔽它的单独时序契约。

## Outcome

根 Scheduler shell 继续拥有 preparation、decision loop、direct admission/running settlement、abort/policy-fault drain、terminal measurement 与 Hook 时序。一个非公开的 forced-block replay adapter 单独拥有**仅** canonical forced blocked effect 到 shell lifecycle effect 的映射。

变更后的 focused quality evidence 不再报告 `scheduler.ts` 的 file `code-lines` Record：总 Record 数从基线 6 降至 5；保留的 5 条均为既有 `admission-core.ts` Records。本 Change 不新增 Record、质量阈值或 waiver。

## Scope

### Intended Change

- 新增 Scheduler-private forced-block effect replay adapter；它只接受 `settled/blocked` canonical effects 和等长、逐项对应的 immutable post-states。
- 将该 forced-only Core-to-shell mapping 从 root `scheduler.ts` 移入 adapter，使 root 文件低于 300 code lines。
- 强化同一 direct integration test，并只更新其 existing semantic Case 的 `Proves`，以记录可观察 forced replay 时序；Case ID、Owner 和 entity key 均连续不变。

### Resulting Impacts

- 对每一个 forced effect，adapter 必须保持此顺序：**(1)** flush old pending measurement，**(2)** 安装对应 immutable Core post-state，**(3)** 做 shell blocked settlement，**(4)** capture performance state，**(5)** record blocked effect，**(6)** 仅在 diagnostics 或 diagnostic logger 存在时投影 scheduler decision，**(7)** 调用 Core-effect observer。effect/state 数量不等、非 blocked effect 或缺失 post-state 仍是 defensive failure。
- root shell 继续直接拥有 direct admission、running settlement、cancellation、policy-fault/abort handling、decision/measurement boundaries 与 drain/seal/summary/Hooks。adapter 不是 generic effect replayer，也不得承接这些生命周期。
- focused quality 的 6-to-5 结论仅比较同一 focused quality surface：移除 `scheduler.ts` 的那一条 `code-lines` Record，保留 baseline 中 `admission-core.ts` 的五条 Records；它不宣称全仓质量或 Gate aggregate。

### Non-Goals and Execution Boundaries

- 不改变 Admission Core algorithm、compiled graph、public API、global concurrency policy 或质量阈值，也不创建 waiver。
- 不将 direct/running/cancellation/abort/policy-fault/terminal actions 泛化或移动到 replay infrastructure。
- 本 Change 的记录不把 focused quality evidence 等同于 Gate aggregate。最终授权后，`bun run check`（无选择参数的 default required Gate）恰好运行一次并 aggregate passed；`bun run check -- --all`（complete Gate，含 artifact/external-consumer acceptance）未运行，因此 package artifact 与 external-consumer 边界仍未获本 Change 证明。
- 最终授权允许归档和仅提交本 Change；不推送。

## Success Criteria

- `scheduler.ts` 不再出现在 focused quality 的 file `code-lines` Records，且同一 focused quality surface 的总数为 5（基线为 6）。
- direct integration evidence 继续证明 canonical Core effect/post-state pairing、direct running settlement 先于 forced effects，以及每个 forced effect 的 blocked settlement、conditional diagnostic、Core observer 与 measurement 的顺序；synthetic diagnostics 保留 direct `task-settled` trigger，terminal last-settled facts 保留 direct-then-forced order。
- targeted Scheduler timing/abort/policy/Hook/wait tests、Test Evidence closure、docs validation、product typecheck/lint/format 与 active Change check 有各自记录的通过证据。
- default required Gate 已恰好运行一次并 aggregate passed；complete `--all` Gate 未运行，并在交付中明确其未覆盖的 package artifact 与 external-consumer 边界。

## Affected Owners

- `docs/architecture.md#execution-boundary`：Scheduler real-shell 与 Core effect boundary。
- `docs/testing.md`、`docs/testing/case-maintenance.md`、`docs/testing/cases/quality-runtime.md`：测试与 semantic Case evidence。
- `src/project-run/task-scheduler/scheduler.ts`、private adapter，及其 direct integration/timing tests：实现与回归证明。
- `changes/isolate-forced-block-effect-replay/`：本 Change 的 active Plan、范围、任务与验证记录。
