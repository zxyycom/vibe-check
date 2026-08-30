---
title: 提供泛型 Finding waiver 对账能力
status: active
alignment: aligned
createdAt: 2026-08-30T17:34:10Z
purpose: 让调用方按结构化语义身份对完整 Finding 集合审计 waiver，而不依赖 Core Record ID。
background: 扫描前排除会丢失证据，Record ID 又不是所有 Check 都能稳定预测的通用 waiver identity。
decision: public helper 对 caller-defined identity 批量对账 zero、one 与 many matches。
tags:
  - configuration
  - product-contract
relations:
  - type: 拆分
    target: reconcile-finding-waivers-with-caller-defined-identities.md
---

## 目的

- 让 custom 与 Product-provided Checks 在保留原 Finding 的前提下，共用一套可审计的 waiver reconciliation。
- 让 helper 只负责 identity matching，不成为 Record、Check status、Gate 或 rendering owner。

## 背景

- 不同 Check 的稳定 Finding identity 由各自领域语义决定；把 Core Record ID 或路径 glob 固化为通用键会丢失适用性或原始证据。
- Waiver 必须在完整 candidate 集合形成后对账，才能区分已应用、已失效和过宽配置。

## 决策

- 采用: package root 提供独立泛型 helper，接收完整 Finding 集合、调用方 `identify(finding)` 投影和带结构化 identity 与非空 reason 的 waivers；按 canonical JSON 结构而非对象引用或 Core Record ID 匹配。
- 采用: 每项 waiver 匹配零条时产生 `unused` audit；恰好一条时 audit 状态为 `applied`，对应 Finding disposition 为 `waived`；多条时产生 `overmatched` audit，且不豁免任何匹配 Finding。
- 采用: helper 保留 Finding 顺序与原引用，安全 materialize waiver evidence，并拒绝重复、malformed、noncanonical 或 hostile authoring。
- 采用: helper 只返回 reconciliation result 与 audit；不发布 Record、决定 Check status、渲染输出，也不认识 Gate、scanner 或 Check ID。采用者自行拥有其 finding、message、计数和结算政策。
- 不采用: 扫描前 glob exclusion、隐式丢弃 unmatched waiver，或把 generic helper 升格为新的 Core finding owner。
