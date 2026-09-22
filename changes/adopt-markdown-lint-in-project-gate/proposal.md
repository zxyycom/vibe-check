# Proposal

本 Plan 将已交付的 `markdownLint` 接入本仓 Project Gate，以真实文档 corpus 的 Finding 和成本证据采用可用的 advisory dogfood。

## Why

`markdownLint` 已作为 package API、文档和 installed consumer 能力交付，但当前 Project Gate 明确不选择它；本仓只验证 Markdown link target/anchor 完整性。因而规则对标题、围栏、列表、表格和图片替代文本的实际影响尚未在自己的文档与 Change materials 上得到反馈。

## Outcome

Project Gate 以独立的 `markdown-lint` Check 对完整 `docs/**/*.md` 与 `changes/**/*.md` corpus 运行固定的八项默认规则，并保留 package 的 non-blocking Finding policy。它属于 required、`materials`、`quality` 与 `--all`；required 仅在闭合的 repository-material 变更时运行，而 `materials`、`quality` 与 `--all` 强制运行。该 Check 保存自己的 Records/final data、共享 repository scan resource claim，却不替代或改变始终全量的 Markdown link validation。

## Scope

### Intended Change

- 在 repository-quality owner 中以明确 Check ID、files 与八项当前默认规则构造 `markdownLint`，不改 Product backend、公共默认值、cache 或规则实现。
- 将 Check 以 repository-material 变化条件接入 required，并直接加入 `materials` 和 `quality` focused preset；同步 manifest、资源声明、Gate/consumer 文档、Decision 与现有语义 Cases。
- 用真实 corpus 基线决定迁移 policy：2026-09-22 从 `f87794df` 运行 502 个 source、0 个 rejected input，得到 59 条 advisory Finding（`table-column-count` 43、`reference-links-images` 16），仅影响 3 个 investigation/resource source，耗时 3.57 s。因此不排除 source 或改变规则，而保持 advisory；未来 blocking 迁移必须先消除或经独立 Change 重审这些 Findings。

### Resulting Impacts

- required 增量判断必须覆盖 lint 的全部 `docs/**` 与 `changes/**` 输入；现有 `repository-material` region 已保守覆盖两者及影响 inputs。links 因反向 target 关系仍完整运行，不能继承 lint 条件。
- 新增/修改 Gate tests 和 Case 正文必须证明 policy、input/Record、empty/unavailable、选中条件、资源 claim 与 aggregate 边界；不将 advisory Findings 伪装为 Gate success 的无记录结果。
- 需要建立一个 repository-specific long-term Decision，因为此前 package Decision 明确说明 Gate 尚未选择本 Check。

## Success Criteria

- Gate manifest 可恢复 `markdown-lint` 的独立 identity、八项规则、完整 docs/changes selection、non-blocking policy、required/materials/quality/all membership 和 repository scan resource claim。
- required 在可信 repository-material 零变化时保留 lint `not-applicable`，在该区域变化或 Git 不可用时保守执行；`--materials`、`--quality` 和 `--all` 总是执行，links 的全量选择不变。
- real corpus 的 lint Records 与 final data 在 advisory policy 下保留，且 Gate aggregate 不因这些 normal Finding 失败；empty/unavailable 仍保留 Product-owned terminal semantics。
- Project Gate、package Check guide、Decision、Cases 和 Change artifacts 描述当前采用事实；目标/完整验证通过。

## Affected Owners

- `docs/tooling/repository-material-validation.md`：repository-material region 与增量闭合。
- `docs/tooling/project-gate.md`：Gate manifest、selection、resource 与 repository-quality policy。
- `docs/checks/markdown-lint.md`：package-facing current Gate adoption boundary。
- `docs/testing/strategy.md` 与 `docs/testing/cases/**`：Gate test evidence。
