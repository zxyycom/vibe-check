---
title: 将默认 Scheduler summary 统一为 terminal measurement Hook
status: active
alignment: aligned
createdAt: 2026-09-02T02:34:23Z
purpose: 让内置 summary 与 caller measurement Hook 共享一条有序 terminal delivery 边界。
background: 现有 Scheduler 专门调用 summary，造成默认副作用与 caller Hook runner 的顺序和失败策略分离。
decision: diagnostic-enabled summary 作为内部默认 Hook 加入统一 runner，并由自身包含 writer failure。
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: expose-invocation-local-scheduler-measurement-hooks.md
---

## 目的
- 让 Scheduler terminal context 只构造一次，按固定顺序投递给 internal default summary 和 caller Hooks，而不由 Scheduler 对 summary 建立特例分支。
- 保持 caller Hooks 的 terminal-only、ordered sync/async、相同 context identity与既有 output failure precedence。

## 背景
- 归档 Hook direction 已将 summary 说明为内置副作用，但现有实现仍在 caller runner 之外直接执行 summary。
- summary writer failure是 diagnostic observation，不应被 runner 误记为 caller output failure；caller Hook failure仍须执行余下 caller Hooks。

## 决策
- 采用: diagnostic-enabled summary 以内部默认 Hook wrapper 进入同一 terminal list，先于 caller Hooks；Scheduler 只运行该 list。
- 采用: 默认 Hook wrapper 自行包含 writer failure；共享 runner不按 summary 特判。caller failure仍只影响 measurementHooks output，正常 completion 与 primary failure沿用既有 precedence。
- 不采用: per-transition caller Hook、summary public API/machine/progress field、Hook identity fingerprint、背景任务、跨 invocation delivery或通过 summary 驱动 policy。
