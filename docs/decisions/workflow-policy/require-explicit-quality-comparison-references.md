---
title: 质量比较只接受显式命名参考
status: archived
alignment: null
createdAt: 2026-08-05T06:43:22Z
purpose: 让任意质量变化视图和门禁都绑定到调用者明确选择、可复现且有名称的比较参考。
background: 单一 baseline 与固定 changed/regressions channel 不能表达多个比较参考，但自动推断历史、分支或远端仍会产生不可复现结论。
decision: 每项 comparison policy 声明显式参考并在 invocation 开始时固定身份；partial evidence 的 verdict 由 policy 处理。
relations:
  - type: 修订
    target: workflow-policy/require-explicit-quality-baselines.md
---

## 目的
- 让 `changed`、`regression`、`new`、`resolved` 或其它比较结果都能明确说明相对于哪个 reference、由哪种 capability 语义产生。
- 在允许多个 comparison references 和配置化 partial-evidence policy 的同时，继续禁止 Product 猜测缺失参考。

## 背景
- `baseline` 是一种 reference，不是所有 change 语义的唯一全局对象；不同 named views 可以比较不同 reference 或字段。
- 固定 `changed` / `regressions` gate prerequisite 把 comparison 名称、reference 选择和 verdict policy 绑定在 Core 中。
- Previous commit、merge base、branch、upstream、remote 与 cache 都不能可靠表达调用者希望验收的参考。

## 决策
- 采用: 任一 capability 或 gate policy需要comparison时，必须声明stable named reference，并要求调用者或resolved policy显式提供对应input；Product不得从Git history、branch、remote、cache或dependency state推断缺失reference。
- 采用: Reference input在capability、cache和artifact work前解析一次为invocation内immutable identity，同一次run中的materialization、comparison、records和diagnostics只使用该identity。
- 采用: Current CLI `--baseline <revision>`继续提供名为`baseline`的explicit reference；未来可以增加其它显式reference inputs，但不能通过policy名字隐式选取。
- 采用: Reference materialization或某项capability comparison只得到partial/unavailable evidence时，records与CapabilityRun如实表达该状态；是否pass、fail或允许partial由selected declarative policy决定，Core不执行全有或全无的固定reducer。
- 不采用: 让`changed`或`regressions`成为Core特权channel，或用自动fallback reference继续评价缺少显式输入的comparison。
