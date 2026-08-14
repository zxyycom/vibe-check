# Tasks

本 Plan 的任务按“长期决定与 current contract → tree/option implementation → dogfood 与全链验证”顺序执行；所有 checkbox 初始保持未完成，直到相应 owner 审阅、实现或验证实际完成。

## Readiness

- [x] 0.1 运行 `bun run change-plan:list`，确认本 Change 与 `adopt-typescript-project-definition`、`establish-api-only-npm-product-boundary` 的 active 状态和单向关系；不修改或重开前置 Change。
- [x] 0.2 使用 `decision-records`：先运行 `bun run decisions:list`，为 public built-in descriptor / Check tree authoring、typed built-in option owner migration、Check-to-Task mutex handoff 建立或修订必要的长期 decisions；运行 `bun run decisions:check`。
- [x] 0.3 使用 `test-evidence-review` 恢复 Project Definition、built-in Check、custom TaskPlan、schedule/selection、Task mutex、quality configuration、dogfood 与 public package Cases；运行 `bun run test-evidence:check`。
- [x] 0.4 从 docs navigation 读取 Configuration、Check/Record、Task orchestration、quality/scanner、output 和 coding-style owners；确认 tree group 不进入 CheckRun/Record/policy/output，Core 保持 flat catalog/private binding。
- [x] 0.5 复审 current public-contract source 与 downstream npm Change：确认三个 descriptor 是 non-callable exports、`defineConfig`/`run` 仍是仅有 callable operations，项目 Run 和 project paths 不成为 package exports。
- [x] 0.6 按本 Design 验证所有已确认选择；若出现会改变 public tree、options ownership、identity、authorization 或 acceptance 的新问题，先更新 Design 的 Open Questions 并取得决定。

## Implementation

- [x] 1.1 扩展 current public-contract source 和 consumer comparison：拥有 `duplicateDetection`、`fileMetrics`、`functionMetrics` 的 exported-value names、必要 types 和 callable/non-callable inventory；不建立第二份 public-name list。
- [x] 1.2 在各 built-in owner 形成 frozen non-callable descriptor：保留 stable Check/Record metadata，新增每个 built-in 的 complete typed default options，并拒绝对 builtin identity/private binding 的伪造或改写。
- [x] 1.3 将 `ProjectDefinition.checks` authoring type 从 `builtIn/custom/schedules/selected` 替换为 discriminated Task-like `CheckNode` tree；实现 group、built-in leaf、custom leaf 的 exact closed validation和稳定 diagnostics。
- [x] 1.4 实现 Check-tree normalization：全局唯一 group-id/leaf-checkId namespace，non-empty group、leaf-only execution fields、selection-by-presence、tree dependency expansion、cycle/self/unknown rejection、inherited `dependsOn`/`mutex` append-dedupe、frozen declarative snapshot与 fingerprint。
- [x] 1.5 将 built-in-specific threshold/default fields 从 top-level quality configuration 迁到 descriptor typed options；保留 project-wide scan classification、include/exclude、generated-file、code-area和 report owners，并在 inputs 中按 resolved leaf options 使用原有语义。
- [x] 1.6 将 resolved tree 映射到现有 flat Check catalog：definitions、custom bindings/applicability、canonical built-in identities、resolved dependencies与 all-leaf selection；删除 public authoring 对重复 schedules/selected 的要求，不改变 Core Check/Record identity。
- [x] 1.7 将 inherited Check mutex handoff 接到 orchestration：direct built-in work 与 custom TaskPlan leaves 都追加 resolved mutex；保留 TaskPlan local dependencies/mutex、terminal availability与 shared `scheduler.maxParallel` 行为。
- [x] 1.8 更新 repository Project Definition、Project Run dogfood aliases和 fixtures，使用直接导入的 built-ins、tree grouping与 ordinary TypeScript spread options；不得通过 scripts 恢复参数解析、config discovery或另一个 config source。
- [x] 1.9 更新 Configuration、current-contract、quality/scanner、Task/Check/Record、output/testing/navigation docs与 examples；使用 `ai-ready-docs` 审核，使 authoring path、inheritance、default concurrency、private boundary和 non-goals可从 owner 文本独立恢复。
- [x] 1.10 更新 `establish-api-only-npm-product-boundary` 的 proposal/design/tasks：把本 Change 作为新的前置 handoff，纳入 descriptor export inventory、declarations和 exact-tarball consumer evidence；不在该 Change 实现 package projection。

## Verification

- [x] 2.1 运行 Check tree authoring/validation/normalization tests：built-in direct use、custom/built-in mixed nesting、selection-by-presence、group flattening、unique namespace、unknown/self/cyclic group dependencies、inherited append-dedupe与 stable diagnostics。
- [x] 2.2 运行 built-in options migration tests：descriptor defaults、ordinary TypeScript spread override、project-wide quality inputs、scanner-private field exclusion、metadata canonicality与 prior quality result semantics。
- [x] 2.3 运行 scheduler/orchestration tests：array order does not serialize; no constraints run concurrently within `maxParallel`; `dependsOn` waits for terminal availability; group references expand; inherited mutex constrains direct work and TaskPlan leaves; TaskPlan local graph remains valid.
- [x] 2.4 运行 Project Definition/Run Controls、catalog/Check/Record/policy/fingerprint、built-in runtime、dogfood Project Run 和 output contract的最窄目标 tests；验证 groups/functions/private bindings/Task values不进入 declarative output。
- [x] 2.5 运行 `bun run typecheck:product`、`bun run lint:product`、`bun run typecheck:scripts`、`bun run lint:scripts`、`bun run test-evidence:check`、`bun run decisions:check`、`bun run validate` 与本 Change `change-plan -- check`。
- [x] 2.6 运行 `bun run verify:vibe-check-workspace:required`；当 affected docs、change handoff、Core/output 和 scripts 已全部修改时运行 `bun run verify:vibe-check-workspace:full`，并记录任何需要 npm package Change 在其阶段补充的 installed-consumer evidence。
