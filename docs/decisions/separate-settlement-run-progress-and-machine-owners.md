---
title: 分离 Check settlement、Project Run、progress 与 machine owner
status: active
alignment: aligned
createdAt: 2026-08-30T17:34:11Z
purpose: 让 terminal facts、invocation orchestration、进度呈现与机器发布分别由实际生命周期 owner 承接。
background: 泛化 Run effect 路径会把领域结算、presentation 与 publication failure 混成一个责任。
decision: settlement 关闭 Check facts；Project Run 编排 invocation；progress 与 machine 各自拥有输出语义。
tags:
  - configuration
  - workflow-policy
relations:
  - type: 拆分
    target: refine-project-run-and-settlement-owners.md
---

## 目的

- 让源码路径和公开契约能够恢复 Check 事实、Run 编排及两类 output 的独立失败边界。
- 避免 presentation 或 publication concern 反向拥有 producing Check 的领域结算。

## 背景

- Check settlement 负责把 producing Check 提交的事实关闭成 terminal outcome；Project Run 负责 invocation、task graph、result 与 output coordination。
- Progress rendering 与 machine publication 的消费者、配置和失败语义不同，不构成一个泛化 effect capability。

## 决策

- 采用: `check-settlement/` 拥有 Check terminal fact 的可信关闭；它不拥有 Project invocation、progress presentation 或 machine artifact lifecycle。
- 采用: `project-run/` 拥有 invocation orchestration、task execution、structured Run result 与 output coordination；progress rendering 是其明确子 owner。
- 采用: progress rendering 与 machine publication 分别拥有自己的配置、投影和失败语义；二者不合并为 generic effect，也不改变 producing Check facts。
- 不采用: 以一个 Run effect abstraction 同时拥有 settlement、console progress、machine persistence 和各 Check 的领域失败。
