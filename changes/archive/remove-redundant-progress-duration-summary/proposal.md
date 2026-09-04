# Proposal

本 Change 计划移除人读 progress final summary 中重复的逐 Check 时长列表，同时保留各自 owner 的完整 duration facts 与现有 lifecycle presentation。

## Why

当前 progress renderer 在每个可见 settled row 已显示 `durationMs`（或 `not run`），但 final `Execution summary` 又从 canonical `checkDurations` 再列出完整列表。该重复会拉长人读输出，且会掩盖 failure message、attention visibility 与 flag-condition grouping 已经定义的呈现边界。

## Outcome

人读 terminal 与可选 `progressLogFile` 的 final summary 只保留 execution、counts 与 elapsed，不再输出 `check durations:` 及其逐项列表；可见 settled rows 仍保留原有 duration。`RunResult.checkDurations` 保持为完整 canonical facts，machine output 继续不含 duration，attention suppression、flag-condition 分组、Check facts、aggregation、Gate performance observation 与 learned scheduling 均不改变。

## Scope

### Intended Change

- 删除 progress final feedback / presentation bridge / formatter 对全量 `checkDurations` 的传递与渲染，使 invocation 不再为人读 final summary 投影这份数组。
- 保留 settled lifecycle feedback 中的 `durationMs` 格式化、`not run` 语义、final counts 和 invocation elapsed；不为被 attention 隐藏或被 flag-condition group 压缩的 Check 恢复额外 row。
- 保留 `RunResult`、execution finalization、Gate `afterGate` performance observer 和 learned admission history 对 canonical `checkDurations` 的既有读取边界。

### Resulting Impacts

- `docs/api-mechanics.md#outputs-与-runresult-边界` 必须移除“final summary 完整 duration 列表”的稳定描述，并明确人读 duration 仍属于 settled-row presentation、完整数组仍在 `RunResult`。
- progress formatter、final feedback contract 与 invocation handoff 的直接测试必须同时证明 summary 不再重复列表、settled rows/elapsed 仍准确、TTY cleanup 和 plain/flag/attention behavior 未回归。
- `docs/testing/cases/quality-runtime.md` 中“final duration summary”对应的证明文字必须改为 `RunResult.checkDurations` 的 canonical identity/order；复核既有 report-output Case 是否仍准确，不为未改变的语义拆分或新增 Case。
- `report-per-check-duration-without-changing-check-facts` 已足以承接长期方向：其要求 progress 与 `RunResult` 有 duration，但没有规定 final summary 重列全部数组。因此不创建或 evolve Decision；若实施时发现必须改变该边界，停止并按 decision-records lifecycle 提出独立后继。

## Success Criteria

1. final summary 和 progress tee 不包含 `check durations:` 或任何由 `checkDurations` 生成的逐项列表，仍包含 execution、counts 与 elapsed。
2. 可见 settled row 仍以现有 duration / `not run` 语义呈现；attention 隐藏规则和 flag-condition-not-matched grouped block 保持原样。
3. `RunResult.checkDurations` 仍完整、按 canonical Check order，且继续可供 Gate performance observation 与 learned scheduling 使用；machine DTO/schema 仍不含 duration。
4. 稳定 API mechanics 与受影响 Case 文字同实现一致；当前 Decision 无 lifecycle 写入，相关验证通过。

## Affected Owners

- `src/project-run/progress-rendering/**`：人读 lifecycle/final summary、feedback contract、terminal/file tee 的直接测试。
- `src/project-run/invocation.ts`：Run-owned final presentation handoff；不得改变 `RunResult` completion facts。
- `src/project-run/result.ts`、`src/project-run/check-execution/**`：仅作为必须保持的 canonical `checkDurations` owner/readback 边界，不应为本 Change 改写。
- `scripts/project/gate/runtime/performance-observation.ts` 与 `src/project-run/scheduler-duration-model/**`：保留的 duration consumers，只做回归验证。
- `docs/api-mechanics.md#outputs-与-runresult-边界`、`docs/testing/cases/quality-runtime.md` 与 `docs/testing/cases/report-output.md`：稳定 output contract 与 Case evidence。
- `docs/decisions/report-per-check-duration-without-changing-check-facts.md`：已对齐的长期方向；本 Change 复核但不演进。
