# Design

本 Plan 以最小模块移动隔离 real-shell forced-block replay，不泛化 Admission Core effect replay。

## Context

`docs/architecture.md#execution-boundary` 规定 real Scheduler 独占 Task/Promise、signal、diagnostic、measurement、actual settlement 与 hard guards；shared Admission Core 只提供 immutable transition effects/post-states。当前 forced replay 会验证 effect/state pairing，并逐项把 canonical forced blocked effect 映射到 shell lifecycle。既有 direct integration entity 已观察 canonical effect/post-state、measurement、diagnostic 与 terminal order；它保留同一 semantic Case 身份。

## Goals / Non-Goals

目标是提取一个可命名、private、forced-only adapter。它只消费 `settled/blocked` effects 与其等长、逐项对应的 immutable post-states，并对每一个 effect 保持以下精确顺序：

1. flush old pending measurement；
2. 安装该 effect 的 immutable Core post-state；
3. 执行 shell blocked settlement；
4. capture performance state；
5. record blocked effect；
6. **仅当** diagnostics 或 diagnostic logger 存在时投影 scheduler decision；
7. 调用 Core-effect observer。

非目标是改变 Admission Core algorithm 或 compiled graph，改变 public API/global concurrency/quality threshold，或将 direct admission、running settlement、cancellation、abort/policy-fault、terminal path、Hook 或 measurement boundary 纳入 generic replayer。focused quality 的 6-to-5 证据独立于 Gate aggregate；最终授权额外要求恰好一次 default required Gate，complete `--all` Gate 仍不在本 Change 范围。

## Decisions

### Intended Change

新增 task-scheduler 同目录的 private `forced-block-effect-replay.ts`，只导出 forced blocked effect replay 函数。它保留 effect/state cardinality、blocked-kind 与 post-state defensive checks，并在 adapter 内完成上述 exact Core-to-shell mapping。`scheduler.ts` 只在其两个 forced-block call sites 调用该 adapter，继续直接处理 admission、running settlement、cancellation、policy fault、abort recheck、decision/measurement 与 terminal path。

### Resulting Impacts

- 移动 replay 所需的 private imports；root shell 仍直接呈现其 own lifecycle，且不获得 public surface。
- 强化既有 direct Scheduler integration test 的可观察 replay order，并复核同一 semantic Case 的 `Proves`。Case ID、Owner 和 entity key 不因该正文强化而改变。
- focused quality baseline 的 6 条 Records 包含 `scheduler.ts` 的 320/300 file `code-lines` Record 及 5 条既有 `admission-core.ts` Records；post-change evidence 仅移除前者，故为 5 条。它不调整其它 Records、阈值或 waiver。

## Risks / Trade-offs

错误移动或重排 measurement、diagnostic 或 Core observer 调用会改变 custom callback measurement、diagnostic sequence 或 last-settled facts。风险控制是保留 direct running settlement 在 root shell、在 adapter 内逐步保留 forced-only sequence，并用既有 timing/abort/policy/Hook/wait tests 与 direct integration entity 证明。新模块不是通用 effect infrastructure，避免将不同 lifecycle semantics 收敛成不透明 replayer。

## Open Questions

无。

## Verification Boundary

已有 Plan verification 记录 targeted tests、Test Evidence closure、docs validation、typecheck、lint、format、single-Change check 与 focused quality evidence。最终授权后，default required Gate `bun run check` 恰好执行一次并 aggregate passed；其最终 machine Records 恰有 5 条，均为既有 `admission-core.ts` Records，且没有 `scheduler.ts` target Record。complete Gate `bun run check -- --all` 未运行，因此 package artifact 与 external-consumer acceptance 仍未验证。归档和提交由当前最终授权单独执行；不推送。
