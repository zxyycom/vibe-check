---
title: 使用基于 Check 值的派生契约
status: archived
alignment: unaligned
createdAt: 2026-08-15T15:38:33Z
purpose: 让所有 Check 都能从明确 base Check 值以字段 owner 规则派生新值，而不按来源分裂 adjustment 能力。
background: 来源专属 helper 和 checkId lookup 把 Product 预先提供的 defaults 误塑成另一种 Check，无法承载统一 composition。
decision: 所有 Check 共享 base-value derivation 与 binding-preservation；字段闭合且各自 owner，helper 名称留待 publication 前确认。
tags:
  - configuration
relations:
  - type: 替代
    target: use-standalone-built-in-check-adjustment-functions.md
---

## 目的

- 让 Product 预先提供的 Check value 与项目提供的 Check value 都能作为明确 base 值，以同一套非突变、字段感知规则派生新的 Check。
- 保持 field semantics、trusted construction/binding handoff 和完整 Project Definition validation 各有 owner，不用来源 special case、object method 或 generic deep merge 拼接它们。

## 背景

- Product 预先提供的 defaults 只是 Check value 的获取方式；把派生能力限制为某一来源，或让 Runtime 再由 `checkId` lookup binding，都会把来源变成 public/runtime variant。
- scalar、fixed object、open map、set-like scheduling collection 和 recursive children 的编辑语义不同；统一 `Record<string, unknown>` patch 或 deep merge 无法保持 closed validation。
- 所有 Check 已通过同一 trusted construction/binding handoff 进入 normalization/resolution，派生值必须保留这一共同 contract，而不是重建或按 source 选择 binding。

## 决策

- 采用: 任一 `Check` 都可以作为显式 base 值派生新的 Check；派生保持 base 的 stable `checkId` 与同一 trusted construction/binding handoff。要创建新的 identity，先通过同一 construction contract 创建新的 Check，再把它作为 base；派生不是 registry mutation、source lookup 或 tree-path edit。
- 采用: 所有 Check 使用相同的 field-derivation contract。每个可编辑字段仍由自己的 owner 定义 closed input、validation、preservation 和 result semantics；Product 默认 options 与项目 Check options 可以不同，但这种 implementation/options 差异不限制哪一种 Check 能派生。
- 采用: `checks` 的 base-value composition、默认保留、exact replacement、base-relative add/remove 和 duplicate identity validation 由单一 Check authoring/public derivation 决策拥有；其中派生输入的 `[]` 清除 `checks`，add/remove 后最终 children 为空也 materialize 为字段缺失，authored/materialized/Normalized Check 只能缺失或持有非空 collection。`dependsOn`/`mutex` 的 inherited collection expression 由独立 collection 决策拥有；`maxParallel` 保持 scalar nearest-explicit 规则；options 不跨 containment 继承或 generic merge。
- 采用: 派生成功只产生新的 Check value，不认证完整 Project Definition。normalization 仍在任何 work 前验证完整 tree、cross-node identity/reference、effective fields 和同一 handoff；Run resolution 不按 origin、`kind` 或 `checkId` lookup 重取 binding。
- 采用: 具体 helper 名称、参数 spelling 与 export inventory 在 publication 前确认。本决策不承诺具体 public spelling 或来源专属 helper，也不建立 mutable derivation API、registry 或 generic object patch。
- 不采用: 按来源分裂派生、generic deep merge、根据 `checkId` 恢复 binding，或把派生结果视为不同 Check type。
