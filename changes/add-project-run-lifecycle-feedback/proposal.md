# Proposal

本 Plan 让最终 npm Product 的 `run` 通过现有 `progress` effect 直接显示 Check 执行进度：TTY 在永久完成记录下维护临时 running 区域，非 TTY 只追加完成记录；两者使用相同的完成事实和 Product 测量耗时。

## Why

以下问题陈述保留 Plan 开始实施前的基线；当前稳定行为由 [Configuration](../../docs/configuration.md#invocation-and-results)、[Architecture](../../docs/architecture.md#execution-boundary) 与 [Output](../../docs/output.md) 拥有。该基线中，Product progress 只打印 `Vibe Check: execution` 与 `Vibe Check: effects` 两个阶段。调用方知道 Run 已开始，却不知道总共有多少 Check、当前有哪些 Check 正在运行、已经完成了哪些、结果如何或各自耗时多久。

实施前的 workspace verifier 已证明基础信息层级有效：开始时显示总数，每项结束时显示状态、名称与耗时，最后显示结果计数和总耗时。最终 npm 应在 Product 已拥有的 Check execution 与 outcome 边界提供同类能力，使任何调用方启用 progress 后即可获得一致反馈，而不要求 Check 或项目实现 lifecycle callback、observer 或第二套 renderer。

## Outcome

调用方在 progress effect 启用时调用 `run(definition, controls)`，可以观察到：

1. Check execution 前显示 Product 标题、`total N checks` 和 `Checks:`；不显示无法准确代表实际运行状态的全局并行度。
2. TTY 在永久完成记录下方维护临时 running 区域。started Check 出现在该区域；收到 settled 后，renderer 清除临时区域、永久追加完成行，再在下一行重绘其余 running Checks。
3. 完成行的 `[n/total]` 表示第 n 个完成；running 行的 `[n/total]` 仅表示当前可见行位置，会随完成行增加而重新编号。可见序号不承担 Check identity。
4. 非 TTY、重定向和 dumb terminal 忽略 started，只按 settled 顺序追加与 TTY 相同的完成行，不输出 cursor 或 color control bytes。
5. 完成行显示 canonical `displayName`、最终 `CheckOutcome` 状态、Product 测量的 duration 或 `not run`，并只在既有 outcome 提供 reason 时追加安全的 reason code。
6. 所有 Check 闭合后显示 outcome 计数与 execution `elapsed`。`elapsed` 是实际经过时间，不是并行 Check duration 之和，也不包含后续 policy、publication、logs 或 output effect 时间。

Product 对每个实际进入执行路径的 Check 使用 monotonic clock 测量一次 `durationMs`。progress completion 与带 final snapshot 的 `RunResult.checkDurations` 复用该值；未被 Task engine 启动的 Check 使用 `null`。计时独立于 progress 是否启用，并且不进入 `CheckOutcome`、QualityRecord、Core、DecisionPolicy 或 machine v3。

首轮不增加 public lifecycle observer、project-supplied progress callback、custom renderer API、wall-clock timestamps、Record timing 或 performance verdict。精确标点、列宽和 ANSI sequence 不是稳定机器契约；信息、顺序、状态、计时和 effect failure behavior 是验收对象。

## Scope

| 纳入本 Change | 明确不纳入本 Change |
| --- | --- |
| Product-owned progress header、TTY 完成记录 + 临时 running 区域、plain completion output 与 final execution summary。 | 通用 dashboard、spinner/bar theme、用户 formatter、renderer plugin 或 progress callback API。 |
| Check execution duration、execution elapsed 与带 final snapshot 的 `RunResult.checkDurations`。 | scheduler queue timing、subprocess 私有 timing、wall-clock timestamps、Record timing、durable telemetry 或 performance policy。 |
| 既有 Check status、display name 和可用 reason 的 human projection。 | 为显示修改 `CheckResult` / `CheckOutcome`、QualityRecord、Core、DecisionPolicy、machine v3 或 report schema。 |
| progress write/rewrite failure 与 final facts、cancellation和 effect status 的确定关系。 | 让 console output 改变 Check outcome、Record、Task admission 或 cancellation。 |
| public contract inventory、稳定 owner 文档、Product output evidence 与 exact-package consumer。 | 重建 Project Gate、切换 workspace verifier、发布 npm package或继承 workspace verifier 全部格式。 |

## Success Criteria

1. exact-package consumer 只需启用现有 progress effect 并调用 public `run`，即可在所有 target 看到 Check 总数、逐项完成状态/耗时与 final execution summary；TTY target 额外显示 running 状态；不导入 Product internal，也不提供 lifecycle callback。
2. 每个实际开始执行的 Check 形成一次 internal started feedback，每个 canonical Check 形成一次 settled feedback；从未启动的 blocked/cancelled Check 只有 settled `not run`。
3. TTY 只刷新临时 running 区域。settled 行按接收顺序永久追加并获得连续 completion ordinal；其余 running 行保持相对顺序并按当前可见位置重新编号。
4. 非 TTY、重定向或 dumb terminal 只输出 settled 行与 summary，不包含 cursor/color control bytes；TTY 与 plain 复用同一 completion counter、status mapping 和 terminal-row formatter。
5. status 只来自最终 `CheckOutcome`，label 只来自 canonical `displayName`；没有既有 reason 时不补造。
6. 每个实际执行的 Check 具有非负有限 `durationMs`；未启动 Check 为 `null`/`not run`。progress 与 `RunResult.checkDurations` 对同一 `checkId` 使用同一次测量，后者与 `snapshot.checks` 同序同量。
7. execution `elapsed` 使用 monotonic interval，并通过并行测试证明它不是 per-Check duration 之和。
8. 颜色只在支持的 TTY 中辅助状态；无色输出仍保留 count、title、status、duration/not-run 与 reason。
9. progress stream failure 不改写 Check/Record facts；失败可从 effect status/result 恢复，并且不会阻止 execution 和其他 effects 闭合。
10. public declaration inventory、Configuration/Architecture/Output owner、focused Product tests、exact-package consumer 与 required workspace verification 证明同一能力。

## Affected Owners

- Progress presentation 与 effect orchestration：`src/product/run/effects.ts`、`src/product/run/invocation.ts`、`src/product/run/publication.ts`。
- Check lifecycle、duration 与 completion handoff：`src/product/run/check-execution.ts`、必要的 private task-scheduler handoff，以及 `src/product/run/result.ts`；不得扩张 package public scheduler surface。
- Canonical label/status inputs：`src/product/definition/check-definition.ts` 的 `displayName` 与 final `CheckOutcome`；renderer 只投影，不建立第二份 mapping。
- Public result 与 package inventory：`src/product/run/index.ts`、`src/product/public-contract/current.ts` 及其 tests；首轮不增加 observer/event type root。
- 稳定事实 owner：[Configuration](../../docs/configuration.md#invocation-and-results)、[Architecture](../../docs/architecture.md#execution-boundary) 与 [Output](../../docs/output.md)。
- 能力参照而非 Product dependency：`scripts/vibe-check-workspace/verify/runner.ts`、`output.ts`、`results.ts`。

## Downstream Handoff

完成后，下游 [build-candidate-backed-project-gate](../build-candidate-backed-project-gate/) 直接启用 npm Product progress effect，并只继续拥有 repository profile、per-Check process logs、exit mapping 与 gate policy。它不再实现 lifecycle observer 或基础 Check progress renderer。

本 Change 会改变 runtime output 与 public `RunResult` declaration。portfolio、delivery navigation 与 Gate Change 已统一为 Product-owned progress 边界；实现完成后，Gate 仍必须使用 fresh candidate，旧 candidate handoff 不能证明新契约。
