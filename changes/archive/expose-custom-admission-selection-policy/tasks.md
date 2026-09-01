# Tasks

任务先用现有归档、Decision 与 Test Evidence 恢复可实施边界，再删除 reservation Core protocol、实现无状态 public adapter 与 fault drain，最后同步 stable owners 和跨边界验证。

## Readiness

- [x] 0.1 已确认 `extract-scheduler-admission-selection-policy` 已归档；`separate-passed-dependencies-from-settled-observations` 已提供 directed readiness vocabulary；[`docs/change-execution-order.md`](../../docs/change-execution-order.md) 已将顺序固定为 custom（含 stateless correction）→ performance diagnostics → learned，Draft fail-fast/named resource 不阻塞。
- [x] 0.2 已通过 `use-stateless-admission-policies-with-hard-scheduler-guards`、`keep-gate-run-evidence-complete-with-stateless-scheduler-context` 与 `expose-stateless-custom-admission-policy-to-callers` 固定无状态 select/wait、Gate evidence、closed public static/custom、frozen context、fingerprint、fatal fault 与 diagnostic/reentrancy边界；实现时须保持三者一致。
- [x] 0.3 已恢复 Test Evidence 基线：333/333 current test entities、91 semantic Cases、30/30 当前目标 tests；Implementation 必须从 `WB-PROJECT-DEFINITION-001`、`AUX-PARALLEL-RUNNER-001`、`AUX-PUBLIC-AUTHORING-TYPES-001` 恢复 Definition/fingerprint、Scheduler guard 与 public authoring consumer owner。此项只证明可定位恢复 owner，不宣称尚未实现的 public custom capability 已获证明。

## Implementation

- [x] 1.1 从 `src/project-run/task-scheduler/**` 删除 `reservationTaskId`、`ReservationUpdate`、keep/set/clear、sticky selection/trace 及相关 decision/diagnostic fields；将 private/static policy 收敛为每轮从 frozen full graph、candidate/capacity/runtime facts 重算的 exact select/wait，不引入兼容 alias 或 Core fairness state。
- [x] 1.2 扩展 Project Definition 的 closed static/custom grammar、validation、normalization、deep-freeze、declarative projection、fingerprint、public declarations和 package-root `defineAdmissionPolicy` export；保证 omitted/explicit static canonical 等价、helper/inline 等价、callback identity/closure/function 均不进入 fingerprint。
- [x] 1.3 构造并 deep-freeze detached ordinary public context：canonical full graph tasks/scopes/relations与 Task-owned priority，candidate `{ taskId, canAdmit }`、running/settled IDs、active scopes、capacity/minimal runtime facts；排除 private types、Set/Map、options/functions/data/Records/messages/logger/clock/signal/Task capability。
- [x] 1.4 实现同步 `proposeAdmission(context)` 的 exact select/wait adapter 与 Scheduler hard guard；对 throw、thenable、malformed/non-candidate/capacity-or-lifecycle-invalid select、undrainable wait 停止 admission、取消 pending、drain running，并以 `admission-policy-failed` execution result和有界 diagnostic category完成，不 fallback、不建立 console/check-message/timing telemetry。
- [x] 1.5 同步 Configuration、Architecture、API mechanics、testing、public inventory、package example、installed consumer和三个 Decision 的必要正文；明确 trusted callback/reentrancy、full-graph handoff、hard-guard与fault boundary，且仅在实现事实成立后把 stable docs改为 current。Decision 的 alignment 仍由其 own workflow 和闭合证据决定；不能因本项编辑或实现而预先标记。

## Verification

- [x] 2.1 运行 private Scheduler/static-policy tests，证明 reservation source/trace 已删除、static tightening 每轮重算、select/wait 有限进展、selected hard guard、cancellation与blocked settlement不变；不得用 fairness/reason assertions替代硬条件证据。
- [x] 2.2 运行 Definition/helper type inference、closed union validation、function preservation、omitted/explicit static canonicalization、fingerprint exclusion、declaration build与package-root export tests。
- [x] 2.3 运行 public adapter/context tests，证明 full canonical frozen graph、Task priority、candidate/capacity/runtime facts、detached projection、forbidden-value absence、custom select/wait与overlapping-Run shared-closure/reentrancy boundary。
- [x] 2.4 运行每个 admission-policy fault category与 lifecycle tests，证明 no fallback、pending cancellation、running drain、`admission-policy-failed` result、diagnostic bounded redaction以及无 console/checkMessages/timing telemetry contract。
- [x] 2.5 运行真实 installed consumer、package inventory/example validation与 `bun run test-evidence -- check --root .`；按实际新增/修改 tests 完成 Case owner/Proves 审阅，不能把 0.3 基线当作 public capability evidence。
- [x] 2.6 运行 format、typecheck、lint、dependency/public-entry、Decision 与 docs validation、`bun run verify:vibe-check-workspace:required`，公共/output边界闭合后运行 full Gate；按编码规范与 AI-ready 复核实现/owner 文档不会把 callback 误解为 Core strategy state、imperative hook 或 graph/priority side channel。
