# Tasks

本 Plan 的任务按“前置 contract 与长期决定 → tree cap / shared scheduler implementation → dogfood 和并发证据”执行；所有 checkbox 初始保持未完成，直到相应 owner 的实现与验证确有证据。

## Readiness

- [x] 0.1 运行 `bun run change-plan:list`，确认 `adopt-composable-check-tree` 是本 Change 的直接前置，且不修改、重开或归档它与其他现有 Change。
- [x] 0.2 使用 `decision-records`：先运行 `bun run decisions:list`，审阅或建立 Check-scoped invocation cap、dynamic reservation/drain、public authoring field与 scheduler-private handoff所需长期 decision；运行 `bun run decisions:check`。
- [x] 0.3 使用 `test-evidence-review` 恢复 Check tree、Project Definition validation、Task scheduler、direct Check、TaskPlan terminal、dependency/mutex、unavailable/failure、Run phase-boundary cancellation 和 dogfood Cases；运行 `bun run test-evidence:check`。
- [x] 0.4 从 docs navigation 读取 Project Definition、Check/Record、Task orchestration、output、coding-style与 current public-contract owners；确认 cap不进入 CheckDefinition/TaskDefinition/Record/policy/output，shared scheduler是唯一 admission owner。
- [x] 0.5 在开始实现前复审本 Design 的 active-window、min-cap、reservation/drain与 deterministic tie-break规则；若新事实会改变这四项中的任一公共语义，先更新 Open Questions并取得决定。

## Implementation

- [x] 1.1 在 composable Check tree authoring types/current public-contract source中加入 optional `maxParallel` scalar和必要 consumer types；保持 runtime callable exports不变，并使 project tree、docs与downstream projection单向消费同一 owner。
- [x] 1.2 实现 Project Definition / Check tree validation和normalization：root default、group-to-child scalar inheritance、child override、positive safe integer、`<= scheduler.maxParallel` fail-fast、每 leaf required resolved cap、frozen declarative fingerprint/diagnostics。
- [x] 1.3 将 resolved Check cap作为独立 private orchestration map 与flat Core catalog分开下发给existing shared scheduler；不向ResolvedCheckCatalog、CheckDefinition、TaskDefinition、TaskPlan、Record、policy或machine output新增字段。
- [x] 1.4 扩展唯一 shared scheduler：维护active Check caps、effective min cap、direct/TaskPlan leaf activation、direct/terminal settlement release、deterministic active constrained ready priority、reservation与non-preemptive drain。
- [x] 1.5 保持 existing readiness/dependency/mutex/unavailable/failure协议：reservation在eligibility变化时重算，失败/terminal cleanup释放active cap，既有任务不被cancel/pause/preempt；phase-boundary cooperative cancellation仍由Run owner处理，不新建scheduler或queue abstraction。
- [x] 1.6 更新 repository Project Definition、Project Run dogfood aliases和fixtures，覆盖root default、group override、leaf override与representative `maxParallel: 1`；不把array order写成执行语义。
- [x] 1.7 更新 Configuration、Check tree、Task orchestration、current contract、testing/navigation和downstream npm Change handoff docs；使用 `ai-ready-docs` 审核，使cap scope、active window、reservation/drain、non-goals和private boundary可独立恢复。
- [x] 1.8 更新 `establish-api-only-npm-product-boundary` 的 handoff/export/declaration/exact-tarball acceptance任务，使其消费本 Change完成后的authoring types与runtime semantics，不在该Change另建scheduler。

## Verification

- [x] 2.1 运行 Check tree authoring/validation/normalization tests：root default、nested group child override、leaf override、`1`、zero/negative/fraction/unsafeinteger、greater-than-root、unknown key、frozen snapshot和 stable diagnostics。
- [x] 2.2 运行 scheduler lifecycle tests：selection/planning/skipped/not-applicable和zero-leaf completion不激活；first direct/leaf admit激活；direct settlement和TaskPlan terminal settlement释放；cap在最后leaf与terminal间仍生效；failure/unavailable正确cleanup；Run phase-boundary cancellation保持原有证据。
- [x] 2.3 运行 concurrency tests：no cap保持root parallelism；one active cap限制whole invocation；multiple active caps取min；array order不改变semantic ordering；active constrained Check ready task优先；ties按stable `(checkId, orchestrationTaskId)` 选择。
- [x] 2.4 运行 reservation/drain tests：low-cap ready获得deterministic reservation；无关ready work不再无限填充budget；已有work无抢占自然drain；drain后reserved Check先admit；mutex/dependencyblocking、unavailable与failure会重新计算而不绕过既有规则。
- [x] 2.5 运行 direct Check与custom TaskPlan mixed tests：TaskPlan local graph、group-derived dependencies/mutex、terminal availability、record settlement与Check-scoped cap同时成立；审计CheckDefinition/TaskDefinition/public output没有scheduler metadata。
- [x] 2.6 运行目标 product/scripts tests、typecheck、lint、`bun run test-evidence:check`、`bun run decisions:check`、`bun run validate`与本Change `change-plan -- check`。
- [x] 2.7 运行 `bun run verify:vibe-check-workspace:required`；当Check tree、Core scheduler、docs、dogfood和downstream handoff已修改时运行 `bun run verify:vibe-check-workspace:full`，记录npm package Change仍需完成的installed-consumer evidence。
