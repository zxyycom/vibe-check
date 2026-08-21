---
title: 让 comparison semantics 留在 producing Check
status: active
alignment: aligned
createdAt: 2026-08-21T05:58:42Z
purpose: 防止特定 built-in 的 baseline 和 regression 模型成为所有 custom Checks 必须实现的 Product contract。
background: Comparison input、matching 与 relation meaning 随 Check domain 变化，不存在所有 Checks 共享的稳定 semantics。
decision: 需要 comparison 的 Check 自己获得和解释输入；Product 不提供 common reference facts 或 Record relations。
tags:
  - configuration
  - product-contract
relations:
  - type: 替代
    target: require-explicit-named-comparison-references.md
---

## 目的

- 让 arbitrary custom Check 的 execution context 不包含它不需要的 baseline/reference protocol。
- 让需要 comparison 的 Check 拥有 input acquisition、matching、completeness、classification 与 failure semantics。
- 防止 Product policy、Core 与 machine 为 built-in-specific `regression`、`changed` 或 reference status 维护共同 vocabulary。

## 背景

- 当前 `RunControls.comparison`、`project.comparison` 与 `reportReference` 来自 default metric Checks 的 cross-run comparison；API health、summary、dependency、format 或其它 custom Check 并不自然共享这套输入和关系。
- “Named frozen reference”只能约束一种已选择的 Product comparison protocol，不能证明 comparison 本身属于 Product foundation。
- Producing Check 已经拥有 options、direct execution、external dependencies、custom Records 与 structured result，能够直接表达自己的 baseline data、domain classification 与 unavailable/not-applicable语义。
- Generic reference facts 迫使 Product resolve Record identity、保存 relation registry，并让 policy/machine 解释 Check-specific comparison 结果。

## 决策

- 采用：Product public `RunControls`、base project context、Record reporter、Core 与 machine 不提供 common comparison/reference input、status、matching 或 relation vocabulary。
- 采用：需要 baseline/reference 的 Check 通过自己的 options、dependencies 或 project-owned wrapper 获得输入，并自行决定 reproducibility、naming、availability 与 comparison algorithm。
- 采用：Check 将 current、baseline、delta、classification 等需要公开的领域结果写入自己的 custom Record data，并通过 ordinary structured Check result表达 completed/not-applicable/unavailable 与 verdict。
- 采用：Product-wide policy 不消费 generic Record comparison relations；domain regression/blocking semantics 由 producing Check outcome拥有。
- 不采用：`RunControls.comparison`、`project.comparison`、`reportReference`、reference facts、`relation-is`、`relation-kind-in`，或仅为保留当前 built-ins 而把 comparison capability注入所有 custom Checks。
