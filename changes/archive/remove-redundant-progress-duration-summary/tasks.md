# Tasks

任务先确认 owner 和现有证明，再收窄 presentation 数据流，最后以直接事实、progress bytes 与全局 Change/Case 门禁闭合；除最终 Gate 与归档外，checkbox 已按本次实际证据更新。

## Readiness

- [x] 0.1 复核 `docs/api-mechanics.md#outputs-与-runresult-边界`、`src/project-run/progress-rendering/**`、`src/project-run/invocation.ts` 与相邻测试，确认唯一目标是 final `check durations:` list；记录 preserved settled-row duration、counts/elapsed、attention 和 flag grouping边界。Owner: progress rendering。
- [x] 0.2 复核 `RunResult.checkDurations` 的 canonical producer/readers：`src/project-run/check-execution/execution-finalization.ts`、`src/project-run/result.ts`、`scripts/project/gate/runtime/performance-observation.ts`、`src/project-run/scheduler-duration-model/**`；确认本 Change 不删除或替代它。Owner: Project Run / Gate / learned scheduling。
- [x] 0.3 按 test-evidence workflow 在改测试前运行 `bun run test-evidence -- check --root .`，读取 `WB-OUTPUT-RUN-PROGRESS-001` 与 `WB-RUNTIME-CHECK-DURATION-001`，确认修改 existing test bodies后保留 Case identity；审计 `docs/testing/cases/report-output.md` 是否无需文字变更。Owner: testing evidence。
- [x] 0.4 复核 active+aligned `report-per-check-duration-without-changing-check-facts` 与 `separate-settlement-run-progress-and-machine-owners`：记录其仍兼容“row-level progress + complete RunResult”方案，不创建或 evolve Decision；若发现实现要求改变长期事实范围，停止并走 decision-records lifecycle。Owner: Decision records。

## Implementation

- [x] 1.1 在 `src/project-run/progress-rendering/renderer.ts` 和 `presentation.ts` 收窄 final feedback/public-private bridge，移除只为 final list 服务的 `checkDurations` payload，并更新全部 fixture constructors。Owner: progress rendering。
- [x] 1.2 在 `src/project-run/invocation.ts` 停止将 execution `checkDurations` 交给 final progress presentation；保留它进入 cancelled/completed/output `RunResult` 的既有路径。Owner: Project Run invocation。
- [x] 1.3 在 `src/project-run/progress-rendering/renderer-formatting.ts` 移除 final `check durations:` heading/map，只保留 execution/counts/elapsed summary；不修改 `formatSettledBlock` 的 duration / `not run` 规则。Owner: progress rendering。
- [x] 1.4 更新 `docs/api-mechanics.md#outputs-与-runresult-边界`：说明人读/tee final summary 不重复完整 duration list、可见 settled rows保留 duration、完整 canonical facts属于 `RunResult`；保留 flag/attention compression 与 machine exclusion。
- [x] 1.5 更新 `docs/testing/cases/quality-runtime.md` 中 `WB-RUNTIME-CHECK-DURATION-001` 的 Proves，使它断言 `RunResult.checkDurations` 的 canonical order/identity与 shared invocation elapsed，而非 final duration summary；只有 `WB-OUTPUT-RUN-PROGRESS-001` 的当前文字不能准确覆盖测试后才最小编辑 `docs/testing/cases/report-output.md`。

## Verification

- [x] 2.1 更新并运行最窄 progress renderer tests（至少 `renderer-formatting-final.test.ts`、`renderer.lifecycle.test.ts`、`renderer-formatting-statuses.test.ts`、`terminal-statuses.test.ts`、`timing.test.ts`）：断言 final terminal bytes与 tee没有 duration heading/list，visible settled rows仍显示 duration/`not run`、elapsed不是并行 duration 求和、attention/flag compression不回归。
- [x] 2.2 运行直接 Project Run / consumer regression tests，断言 `RunResult.checkDurations` 仍完整 canonical，并运行 Gate performance observation 与 learned duration-model 相关 tests，证明其不依赖 progress bytes且不受影响。Owner: Project Run / Gate / learned scheduling。
- [x] 2.3 对测试正文与 Case 文字运行 `bun run test-evidence -- check --root .`；运行 `bun run validate -- docs` 验证稳定文档，并复核 Case entity keys与Proves仍匹配实际断言。
- [x] 2.4 运行 `bun run format -- check`、`bun run typecheck`、`bun run lint` 与 `git diff --check`；在交付中分别报告最窄测试、Case/docs、工程和 Gate 证据，以及未运行项（如适用）。
- [x] 2.5 最终验收已运行一次 `bun run check`：31 个 required Check passed、5 个 package-acceptance Check 未选择；每个 settled row 保留耗时，final summary 只保留 execution、counts 与 elapsed，不再输出 `check durations:`。
- [x] 2.6 实现、验证、stable owners、correctness 与最终 AI-ready/编码规范审查均已完成；当前用户请求已授权归档并要求一个 Change 一个提交，据此归档并只提交本 Change 的可归因文件，不纳入后续 Record Change 的 Plan/Decision。
