---
title: 保持格式感知 Check 能力彼此独立
status: active
alignment: aligned
createdAt: 2026-08-30T17:33:59Z
purpose: 让每项格式或风险能力拥有自己的输入、安全、证据与结算边界，不形成泛化非代码扫描层。
background: Markdown、路径、JSON、Schema、秘密和网络链接有不同风险，不能由一个最低共同 scanner 可靠承接。
decision: 已实现与未来格式能力都保持独立 Check；Core 只承接通用执行与可信结算。
tags:
  - product-contract
  - product-priority
relations:
  - type: 重划
    target: expand-format-aware-built-in-checks.md
---

## 目的

- 防止格式感知能力为了复用而退化成拥有含糊输入、权限和 Finding 语义的通用“非代码扫描器”。
- 让尚未实现的方向只有在真实消费者、风险证据和独立 owner 都明确时才进入当前产品基线。

## 背景

- JSON、JSON Schema 与 Markdown Link 已形成各自的 Product-provided Check；路径引用、秘密检测与网络链接仍具有不同的授权和失败语义。
- Run resolution、单一 Task graph 与 Core settlement 可以复用执行机制，但不能替 producing Check 判断领域 applicability、finding 或安全政策。

## 决策

- 采用: 每项格式或风险能力保持独立 Product-provided Check，由自身拥有合格输入、领域解析、权限、安全失败、QualityRecords 与结算政策。
- 采用: Run resolution、单一 Task graph 与 Core trusted settlement 只承接通用解析、调度和 terminal fact 关闭；Core 不拥有 capability completion、generic finding 或新的 coverage entity。
- 采用: 已实现的 JSON、JSON Schema 与 Markdown Link 继续由当前 owner 承接；路径引用、秘密检测、网络链接及其它未来能力只有在新的真实 consumer、风险证据或明确优先级下，才以独立决策和 Change 重新基线。
- 采用: Markdown Structure 不因与 Markdown Link 共享格式而恢复为当前方向；重新提出仍需独立用户结果。
- 不采用: shared parser registry、Check-to-Check handoff、Product-wide file policy、generic Record catalog，或把格式检查重新纳入通用代码指标。
