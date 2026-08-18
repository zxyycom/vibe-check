---
title: 在 project config 中使用语义 check ID
status: archived
alignment: null
createdAt: 2026-08-03T09:23:47Z
purpose: 让 accepted-warning 配置按 Vibe Check 质量检查语义匹配，而不是依赖当前 scanner identity。
background: 当前 acceptedWarnings 使用含 tool name 的 ruleId 和 sourceTool，backend replacement 会继续迁移 project config。
decision: Public acceptedWarnings 使用 closed checkId；内部映射 current warning identity，machine fields 保持不变。
tags:
  - configuration
relations: []
---

## 目的
- 让项目维护者按稳定的 Vibe Check check 语义接受 warning，不需要知道当前由哪个 scanner
  产生 metric 或 warning。
- 隔离 project config identity 与现有 machine-output identity，使 backend replacement 不再
  改动 accepted-warning config，同时避免把 output-contract 重命名塞进本次配置变更。

## 背景
- 当前 `acceptedWarnings[]` 要求 `ruleId`，这些 IDs 包含 `lizard`、`scc` 或 `jscpd`；optional
  `sourceTool` matcher 进一步暴露 backend。
- Machine warning v1、human output、artifact examples 和下游消费者仍使用 current `ruleId` /
  `sourceTool`。同时改写它们会扩展为独立的 output compatibility change。
- Vibe Check 当前有五种稳定质量检查语义：file code lines、function cyclomatic complexity、
  function code lines、function parameter count 和 duplicate code。

## 决策
- 采用: Public `acceptedWarnings[]` 使用 required `checkId`，closed values 为
  `file-code-lines`、`function-cyclomatic-complexity`、`function-code-lines`、
  `function-parameter-count` 和 `duplicate-code`。
- 采用: 保留 `reason` 及现有与 backend 无关的 optional filters；public config 不再接受
  `ruleId` 或 `sourceTool` matcher。
- 采用: Product Config / Quality owner 维护 exhaustive `checkId` 到 current internal warning
  identity 的单一映射；accepted-warning matching 通过该语义身份完成。
- 采用: 本次配置变更保持 machine warning `ruleId`、`sourceTool`、ordering、channels 和
  `acceptedReason` behavior；未来重命名 machine identity 必须进入独立 output-contract change。
- 不采用: 长期双读 `checkId` 与 tool-named `ruleId`，或把 arbitrary machine rule ID 继续暴露
  为 project config contract。
