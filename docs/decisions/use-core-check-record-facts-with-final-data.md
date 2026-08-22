---
title: 使用含 final data 的 Core Check 与 minimal Record facts
status: active
alignment: aligned
createdAt: 2026-08-21T15:02:45Z
purpose: 让 Run resolution 形成只包含四态 Check final facts 与 minimal Record facts 的两实体 Core snapshot。
background: Core 的 Check outcome 仍使用已退休的双层终态表示，且 Record 保留了不属于最小 Check-local contract 的类型与字段模型。
decision: 保留 Run resolution 与 two-entity Core，修订 Check 为四态 final data、Record 为 checkId/id/data。
tags:
  - product-contract
relations:
  - type: 修订
    target: use-core-check-and-record-facts-from-run-resolution.md
---

## 目的

- 保留 Definition normalization、Run pre-work resolution 与 Core registration 的既有 owner 边界。
- 让每个 resolved executable Check 产生一个完整的四态 Core fact，并让 Record 继续独立于 Check outcome。
- 让 completed Run facts 成为 consumers 读取 canonical Checks 和 Records 的唯一基础，而不内建 multi-Check evaluator。

## 背景

- 一个 resolved Check 仍可以没有 Records，而已接受的 Record 也可以先于其 Check 的后续 unavailable settlement 成立；二者必须保留为独立事实。
- Check 的 primary data 与 supplemental Record data 都需要相同的 canonical JSON snapshot，而已退休的双层 outcome 表示和 Record type/opaque identity 不再表达当前契约。
- Core snapshot 需要稳定的两实体边界；聚合是按 invocation 配置从 settled Check statuses 得到的 derived Run result，而不是第三种 Core entity。

## 决策

- 采用：Definition 只形成 canonical Normalized Checks，Package Run pre-work 对每项只 resolution 一次；每个 resolved executable Check 在 Core snapshot 中恰有一个 Core Check，不为 container 或未选择的 leaf 生成事实。
- 采用：Core Check 的 outcome 是 `passed(data)`、`failed(data)`、`not-applicable(reason?)` 或 `unavailable(reason)`；通过/失败的 final data 与 Record data 都是 detached、deep-frozen canonical JSON object。
- 采用：Core Record 固定为 `{ checkId, id, data }`。`id` 只在 owning Check 内唯一，Product 以结构性 `{ checkId, id }` 建立 ownership 和重复检测；不同 Checks 可以重用相同 local ID。
- 采用：最终 Core snapshot 的 entity collections 恰为 `checks` 与 `records`。completed/effect Run facts 始终保留这两组 raw facts；是否产生 aggregate 只由显式 Run Controls 决定。
- 不采用：`checkRunId`、Record type identity、Product-generated opaque Record ID、catalog/field projection、由 Records 推断 Check status，或 completeness/integrity/aggregate 第三实体集合。
