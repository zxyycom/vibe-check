---
title: 以分组测量保持 terminal effects 契约
id: 261016-preserve-terminal-effects-with-grouped-measurements
status: active
alignment: aligned
createdAt: 2026-10-16T07:28:20Z
purpose: 保持终态 effect 的准确命名、交付机会与失败优先级
background: 旧命名决策保留全部 measurement DTO，阻止按独立需求拆分观察成本
decision: 保留 terminalEffects 流水线并以 runMeasurement 与 taskTimings 替换 raw DTO
tags:
  - admission-scheduling
  - product-contract
  - scheduler
  - workflow-policy
relations:
  - type: 修订
    target: 260914-name-scheduler-terminal-consumers-as-effects
    summary: 保留 effect 与输出语义，改为独立分组 measurement DTO
---

## 目的

- 让 Definition 与 prepared strategy 的终态消费者按只读副作用职责保留准确的命名、输出身份与执行机会。
- 在按需求分组测量的 breaking 迁移中，维持 sealed facts、生命周期及主结果优先级。

## 背景

- 前序已将 measurementHooks/complete 直接切换为 terminalEffects/terminalEffect，避免 consumer 被误称 producer 或暗示必达 disposal；同时明确保留旧 SchedulerMeasurementContext 与全部 measurement DTO。
- 旧 rawMeasurement 将 Run 汇总与逐 Task delay/chronology 绑定；新精确需求要能独立关闭两类生产。保留全部旧 DTO 的承诺必须明确修订，而非悄然改写前序。
- internal summary 与 collector 各有私有依赖和 failure containment，并不因为相邻就成为公开 effect。

## 决策

- 采用: 保留 `Definition.scheduler.terminalEffects[]`、`SchedulerTerminalEffect` 与 prepared `terminalEffect` 的名称和独立配置路径；不恢复 measurementHooks/complete 或其别名。
- 采用: terminal 合法字段为 graph、execution、runMeasurement、taskTimings，按各自固定声明精确交付。runMeasurement 承接旧 rawMeasurement 除 admissions 外的 Run facts；taskTimings 交付 closed timing availability 及可用时的 admissions。移除旧 rawMeasurement 和旧 helper，不再承诺保留原 measurement context/DTO 形状。
- 采用: 同一 drain/seal 后先运行自行 containment 的 internal summary，再按声明顺序逐个 await 所有 Definition effects；任一失败不阻止后续；prepared effect 最后至多一次。各消费者不保证外层 identity 相同，仍只读同一边界的不可变事实。
- 采用: prepared effect 只在 sealed terminal boundary 存在时运行，不是必达 resource disposal，不并入 Definition 数组。零需求仍正常交付；未 seal 的早期失败不运行。
- 采用: 任一 Definition/prepared effect 存在就启用 `outputs.terminalEffects`；到达 sequence 前为 not-run，全成功为 succeeded，任一失败为 failed。正常完成映射 scheduler-terminal-effects-failed；已有 cancellation、preparation、admission 或 execution primary result 不被覆盖，Check facts 不被回写。
- 采用: caller failure diagnostic event 保持 scheduler.terminal-effect-failed；internal summary failure 自行 containment，不进入 caller aggregate。effect 的函数身份、闭包、需求和存在性不进入 declarative fingerprint。
- 不采用: 第二 output、short-circuit、并行 delivery、通用 terminal plugin registry、Controls override、sealed fact mutation、prepared dispose 或公开 internal summary/collector。
