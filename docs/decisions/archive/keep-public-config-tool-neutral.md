---
title: 让 public project config 保持 scanner-tool 中立
status: archived
alignment: null
createdAt: 2026-08-03T08:45:33Z
purpose: 让项目配置表达稳定质量意图，而不是固化当前 scanner 实现和安装方式。
background: 当前完整 QualityConfig 暴露 lizard、scc、jscpd 与 command/args，使底层替换直接变成 public config migration。
decision: Public project config 只使用产品语义字段，底层 scanner 映射与 dependency resolution 由 Product 内部边界拥有。
tags:
  - configuration
relations: []
---

## 目的
- 让项目维护者配置函数、文件、重复检测、scope、report 等产品语义，不必知道当前由哪个
  scanner 实现。
- 让 scanner 替换、运行时统一和平台命令变化留在 Product-owned dependency boundary，避免
  反复迁移项目配置和 editor schema。

## 背景
- 当前 `QualityConfig` 顶层暴露 `lizard`、`scc`、`jscpd`，`tools` 又暴露对应 command 与
  args；这些字段把 measurement semantics、scanner identity 和 dependency installation 混在
  一份 public document 中。
- 已延期的 Lizard TypeScript port 会删除 Python/Lizard command。如果 external config
  workflow 先生成当前 tool-named schema，用户将很快承受一次没有产品语义收益的迁移。
- Product 仍需要解析 dependency、处理 platform 和观察 tool availability，但这些责任不要求
  project config 暴露底层实现。

## 决策
- 采用: Public project config、generated starter、editor schema、help 和示例只声明稳定的
  产品语义字段，不包含 `lizard`、`scc`、`jscpd` tool identity 或 scanner command/args。
- 采用: Product 内部 dependency boundary 负责把 semantic config 映射到当前 scanner、解析
  command/args、处理 platform 与 operational override，并向 Scanner 提供已归一化依赖；Core
  继续只消费产品领域值。
- 采用: 语义配置重构作为 external project config workflow 的前置；后者只为最终 semantic
  schema 提供 discovery、初始化和 editor assistance，不先公开 tool-named starter 再迁移。
- 采用: 如果 source-checkout 或 CI 仍需要 tool-specific operational override，它不得进入
  public project config schema 或 generated config；其责任、稳定性和可见范围由内部依赖
  change 明确界定。
- 不采用: 仅把 `tools` object 隐藏、却保留以 scanner 名称命名的 thresholds/maps，或用新的
  generic command provider object 继续把底层实现转嫁给项目维护者。
