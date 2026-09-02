---
title: 将 Scheduler 性能测量交给 invocation-local Hook
status: archived
alignment: aligned
createdAt: 2026-09-02T01:22:44Z
purpose: 让调用方在不复制 Scheduler 生命周期的前提下消费安全的终态性能事实。
background: 现有 Scheduler summary 是启用日志时的私有人读投影，不能支持调用方的二级测量。
decision: Scheduler 保留一阶测量并在 terminal drain 后交给有序 Hook，内置 summary 作为其中一个副作用。
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: extend-invocation-local-scheduler-performance-summary.md
---

## 目的

- 让 Project Definition 能将一次 Scheduler invocation 的终态性能事实交给 caller-owned sync 或 async Hook，而不向 caller 交付可变 Scheduler、Task callback、Task value 或 error。
- 保持采样、区间分类、积分、admission 和 settlement 生命周期由 Scheduler 单独拥有，避免从日志或 Check duration 重建虚假的性能事实。

## 背景

- `extend-invocation-local-scheduler-performance-summary.md` 建立了 enabled-only private summary、bounded pressure/tail facts与 declarative fingerprint comparison signal；它把 summary 视为 Scheduler 的终态诊断实现。
- caller 需要派生不同的二级观察，但现有 human log 不是可解析 API，也不应成为 machine/telemetry 回放通道。
- Run 的 output failure 分支已经保留完整 settled Check facts，适合表达不会改变事实、但必须对调用方可见的 terminal side-effect failure。

## 决策

- 采用: `SchedulerPolicy` 提供有序 runtime-only measurement hook list；function identity、source、closure、id、version 与 registry均不进入 declarative fingerprint。
- 采用: Scheduler 形成一次递归 immutable terminal context，包含 canonical graph snapshot、admitted/settled execution observation和有界 raw measurement；raw 保留每个 admission-viable Task 的一阶 delay/admission/settlement table及必要 run accumulator、peak、sequence/accepted-wait facts，top-N、ratio、queue aggregate和tail contributor全由内置 summary Hook二级投影。它不暴露 Task value/error/callback、clock、mutable collection、streaming event或完整 interval ledger。
- 采用: 只在 Scheduler 已停止 admission并完成 started work drain 后，按顺序调用内置 summary side effect及所有 caller Hook；允许 sync/async，await全部 settlement，Hook时间不计入 Scheduler measurement；单个 Hook failure不阻止其余 Hook且不改写 Scheduler/Check facts。
- 采用: caller Hook failure标记独立 measurement-hook output failed，并通过既有 `output` RunResult 保留完整 facts；内置 summary writer failure继续是受限的 diagnostic writer failure，而不是 Hook failure。
- 不采用: public measurement field、machine/progress/Check fact、跨 invocation history、learned policy、自动调参或通过 diagnostic text反向解析测量。
