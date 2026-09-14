---
title: 将 Scheduler 终态消费者命名为 terminal effects
id: 260914-name-scheduler-terminal-consumers-as-effects
status: active
alignment: aligned
createdAt: 2026-09-14T06:21:06Z
purpose: 让 Definition 与 prepared strategy 的终态函数按只读副作用职责共享准确输出身份
background: 现有 measurement Hooks 与 prepared complete 已共享终态流水线和输出，但名称混合数据、时点与生命周期完成含义
decision: 直接切换为 terminalEffects 与 terminalEffect，保留 sealed measurement、顺序交付、故障聚合和主结果优先级
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: 260903-extend-measurement-hook-output-to-prepared-complete
    summary: 保留终态流水线语义并更正 effect 与 output 命名
---

## 目的

- 让 Definition 作者知道终态函数执行只读副作用，而不是产生 Scheduler measurement 或完成整个 Run 生命周期。
- 让 generic consumers 与 prepared strategy consumer 共享准确的 output readback，同时保留各自配置路径和执行顺序。
- 保持 measurement facts、sealed context 与 primary-result priority 的现有边界。

## 背景

- 当前 Scheduler 在 sealed terminal context 上先运行 internal summary，再顺序等待 `scheduler.measurementHooks[]`，Invocation 随后运行 prepared strategy 的 `complete`。
- `260903-extend-measurement-hook-output-to-prepared-complete` 已让 generic Hooks 与 prepared `complete` 共享 `outputs.measurementHooks`，并固定全部 generic Hooks 获得调用机会和 primary failure 不被覆盖。
- `measurementHook` 把 consumer 误写成 measurement producer；`complete` 又暗示必达清理或整个 lifecycle 完成。实际两者都是读取冻结终态事实的 caller-owned effect，prepared variant 只额外拥有策略局部状态。
- internal summary 和 admission action collector 有不同上下文、依赖与 failure containment，即使占据相邻逻辑位置也不能并入公开 effect slot。

## 决策

- 采用: `Definition.scheduler.measurementHooks[]` 与 `SchedulerMeasurementHook` 直接改为 `terminalEffects[]` 与 `SchedulerTerminalEffect`；`PreparedCustomAdmissionStrategy.complete` 直接改为 `terminalEffect`。不保留旧字段或类型别名。
- 采用: `SchedulerMeasurementContext` 与全部 measurement DTO 保留。Scheduler seal context 后先运行自行 containment 的 internal summary，再按声明顺序逐个 await 所有 Definition terminal effects；某项失败不阻止后续项；prepared terminal effect 最后至多一次运行。
- 采用: prepared terminal effect 只在 sealed context 存在时运行，不是必达 resource disposal。它保持独立 prepared strategy 路径，不并入 Definition 数组。
- 采用: output 直接改为 `outputs.terminalEffects`，任一 Definition 或 prepared effect 存在时 enabled；到达 sequence 前为 `not-run`，全部成功为 `succeeded`，任一失败为 `failed`。正常完成分支使用 `scheduler-terminal-effects-failed`，已有 cancellation、preparation、admission 或 execution primary result 不被覆盖。
- 采用: caller failure diagnostic event 直接改为 `scheduler.terminal-effect-failed`。internal summary failure 继续自行 containment，不进入 caller aggregate。
- 采用: terminal effects 与 prepared effect 的函数身份、闭包和存在性继续不进入 declarative fingerprint。
- 不采用: second output、effect short-circuit、并行 delivery、通用 terminal plugin registry、Controls override、sealed fact mutation、prepared `dispose`，或把 internal summary/collector 暴露给 public context。
