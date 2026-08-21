---
title: 使用显式 Run Controls Check aggregation
status: active
alignment: aligned
createdAt: 2026-08-21T15:02:45Z
purpose: 让需要多 Check 结论的调用方通过显式 Run Controls 聚合 settled Check statuses，而不是运行 DecisionPolicy。
background: 旧 DecisionPolicy 和 GateResult 依赖已退出的 Record catalog、reference 和 comparison 语义。
decision: Run Controls 可选声明 closed aggregation；Run 只从 selected statuses 返回 aggregate，未配置为 null。
tags:
  - configuration
relations:
  - type: 替代
    target: evaluate-decision-policies-from-core-facts.md
---

## 目的

- 让 Product 保留 canonical raw Check/Record facts，同时给明确需要一个 multi-Check result 的 invocation 提供最小、可验证的派生结果。
- 让 aggregation 的选择、模式与 unavailable/not-applicable/empty-set 处理由 caller 显式拥有，不形成 hidden default 或 Core lifecycle。
- 移除依赖 Record catalog、comparison/reference 和 named policy 的通用质量决策模型，而不以 CLI-local reducer 或 dependent Check 冒充替代。

## 背景

- `DecisionPolicy` 的 selectors、acceptance、views、readiness、reference evidence 和 `GateResult` 解释旧 Record/comparison contract；这些 operands 不属于 arbitrary custom Check 的共同基础。
- 选定 Checks 的 settled terminal statuses 已是 Run-owned canonical facts，足以让明确的调用方以有限规则得到自己的 aggregate。
- 未请求 aggregation 的 programmatic consumer 仍需要读取全部 raw facts，不能被一个 Product-level gate result 取代。

## 决策

- 采用：`RunControls.checkAggregation` 是无默认值的 closed invocation control；它显式声明 selected Check IDs 或 all、`all | any` mode、unavailable handling、not-applicable handling和 empty-set result。Run 在 work 前验证 selection。
- 采用：Run 仅从 selected settled Check statuses 确定性派生 `passed | failed | not-applicable | unavailable` aggregate。raw canonical Checks/Records 始终保留；未提供 aggregation 时 `RunResult.aggregate` 为 `null`。
- 采用：aggregate 不读取 Records、final data、definition warnings、effects、output、presentation 或任意 domain evidence；它不是 Core status、独立实体集合或长期 quality policy。
- 采用：repository Gate 等调用方把自身 eligibility selection 和 explicit aggregation 传给 Package Run，再消费返回 aggregate；adapter 只负责 invocation、日志与 process exit mapping。
- 不采用：`DecisionPolicy`、selected policy、Record/reference evaluator、acceptance/views/readiness/blocking precedence、`GateResult`、fixed global reducer、common comparison policy，或 CLI-local snapshot traversal。
