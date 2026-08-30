---
title: 首次公开发布前保持四项首版 Check 能力
status: active
alignment: aligned
createdAt: 2026-08-30T17:33:59Z
purpose: 固定首发四项已选能力，并让 Markdown Structure 只在出现新的独立用户证据后重新评审。
background: 既有记录对首发 Check 数量互相冲突，并把已取消与已实现方向混在同一生命周期中。
decision: 首发只要求 JSON、JSON Schema、Markdown Link 与 maintenance reminders 四项能力。
tags:
  - product-contract
  - product-priority
relations:
  - type: 重划
    target: allow-controlled-json-schema-reference-sources.md
  - type: 重划
    target: complete-first-release-check-set-without-markdown-structure.md
---

## 目的

- 让首次公开 package 的 Check 集只有一个可核对数量，不再同时存在四项与五项首发要求。
- 保留已经具有当前实现和消费者价值的四项能力，不把已取消的 Markdown 标题偏好恢复成发布门槛。

## 背景

- 当前 package 已提供 `jsonValidation`、`jsonSchemaValidation`、`markdownLinkValidation` 三项 ordinary Check values，以及生成第四项 ordinary Check 的 `maintenanceReminders(entries)` constructor。
- Markdown Structure 曾被列入五项首发集合，后来因缺少独立用户结果而明确取消；继续保留相反的 active 方向会让发布验收无法恢复唯一基线。
- JSON Schema reference policy 和其它未来格式能力各自具有独立安全与 owner 边界，应由单独决策承接。

## 决策

- 采用: 首次公开发布前完成并验证 `jsonValidation`、`jsonSchemaValidation`、`markdownLinkValidation` 与 `maintenanceReminders(entries)` 形成的四项独立 ordinary Check 能力。
- 采用: `maintenanceReminders(entries)` 保持 fixed-ID executable Check constructor；项目通过 native object composition 替换其 closed options，不建立 generic factory、第二 Check family 或 reminder-level Check/Record identity。
- 采用: 每条 reminder 使用 immutable full commit object ID 与 first-parent history 度量 commits 和累计 changed lines；超过上限时保留完整 assessment，Git 或历史不可用时不伪造 clean assessment。
- 采用: Markdown Structure 不属于首发门槛，也不作为当前活动产品方向；只有新的、独立且可证明的用户结果出现时，才以新决策重新评审其 policy、parser reuse 与 public contract。
- 不采用: 把 Markdown 标题规则当作无需消费者证据的通用 default Check，或用未实现的未来能力扩大首发验收集合。
