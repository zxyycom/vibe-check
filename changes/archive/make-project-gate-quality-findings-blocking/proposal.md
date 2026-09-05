# Proposal

本 Plan 将已确认的严格 Project Gate 方向落实为独立、最小、可验证的配置与证据变更。

## Why

本仓四项 repository-quality Check 当前显式保留 `non-blocking` policy，因此 normal Finding 虽保留完整 evidence，却不会使 producing Check 或既有 effective/all Gate aggregate 失败。这与新的长期方向不一致，同时不能以改变 package consumer defaults 或让 Gate 重算 Records 来修复。

## Outcome

Project Gate 的 duplicate detection、file metrics、function metrics 与 Markdown link validation 在既有 Gate selection 内对未豁免 normal Finding 均结算为 failed，并通过既有 eligible-status `all` aggregation 令相应 Gate invocation failed；package constructors 省略 `findingPolicy` 时仍为 advisory。

## Scope

### Intended Change

- 仅将 `scripts/project/gate/checks/repository-quality.ts` 中 duplicate-detection、file-metrics、function-metrics 与 markdown-link-validation 的顶层 explicit `findingPolicy` 由 `non-blocking` 改为 `blocking`。
- 更新 Gate configuration/definition evidence、真实 Product settlement/aggregate evidence，以及 `docs/script-tooling.md` 对四项 Gate policy、required/quality/all selection 和 package-default 分层的当前事实。
- 建立并在实现后对齐 `keep-package-quality-defaults-advisory-and-make-project-gate-strict.md`；初阶段仅运行 focused quality Gate，最终归档与提交只在完成后的明确授权下执行。

### Resulting Impacts

- 已有未豁免 normal Finding 将使 owning Check failed，并通过已有 effective `all` aggregate 令所选 Gate failed；0 Finding 继续 passed。四项 Check 都在 required、`--quality` 与完整 `--all` selection 内；只有 Markdown link validation 还在 `--docs` selection 内。
- 既有 waiver 和 selection exclusion 继续在 owning Check 的既有边界生效，不能由本 Change 改写或被 Gate 重算。
- package defaults、thresholds、scopes、exclusions、flags、required membership、aggregation mechanics、Record shape、release-only policy 与外部写入均不变。

## Success Criteria

1. 四项 Gate configuration 的顶层 policy 均为 `blocking`，而 package constructor defaults 仍为 `non-blocking`。
2. 每项注入的 normal Finding 通过真实 producing Check settlement 变为 failed，既有 aggregate 变为 failed；zero Finding passed。
3. waiver/exclusion 的现有语义仍由 owning Check 处理，Gate 不从 Record/message/Finding 重算结果。
4. 稳定文档、Decision、Change tasks 与 Test Evidence 均与实际范围一致，并通过 focused 与获授权的 default Gate validation。
5. 在归档前恰好一次 default `bun run check` 通过；不运行 `--all` Gate、不手动 push，也不绕过已配置的 commit hook。default Gate 通过后才由 Change CLI 归档并创建一个只含本 Change 的提交。

## Affected Owners

- `docs/script-tooling.md#project-gate`：Project Gate 的当前组合、quality policy 与 selection facts。
- `docs/quality-metrics.md#explicit-aggregation-and-repository-gate-mapping`：existing status-only aggregate boundary。
- `scripts/project/gate/checks/repository-quality.ts`、`scripts/project/gate/definition.ts` 与相关 tests：Gate-owned options和配置/组合证明。
- package-provided quality Check tests：真实 Finding settlement 和 waiver/exclusion evidence。
- `docs/testing/**`、`scripts/test-evidence/**`：修改测试正文后的 Case/实体闭合。
- `docs/decisions/` 与 `changes/make-project-gate-quality-findings-blocking/`：长期方向与当前实施交接。
