---
title: 在首次公开发布前完成四项选定的首版 Checks
status: active
alignment: unaligned
createdAt: 2026-08-24T14:01:40Z
purpose: 让首次公开 package 交付可验证的本地引用完整性与其它高价值、低风险能力，而不把 Markdown 标题偏好伪装成通用有效性。
background: 用户已明确取消 Markdown Structure Check；保留 Link、JSON、JSON Schema 与 maintenance reminders 的首版方向。
decision: 首次公开发布前完成四项独立 ordinary Checks，Markdown Link 独立拥有最小 private parser adapter，Structure 不再是发布前置。
tags:
  - product-contract
  - product-priority
relations:
  - type: 修订
    target: complete-first-release-check-set-before-publication.md
---

## 目的

- 让首次公开 package 除现有代码指标外，提供严格 JSON、离线 JSON Schema、离线 Markdown 本地引用完整性和维护提醒四项直接可用能力。
- 将首版发布门槛聚焦于可由项目内容或 Git 历史直接证伪、且具有明确产品结果的风险，不把标题结构偏好称为 Markdown 有效性。
- 在公开发布前重新生成并验证包含四项能力的 exact package candidate、公共说明与 Project Gate 消费证据。

## 背景

- 当前 Product 已有 ordinary Check values、closed options、four-state final result、Check-local supplemental Records、terminal messages、`attention` visibility 与统一 Run scheduling。
- 严格 JSON、显式离线 JSON Schema 与离线本地 file/anchor links 都能使用当前 global scope 和 producing Check 边界完成，不需要网络权限或新的 Core entity。
- Markdown 标题的 H1、层级和深度规则是项目或渲染目标的 policy，不是纯文本 Markdown 的普遍有效性；当前没有足以证明将其作为首版默认 Check 的独立用户结果。
- Markdown Link 的本地 target/anchor 完整性可由实际文档内容证伪。它独立拥有只服务于 occurrence、heading/anchor 和 source range 的最小 private parser adapter，不依赖 Structure Check、共享运行结果或公共 Markdown model。
- Maintenance reminders 采用已确认的专用 `maintenanceReminders(entries)` constructor；它只生成一个 fixed-ID ordinary Check，并把 Git history、failure folding 和 identity 保持为该 Check 的局部语义，而不增加 generic factory API。
- 文本路径引用仍有 segmentation 和误报边界；网络链接涉及 SSRF 与 credential material；秘密检测涉及泄露、漏报与 detector provenance；Lizard 迁移主要改善内部依赖。这些成本仍不适合作为首次公开发布前置。

## 决策

- 采用: 在首次公开发布 `vibe-check` 前完成并验证三项 Product-provided ordinary Check values：`jsonValidation`、`jsonSchemaValidation` 与 `markdownLinkValidation`；`maintenanceReminders(entries)` 是生成第四项独立 ordinary Check 的唯一专用 constructor。
- 采用: Markdown Link 只做离线本地文件、目录（若其选项契约确认）与锚点引用完整性验证；它独立拥有最小 package-private parser adapter，不建立 shared parser registry、Check-to-Check handoff 或 public Markdown model。
- 采用: Markdown Structure Check 不再属于首版发布门槛，也不保留 active Change。未来只有出现独立、可证明的用户结果时，才可重新提出新的 Change 并重新评审其 policy、parser reuse 与 public contract。
- 采用: `maintenanceReminders(entries)` 创建一个 fixed-ID executable Check；项目可在构造后通过 native object composition 替换其 closed options，但不增加 generic factory、第二 Check family 或 reminder-level Check/Record identity。
- 采用: 每条 reminder 使用 immutable full commit object ID 与 first-parent history 度量 commits 和累计 changed lines；超过配置上限的 advisory reminder 保留完整 assessment 并附加 warning，enforcing reminder 还附加 error 并使 owning Check failed。Git 或历史无法完成度量时形成 entry-local unavailable assessment，不伪造 clean assessment；只有无法形成完整可信 payload 的边界才使整个 Check unavailable。
- 采用: JSON Schema 只使用显式离线 registry/bindings；各 Check 不建立 shared file-policy、comparison/reference 或通用 Record catalog。
- 采用: 四项能力完成后，重新生成 exact package candidate，更新 public declarations、README/API guide、runtime dependencies、license 与 semantic Cases，并通过 required/full Project Gate 后才进入公开发布准备。
- 采用: `path-reference-validation`、`network-link-validation`、`secret-detection` 与 Lizard TypeScript migration 继续保留为首版后方向；只有新的真实 consumer、风险证据或明确优先级才恢复实施，不以其 active Change 状态阻塞首次公开发布。
- 不采用: 为赶首版降低 network/secret 安全边界、恢复 Product-wide file-policy resolver、把 reminder entry 提升为全局 Check/Record，或把 Markdown 标题规则当作无需消费者证据的通用 default Check。
