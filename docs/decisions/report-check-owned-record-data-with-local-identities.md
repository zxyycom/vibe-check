---
title: 让 Check 用局部 identity 提交 custom Record data
status: active
alignment: unaligned
createdAt: 2026-08-21T05:58:41Z
purpose: 让 arbitrary custom Check 通过最小 Record contract 提交自己的数据，而 Product 不建立字段类型系统。
background: Built-in finding/metric fields 不是所有 custom Checks 的共同义务，Product 只需 identity、canonical data 与生命周期边界。
decision: Check 提交 closed local ID 与 custom data；Core Record 只保留 checkId、id 和 data。
tags:
  - configuration
  - product-contract
relations:
  - type: 归并
    target: keep-record-field-shapes-at-the-type-boundary.md
  - type: 归并
    target: use-check-owned-extractors-for-opaque-record-identities.md
---

## 目的

- 让 Product-provided defaults 与 project-authored custom Checks 使用同一个不假设 file、finding、metric、comparison 或 presentation 的 Record contract。
- 让 producing Check 完整拥有 custom data shape 与 domain identity semantics，同时让 Product 保留安全 snapshot、ownership、conflict、lifecycle 和 publication责任。
- 避免为了多个 report 调用的可选复用需求建立 public Record generic、descriptor、Schema、catalog 或 identity extractor系统。

## 背景

- Reporter 已经由 owning Check scope 绑定 `checkId`；Check author 可以直接为每条领域事实提供 Check-local `id`。
- Repository summary、API health、performance sample、dependency fact 与 file finding 的 data shape、location、severity、message 和 comparison semantics稳定不同，不能从当前 built-ins 提炼为共同 Record fields。
- Product 的 named consumers 需要的是可归属、可判重、可安全保存的 Record fact；custom data 的 TypeScript shape 与业务约束没有独立 Product consumer。
- 用 `recordTypeId`、field descriptor、`identityFields` 或 `identify(fields)` 重建 identity，会把 Check-owned data semantics 升级成 Product contract，并要求 reference/machine 重放同一规则。

## 决策

- 采用：Public reporter 使用 `records.report({ id }, data)` 等效的两参数 contract。第一个参数是 closed Product-owned identity input；第二个参数是 producing Check 拥有的 non-array custom data object。
- 采用：`id` 是非空 Check-local author identity；Product 从 reporter scope 绑定 `checkId`，Core composite identity 是 `{ checkId, id }`。不同 Checks 可以使用相同 `id`，同一 Check 的 duplicate/conflict fail closed。
- 采用：Product 对 `data` 建立 detached、deep-frozen canonical JSON snapshot，拒绝 function、`undefined`、non-finite number、cycle、accessor、unsupported prototype 与 sparse array；它不验证 custom property、required、union 或业务 constraints。
- 采用：Core Record 只保留 `{ checkId, id, data }`。Machine consumer验证 composite identity、ownership、ordering 与 set integrity，不从 data 生成、hash 或重算 author identity。
- 采用：Check author 需要复用时使用自己的 local TypeScript interface、type、factory 或 `satisfies`；这些类型不进入 `defineCheck` generic、Definition、Core、machine schema 或 Product runtime dependency。
- 不采用：`CheckRecordType`、Record tuple generic、`recordTypes`、field descriptor/Schema、`identityFields`、`identify`、Product-generated opaque ID，或把 kind、level、subject、message、location 和 comparison semantics加入 base Record。
