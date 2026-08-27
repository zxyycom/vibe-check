# Proposal

本 Draft 保留显式 HTML link-bearing attribute 的本地引用校验方向，但当前不进入实现或首次公开发布范围。

## Why

当前 `markdownLinkValidation` 只拥有 Markdown parser 识别的 link、image、reference 与 autolink occurrence，明确忽略 `<a href="docs/a.md">` 这类 raw HTML attribute。HTML attribute 比普通 prose path 具有更清楚的语法与用户意图，未来可能值得校验；但 HTML source、embedded raw HTML、attribute 集合、base URL、fragment 与 malformed markup 都有独立语义，不能静默扩展现有 Markdown Link Check。

## Outcome

在真实 consumer 与 corpus 明确 source kinds、supported attributes 和本地 target 语义后，Package 可提供独立的 format-aware HTML link validation Check：只处理 owning Check 明确支持的 HTML occurrences，验证有界 direct local target，保持与 Markdown Link occurrence owner 互斥，不访问网络，并只发布安全 Records 与四态结果。
