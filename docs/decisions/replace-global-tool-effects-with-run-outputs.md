---
title: 用明确 Run outputs 与 Check-owned cache 取代旧全局工具模型
status: active
alignment: aligned
createdAt: 2026-08-26T09:17:19Z
purpose: 让 Run 只拥有 machine publication 与 progress rendering，并让 cache 保持在 producing Check。
background: 先前的全局 effects/cache 模型把不同 owner 的 IO 生命周期误当成同一产品能力。
decision: 弃用全局 cache/effect；以 ProjectOutputs 与 duplicate options 表达各自 owner。
tags:
  - product-contract
relations:
  - type: 替代
    target: enable-tool-effects-by-default.md
---

## 目的

- 让输出与 cache 由实际 owner 管理。

## 背景

- 先前全局 effects 将无共同生命周期的能力混在 Run。

## 决策

- 采用：`ProjectDefinition.outputs`、`RunControls.outputs` 与 `RunResult.outputs` 只表达 `machinePublication` 和 `progressRendering`；失败为明确 `output` result，不再有 effect branch。
- 采用：duplicate-detection options 独占 cache 的 directory、enabled、read-miss 与 write-failure settlement；其它 Check 和 Run 没有 cache capability。
- 不采用：全局 cache、logs output、output status 以外的泛化 IO 聚合，或以副作用技术形态混合无共同生命周期的能力。
