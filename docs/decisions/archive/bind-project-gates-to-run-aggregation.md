---
title: 让 Project Gate 绑定 Run aggregation
status: archived
alignment: aligned
createdAt: 2026-08-21T15:02:46Z
purpose: 让项目 Gate 保持显式 Project Definition 与 Run 绑定，同时只消费该次 Run 的明确 aggregation 结果。
background: Gate 仍需要项目持有的配置和可审阅的运行输入，但已退休的通用评估模型不再是 current Product contract。
decision: 项目脚本显式绑定 Definition、Run Controls 与 Gate aggregation；adapter 不隐式选择行为或重算结论。
tags:
  - configuration
relations:
  - type: 修订
    target: use-user-owned-definition-for-observation-and-gates.md
---

## 目的

- 让 non-blocking observation 与 blocking Project Gate 都从项目持有、普通 import 的 Project Definition value 运行。
- 让 Gate 的阻断结论由本次 Run 的显式 selected-Check aggregation 产生，而不是由命名评估器或环境发现选择。
- 保持 Product 不创建、发现、重载或绕过项目 configuration module，并让 process adapter 保持 thin boundary。

## 背景

- Project-owned Definition 仍拥有 recursive Checks、Check-owned options、scheduler 和 outputs；它是每次 Product Run 的明确 authoring input。
- Gate 需要声明自己的 required/full eligibility 与 aggregation handling，但这些是该项目 invocation 的 Run Controls，不是 Product 的共享选择目录。
- Package Run 已返回 configuration/run/output facts、raw canonical facts 和 optional aggregate；adapter 不应再次遍历 snapshot 重构 quality conclusion。

## 决策

- 采用：每次 observation 或 Gate invocation 都将一个已验证的 Project Definition value 显式传给 Package Run；缺失或无效 Definition 仍在任何 Check work 前返回 typed configuration result。
- 采用：blocking Gate 在自己的 Project Run 中绑定 eligible Check IDs 和完整 `checkAggregation` configuration，并消费 `RunResult.aggregate`；required/full 可以拥有不同 selection，但不以 profile 或命名评估器隐式选择行为。
- 采用：Project Gate adapter 只把 invocation、configuration/run/output facts 与 aggregate 映射为 process exit `0`、`1` 或 `2`，并保留日志责任；它不选择已退休的评估器、重算 snapshot aggregate 或解释 Check-local data。
- 采用：non-blocking observation 可以明确使用 neutral Definition composition 或不配置 aggregation；两者仍由项目 script 传入明确 Definition/Run Controls。
- 不采用：Product configuration discovery、missing-definition fallback、命名评估器选择、独立 Gate result object、CLI-local reducer，或由 Product 生成项目 gate script。
