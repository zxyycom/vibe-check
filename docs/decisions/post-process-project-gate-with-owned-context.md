---
title: 以完整 Gate-owned invocation 上下文后处理一个 Gate 结果
status: active
alignment: aligned
createdAt: 2026-08-27T03:52:26Z
purpose: 让项目级运行后验收转换一个 Gate 结论，并统一取得该次 invocation 的 Gate-owned facts。
background: 只为性能暴露 RunResult、elapsed 和日志路径会把通用后处理上下文错误绑定到单一验收用例。
decision: Project Gate 以私有 afterGate 阶段和完整 Gate-owned invocation context 转换初步结果，对外仍只提供一个最终结果。
tags:
  - configuration
  - workflow-policy
relations:
  - type: 修订
    target: bind-project-gates-to-run-aggregation.md
---

## 目的

- 让项目级运行后验收在 bound Run 返回并产生初步 Gate 结论后运行，同时取得该次 invocation 到该时点为止由 Gate 拥有的完整事实。
- 让终端输出、process exit 和后续调用方继续只消费一个最终 Project Gate 结果，不要求理解 base、acceptances 与 final 三层模型。
- 让性能 elapsed 只是 context 中的 timing observation，而不是 Hook context 的结构中心或唯一变化原因。

## 背景

- Package Run 已拥有 Check lifecycle、原始结果和显式 selected-Check aggregate；Project Gate 不应遍历 snapshot 重算这些事实。
- Project Gate 另拥有 normalized selection、repository root、prepared candidate、invocation logs 和从开始到 Run 结算的 timing；这些事实都可能被运行后验收合法消费。
- 只把 RunResult、elapsed 和 log directory 拼成性能专用 context，会遗漏现有 Gate-owned facts，并迫使后续验收反复扩展 Hook 参数。
- loader、clock、console writer 和 candidate preparer 是执行依赖，不是 settled invocation facts；把它们放入 context 会使 Hook 成为第二执行控制面。

## 决策

- 采用: Project Gate 先从同次 RunResult 的 aggregate、definition warning 与 output facts 形成一个不可变的初步 `ProjectGateResult`，再调用一个项目私有 `afterGate` 阶段返回同类型的最终结果。
- 采用: `afterGate` 同时接收初步结果和一个完整只读 `ProjectGateContext`；context 包含 normalized selection、repository root、prepared candidate、invocation log directory、原始 RunResult，以及 `startedAtMs`、`initialResultAtMs` 和 `elapsedToInitialResultMs` timing facts。该 elapsed 不包含 Hook 自身耗时。
- 采用: context 只承接该次 settled invocation 已形成且由 Gate 拥有的事实；loader、clock、console、preparer 等执行依赖不进入 context，Hook 也不得修改 context、Check outcome、RunResult 或 Product aggregate。
- 采用: 终端结果、process exit 和 `runProjectGate` 返回的 exit status 只消费处理后的一个最终结果；初步结果是内部中间值，不建立要求调用方理解的并行结果集合。
- 采用: `afterGate` 抛错或返回无效结果时 fail closed 为 `unavailable`，并输出可定位到该阶段和 invocation logs 的安全诊断。
- 采用: 首个阶段只建立运行后转换和完整 context 机制，不预设未经测量的性能预算数值；后续性能规则作为该阶段的具体项目验收演进。
- 不采用: 性能专用 Hook context、Product 公共 lifecycle Hook、第二套 Check aggregation、原地状态 mutation、多个无顺序 Hook 链或对外暴露 base/acceptances/final 三层结果。
