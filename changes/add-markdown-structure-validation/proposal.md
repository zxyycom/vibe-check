# Proposal

本 Proposal 是实现 Markdown 结构 observation 与 policy validation built-in Check 的临时计划，稳定事实由落地后的产品 owners承接。

## Why

当前产品没有基于 Markdown 语义的文档结构检查；仓库脚本的链接或格式校验也不能成为对外产品 contract。Vibe-coding 产生和改写的文档容易出现标题层级、H1、过长或过短 section/paragraph等问题，正则和整文件字符数既不稳定，也会把代码、表格和标记误作 prose。

## Outcome

Vibe Check 提供 stable `checkId = markdown-structure-validation` 的 built-in Check，使用 Product-owned GFM document boundary为 approved Markdown exact inputs生成 document/section/paragraph measurement records，并按 Project Definition 与 file policy中的结构规则生成独立 violation records。CheckResult只由该 Check 的完整领域结果决定，Core 不解释 Markdown、阈值或 heading semantics。

## Scope

纳入：

- GFM parsing、front matter / code / table / list / inline语义、source locations、document/section/paragraph prose projection。
- Unicode scalar `characters`、whitespace-delimited `words`、section nesting和稳定 subject identity。
- Document、section、paragraph的 min/max words/characters，以及 single H1、first heading H1、depth skip和maximum depth规则。
- 四个 record types、policy/neutral behavior、CheckResult、named-reference comparison、cache、输出、owner同步和测试证据。
- 一个可供 Markdown link Check复用、但不拥有任何 structure policy的内部 Markdown document boundary。

不纳入：formatting、自动修复、完整 Markdown lint规则集、链接目标验证、外链网络访问、HTML安全审计，以及把 parser package/AST类型暴露为 public policy。

## Success Criteria

- Check只处理 resolution批准且最终 policy enabled的 Markdown exact inputs；omitted、无输入、领域 violation与 execution failure分别保持正确 run/result语义。
- GFM、front matter、code/table/list和Unicode fixture得到固定 prose/heading事实；合规文档仍发布 measurement records，只有规则被违反时才发布 violation records。
- Subject/record identity不依赖 line、column、byte offset或 parser node ID；前置空行不制造新 identity，位置仍准确更新。
- Neutral definition执行 measurement但不启用阈值/heading violation；Project Definition和有序 file policy可完整、可解释地收紧具体 path政策。
- Owner docs、Check/Record output、test Cases、parser conformance、formal CLI和 workspace required verification全部同步并通过。

## Affected Owners

- `docs/architecture.md`：Markdown document boundary、Structure Check与Core/Output调用方向。
- `docs/configuration.md`：Project Definition built-in policy、neutral contribution和file-policy输入。
- `docs/scan-scope.md`：Markdown classification与exact inputs。
- `docs/output.md`：measurement/violation QualityRecords、catalog和定位信息。
- `docs/testing.md` 与 `docs/testing/cases/`：GFM、度量、规则、identity、comparison、cache和入口证据。
- `src/product/**`：parser adapter、Check binding、records和产品接线的唯一 runtime owner。
