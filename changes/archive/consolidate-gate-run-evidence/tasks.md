# Tasks

任务按方向恢复、Gate/Run 实现、稳定材料同步和由窄到宽的验证排列；当前 16/16 项均以实际实施与验证勾选完成。Change 仍为 active plan；归档、暂存和提交均需后续明确授权。

## Readiness

- [x] 0.1 恢复并审计 `consolidate-project-gate-run-evidence.md`、归档的 `add-ephemeral-project-run-diagnostic-logging.md`、Gate/quality/script tooling owner、Project Run/output/scheduler owner和现有 Case/Test Evidence；确认当时 active + unaligned 的 Decision 是本次授权方向而非当时的 current fact。
- [x] 0.2 为 `repository-quality`、`quality` tag 与 `bun run quality` 做 caller/consumer audit，列出 package scripts、Gate selection/test、stable docs、Case 和 test entities；发现独立 consumer 时回写 Change，而不是删除其入口。
- [x] 0.3 记录现有 required/full Gate membership、aggregate/exit、nested quality transcript/log location，以及 representative preflight/scheduler/closing diagnostic evidence；基线仅作本 Change 的对比证据。
- [x] 0.4 分别确认 Gate invocation 与 test fixture 的 diagnostic directory owner：测试目录的 containment、unique naming、fixture cleanup 和无污染 `.log/project-run` strategy；确认不需要扩张 Product public output contract。

## Implementation

- [x] 1.1 删除 Gate `repository-quality` process entry、`quality` catalog/tag/profile/disabled-selection路径和相应 tests/material；保持其余 Gate-owned Checks、candidate preparation、test lanes、aggregate和 required/full selection 的语义。
- [x] 1.2 在完成 caller audit 后删除 `bun run quality` package script及只服务它的 repository quality root wrapper；保留 scan adapter 或其它 source 仅当仍有真实 caller，并移除过时 command documentation。
- [x] 1.3 保留 Gate bound Run 的 Gate-owned invocation directory，并将测试主动启用的 Product diagnostic directory 绑定到 test-owned fixture；加入 containment/cleanup assertions，证明每个 enabled Run 仍只有一份 core log且普通 `.log/project-run` 未被测试 evidence 污染。
- [x] 1.4 将 preflight diagnostic 改为每 Check 一条 `preflight.resolved` observation，统一 skipped、prepared、continued、blocked、cancelled、throw、malformed 的安全 details；删除重复 `preflight.started`/`preflight.finished`输出并保留现有 preflight execution semantics。
- [x] 1.5 收敛 `SchedulerDecision` diagnostic projection：从同一 immutable decision 输出完整 maxParallel/effectiveMaxParallel/running/blocker/reservation context和 decision-specific facts；改善 human summary，但不通过相同数值省略字段，也不在 shell 重新决策。
- [x] 1.6 调整 completion closing details，使 diagnostic logger close 前只显示 pending-close 而不在同一 observation 的 output snapshot 显示 not-run；保持 final RunResult outputs、partial writes、logger failure containment和其它 output priority。
- [x] 1.7 更新实际受影响的 stable owner docs、Case/Test Evidence mappings 与 command examples；移除已删除 quality identity/short command，保持日志正文非稳定协议。

## Verification

- [x] 2.1 运行 Gate definition/catalog/selection 和 repository tooling 的最窄测试，并完成 quality caller/consumer audit，证明无 `repository-quality`/`quality` tag 残留、保留 Check membership正确且短命令已退出。
- [x] 2.2 运行 Product diagnostic/preflight/scheduler/completion focused tests，证明 skipped preflight 的单 resolution、所有 decision 的完整 context、pending-close/not-run 无冲突、single log和 logging-failure/cancellation边界。
- [x] 2.3 运行 Gate 与目标 Product/runtime fixture tests，检查 Gate invocation evidence、test-owned evidence containment/cleanup、普通 `.log/project-run` 无污染、RunResult file/status readback和 Case assertions。
- [x] 2.4 按测试修改实际范围运行 `bun run test-evidence -- check --root .`，核对新增/删除/改名 test entities 与 Case mapping；运行 `bun run validate -- docs`、`bun run decisions -- check`、`bun run change-plan -- check changes/consolidate-gate-run-evidence` 与 `git diff --check`。
- [x] 2.5 运行 `bun run verify:vibe-check-workspace:required` 和 `bun run verify:vibe-check-workspace:full`，保存本次 Gate invocation 的 aggregate、selected checks与 test-owned diagnostic evidence 的可复核路径；审阅最终 diff，确认无未授权 public parser/schema/observer/multi-log 或独立 quality workflow。

## Verification Evidence

- **Plan baseline（仅作对比）**：Gate 曾启动不影响 aggregate 的 `repository-quality` 嵌套 Run；其 diagnostic 含重复 preflight lifecycle 表达，测试 evidence 也曾写入普通 Project Run 日志目录。该观察不定义当前契约或日志格式。
- **Current Gate smoke**：required 与 full invocation 均返回 passed；二者都不再选择或启动 `repository-quality`，并各自只在 Gate invocation directory 留下一份 Product core diagnostic evidence，没有该 wrapper 的 transcript。
- **Focused behavior**：Product Run、Gate 和 runtime fixture tests 覆盖单次 preflight resolution、完整 scheduler 决策语境、无冲突的 closing projection、logging-failure/cancellation、test-owned evidence containment/cleanup，以及普通 `.log/project-run` 不受测试 evidence 污染。
- **Closure**：目标测试、Test Evidence closure、product/scripts typecheck、lint、format、docs、Decision、Change 和 diff checks，以及 required/full workspace Gate 均已在本 Change 实施中通过。私有日志的路径、event 文本、字段布局和计数只作当次诊断材料，不是稳定协议或后续验收输入。
