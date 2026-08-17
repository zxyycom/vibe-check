---
title: 发布前确认单一 Check authoring 与派生名称
status: archived
alignment: unaligned
createdAt: 2026-08-15T15:31:40Z
purpose: 让公开 authoring surface 用同一种 Check value 表达 Product 与项目提供的 Check，并在发布前确认 base-value composition 的名称。
background: 多个 public Check type 会泄漏来源或树角色；以 containment parent 为 base 的 helper 会形成隐式 tree editor。
decision: public contract 只承诺单一 Check type；checks 只能从明确 base Check 派生编辑，helper 名称留待 publication 前确认。
relations:
  - type: 修订
    target: product-contract/confirm-built-in-check-and-adjustment-names-before-publication.md
---

## 目的

- 让 package consumer 能以一套可读、单一拥有的 public names author Check，而不根据 Check 来源、parent/leaf 或 lifecycle 选择不同 authoring type。
- 让 Check composition 的派生操作明确以一个 Check value 为 base，避免 helper 隐式编辑 containment parent 或充当任意 tree mutation API。

## 背景

- Product 预先提供的 Check value 和项目提供的 Check value 都进入同一 construction/binding handoff；来源不能成为 runtime binding lookup 或 public type 分支。
- Product 当前提供的 default values 和字段调整能力仍需保持普通值、非突变和字段 owner 的边界，但 recursive `checks` 需要自己的 base-value derivation rule。
- package 尚未建立稳定 public surface；提前锁定 helper spelling 或 compatibility alias 会把尚未确认的 authoring ergonomics 伪装成长期承诺。

## 决策

- 采用: public authoring type 只使用 `Check`。Product 预先提供的 Check values 与项目提供的 Check values 都可作为 `ProjectDefinition.checks` 元素、递归 composition base 和普通调整输入，并通过同一 trusted private construction/binding handoff 进入 normalization/resolution；公开类型和 runtime binding 都不以 Check 来源、parent/leaf、`kind`、`checkId` lookup 或 Normalized/Resolved lifecycle 分支。
- 采用: `duplicateDetection`、`fileMetrics` 与 `functionMetrics` 继续表示 Product 预先提供的 ordinary Check values。它们和项目提供的 Check values 使用同一 construction/binding handoff，不公开 private binding、object identity brand 或 method receiver；具体 implementation/options 的不同不产生不同的 tree 或 execution semantics。
- 采用: `checks` 不向 containment child 继承，只能通过以某个明确 `Check` value 为 base 的派生操作编辑，返回新的 Check value；base 是该 Check 自身，不是 containment parent、tree path、registry entry 或全局 mutable tree。未编辑时保留 base 的 `checks`；普通 readonly child array 精确替换它，其中 `[]` 表示清除 `checks`；base-relative edit 可 add、remove 或同时 add/remove 子 Check，add/remove 后最终 children 为空也表示清除。返回的 materialized Check 必须省略 `checks`；直接声明的 Check 和任何 materialized/Normalized Check 都不得带 present empty array。remove 按 child `checkId`，缺失 target 是 no-op；同一 edit 同时 add/remove 同一 identity fail closed，最终 children/project tree 的 duplicate `checkId` 也 fail closed。
- 采用: composition helper 的具体 public symbol、参数/object spelling 与是否与其它 field adjustment operation 共享 function 仍在 publication 前确认。当前决策只锁定 base-value derivation 语义，不建立额外的 public authoring surface、mutable tree editor 或 compatibility alias。
- 采用: `defineConfig`、`run`、public-contract inventory、declarations、docs、fixtures 与 package acceptance 在发布前从同一 current public-contract owner 核对最终 names、single-Check inference、base-value composition、field preservation 与 exact export inventory。
- 不采用: 按来源或 tree role 分裂的 authoring type、tree-wide mutation、未确认的 compatibility/export surface，或把 internal Normalized/Resolved types 公开为 authoring contract。
