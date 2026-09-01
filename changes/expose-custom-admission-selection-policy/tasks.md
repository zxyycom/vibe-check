# Tasks

任务先确认 public adapter 的未决 contract，再将其适配到既有 private select/wait/reservation boundary，最后证明它未取得 Scheduler 的 hard-legality 或 execution ownership。

## Readiness

- [ ] 0.1 确认`extract-scheduler-admission-selection-policy`已归档，`separate-passed-dependencies-from-settled-observations` Decision 已闭合 public graph 所需的 directed readiness vocabulary，并记录 performance diagnostics 与 learned policy 的实际实施顺序。
- [ ] 0.2 使用 Decision Records 闭合 custom public discriminated select/wait/reservation result、identity projection、invalid-result handling，以及是否纳入 fault、console、diagnostic、timing contract；不得把 callback 限缩为 Task-ID-only 或禁止 policy-owned reservation update。
- [ ] 0.3 按`test-evidence-review`恢复 Definition/fingerprint、private Scheduler guard、public adapter 与 installed consumer Case owner，确认 public view 完整交接 graph-owned priority/topology，却不复制 private engine contract。

## Implementation

- [ ] 1.1 从 package root 提供`defineAdmissionPolicy`和最小 supporting types，扩展 closed static/custom Definition grammar、validation、normalization、deep-freeze、declarative projection 与 fingerprint。
- [ ] 1.2 在 prepared graph 闭合后投影并 deep-freeze full normalized graph、relation/mutex eligible candidates、per-candidate capacity facts 和必要 inspection view；排除 options、functions、data、Records、messages、logger、clock、signal 与 mutable collections。
- [ ] 1.3 将同步 custom select/wait/reservation result 适配到 private policy：Scheduler guard selected candidate/current capacity、reservation set target candidate 与 drainable wait，不重演 policy-owned reservation/fairness/anti-starvation strategy。
- [ ] 1.4 仅在 0.2 明确决定后实现 custom invalid-result/fault、console、diagnostic 或 timing behavior 及其 owner；不要从本计划推断 fallback、console routing 或 telemetry shape。
- [ ] 1.5 更新 Configuration、Architecture、API mechanics、testing、public inventory 与 installed consumer example，明确 full graph/priority handoff、select/wait/reservation capability、hard guards、trusted host risk 和已决定的 deferred contracts。

## Verification

- [ ] 2.1 运行 Definition/helper type inference、closed validation、function preservation、identity fingerprint、explicit/omitted static canonicalization 与 package declaration tests。
- [ ] 2.2 运行 custom select、custom wait、reservation set/clear/replace、full frozen graph/capacity view、candidate membership、selected-capacity、wait-drain、cancellation 和 shared-closure overlapping Run Scheduler tests。
- [ ] 2.3 运行 0.2 所决定的 invalid-result/fault、console、diagnostic、timing behavior tests；未决定前不得将其作为完成证据。
- [ ] 2.4 运行真实 installed consumer、public inventory/example validation 与`bun run test-evidence -- check --root .`。
- [ ] 2.5 运行 format、typecheck、lint、dependency/public-entry 检查和`bun run verify:vibe-check-workspace:required`；公共 contract 与 output boundary 闭合后运行 full Gate。
- [ ] 2.6 按编码规范审阅 public/private projection、trusted callback containment、exhaustive closed unions 与文件职责，并用 AI-ready 审阅确认实现者不会把 selector 误解为 graph/priority side channel、hard-legality owner 或 imperative Task hook。
