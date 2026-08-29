# Tasks

所有任务均已完成；本文件保留从范围确认到实现、局部证据和 workspace Gate 的可复核顺序。归档仍需单独授权。

## Readiness

- [x] 0.1 恢复并记录 `add-ephemeral-project-run-diagnostic-logging.md`、`choose-implementation-style-by-problem-shape.md`、Project Run/output owner、现有 logger/scheduler/Check tests的当前约束；确认它们足以覆盖本 Change，未引入 public observer/parser/schema/verbosity/multiple-file scope。
- [x] 0.2 审计 `RunResult.outputs.diagnosticLogging.file`、README/JSDoc/examples、Configuration/API mechanics/Output docs、quality/Gate consumers与现有 assertions，定位旧 `run-<uuid>.log` 或单行/event-text 假设，并列出需要同步的 stable owner 和 tests。
- [x] 0.3 建立当前 full/representative log 的可复现基线：按类别计数 scheduler/Check/dependency/Record observations，记录大 accepted data 的重复位置与安全 renderer 的实际限制；把基线只作为本 Change verification evidence，不发布为新 contract。
- [x] 0.4 为 scheduler 写出 snapshot、trigger、判别 `SchedulerDecision` 和 apply invariant 的局部设计，逐项映射当前 canonical order、dependency、mutex、root/scope cap、reservation、tightening scope、cancel、await/drain/complete 行为与纯函数测试 cases。

## Implementation

- [x] 1.1 实现 enabled diagnostic file 的 `run-<UTC compact timestamp>-<UUID>.log` identity，保持 project-root containment、disabled/configuration behavior、RunResult file/status readback和 logger failure containment；更新已受影响的 consumer wiring/assertions。
- [x] 1.2 改造 Product-private diagnostic renderer 为 sequence/elapsed header 与安全 continuation details 的单文件人读格式，保持 synchronous append、partial write completion、failure latch、control-character escaping、author-hook avoidance与 close 前/后事实边界；为 compact timestamp、multiline complete evidence和 render/append failure补测试，并以局部 diff 确认既有 partial-write loop 未改变。
- [x] 1.3 收敛 invocation/completion/logging observations：实现最小 Run start/planning/aggregation/cancellation/closing summary，删除每 Check catalog和无新事实重复 summary；closing 只表达 `diagnostic=pending-close` 与其他已知 output/candidate facts。
- [x] 1.4 收敛 Check execution observations：保留 preflight、start、dependency result、Record report、final Check与异常边界；让 normal accepted final data仅在 owning final Check 中输出安全 shape/keys/items/bytes 摘要，dependency 只记录 data presence，Record完整安全输出一次，malformed/rejected/contained raw value与reason完整安全输出一次；删除同一 outcome/data 的 callback/settlement/task 重复投影。
- [x] 1.5 提取 immutable scheduler snapshot、explicit trigger 与 pure `SchedulerDecision` union；用 `decideScheduler` 保留当前选择政策和 blocker/capacity/reservation/scope/cancellation/terminal 语义，并以直接单元测试证明它不执行 mutation、Promise、logging或 clock read。
- [x] 1.6 将 generic task engine admission loop 改为 imperative `applySchedulerDecision` shell：只应用并验证 decision、启动/等待/settle/cancel/drain task，并从同一 decision 写一条 `scheduler.decision`；删除 ready/waiting 逐任务扫描和 scheduler重复settlement日志，同时保持 Task/Check owner语言分离。
- [x] 1.7 同步受影响 stable docs、public declarations/examples和 repository quality/Gate materials：仅更新实际已声明的 filename/output readback或消费说明，不将人读 event payload 升格为 parser/schema contract；若长期 Decision不足，先停下更新 plan/Decision而非临时扩张实现。

## Verification

- [x] 2.1 运行 logger 与 invocation focused tests，覆盖 disabled、compact UTC+UUID single file、normal multi-line rendering、create/append/close failure、output status/priority与配置无日志边界；局部 diff 确认既有 partial-write completion loop 保持原样。
- [x] 2.2 运行 Check-execution focused tests，覆盖 preflight、four-state terminal facts/messages/duration、large accepted final data summary、dependency data presence、Record single full render、malformed/contained author values、hostile getters/proxies/functions与 cancellation closure。
- [x] 2.3 运行 scheduler focused tests，直接覆盖 pure decision canonical ordering、dependency/mutex blockers、root/effective/tightening scope capacity、reservation、multiple admissions、await-running、settle-blocked、cancellation、task failure/drain与 complete；运行 task-engine integration确认 effects 按该 decision 执行。
- [x] 2.4 运行 representative repository quality/Project Gate diagnostic smoke，人工审阅一个完整日志：每 Check start/finish、Record/dependency和每 scheduler admission-cycle可恢复，accepted data未全文重复，未出现 ready/waiting churn；记录前后 event/bytes 对比及仍未承诺的格式边界。
- [x] 2.5 运行受影响 docs/material/schema validation、最窄 typecheck/lint/dependency/entry checks、`bun run decisions -- check`、`bun run change-plan -- check changes/reduce-project-run-diagnostics-to-runtime-decisions` 与 Change semantic/AI-ready review；日志正文没有因此成为 parser/schema contract。
- [x] 2.6 运行 `bun run verify:vibe-check-workspace:required`，处理本 Change 引入的 failures；在所有局部与 required evidence完成后显式运行 `bun run verify:vibe-check-workspace:full`，确认两个 profile 均通过；外部强制终止仍只以 partial-log boundary 覆盖，不主张 fsync 或 crash-consistency。

## Completion Evidence

- 已完成的 checkbox 对应当前 workspace 的实现和验证状态；本 Change 不复制 Product Gate transcript 或把它升级为新的 stable evidence artifact。
- 已运行的局部 runtime tests、Test Evidence、typecheck、lint、docs validation、Decision/Change checks，以及 required/full workspace Gate 共同证明本次范围。强制进程终止、文件系统崩溃和 fsync durability 仍在日志的明确非目标范围。
