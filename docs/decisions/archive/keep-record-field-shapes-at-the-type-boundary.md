---
title: 让 Record field shape 保持在 Check 类型边界
status: archived
alignment: unaligned
createdAt: 2026-08-21T03:35:53Z
purpose: 让 Check author 获得精确 Record 类型，而 Product runtime 不维护没有独立消费者的字段 Schema。
background: Record field descriptor 重复表达 TypeScript shape，现有 Product consumers 只需要 canonical JSON 与少量显式领域约束。
decision: Record field shape 只由 Check-owned TypeScript generic 表达；runtime 与 machine 仅接收 canonical JSON。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让一个 Check 的多个 Record variants 在 `defineCheck(...)` callback 中获得精确、可判别的 report 与 reference 类型。
- 避免 Product 为 TypeScript 已拥有的 custom field shape 再维护 descriptor、Schema vocabulary、per-type runtime validator 与 machine catalog projection。
- 让 runtime validation 只覆盖 Product 在类型擦除后仍真正拥有的安全、身份和领域边界。

## 背景

- 当前 `{ fieldId, valueType, required }[]` descriptor 没有直接生成 callback reporter type，却要求 Project author 与 Product validator 重复维护同一字段关系。
- Record fields 进入 Core 和 machine 时需要的是实际 canonical JSON object，而不是完整 authoring type；现有 annotation consumer 也不解释 custom field shape。
- Identity 可以由 Check-owned typed extractor 生成，policy 只消费显式声明的 scalar operand；两者都不要求 Product 固定整个 fields object。
- TypeBox 继续适合实现 Product-owned fixed machine schema，但这不构成把 vendor Schema 暴露为 Record authoring contract 的理由。

## 决策

- 采用：Public authoring 以 `CheckRecordType<RecordTypeId, Fields>` 等效的 type-only generic 表达 Record variant，并由 `defineCheck<[...]>` 把 catalog relation 投影到 report/reference contextual types 与 published declarations。
- 采用：`Fields` 可以使用普通 TypeScript object、optional property、literal、union、array 与 nested object；不要求 author 同时提供 descriptor、TypeBox Schema、JSON Schema 或其它 runtime shape declaration。
- 采用：Product runtime 只安全 materialize 并冻结 non-array canonical JSON object，拒绝不能稳定 hash 或发布的 function、`undefined`、non-finite number、cycle、accessor、unsupported prototype 与 sparse array；它不验证 erased required/property/union/constraint semantics。
- 采用：Policy field operand 继续以显式 metadata 公开，但 typed authoring 约束可引用的 scalar-compatible key；runtime 与 machine 只验证实际读取值与声明 scalar type，不借此重建其它 field shape。
- 采用：Machine Record schema 把 `fields` 作为 generic canonical JSON object；固定 TypeBox/Ajv schemas 属于 machine implementation 与 contract evidence，不进入 public Record type。
- 不采用：为 JavaScript、`any` 或 dynamic custom Check 恢复第二份 field Schema。绕过 compiler 的 Check 拥有自己的 field semantics，Product 只保护自己实际消费和公开的边界。
