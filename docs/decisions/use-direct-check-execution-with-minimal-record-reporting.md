---
title: 使用直接 Check execution 与最小 Record reporting
status: active
alignment: unaligned
createdAt: 2026-08-21T05:58:42Z
purpose: 保留普通 Check 的 direct callback 和 structured result，同时把 reporter 收敛为 identity 与 custom data。
background: Direct execution 与三类 result 适用于 custom Check；comparison 和 finding assumptions 不属于共同 context。
decision: Check 继续直接执行并返回 structured result；records 只提交 Check-local identity 与 custom data。
tags:
  - configuration
relations:
  - type: 修订
    target: use-direct-check-execution-with-structured-results.md
---

## 目的

- 让 Product defaults 与 project custom Checks 继续使用一种 plain `Check` value、一个 direct callback 和一套 structured outcome grammar。
- 保留 options inference、caller-runtime execution、cancellation 与 Product failure containment，同时删除不是所有 Checks 共有的 Record/reference context。
- 保持 Check result 与零到多个 custom Records 两条独立输出通道，不从 Record presence 或 data 推断 verdict。

## 背景

- `completed(passed|failed)`、`not-applicable` 与 `unavailable` 区分领域结论、无适用工作和无法完成，这个共同模型不依赖当前 Record shape。
- Check-specific scanner、network、baseline 或其它 external dependencies 已由 Check options/direct execution owner承接，不需要 generic execution wrapper 或 Product context protocol。
- Current reporter 强制 candidate 声明 Record type、finding presentation fields 与 reference relations，使 direct custom Check API 继承 default built-ins 的数据模型。
- Minimal Record reporting只需 owning reporter scope、Check-local identity、canonical custom data 与 reporter lifecycle。

## 决策

- 采用：Public Check 继续声明 direct `execution` callback，不增加 execution wrapper、kind union、TaskPlan 或第二运行入口。
- 采用：Execution context 继续提供 typed `options`、真正 Product-owned project/invocation facts、Check-scoped `records` 与 cancellation `signal`；Check-specific dependencies由 options或project-owned composition负责。
- 采用：Execution 继续返回 `{ status: "completed", verdict: "passed" | "failed" }`、`{ status: "not-applicable", reason? }` 或 `{ status: "unavailable", reason }`。Product-owned throw、malformed result、cancellation 与 protocol failures映射为专属 unavailable reasons。
- 采用：`records.report({ id }, data)` 可以提交零到多个 Records；return result 关闭 reporter和当前 Check。Product只验证 identity、canonical data、ownership、conflict、late write 与 lifecycle。
- 采用：`defineCheck` 继续改善 options、context 与 result contextual typing；plain object、`satisfies Check`、native composition 与 inline Definition保持合法。
- 不采用：Record catalog/generic、reference reporter、common comparison context、从 custom data 推断 outcome，或让 callback提供 `checkId`/Core outcome envelope。
