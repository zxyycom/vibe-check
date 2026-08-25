---
title: 将未定义 Markdown reference 排除在 Link Check 之外
status: active
alignment: unaligned
createdAt: 2026-08-25T05:56:52Z
purpose: 让离线 Link Check 只验证可解析的本地引用完整性，不把缺失 reference definition 扩展为 Markdown 语法或风格校验。
background: 用户取消通用 Markdown Structure Check；parser audit 确认未定义 reference 不会成为 AST link occurrence。
decision: Link 只处理 parser 产出的已解析 occurrence，未定义 reference 保持不报告，未来 syntax lint 需要独立消费者与 Change。
tags:
  - product-contract
relations: []
---

## 目的

- 保持 `markdownLinkValidation` 的结果含义为本机 target/anchor integrity，而不是泛化的 Markdown 有效性、reference-definition completeness 或文档风格。
- 让 parser adapter 的 occurrence 边界可复现：只从 AST 的语义 link/image/reference facts 投影，不用正则或二次扫描把普通文本重新解释为 link syntax。

## 背景

- 用户已明确取消 Markdown Structure Check；当前 Link Change 的非目标是不判定 Markdown 文本是否“语法有效”。
- 在 2026-08-25 的临时 Bun 1.3.14 fixture 中，`mdast-util-from-markdown` 配合当前 GFM/front matter candidates 会把未定义的 `[label][missing]` 保留为 text，而带 definition 的 reference 产出 `linkReference` 与 `definition` facts。该行为也与 [Markdown Link Validation 库策略与可实施难度](../investigations/implementation-libraries/markdown-link-validation-library-strategy.md) 的候选比较一致。
- 为保留未定义 reference，需要另行做语法级 token/文本识别；这会扩大 Link 的职责，并和当前取消的 generic Markdown validation 方向冲突。

## 决策

- 采用：Link Check 只验证 parser 已识别的 inline link、image、explicit autolink、选定 GFM autolink literal，以及能绑定 local definition 的 reference occurrence；definition target 由 Link 的 private adapter 解析并投影。
- 采用：未定义、collapsed 或 shortcut reference 若 parser 没有产出语义 occurrence，就不形成 Link issue、Record、count 或 unavailable；它们保持普通 Markdown text 的现有语义。
- 采用：Link fixtures 必须证明已定义 reference 会进入 target validation，未定义 reference 不会被二次提取；这两个结果不依赖 code/HTML/prose exclusion 的偶然实现。
- 不采用：在 Link Check 中通过 raw text、正则或 parser 私有 token hack 检测未定义 reference，或把其报告为 missing local target。
- 未来：若出现独立、可证明的用户结果需要检查 undefined reference definitions，应建立单独的 Markdown syntax/lint Change，并重新评审 grammar、public结果与 parser reuse。
