---
title: 用连续阶段解释 Gate 初步结果耗时
status: active
alignment: aligned
createdAt: 2026-08-30T04:14:37Z
purpose: 让 Gate-owned context 用连续三阶段解释 elapsed-to-initial-result。
background: 既有 afterGate context 只列举 startedAt、initialResultAt 与 total elapsed；当前 Gate 已提供三段连续 phase 以解释总耗时。
decision: 保留一个 Gate-owned afterGate context 和总 elapsed，并增加三段只读 phase timing；observer 仍只输出 advisory。
tags:
  - configuration
  - workflow-policy
relations:
  - type: 修订
    target: post-process-project-gate-with-owned-context.md
---

## 目的

- 让 Project Gate 的 afterGate 继续在 bound Run 形成初步结果后，使用完整 Gate-owned invocation context 转换唯一最终结果。
- 让 `elapsedToInitialResultMs` 仍是从 Gate 启动到初步结果的唯一总比较值，同时以连续阶段解释等待位置。
- 保持 Hook 不成为第二个 aggregate、执行控制面或公共 Product lifecycle API。

## 背景

- 前序 `post-process-project-gate-with-owned-context.md` 已建立私有 afterGate、单一最终结果、immutable context 与不暴露执行依赖的边界；其 timing 列举只有 `startedAtMs`、`initialResultAtMs` 与总 elapsed。
- 当前 Gate 在同一 monotonic interval 内提供 `candidatePreparationMs`、`adapterSetupMs` 与 `productRunMs`；三段连续相加为 `elapsedToInitialResultMs`，用于解释 candidate preparation、consumer/log setup 与 bound Product Run 到初步结果的耗时。
- `monitor-project-gate-performance-advisory.md` 的核心方向没有变化：总 elapsed 只在 workload identity 匹配时和 baseline 比较，超界仅 warning，不修改 Gate status 或 exit。phase 只是同一 observation 的解释，不是新 budget、独立采样 target 或 aggregate input。

## 决策

- 采用: Project Gate 仍先从同次 RunResult aggregate、definition warning 与 output facts形成 immutable initial `ProjectGateResult`，再调用一个私有 `afterGate` 返回同类型唯一最终结果。
- 采用: `ProjectGateContext.timing` 提供 `startedAtMs`、`initialResultAtMs`、`elapsedToInitialResultMs`，以及连续的 `candidatePreparationMs`、`adapterSetupMs`、`productRunMs`。总值覆盖 Gate 启动到初步结果；phase 只解释该总值，不包括 Hook 自身耗时。
- 采用: context 继续只承接同次 invocation 已形成且 Gate-owned 的 normalized selection、repository root、prepared candidate、invocation log directory、raw RunResult 与 timing facts；loader、clock、console、preparer 等执行依赖不进入 context，Hook 不得改写 context、Check outcome、RunResult 或 aggregate。
- 采用: default performance observer 在单条 `elapsed-to-initial-result` message 中展示总值和三段 phase；只有总值与 baseline workload identity 完整匹配时才比较 threshold，超界仍只 warning。
- 采用: Hook throw 或 invalid return fail closed 为 unavailable，并保持 process exit 只消费处理后的一个结果。
- 不采用: phases 成为 public Product API、第二套 Check aggregation、per-phase hard budget、并行 Hook chain、通过 diagnostic text 或 Check duration 求和重建 Gate wall time，或对外暴露 base/acceptances/final 结果集合。
