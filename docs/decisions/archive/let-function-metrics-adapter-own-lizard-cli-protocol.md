---
title: 让函数指标 adapter 独占 Lizard CLI 协议
status: archived
alignment: aligned
createdAt: 2026-08-28T06:28:26Z
purpose: 让 functionMetrics 只暴露 executable 选择，不把 Lizard version、CSV 和执行调优参数变成产品配置。
background: public args 和 availabilityArgs 可以改变 adapter 的可信 measurement protocol，而它们没有独立 consumer policy 语义。
decision: functionMetrics 只选择 executable，Lizard adapter 固定 version probe、CSV 调用与私有执行参数。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让 consumer 可以明确选择已授权的 Lizard-compatible executable，而不负责构造 private adapter protocol。
- 防止任意 public arguments 改变 version probe、exact-input handoff、CSV output 或 parser 完整性边界。
- 为未来替换 private Lizard backend 保持一个最小、可删除的 execution dependency surface。

## 背景

- 当前 `FunctionMetricsScannerOptions` 公开 executable、scan args 与 availability args；adapter 又自行追加 exact paths 和 `--csv`。
- version probe、CSV output、timeout 与可能的 Lizard tuning 是形成可信完整 measurement 的实现步骤，不是 function quality policy。
- Lizard 当前从系统 executable 解析，不具有 jscpd package-manifest command，因此不需要照搬 package/custom command discriminant。
- 活动决策要求 Check options 拥有自己的 execution dependency，但不要求把依赖的完整 CLI protocol 暴露为 authoring capability。

## 决策

- 采用: public constructor scanner input 与 resolved options 只包含非空 executable，默认值为 `lizard`。
- 采用: function-metrics-owned Lizard adapter固定 version arguments、scan argument ordering、exact paths、CSV output和timeout；public input不提供 scan prefix、availability arguments、output format或worker tuning。
- 采用: adapter availability 与 process/parser failure继续 fail closed 为 owning Check unavailable，不能把不兼容 custom executable解释为成功空结果。
- 采用: tests通过真实 direct executable fixture或private seam证明协议，不为测试便利恢复 public arguments。
- 不采用: Product-wide scanner registry、Run Controls/environment override、任意 argument passthrough，或因 Lizard 支持某个 flag 就建立 public capability。
