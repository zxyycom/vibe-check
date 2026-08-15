---
title: 公开单一 Check authoring surface
status: active
alignment: unaligned
createdAt: 2026-08-15T15:38:42Z
purpose: 让 package 以同一种 Check value 暴露 Product 预先提供和项目提供的 Check，并只保留一个产品执行入口。
background: 来源专属 helper、固定 exports 和 checkId lookup 会把 value source 变成 public/runtime variant。
decision: package 公开单一 Check surface 与 Product 预先提供的 values；派生 names/inventory 待确认，runtime 不按来源选择 binding。
relations:
  - type: 替代
    target: product-contract/expose-built-in-check-values-and-adjustment-functions.md
---

## 目的

- 让 package consumer 用同一个 `Check` contract author、组合和派生 Product 预先提供或项目提供的 Check，而不用选择来源专属 public type、不同 binding protocol 或 API。
- 保持 Product Run 作为唯一执行入口，同时让非执行的 Check value derivation 有明确而未过早命名的 public boundary。

## 背景

- Product 可以预先提供可直接使用的 Check values，但预先提供不应把它们塑造成另一种 data type、private binding carrier 或 `checkId`-driven runtime lookup key。
- 既有的 helper count 和名称来自来源专属 adjustment 方向；single-Check derivation 与 recursive composition 的最终 helper spelling 尚未确认。
- public contract 需要同时避免泄漏 Core/scheduler/binding internals，和以来源 special case 再建第二个 execution entry。

## 决策

- 采用: package 的 authoring surface 只使用 `Check` public type。Product 预先提供的 values 与项目提供的 values 都是普通 Check，可进入 Project Definition、作为 base 派生并通过同一 trusted construction/binding handoff 进入 normalization/resolution；runtime 不按 Check 来源、`kind`、`checkId` 或 public value identity 选择 binding。
- 采用: package 可以公开 Product 预先准备的 ordinary Check values，例如当前的 duplicate detection、file metrics 与 function metrics defaults；它们表达 Product 对默认 implementation/options 的 ownership，不表达不同的 tree、derivation、execution 或 binding semantics。
- 采用: Project Definition construction 只形成 typed value，Product Run 保持唯一执行产品工作的 public operation。Check derivation 只返回新的 Check value、不运行 Product、不注册 global state，也不形成第二 execution entry。
- 采用: helper 的具体 public symbols、参数/object spelling、callable count 与 exact export inventory 由 publication naming decision 在发布前逐项确认；当前不承诺具体 helper name、callable count 或 export inventory。
- 采用: 必要 public types 可以支持 Check construction、base-value derivation、Project Definition、Run 和结果消费，但不得泄漏 trusted binding handoff、Core、scheduler、Task、host implementation 或 internal module paths。
- 不采用: 来源专属 public variant、`checkId` binding lookup、额外 execution entry，或 mutable registration/derivation API。
