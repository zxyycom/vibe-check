---
title: 提供闭合规则的 Markdown lint Check
id: 260915-provide-bounded-markdown-lint-check
status: active
alignment: aligned
createdAt: 2026-09-15T03:16:48Z
purpose: 让 package consumer 以闭合高信号规则、受控输入和稳定结果运行 Markdown lint。
background: 现有 Markdown Link 只验证本地引用完整性，结构与明确内容缺陷仍缺少随包 Check。
decision: 新增独立 markdownLint，固定九项规则与私有 backend，并保持 package advisory 与 Gate 分离。
tags:
  - configuration
  - dependency-policy
  - product-contract
  - product-priority
relations: []
---

## 目的

- 让 package consumer 直接组合 Markdown 结构与明确内容缺陷检查，不必自行建立第三方配置、文件授权和
  结果转换。
- 让公共规则、诊断和结算保持 Product-owned，使 backend 升级不会自动改变 consumer contract。

## 背景

- `markdownLinkValidation` 已拥有本地 target 与 anchor 完整性；未定义 reference、标题层级、围栏语言、
  图片替代文本和表格列数属于独立 lint 结果。
- [`survey-markdown-lint-tools.md`](../investigations/survey-markdown-lint-tools.md) 与 installed-consumer spike 证明
  `markdownlint@0.41.1` 可通过 Node ESM Promise subpath 接收内存 strings，并返回带一基位置的结构化 Finding。
- Package 质量 Finding 默认提供 advisory evidence；Project Gate 的 blocking policy 和 selection 由
  repository owner 独立决定。

## 决策

- 采用: 从 package root 提供 `markdownLint(options?)` ordinary Check，并由独立 Markdown lint owner 承接
  输入、规则、资源、Records、消息、final data 与四态结算。
- 采用: v1 提供九个 Product 语义规则名，其中八项构成默认集，`link-fragments` 只由 consumer 显式选择；
  `rules` 是非空、闭合、完整替换的列表，不公开 backend preset、tag、rule object 或 parser 配置。
- 采用: 固定使用 MIT 许可的 `markdownlint@0.41.1` Promise `strings` API。Product 传入 exact authorized
  UTF-8 Markdown、固定 front matter 与 inline-config policy，验证 backend 结果后只发布 project-relative path、
  公共规则名和安全 range。
- 采用: 单文件 bytes、全次 Findings 和 cancellation 采用有界策略；读取、解码、limit、backend 或 protocol
  无法形成完整可信结果时结算为 `unavailable`，不发布 partial lint Findings。
- 采用: Consumer 省略 `findingPolicy` 时 lint Finding 为 `non-blocking`；显式 `blocking` 由 owning Check 结算。
  当前 Project Gate 不选择本 Check，后续 repository dogfood 以独立 Change 评审 corpus、exclusions、迁移和
  preset membership。
- 采用: 首版按稳定顺序逐文件执行且不持久化 cache；缓存 identity、收益门槛和 failure fallback 由后续
  Markdown lint cache Change 决定。
