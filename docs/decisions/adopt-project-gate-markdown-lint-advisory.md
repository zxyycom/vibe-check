---
title: 采用 Project Gate Markdown lint advisory
id: 260922-adopt-project-gate-markdown-lint-advisory
status: active
alignment: aligned
createdAt: 2026-09-22T17:33:12Z
purpose: 让 Gate 持续提供完整 Markdown lint evidence，并独立决定 Finding 是否阻断。
background: 首次接入时公开 lint 尚未用于本仓，docs/changes corpus 存在集中资源 Finding。
decision: Gate 以完整材料范围和 advisory policy 采用独立 markdown-lint。
tags:
  - configuration
  - repository-automation
  - workflow-policy
relations: []
---

## 目的

- 让本仓对自己的 Markdown materials 持续运行已交付的 lint，而不是只在 package consumer 中提供未被本仓验证的能力。
- 将完整 Finding、final data 和成本事实的收集与阻断策略分开；首次接入时不让已知 profile 资源噪声阻断日常 Gate。

## 背景

- `markdownLint` 的 package 默认 finding policy 是 non-blocking；此前的 `260915-provide-bounded-markdown-lint-check` 明确将 repository dogfood 留给后续独立 Change。
- 2026-09-22 从 `f87794df` 对完整 `docs/**/*.md` 和 `changes/**/*.md` corpus 的公开 API 基线读取 502 个 source、0 个 rejected input，在约 3.57 s 得到 59 条 Finding：43 条 `table-column-count`、16 条 `reference-links-images`，仅影响三个 investigation/resource source。
- 后续核对（2026-09-23）：将两份原样 profile 渲染转为 `.txt` 资源、补存原生采样并修正余下报告表格后，required Gate 的 503-source corpus 得到 0 条 Finding。此变化消除了形成时的噪声，不自动改变已采用的 `non-blocking` 策略。
- Project Gate 已有保守的 `repository-material` change region，覆盖全部 lint source 及其声明/实现输入；Markdown link validation 仍因未建模的反向 target 依赖而必须全量运行。

## 决策

- 采用: Project Gate 增加独立 `markdown-lint` identity，固定完整 `docs/**/*.md` 与 `changes/**/*.md` selection 以及当前八项默认规则；不启用 `link-fragments`，不改变 package backend、公共默认值、rules 或 cache。
- 采用: 此 repository Check 显式保持 `non-blocking`。lint Finding 以 owning Check 的 Records、消息和 final data 输出，但不使 Check 或 default strict aggregate failed；empty 与 unavailable 继续使用 Product-owned terminal semantics。
- 采用: `markdown-lint` 是 required、`materials` 和 `quality` 成员并声明 repository scan resource claim。required 只在 `repository-material` changed（或 Git evidence unavailable 的保守路径）执行，`--materials`、`--quality`、`--all` 始终 force；Markdown link validation 保持自身 full required/materials/quality/all path。
- 不采用: 在首次接入时静默排除 investigation/resource source、用规则/backend 修改消除 Findings、把 lint 与 link validation 合并，或同时提升为 blocking。任何 blocking threshold、scope exclusion、rule/backend 或 cache 改变均须经过独立 Change 和新的 corpus evidence。
