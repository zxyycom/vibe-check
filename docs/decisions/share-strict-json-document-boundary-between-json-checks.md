---
title: 在 JSON sibling Checks 间共享 strict document boundary
status: active
alignment: aligned
createdAt: 2026-08-30T17:34:11Z
purpose: 让 JSON 与 JSON Schema Checks 共用严格文档解析边界，而不让任一 sibling 拥有另一项能力。
background: 两项 Check 都需要相同 strict JSON document fact，但各自拥有不同领域验证与 Record 语义。
decision: strict JSON document 是 package-private shared capability；JSON Checks 只拥有其领域投影。
tags:
  - product-contract
relations:
  - type: 拆分
    target: refine-project-run-and-settlement-owners.md
---

## 目的

- 只共享 JSON 与 JSON Schema 真正共同依赖的 strict document boundary。
- 保持两项 producing Check 的 applicability、validation、finding 与 settlement 独立。

## 背景

- Strict JSON parsing 同时服务 JSON grammar 与 JSON Schema validation；将其放入任一 Check 会造成 sibling ownership 倒置。
- 共同 document fact 不等于共享 Check lifecycle、Record catalog 或 public parser surface。

## 决策

- 采用: strict JSON document parsing 是 package-private shared capability，为 JSON 与 JSON Schema sibling Checks 提供同一严格、可判别的 document boundary。
- 采用: `jsonValidation` 与 `jsonSchemaValidation` 分别拥有自己的输入适用性、领域验证、safe evidence、QualityRecords 与 terminal settlement；任一 Check 都不拥有 sibling。
- 采用: shared boundary 只返回两项消费者共同需要的 document success/failure facts，不建立 public JSON model、generic parser registry 或跨 Check handoff。
- 不采用: 重复实现不同 strict parser，或把 JSON Schema engine、Schema reference policy 与 JSON grammar 合并为一个 Check。
