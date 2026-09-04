# Design

本设计把完整 duration facts 与人读 progress presentation 分开：前者保持 canonical `RunResult` ownership，后者只保留已在 lifecycle 时交付的局部 duration。

## Context

- `src/project-run/check-execution/execution-finalization.ts` 从 settled facts 按 canonical snapshot order 形成 `checkDurations`；`src/project-run/result.ts` 将它作为 completed、output 与 execution-cancelled `RunResult` facts。
- `src/project-run/invocation.ts` 的 final presentation handoff 只传 execution、counts 与 elapsed；`presentation.ts` 和 final `ProgressFeedback` 不携带 `checkDurations`，`renderer-formatting.ts` 的 `Execution summary` 也不输出 `check durations:` 或逐 Check rows。
- 每个普通 visible settled row 已由 `formatSettledBlock` 显示 measured duration 或 `not run`。attention passed/no-message rows 按既有规则隐藏；flag condition mismatch 以一个名称分组呈现且不逐项显示 settled row。这两项都是有意的 presentation compression。
- `docs/api-mechanics.md#outputs-与-runresult-边界` 规定 final summary 不重复完整 duration list、可见 settled rows保留 duration，并将完整 canonical facts 归于 `RunResult`；machine contract 排除 duration。Gate performance observer 和 learned duration model 消费 `RunResult.checkDurations`，而不读取人读 progress bytes。
- active + aligned Decision `report-per-check-duration-without-changing-check-facts` 保持 duration 为 Project Run summary，排除 Check/Record/aggregation/machine telemetry 扩张；本 Change 不改变该判断，只消除它的一条重复人读投影。

## Goals / Non-Goals

**Goals**

- 使 final progress summary 不再携带完整 duration array 或渲染逐 Check 列表。
- 保留可见 settled lifecycle row 的 duration，以及 final summary 的 invocation elapsed 与 outcome counts。
- 证明 canonical `RunResult.checkDurations` 和它的 Gate/learned consumers 未被 presentation-only 删除波及。

**Non-Goals**

- 不删除、重排、截断或改写 `RunResult.checkDurations`，不改变 Check settlement、Record、aggregation、machine schema 或 diagnostic ownership。
- 不改变 attention visibility、flag effective selection、flag-condition grouping、completion ordinal、reason/message formatting、TTY running region 或 file tee failure semantics。
- 不为 duration 引入新 CLI、telemetry、wall-clock fields、format option 或 summary toggle；不执行 Decision evolve、归档或提交。

## Decisions

### Intended Change

1. **Final presentation has no full duration payload.** 删除 `ProgressFeedback` 的 final variant 与 `ProgressFinalFeedback` 中仅为 summary list 服务的 `checkDurations` 字段；`invocation.ts` 在 final presentation handoff 仅传 counts、elapsed、execution。这样类型边界阻止 renderer 日后重新依赖完整 `RunResult` array。
2. **Keep duration where lifecycle owns it.** 保持 settled feedback 的 `durationMs`、`formatSettledBlock` 和 row-level `not run`。final formatter 仅输出 execution summary 的 execution/counts/elapsed，不输出 heading、Check IDs 或 durations。
3. **Keep intentional compression.** 不因删除 final list而改变 attention 通过项的隐藏，也不把 flag condition mismatch group 改成 individual rows；被压缩项的完整 duration facts 继续只在 `RunResult.checkDurations` 供程序化 consumer 读取。
4. **No fact-consumer change.** execution finalization/result types、Gate performance observation 和 learned scheduler history 不修改其 canonical fact 输入；machine output 继续排除 duration。验证使用直接 `RunResult` assertions，而非重新从 terminal bytes 推断事实。
5. **Stable owner and Decision update is minimal.** 更新 API mechanics 的 human output contract，改写 runtime Case 中失效的“final duration summary”表述并重审 report-output Case。现有 duration Decision 保持 aligned，既不作文字澄清也不 evolve：本 Change 没有改变其长期承诺的 scope、owner、compatibility 或 risk treatment。

### Resulting Impacts

- **Progress contract:** final feedback shape、presentation bridge、formatter、invocation call site 和 fixture construction必须同步收窄；否则 TypeScript compile 或测试会暴露残留 data flow。
- **Output compatibility:** terminal and tee bytes 会少一段重复文本；这是人读 presentation contract 的有意 hard cut，不影响 machine files 或 structured API。
- **Test evidence:** 修改 existing tests 的 body/expected output 后，复用同一 Case identity；`WB-RUNTIME-CHECK-DURATION-001` 的 Proves 改为 canonical `RunResult` duration order，不再声称不存在的 final list。`WB-OUTPUT-RUN-PROGRESS-001` 保留，只在其已经足以描述 row-level duration与压缩行为时不改动。
- **Downstream facts:** Gate performance observation 与 scheduler history 的完整 `RunResult.checkDurations` consumer contract是回归边界；它们不成为 progress renderer 的 dependency，也不改变 machine duration exclusion。

## Risks / Trade-offs

- final list 也会覆盖被 attention/flag compression 隐藏的 duration；移除后，人读输出不再提供这条重复、无上下文列表。该取舍符合本 Change 的目标，程序化完整事实仍在 `RunResult`。
- 只删除 formatter mapping 而保留 final feedback payload会留下没有消费者的耦合；反之误删 execution finalization 会破坏 Gate/learned consumers。因此用类型收窄和 direct fact tests共同防护。
- progress tee镜像 terminal bytes；两者必须同步改变，同时保留 terminal-first 与 file-only failure isolation。

## Open Questions

无。已确认的范围是 presentation-only；用户已授权本 Change 完成后归档及一个 Change 一个提交，但本 Plan 阶段不归档、不提交。
