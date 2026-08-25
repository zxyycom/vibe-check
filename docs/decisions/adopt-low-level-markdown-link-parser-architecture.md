---
title: 为 Markdown Link Check 采用低层 parser 与 Link-owned resolver
status: active
alignment: aligned
createdAt: 2026-08-25T05:49:49Z
purpose: 以可控的依赖和私有解析边界实现离线 Markdown Link Check，而不引入 Git、CLI、crawler 或公共 Markdown 模型。
background: 用户在审阅库调查后确认采用现成 parser/slug 加 Link-owned resolver 的路线，并要求避免不必要的实现或使用复杂度。
decision: Link 以低层 parser/slugger 生成私有 facts，target authorization 与安全语义仍由 Check 自己拥有。
tags:
  - dependency-policy
  - product-contract
relations: []
---

## 目的

- 让 `markdownLinkValidation` 以成熟 Markdown 语法实现取得受支持 occurrence、heading 和 source-range facts，同时不把 parser、AST 或 renderer pipeline 暴露给 Product consumer。
- 将 filesystem target authorization、root-external mode、directory、symlink、safe Record projection 与 zero-network 保留为 Link Check 的明确责任，而不是与第三方 validator 的默认行为对抗。
- 控制首版的依赖与使用复杂度：consumer 只组合 ordinary Check 及其 closed options，不需要调用 Git、CLI、crawler、unified pipeline 或 Markdown AST API。

## 背景

- [离线 Markdown Link Check 的本地目标边界](define-offline-markdown-link-target-boundaries.md) 已确认 source exact scope、direct-only target resolution、root 外 `ignore | report | validate`、directory 和 GitHub-priority anchor 的长期边界。
- [Markdown Link Validation 库策略与可实施难度](../investigations/implementation-libraries/markdown-link-validation-library-strategy.md) 的临时 Bun experiment 和一手资料表明，低层 mdast/micromark 组合能提供所需 AST facts；`remark-validate-links` 的 Git discovery / child-process 行为和 Node API 跨文件 heading 限制不适合作为 Product core。
- 用户已确认“现成 parser/slug + Link-owned resolver”方向。此确认不等于依赖已经安装、版本已接受或 Check 已实现；这些仍需 Change 的 Readiness 与 implementation evidence 闭合。

## 决策

- 采用：Link 的 package-private parser adapter 以 `mdast-util-from-markdown` 为入口，并按实际支持语法组合必要的 micromark/mdast GFM 与 front matter extensions；它将 dependency AST 收敛为 Link 所需的 immutable occurrence、definition、heading/slug input 和明确 range facts。
- 采用：同一 private adapter 使用 `github-slugger` 作为 GitHub-priority heading slug 的候选实现。Product fixture corpus，而非任何库的未验证边缘行为，仍是 anchor compatibility 的权威；不承诺自动兼容所有 renderer。
- 采用：所有 target decode/classification、filesystem I/O、source-vs-target boundary、root-external authorization、realpath/symlink handling、directory one-entry policy、limits、unavailable folding 和 safe output 继续由 Link-owned resolver 实现。parser 只接收已获授权读取的 source/eligible anchor target bytes，不能发现文件、调用 Git/child process、发起网络或递归扫描。
- 采用：public API 继续只暴露 `markdownLinkValidation` 和其 closed options；不公开 AST、parser configuration、generic resolver、cross-Check snapshot 或 shared Markdown model。
- 不采用：`remark-validate-links` 作为完整 Product validator；完整 unified/remark pipeline、`markdown-it` 或网络/crawler 型 checker 作为首版默认 runtime。未来若出现独立的 Markdown transform consumer 或新的兼容性证据，必须以新 Decision 重新评审这一选择。
- 约束：精确 production semver、最小 extension set、传递 dependency/license/security audit、Bun installed-consumer evidence、source-range contract 与 GitHub-priority fixture corpus在实际依赖变更前由 Link Change 的 L4/L5 闭合；本 Decision 不授权跳过这些门禁。
