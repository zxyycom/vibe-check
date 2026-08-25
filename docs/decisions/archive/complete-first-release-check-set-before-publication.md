---
title: 在首次公开发布前完成选定的首版 Checks
status: archived
alignment: unaligned
createdAt: 2026-08-24T10:06:12Z
purpose: 让首次公开 package 同时交付确定性格式检查与低样板的维护提醒能力。
background: 四项离线格式 Check 已进入首版计划，用户进一步确认 maintenance reminders 也应提前，而高风险能力继续后置。
decision: 首版前完成四项离线格式 Checks 与 ordinary maintenanceReminders value，并重新闭合 package 和 Gate 证据。
tags:
  - product-contract
  - product-priority
relations: []
---

## 目的

- 让首次公开 package 除现有代码指标外，提供严格 JSON、离线 JSON Schema、Markdown 标题结构、本地链接以及维护提醒五项直接可用能力。
- 让首版范围继续服从当前 ordinary Check、Check-owned options、最小 Record、terminal messages 与显式 aggregation边界。
- 在公开发布前重新生成并验证包含这五项能力的 exact package candidate、公共说明与 Project Gate消费证据。

## 背景

- 当前 Product已有 ordinary Check values、closed options、four-state final result、Check-local supplemental Records、terminal messages、`attention` visibility与统一 Run scheduling。
- 严格 JSON、显式离线 JSON Schema、Markdown heading structure和本地 file/anchor links都能使用当前 global scope与 producing Check边界完成，不需要网络权限或新的 Core entity。
- Maintenance reminders原 Draft选择专用 constructor，并留下 Git history、failure folding和 identity问题；同一用户结果可以由一个 ordinary default Check value及其完整 options直接承接，从而避免扩展 factory API。
- 文本路径引用仍有 segmentation和误报边界；网络链接涉及 SSRF与 credential material；秘密检测涉及泄露、漏报与 detector provenance；Lizard迁移主要改善内部依赖。这些成本仍不适合作为首次公开发布前置。

## 决策

- 采用: 在首次公开发布 `vibe-check` 前完成并验证五项 Product-provided ordinary Check values：`jsonValidation`、`jsonSchemaValidation`、`markdownStructureValidation`、`markdownLinkValidation` 与 `maintenanceReminders`。
- 采用: Maintenance reminders保持一个 fixed-ID executable Check；项目通过 native object composition替换其 closed options，不增加 constructor、factory、第二 Check family或 reminder-level Check/Record identity。
- 采用: 每条 reminder使用 immutable full commit object ID与 first-parent history度量 commits和累计 changed lines；超过配置上限的 advisory reminder只附加 terminal message，enforcing reminder还使 owning Check failed。Git或历史无法完成度量时 Check返回 unavailable，不伪造 clean assessment。
- 采用: 首版 Markdown structure只承接确定性标题规则；Markdown link只做离线本地文件与锚点验证；JSON Schema只使用显式离线 registry/bindings；各 Check不建立 shared file-policy、comparison/reference或通用 Record catalog。
- 采用: 五项能力完成后，重新生成 exact package candidate，更新 public declarations、README/API guide、runtime dependencies、license与 semantic Cases，并通过 required/full Project Gate后才进入公开发布准备。
- 采用: `path-reference-validation`、`network-link-validation`、`secret-detection` 与 Lizard TypeScript migration继续保留为首版后方向；只有新的真实 consumer、风险证据或明确优先级才恢复实施，不以其 active Change状态阻塞首次公开发布。
- 不采用: 为赶首版降低 network/secret安全边界、恢复 Product-wide file-policy resolver、把 reminder entry提升为全局 Check/Record，或把旧 Change的 Readiness当作当前实现证据。
