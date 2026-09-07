---
title: 保持运行诊断通道独立于可选策略
status: candidate
alignment: null
createdAt: null
purpose: 让 Product 诊断反映稳定运行职责，而可选策略通过普通调用方观察能力解释自身行为。
background: 专用 learned-admission channel 要求 Product 识别一种普通扩展功能，破坏相同接口接入边界。
decision: 保留 Gate、progress、Core 和 Scheduler 的职责隔离，移除 Product 专属学习诊断通道。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: organize-owner-aware-project-run-and-gate-diagnostics.md
---

## 目的

- 维护者能按同一 invocation 中的运行职责定位 diagnostics、machine facts 和 Check artifacts。
- 可选策略不因由仓库开发者预先提供就取得额外 Product channel 或 observer。

## 背景

- Gate、progress、Core 与 Scheduler 分别拥有不同观察事实，混合 transcript 无法准确归因 writer failure。
- learned 改为普通 public prepared strategy 后，其模型和历史不再属于 Product invocation owner；原专属 channel 没有独立的运行职责依据。

## 决策

- 采用: Gate evidence 继续以 adapter gate log、Product progress、Core/Scheduler diagnostic channels、machine namespace 与 Check-owned artifact namespace 组织，不恢复混合全局 transcript。
- 采用: Product diagnostic router 继续分配 invocation-global sequence 与 monotonic elapsed，并按 Core/Scheduler owner 路由；readback 保留 aggregate 和 per-channel status，setup/write/close failure 归因到实际 channel。
- 采用: 删除 Product-owned learned-admission channel 及 disabled 空壳。可选策略以自己的普通 public observation/caller closure 解释模型与存储状态；Product 不为某个 helper 注入 sink 或 admission observer。
- 采用: 关联依靠 exact invocation grouping、Product identity、sequence、elapsed 和 phase boundary；人读 diagnostics 保持私有格式，不升级为公共解析协议。
- 采用: 保持 machine run.json/records.ndjson 原子对和多个 Check-local artifact 的独立事实，不机械要求一个 owner 一个文件。此决策不改变日志文件名、Gate/Product identity 或目录命名规则。
