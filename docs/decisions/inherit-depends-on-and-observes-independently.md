---
title: 分别继承 dependsOn 与 observes relation
status: active
alignment: aligned
createdAt: 2026-09-01T10:43:20Z
purpose: 让两种有向 Check relation 以同一闭合语法独立继承，而不混淆各自调度含义。
background: dependsOn 已有 inherit collection grammar，新增 observes 必须继承同等编辑能力且保持 relation 边界。
decision: dependsOn、observes 与 mutex 都使用唯一 inherit grammar；两个有向 relation 分别 canonicalize 并在 effective 层拒绝重叠。
tags:
  - configuration
relations:
  - type: 修订
    target: use-inherit-for-check-collection-edits.md
---

## 目的

- 让 Check tree 中 success prerequisite 与 settled observation 都能以清晰、可验证的 parent-relative collection edit 表达。
- 保持 collection inheritance 只编辑各字段自己的 effective collection，不把不同 relation 合并为无语义的 order edge。

## 背景

- 字段缺失、exact replacement、清空和 parent-relative add/remove 仍是不同操作；新增 `observes` 不应重新引入 raw object、隐式 append 或第二套 helper。
- `dependsOn` 与 `observes` 有不同 readiness 语义，故它们不能共享一个 effective collection；但两者都必须进入统一的 direct-edge validation。

## 决策

- 采用: `dependsOn`、`observes` 与 `mutex` 的字段缺失分别完整继承 parent effective collection；root inherited base 仍为空 collection。
- 采用: 每个字段的 readonly array 是该字段的 exact value，`[]` 明确清空；唯一 parent-relative spelling 继续是 `inherit({ add?, remove? })`，且 input 只允许这两个字段。
- 采用: 每个 collection 各自先移除 `remove` identities 再加入 `add` identities；add wins、重复 coalesce、effective collection canonicalize。
- 采用: normalization 单独保存稳定、去重的 `dependsOn`、`observes` 与 `mutex`；仅两个 relation 的 union 参与 directed validation 和 direct read authorization，`mutex` 不形成 directed edge 或 read authorization。
- 采用: 一个 Check 的 effective `dependsOn` 与 `observes` 不得含同一 identity；该约束在继承完成后的 effective collections 上验证。
- 不采用: 隐式 array append、generic deep merge、把 `[]` 当作缺失、raw `{ add, remove }`、另一套 observation helper，或把 `inherit(...)` 扩张成默认 Check 对象修改 API。
