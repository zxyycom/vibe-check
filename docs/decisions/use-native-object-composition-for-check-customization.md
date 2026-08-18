---
title: 使用原生对象组合自定义 Check
status: active
alignment: aligned
createdAt: 2026-08-17T09:18:05Z
purpose: 让项目直接用 TypeScript 对象展开、解构和数组操作修改 Product 默认 Check，而不维护产品专属调整 API。
background: Product 默认 Check 已是完整普通对象；partial parser 和派生 helper 会为语言已有的对象组合能力增加第二套语义。
decision: Product 只提供完整默认 Check；项目用原生对象操作形成另一个完整 Check，Definition 只验证最终对象，不补全 partial override。
tags:
  - configuration
relations:
  - type: 替代
    target: use-check-value-derivation-contract.md
---

## 目的

- 让项目能够修改 Product 默认 Check 的参数与公共配置，同时保持调用方式与普通 TypeScript 对象完全一致。
- 删除 `replace`、`append`、`deriveCheck` 或其它产品专属派生概念，避免维护与对象展开并行的 patch grammar。

## 背景

- `duplicateDetection`、`fileMetrics` 与 `functionMetrics` 已经是包含完整默认 options 的普通对象。项目可以通过 object spread、rest/destructuring、nested spread 和普通数组操作创建修改后的对象。
- JavaScript object spread 是浅复制；修改 nested options 时需要显式展开相应层级。这个写法可能比专属 helper 更长，但语义透明，不要求 Product 定义哪些字段 deep merge、补全或保持隐藏状态。
- 若 Definition 接受 partial override 并自动补全默认值，它仍然建立了一套特殊输入和 materialization API；这与只提供普通对象的目标不同。

## 决策

- 采用: Product 只公开完整的默认 Check 对象。调用者使用 TypeScript/JavaScript 原生 object spread、rest/destructuring、nested spread 与数组操作形成另一个完整 Check 对象。
- 采用: 对象组合完全遵守语言自身的浅复制和属性覆盖规则。nested options、open maps、collections 与 `checks` 不获得 Product 定义的隐式 deep merge、base-relative patch 或缺失字段补全。
- 采用: TypeScript public types检查组合结果是否满足完整 Check shape；Definition 在运行前按最终对象执行 closed validation、normalization 与 Project-level reference validation。Definition 不接收或 materialize 专门的 partial Check override。
- 采用: `dependsOn`、`mutex` 与 `maxParallel` 在最终 Check 中仍遵守各自的配置与继承 owner；这些字段的运行语义不是默认对象复制 API。普通数组写出精确本地值，parent-relative `dependsOn` / `mutex` 编辑使用独立的 `inherit(...)` grammar。
- 采用: 移除 `replace`、`append` 及其 public replacement/append types、partial parser 和示例，不保留同义 compatibility alias；当前 contract 尚未发布稳定版本，因此采用 hard cut。
- 不采用: generic derivation helper、来源专属 adjustment helper、partial object grammar、自动默认值 materialization、generic deep merge、mutable object method 或 registry mutation。
