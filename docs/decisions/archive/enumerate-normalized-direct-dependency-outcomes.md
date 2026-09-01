---
title: 枚举已规范化的直接 dependency outcomes
status: archived
alignment: aligned
createdAt: 2026-08-31T15:38:59Z
purpose: 让 downstream Check 能稳定批量读取全部已声明直接上游终态，而不依赖调度历史。
background: string getter 只能读取一个指定 direct dependency，消费者仍要复制自己的静态 ID 列表。
decision: 在同一 direct-edge 授权边界提供稳定 outcome 列表，不提供全局 registry 或上游控制能力。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: read-direct-dependency-final-data-by-string.md
---

## 目的

- 让 audit、summary 与后续 Check 能从现有 `dependsOn` 的同一事实源读取所有有效 direct dependencies，避免复制 ID 遍历逻辑。
- 保持跨 Check data handoff 的 producing Check、显式 direct edge 与 producer parser 边界，不建立第二事实源或隐式全局执行视图。

## 背景

- `dependencies.get(checkId)` 已经通过当前 Check 的 normalized effective direct dependency IDs 授权一个 exact read，并从已结算的 Core outcome 返回 canonical final data 或受控 read failure。
- execution scheduler 的 settlement 先后和 Core slot storage 不构成 consumer 授权集合；暴露当次已执行的 Checks 会在并发条件下泄漏不稳定的 ambient history。
- 每个 executable Check 的 effective `dependsOn` 已在 Definition normalization 时去重并稳定排序，继承得到的 direct IDs 也在该集合中。

## 决策

- 采用: `CheckDependencies` 在保留 non-generic `get` 的同时提供零参数 `list()`；它只返回当前 Check 全部 normalized effective direct dependency IDs，按该稳定 ID 顺序给出 `{ checkId, outcome }`。
- 采用: list item 的 `outcome` 直接复用 Core 已结算的完整四态 `CheckOutcome`；返回数组、item 与其嵌套值保持 frozen，consumer 只能据此执行本 Check 自己的逻辑、I/O、Records、messages 与 terminal result。
- 采用: `passed` 或 `failed` 的 data 仍由 producer parser 解释和验证；`not-applicable` 与 `unavailable` 保留原有 reason，而不是变成单项 `get` 的 read failure。
- 不采用: global executed-Check registry、transitive 或 undeclared read、query/filter DSL、lazy cache、上游 rerun/cancel/settle/mutation，或把 execution reader 与 after-run settled snapshot 合并。
