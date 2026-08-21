---
title: 使用四态 Check final result 与主数据
status: active
alignment: aligned
createdAt: 2026-08-21T15:02:44Z
purpose: 让普通直接 Check callback 用单一四态终态和 Check-owned final data 表达其主结果。
background: completed 加 verdict 将一个终态拆成双层结构，且已无法表达通过或失败 Check 的主结构化结果。
decision: 保留直接 execution 与最小 Record reporting，将 Check result 修订为四态终态；passed 和 failed 携带 canonical final data。
tags:
  - configuration
relations:
  - type: 修订
    target: use-direct-check-execution-with-minimal-record-reporting.md
---

## 目的

- 让 Product defaults 与 project custom Checks 继续通过同一种普通 `Check` value 和 direct `execution` callback 表达自己的运行与结论。
- 让一个 Check 的终态和它自己的主结构化结果同时成为单一、可读取的最终事实，不从 Records 或外部 policy 推断。
- 保持 options inference、caller-runtime execution、cancellation 与 Product failure containment，不恢复第二 execution model。

## 背景

- `completed` 与 `verdict` 共同表达一个 Check 终态，增加了不独立的状态层，且通过/失败的 result 没有位置承载 Check-owned primary data。
- `not-applicable` 与 `unavailable` 与通过/失败不同：它们表达无适用工作或不能形成正常结论，不能伪造主数据。
- Check-scoped minimal Records 是零到多个补充事实；其存在、数量和内容不能决定或替代 Check status。

## 决策

- 采用：Public direct `execution` 返回唯一 closed result union：`passed` 与 `failed` 必须各携带 object `data`，`not-applicable` 可携带受控 reason，`unavailable` 必须携带受控 reason。`completed + verdict` 不再是 result grammar。
- 采用：`passed` 或 `failed` 的 `data` 是 producing Check 的唯一 primary structured result；无领域数据的 Check 显式返回空 object。Product 在 Core settlement boundary把该data以与Record data相同的canonical JSON安全边界detached、prototype-safe并deep-freeze；需要canonical text或bytes时再显式按lexical key order序列化。
- 采用：direct execution context 继续提供 typed options、Product-owned invocation facts、Check-scoped `records` 与 cancellation signal；`records.report({ id }, data)` 仍只提交 supplemental Records，callback settlement 关闭 reporter。
- 采用：Product 将 callback throw、malformed result、invalid final data、cancellation 和协议失败收敛为 owning Check 的 unavailable outcome，并不撤销已经接受的 Records 或影响无关 Checks。
- 不采用：execution wrapper、TaskPlan、从 Record data 推断 outcome、额外完成状态、Record catalog/generic，或为主数据引入 Product-owned domain schema、parser 或 presentation fallback。
