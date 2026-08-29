---
title: 增加一次性 Project Run core 诊断日志 output
status: archived
alignment: aligned
createdAt: 2026-08-29T06:20:34Z
purpose: 让维护者无需断点调试即可恢复 Project Run core 的详细运行路径。
background: 最终 Run facts、progress 与 Gate transcripts 无法共同还原 Product 编排过程。
decision: 增加外部默认关闭、仓库消费者默认开启的一次性人读 diagnostic logging output。
tags:
  - product-contract
relations:
  - type: 修订
    target: replace-global-tool-effects-with-run-outputs.md
---

## 目的

- 让开发和维护 Vibe Check core 的人员无需断点调试即可获得一次 invocation 的连续运行细节。
- 保持 Run output、Check-owned cache 与 Check 领域信息各自明确的 owner。

## 背景

- Project Run 当前只拥有 machine publication 与 progress rendering；前者发布最终 facts，后者提供有界的人读生命周期反馈，都不记录 planning、preflight、scheduler blocker、dependency/Record handoff、cancellation 与 output closure 的连续过程。
- Project Gate transcript 只证明已启动 command Check 的 process output，不拥有 Product scheduler 或 settlement facts。
- duplicate-detection cache 具有 Check-specific 生命周期，继续由 producing Check 独占，不应因为增加日志而回到全局 effect/cache 模型。

## 决策

- 采用：在 `ProjectDefinition.outputs`、`RunControls.outputs` 与 `RunResult.outputs` 增加 `diagnosticLogging`。外部 package 默认关闭；本仓库 quality 与 Project Gate 作为明确消费者默认开启。
- 采用：日志由 Product core 在真实 facts 形成位置持续追加 invocation-specific 人读文本，覆盖有效 Run 的 planning、preflight、scheduler、Check handoff、dependency read、Record report、settlement、cancellation、aggregation 与 output closure。
- 采用：logging failure 只形成自己的 output status/file 与既定 output diagnostic，不改写 Check/Record facts，也不阻断其它 output closure。
- 采用：machine publication 与 progress rendering 保持各自现有 contract；duplicate-detection cache 继续完全属于 producing Check。
- 不采用：给 `CheckExecutionContext`、`CheckPreflight` 或 package-provided/custom Check 增加 logger。Check-specific 新信息继续使用 final data、supplemental Record 或 terminal message。
- 不采用：日志 parser、schema version、稳定 event vocabulary、跨版本兼容、machine publication、remote transport、rotation、retention、cleanup、`latest` 或跨 invocation index；这些一次性文件只承诺当前人工可读性。
