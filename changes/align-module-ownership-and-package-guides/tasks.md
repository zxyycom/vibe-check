# Tasks

以下任务按 owner 和共享写入面分组；完成前必须保留现有行为并以相称测试和最终集成证据闭合。

## Readiness

- [x] 0.1 由协调者记录当前 public export inventory、七项 package-provided ordinary Check ID/default options、candidate 文档清单和受影响测试/Case 路径，作为重组前后保持 contract 的比较基线。
- [x] 0.2 A 实现代理读取 `src/checks/**`、`src/definition/**`、相邻测试与 Case materials，列出每项 Check 的私有文件、真实共享依赖、迁移目标和所有将由 integration 修改的 import/export 聚合。
- [x] 0.3 B 实现代理读取 `scripts/foundation/**`、`scripts/{docs,validation,package,test-evidence}/**`、相邻测试及 `docs/script-tooling.md`，列出 owner 错位、目标路径和不变的 workflow entry。
- [x] 0.4 C 实现代理读取 package README/template、documentation projection/validation、artifact/candidate owner、public examples 与测试，列出七份 guide 的 source 路径、package inclusion route、以及全部 shared registry/manifest/fingerprint touch points。

## Implementation

- [x] 1.1 **A — Product only:** 将每项 package-provided Check 的 default/options/options-validation/execution 和 Check-private support 迁入 `src/checks/<check-owner>/`；移除 `src/checks/builtins/` 与 `src/definition/default-checks.ts`，但不编辑 `src/index.ts`、Definition aggregation 或任何 shared integration 文件。
- [x] 1.2 **A — Product direct evidence:** 修复 A owner 内部 imports，并移动/拆分直接 Product tests、fixtures 和直接 Case owner/proves；在交接中给出 integration 必须处理的精确 import/export、Definition materialization 和全局 Case index 变更。
- [x] 1.3 **B — scripts internal only:** 在既有顶层 owner 内完成 foundation command/process、machine-artifact docs/validation、test-evidence ast-grep 和 package artifact third-party-license 的归属收敛；修复 B 范围内 imports 与相邻测试，但不改 root command、shared package manifest、README/template 或 candidate receipt。
- [x] 1.4 **C — public docs/package artifact only:** 新增七项 package-provided ordinary Check 的中文 guide source、README 可发现索引所需的局部文档材料、package docs/artifact owner 内的 inclusion/audit tests及可运行示例；不编辑 shared README/template、documentation registry/projection command、manifest/fingerprint 或最终 candidate evidence。
- [x] 1.5 **Integration — shared Product/package surfaces:** 根据 A/C 交接，串行更新 `src/index.ts`、Definition aggregation、public export inventory、README/template、documentation registry/projection、package manifest/fingerprint、global Case index 与任何跨切面 tests；不得引入 compatibility export、CLI/bin 或 subpath API。
- [x] 1.6 **Integration — artifact refresh:** 从最终 sources 重新投影 public documentation 并生成新的 candidate/receipt，确认 package 同版本包含 guides、可读 ESM、declarations 和 `src`；废弃旧 candidate 作为本 Change 的验收证据。
- [x] 1.7 **Review correction — ordinary Check core:** 删除 Definition/check-tree 的 package-provided Check validator registry，以及 `ProjectDefinition.quality`、`ProjectQualityConfiguration`、`CheckProjectContext.files`；将完整 file/code-area policy 迁入所需 Check options，并同步 repository dogfood composition。
- [x] 1.8 **Review correction — local scanners/models:** 将 jscpd、scc、lizard 的完整 adapter/test 边界迁入各自 Check，拆分 aggregate scanner tests；将三类 measurement model 分别迁入 owner，删除 `scanner-adapters`、`metric-model`、`metric-analysis`。
- [x] 1.9 **Review correction — real common capability:** 将 Git-aware collection、project-relative normalization、code-area classification 与 exact-input acceptance 提升为 `src/project-files/**` 的真实共同能力，删除 checks 下的 `scan-scope` 并修复全部 owner imports。
- [x] 1.10 **Review correction — contracts/docs/evidence:** 同步 public types/inventory、Configuration/Architecture/Scan Scope/Scanner docs、七份 package guides、tests 与 semantic Cases；明确 malformed package-provided options 由 owning Check fail closed，且不保留 `quality` 兼容字段。
- [x] 1.11 **Review correction — candidate refresh:** 从修正后的最终 source 重建 package documentation/candidate/receipt，并废弃 `0.0.0-local.5151abc08085` 作为当前验收证据。

## Verification

- [x] 2.1 A 运行迁移 Check 的最窄 Product tests、typecheck/lint 与 `bun run test-evidence -- check --root .`，并比较 public exports、Check IDs、默认值与行为基线。
- [x] 2.2 B 运行每个受影响 script owner 的最窄测试、相关 workflow verification 与 `bun run test-evidence -- check --root .`，证明 quality/Gate/command 行为未变。
- [x] 2.3 C 运行 documentation/package artifact 的最窄 projection、validation 和 candidate tests，检查七份指南的中文主叙述、README 可达性、options/default/example/状态边界覆盖及 tarball inclusion。
- [x] 2.4 Integration 运行 `bun run change-plan -- check changes/align-module-ownership-and-package-guides`、`bun run validate`、`bun run test-evidence -- check --root .`、受影响 package/public-entry tests，并核对不存在 `src/checks/builtins/`、`src/definition/default-checks.ts`、新增 CLI/bin 或 subpath exports。
- [x] 2.5 Integration 以最终 worktree 运行 `bun run verify:vibe-check-workspace:full`；记录实际输出、未覆盖项（如有）和新 candidate/receipt 的可审计位置后，才可作语义完成审阅。
- [x] 2.6 运行各 Check scanner/options、project-files、Definition/run 的最窄 tests 与 Product typecheck/lint/format，证明 core import graph 不再指向 package-provided Check owner。
- [x] 2.7 运行 Test Evidence、Decision/Change checks、documentation/package candidate tests，并以最终 worktree 重新运行 `bun run verify:vibe-check-workspace:full`。
- [x] 2.8 审阅最终目录与 import graph，证明不存在旧集中目录/registry/compatibility layer，且每个 scanner、measurement model 与 options failure 只有一个 Check owner。

## Completion Evidence

- **Readiness / implementation review：** 独立结构复验确认 `src/checks/builtins/` 与 `src/definition/default-checks.ts` 均不存在；七项 public package-provided Check 分别位于其 Check owner（`duplicate-detection`、`file-metrics`、`function-metrics`、`json-validation`、`json-schema-validation`、`markdown-link-validation`、`maintenance-reminders`），其余跨 Check 能力位于明确命名的共享 owner。scripts 的 foundation、machine-artifacts、test-evidence ast-grep 与 package third-party-license 路径也已收敛。
- **Product / scripts verification：** 独立复验已通过 Product tests 89/89、Product typecheck/lint/format，以及 scripts tests/typecheck/lint/docs；Test Evidence 为 214/214 测试节点、62 Cases。
- **Package evidence：** 最终 candidate 为 `0.0.0-local.5151abc08085`，artifact SHA-256 为 `5e851c5c3344bac6a50561ce019ac72b8e3eed9c052223d760cb9e2b579f1716`；receipt 位于 `.cache/vibe-check/package-candidate/preparation-receipt.json`，列出 `README.md`、`docs/checks/index.md` 与七份 guide，并确认 `package.json` 只有 `.` root export。
- **Final workspace gate：** `bun run verify:vibe-check-workspace:full` 已通过 14/14；可审计日志目录为 `.log/project-gate/2026-08-25T16-12-06.522Z-1951119-82b63e75-dc63-45ca-8467-39aec7a8eaff/`。其中记录了 format、Product/scripts lint 与 typecheck、repository-quality、Test Evidence ast-grep rule tests 和 `git diff --check` 的成功结果。

以上证据只属于第一轮实施；用户 review 已证明其结构性成功标准未满足，因此不再作为当前完成证据。随后任务 1.7–2.8 重新打开并完成以下 correction evidence。任何新证据仍不构成 archive 授权；本 Change 保持 active/plan，只有当前任务明确授权后方可归档。

## Review Correction Evidence

- **Ordinary Check/core boundary：** production `src/definition/**`、`src/run/**` 与 `src/core/**` 不 import package-provided Check owner，也不含 package Check IDs；`ProjectDefinition.quality`、`ProjectQualityConfiguration`、`CheckProjectContext.files` 与集中 validator registry 均不存在。新 active aligned Decisions `treat-package-provided-checks-as-ordinary.md` 与 `let-each-check-own-file-selection.md` 固定长期 owner；后者以 `归并` 关系承接并归档旧 file override 与 Markdown source/target boundary Decisions。`bun run decisions -- check` 通过 153 条记录、0 candidates。
- **Owner layout：** jscpd、scc 与 Lizard 分别位于 `duplicate-detection/jscpd`、`file-metrics/scc` 与 `function-metrics/lizard`；三个 measurement models 分别位于 owning Check。`scanner-adapters`、`scan-scope`、`metric-model`、`metric-analysis`、`builtin-option-validation.ts` 与 `definition/quality-configuration.ts` 均不存在；真实共同 collection/exact-membership mechanism 位于 `src/project-files/**`。
- **Focused verification：** 受影响 Product/docs/layout tests 通过 129/129；受影响 Gate tests 通过 8/8；Product typecheck、Product lint、scripts typecheck、format check 与 `git diff --check` 通过。Test Evidence 通过 214/214 Bun entities、62 Cases、9 topics；docs validation 通过 190 个 Markdown files 的 link closure。
- **Package evidence：** 当前 candidate 为 `0.0.0-local.983ac4d30baa`，input fingerprint 为 `983ac4d30baa14c0233e6a8b70967d62ffece6e3fd9cd5315450610261169a69`，artifact SHA-256 为 `cbb9b0492678a9df35621bcd994a90e7a801b7d977f4edd5d7677d87bfe5c34b`。receipt 位于 `.cache/vibe-check/package-candidate/preparation-receipt.json`；installed package 包含 README、`docs/checks/index.md` 和七份独立指南，exports 仍只有 `.`。
- **Final workspace gate：** `bun run verify:vibe-check-workspace:full` 通过 14/14；可审计日志目录为 `.log/project-gate/2026-08-26T02-34-24.722Z-2074488-b1ff62fc-759b-4887-8bbc-3e95eadc8252/`。
