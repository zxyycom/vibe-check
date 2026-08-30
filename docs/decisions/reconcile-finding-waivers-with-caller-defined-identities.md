---
title: 用调用方定义的身份对账质量 Finding 豁免
status: active
alignment: aligned
createdAt: 2026-08-30T14:43:38Z
purpose: 让质量 Finding 的例外既保留原始证据和理由，又可审计失效或过宽的豁免配置。
background: 决策形成前的路径 glob 排除会在扫描前抹去 Finding，且 Core Record ID 不是所有 Check 都可稳定预测或适合作为豁免键。
decision: 提供独立泛型 helper，按调用方从完整 Finding 投影出的结构化身份批量对账 waiver，并由采用它的 Check 自行发布和结算结果。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: exclude-byte-preserved-historical-v2-schema-from-repository-file-metrics.md
---

## 目的

- 让经过允许的质量 Finding 仍作为可检查证据出现，并直接附带其豁免理由，而不是在 file collection 或 scanner 前静默消失。
- 让调用方为其 Finding 定义稳定的语义身份，避免将 Core Record ID、行号或其它实现细节误当作通用豁免键。
- 让未使用或过宽匹配的 waiver 形成可行动的审计结果，防止配置长期漂移。

## 背景

- 决策形成前，repository-private file-metrics 通过 path exclusion 跳过必须保持 bytes 的历史 v2 run schema；这保护了材料，但不保留该路径实际触发的 SCC finding 和例外理由。
- 不同 Check 的 Finding 具有不同的稳定语义字段。可由调用方从完整 Finding 投影出 path、函数名、metric 等结构化 identity，不能假设 `{ checkId, id }` 对所有场景稳定、可预测或适合 authoring。
- Core、Run、Gate 和普通 Record 不认识某个 Check 的 Finding 语义或 waiver 对其状态的影响；把对账逻辑提升为 Core 特殊机制会错误扩大产品契约。

## 决策

- 采用: 提供公开、独立且泛型的 finding-waiver reconciliation helper。它接收完整 Finding 集合、调用方提供的 `identify(finding)` 语义投影，以及带结构化 identity 和 reason 的 waiver 集合；helper 对 identity 执行规范结构比较，不读取或要求 Core Record ID。
- 采用: helper 在完整 candidate 集合上批量对账。每个 waiver 匹配零条 Finding 时产生 `unused` audit；恰好一条时产生 `waived` disposition；多条时产生 `overmatched` audit，并且默认不豁免这些 Finding，避免宽泛 identity 意外消除多个问题。
- 采用: helper 只返回 reconciliation result 与 audit，不发布 Record、不决定 Check status、不渲染终端输出，也不认识 Gate、scanner 或任意 Check ID。每个采用它的 Check 保持自己的 finding、Record、message、计数和结算政策。
- 采用: 首个采用者是 repository file-metrics：保留 SCC 对历史 v2 run schema 的 measurement/finding，并通过稳定的 path + metric identity 显示保留 bytes/URN 的 waiver reason；替换现有 Gate `schemas-examples` glob exclusion，不扩大到其它历史材料或 Checks。
