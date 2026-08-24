# Proposal

本 Plan 在当前 ordinary Check contract 上交付确定性的 Markdown 标题结构 default Check，并把它纳入首次公开 package。

## Why

Markdown 文档常见的结构缺陷是缺少或重复 H1、首个标题层级错误、标题深度跳跃和过深嵌套。旧计划还包含 section/paragraph 字数度量、十六个阈值、measurement catalog、comparison/cache和 shared file policy；这些主观且高噪声的范围不是首版提供直接价值所必需。

## Outcome

Package 公开 ordinary value `markdownStructureValidation`（`checkId = markdown-structure-validation`）。它只处理 global scope 中的 Markdown exact inputs，通过一个 package-private GFM document boundary验证 closed heading rules，报告 safe Check-local Records，并用 final counts与四态结果表达结论。

## Scope

### Intended Change

- 新增 `MarkdownStructureValidationOptions`，首版只包含 `requireSingleH1`、`requireFirstHeadingH1`、`forbidDepthSkips` 与 `maximumDepth: false | 1..6`；`.md`/`.markdown` eligibility固定由本 Check实现并且只能消费 global scope。
- 选择并封装 CommonMark + GFM parser dependency，输出 parser-neutral headings、link occurrences、visible text segments与 source ranges；Markdown Link Check复用该 private boundary。
- Structure Check只报告 heading-rule violations；final data提供 document/heading/issue counts，存在 violation为 `failed`，无 violation为 `passed`，无 eligible Markdown为 `not-applicable`，read/parse/protocol failure为 `unavailable`。
- 公开 value/options、runtime validation、README/API example、package dependency/license、owner docs、语义 Cases、Gate与 exact candidate。
- 不包含 paragraph/section word/character measurements、style/formatting、自动修复、完整 lint规则集、链接验证、HTML安全、shared file policy、comparison/reference或 cache。

### Resulting Impacts

Private Markdown document boundary必须同时满足 Structure 与离线 Link Check 的事实需求，但 parser types、policy、Records、final data和 verdict 不跨 Check共享。

## Success Criteria

- CommonMark/GFM headings、front matter、code fence、HTML、tables、lists、Unicode和空文档有确定 parser-neutral结果；代码中的 `#` 不被误作 heading。
- 四项 heading rules 各自独立、边界明确且可组合；Record identity不依赖 line/column/parser node ID，当前位置仍可导航。
- Check只读取 global scope 中的 `.md`/`.markdown` exact paths；首版不增加 per-file override或第二文件收集器。
- Public/package/docs/Case证据、最窄 tests、typecheck、lint、required/full Gate和 exact candidate preparation全部通过。

## Affected Owners

- `docs/configuration.md`：default value、closed heading options与 native composition。
- `docs/scan-scope.md`：Markdown exact-input eligibility。
- `docs/quality-metrics.md`：heading Records、final counts与 status folding。
- `docs/output.md`：通用 v4 safe data projection。
- `src/checks/**`、`src/definition/**`、`src/index.ts` 与 package dependency/contract owners：private parser boundary、Check implementation和 public surface。
- `docs/testing/cases/**`：dialect/rules/scope/failure/public-consumer evidence。
