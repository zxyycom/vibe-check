---
title: 保持 Invocation 策略生命周期不识别学习特例
status: candidate
alignment: null
createdAt: null
purpose: 让 Invocation 承接统一策略生命周期而不为某项可选功能提供额外状态或观察权限。
background: 原私有生命周期同时拥有 learned state 与专属 observer，和普通 prepared author 的能力不对等。
decision: Invocation 只适配 static 与公共 custom 策略，学习和观察通过相同公开上下文完成。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: retain-private-invocation-admission-strategy-lifecycle.md
---

## 目的

- 保持 graph-ready preparation、同步 result-only selection 与 sealed terminal completion 的清楚 owner。
- 拆除可选 learned 能力的 runtime 特例，而不移动 Scheduler 执行与 measurement 的责任。

## 背景

- Invocation 已能为 public prepared strategy 每次 Run 建立独立实例；Scheduler 已通过 frozen context 和 proposal guards 隔离策略与执行。
- 原 private learned 分支额外读取 normalized inputs、观察 admission 和占用独立 channel，普通策略作者无法采用相同路径。

## 决策

- 采用: Invocation 在 static graph validation 后、未在 pre-work/planning 取消时准备 public strategy；静态默认与 custom adapter 可以保留内部实现分层，但不得识别学习工厂或提供某一策略专属 provider。
- 采用: Scheduler 接收同步 result-only selection policy，并保持 relation/mutex eligibility、capacity、lifecycle cutoff、cancellation、Task start/settlement 和 finite-progress guard 的唯一责任。
- 采用: Scheduler 拥有 clock、collector、append/freeze、captured-prefix reader 与 raw terminal measurement；是否需要测量依据通用 diagnostics、hooks 与 public strategy contract，不依据 learned 身份。
- 采用: Scheduler 停止 admission、drain started work 并 seal terminal measurement 后，由 Invocation 按通用 terminal pipeline 交付 completion。学习 helper 与其它 prepared author 拿到相同 public context。
- 采用: 跨 Run history、prediction、score 与 helper diagnostics 留在 caller/普通 helper；不提供 learned-only admitted observer、normalized Check/flags injection 或 Product-managed host capability。
- 采用: prepare/proposal/completion 的错误与取消仍由公共策略和终态 pipeline owner 定义；学习 helper 内可恢复的存储或观察故障由 helper 隔离，不能藉此改变通用 callback failure contract。
