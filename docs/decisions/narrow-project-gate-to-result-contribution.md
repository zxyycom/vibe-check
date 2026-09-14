---
title: 将 Project Gate 后处理收窄为结果贡献
id: 260914-narrow-project-gate-to-result-contribution
status: active
alignment: unaligned
createdAt: 2026-09-14T06:21:10Z
purpose: 让中央 Gate 配置只暴露当前性能提示需要的消息贡献权限
background: 当前 afterGate 类型可替换完整结果，但唯一实际消费者只追加 advisory message，额外状态策略没有当前责任
decision: 以单一 resultContributor 替代 afterGate，由 adapter 验证并追加消息、保留初步状态且对故障 fail closed
tags:
  - configuration
  - workflow-policy
relations:
  - type: 修订
    target: 260831-centralize-project-gate-after-hook-configuration
    summary: 保留中央配置并收窄为消息贡献
---

## 目的

- 让维护者从中央 Gate 配置发现当前唯一的性能消息贡献，而不会误以为项目函数可以重写 Gate 状态。
- 保持 exact candidate、动态 bound module、fail-closed adapter 与唯一 exit 映射边界。
- 不为没有当前消费者的状态策略、数组组合或插件注册提前建立契约。

## 背景

- `260831-centralize-project-gate-after-hook-configuration` 将唯一 `afterGate` 放入中央 Definition 并允许它返回完整 `{status,messages}`。
- 当前默认且唯一的实际实现 `observeProjectGatePerformance` 只根据 timing、selection、candidate 与 Run facts 追加一条 advisory 或 not-comparable message，从不改变初步 status。
- 初步 status 已由 Gate adapter 根据 Product Run、Definition warnings 和 progress output 唯一形成；process exit 又由最终 status 唯一映射。保留 full-result transform 会授予当前场景不需要的第二状态决定权。
- 生命周期完整性只要求保留“结果贡献”和“结果决定”两个逻辑位置，不要求它们都是 Project 配置函数。

## 决策

- 采用: 删除 Project `afterGate` / `ProjectGateAfterHook`，在 `PROJECT_GATE_RUN_CONFIG.resultContributor` 配置唯一同步或异步 `ProjectGateResultContributor`。candidate-bound module 继续在 exact installed entry 校验后投影该函数与 Product `run`。
- 采用: contributor 接收包含 frozen initial result 的 Gate contribution context，只返回 `readonly ProjectGateMessage[]`。adapter 以 closed grammar 验证并冻结全部消息，按顺序追加到 initial messages，并原样保留 initial status。
- 采用: 当前 performance observer 改为 message contributor；它可以读取 initial status 和既有 Gate context，但不能返回 status 或完整 result。
- 采用: contributor throw/reject 映射为 `unavailable` 与 `result-contributor-failed`；非数组、非法 message 或 hostile terminal text 映射为 `unavailable` 与 `result-contributor-invalid-result`。未经验证的贡献不进入 transcript。
- 采用: `createInitialProjectGateResult` 继续拥有 Product-to-Gate status 映射，`projectGateExitStatus` 继续拥有 status-to-process 映射，transcript 在最终结果后关闭。
- 不采用: result policy、第二 contributor、contributor array、priority、plugin discovery、Product lifecycle API、静态 root import、beforeGate，或任何允许 contributor 改写 status 的兼容入口。
