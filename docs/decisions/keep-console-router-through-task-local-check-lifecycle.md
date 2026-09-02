---
title: 在 task-local Check 生命周期中保持 console router
status: active
alignment: aligned
createdAt: 2026-09-01T10:43:21Z
purpose: 让一次 Run 的 console capture 覆盖 task-local preflight 与 execution，而不依赖全局 preflight barrier。
background: preflight 已移入各 Check Task；router 仍须在任何 author work 前建立并在全部 Check 闭合后恢复。
decision: 静态图校验后安装一次 router，覆盖每个获准入 Check 的 preflight/execution，直至 resolved Checks 全部结算。
tags:
  - product-contract
relations:
  - type: 修订
    target: install-check-console-router-before-preflight.md
---

## 目的

- 让启用默认 progress 的 consumer 在 task-local lifecycle 下仍取得完整、归属明确的 Check feedback。
- 保持全局 console 的安装/恢复由一次 resolved Run 唯一拥有，而每项 author invocation 的输出由独立 async context 隔离。

## 背景

- 不再存在先于 Task execution 的全局 preflight barrier；但每项获准入 Check 的 preflight 与 execution 仍是需要 capture 的 author work。
- 按单个 callback 反复改写 global console 仍不能表达整轮 Run 的资源生命周期，也会破坏并发的 buffer attribution。

## 决策

- 采用: Product 在完整静态 Check graph 已验证后、任何 Task admission 和 author work 前安装一次 global console router；它覆盖所有 task-local preflight 与 execution，并在全部 resolved Checks 闭合后恢复原 method descriptors。
- 采用: 每次 awaited preflight 或 execution 各建立独立 async capture context；context 内写入 owning Check buffer，context 外委托安装时 host method，并发 context 不共享 buffer。
- 采用: captured console、accepted preflight messages 与 accepted terminal messages 仍按生命周期顺序进入 Check feedback 和 final `RunResult.checkMessages`，但不成为 outcome、Record、dependency、aggregation 或 machine fact。
- 保留: 重叠 Run 的 router reference lifecycle、TTY-safe rendering，以及 direct streams、pre-bound methods、floating work 和高容量输出不在 global-console capture guarantee 内的边界。
- 不采用: 重新建立全局 preflight barrier、per-Check router install、公共 live logger、Check 可写 progress stream、process stream monkey-patch，或把 console 文本提升为质量事实。
