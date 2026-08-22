---
title: 让基线语义留在 producing Check
status: active
alignment: aligned
createdAt: 2026-08-21T05:58:42Z
purpose: 防止特定 built-in 的 baseline 和 regression 模型成为所有 custom Checks 必须实现的 Product contract。
background: Baseline input、matching 与 relation meaning 随 Check domain 变化，不存在所有 Checks 共享的稳定 semantics。
decision: baseline/reference behavior 由 Check 自己解释；Product 不提供 shared reference facts 或 Record relations。
tags:
  - configuration
  - product-contract
relations:
  - type: 替代
    target: require-explicit-named-comparison-references.md
---

## 目的

- 让 arbitrary custom Check 的 execution context 不包含它不需要的 baseline/reference protocol。
- 让需要 baseline/reference behavior 的 Check 拥有 input acquisition、matching、completeness、classification 与 failure semantics。
- 防止 Product、Core 与 machine 为 built-in-specific `regression`、`changed` 或 reference status 维护共同 vocabulary。

## 背景

- 已退休的 shared Run/context/reference channel 来自 default metric Checks 的 cross-run baseline behavior；API health、summary、dependency、format 或其它 custom Check 并不自然共享这套输入和关系。
- “Named frozen reference”只能约束一种已选择的 Product baseline protocol，不能证明这种行为本身属于 Product foundation。
- Producing Check 已经拥有 options、direct execution、external dependencies、custom Records 与 structured result，能够直接表达自己的 baseline data、domain classification 与 unavailable/not-applicable语义。
- Generic reference facts 迫使 Product resolve Record identity、保存 relation registry，并让 machine 解释 Check-specific baseline 结果。

## 决策

- 采用：Product public `RunControls`、base project context、Record reporter、Core 与 machine 不提供 common baseline/reference input、status、matching 或 relation vocabulary。
- 采用：需要 baseline/reference behavior 的 Check 通过自己的 options、dependencies 或 project-owned wrapper 获得输入，并自行决定 reproducibility、naming、availability 与 baseline algorithm。
- 采用：Check 将 current、baseline、delta、classification 等需要公开的领域结果写入自己的 custom Record data，并通过 ordinary structured Check result表达四态终态。
- 采用：Product 不消费 generic Record baseline relations；domain regression/blocking semantics 由 producing Check outcome拥有。
- 不采用：已退休的 shared Run/context/reference channel、reference facts、`relation-is`、`relation-kind-in`，或仅为保留当前 built-ins 而把 baseline capability注入所有 custom Checks。
