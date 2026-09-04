---
title: 以 owner-aware channel 组织 Project Run 与 Gate 诊断
status: active
alignment: aligned
createdAt: 2026-09-04T06:54:13Z
purpose: 让维护者按输出 owner 检查同一次 invocation，而不再从混合 transcript 或单一 Product log 中筛选事实。
background: 单一 core log 与全局 Gate transcript 混合多个 owner，无法准确归因 writer failure，并重复保存 progress、message 与 Gate 过程。
decision: 按 owner channel 与 namespace 组织 evidence，以 identity、sequence、elapsed 关联跨 owner 过程。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: organize-project-run-and-gate-diagnostics-for-human-inspection.md
---

## 目的

- 让维护者从一次 invocation 的明确 owner channel 或 namespace 直接定位 Gate adapter、Product presentation、Core、Scheduler、learned admission、machine facts 和 Check artifact。
- 保持人读 diagnostic 为私有展示，不建立 parser、schema/version 或跨版本兼容承诺，同时让各 owner 的 failure/readback 可独立归因。
- 在不重新耦合 writer 的前提下，让需要跨 Product diagnostic owner 的分析可以由共享 invocation identity、global sequence 与 monotonic elapsed 确定性关联。

## 背景

- 原有单一 Product core log 同时承载 Core、Scheduler、learned admission 和 Check lifecycle；原有 `gate.log` 又通过全局 transcript 捕获混入 Product progress、Check messages 与 Gate `afterGate` 输出。
- 原有 `process/<check-id>.log` 在 invocation 根下与 Gate、machine 和 Product files 平铺，且 process Check 需经 Definition closure 重复取得 invocation directory。
- 同一次 invocation 的 owner 在物理上未必只有一个文件：machine publisher 的 `run.json` 与 `records.ndjson` 是不可任意合并的原子对，Check 也可能有多种 owner-local artifact。因此稳定边界是具名 channel 或 namespace，而不是强制一 owner 一文件。

## 决策

- 采用: Project Gate 的 invocation evidence 以 `gate.log`、`progress.log`、owner-first 的 Core、Scheduler 与可选 learned-admission diagnostic channel、`machine/` 和 `checks/<encoded-check-id>/` 组织。Gate 只写 adapter 与 `afterGate` result messages；progress 只写 Product progress、Check presentation 与完整 per-Check duration；每个 executable Check 只能取得自己的 artifact directory，不能拼接 sibling namespace。
- 采用: Product 保留一个顶层 diagnostic logging 配置入口，但其内部使用 owner-neutral router 分配 Product-invocation-global sequence 与 monotonic elapsed，并按 owner 路由到独立 channel。readback 同时提供 aggregate diagnostic status 和 per-channel file/status map；static/custom policy 的 learned-admission channel 为 disabled 且不创建空文件，writer setup/write/close failure 必须归因到对应 channel。
- 采用: Gate layout 与人读 diagnostic shape hard cut；不双写旧路径、不保留兼容别名，也不以单一全局 sequence 重新耦合 Gate、progress 与 Product writers。Gate artifacts 通过 exact invocation root 归组；Product diagnostic channels 通过 shared Product invocation ID、global sequence、monotonic elapsed 和明确 Product Run phase boundary 关联。
- 不采用: 无差别 patch 终端 stream 形成 Gate transcript、继续保留一个混合 Product sink、根级 process transcript 双写、额外 `gate-result.json`、让 Check 写 Product-owned file，或把 human diagnostic 升级为公共解析协议。
