---
title: 在 Check Task 准入后执行 preflight
status: active
alignment: aligned
createdAt: 2026-09-01T10:43:19Z
purpose: 让 preflight 与 execution 同受每个 Check 的调度、依赖和取消生命周期约束。
background: 全局 preflight barrier 会在 dependency readiness 前启动 dependent author work，并隐含 Definition 顺序。
decision: 每个 Check 在自身获准入后顺序执行 preflight 和 execution，不再建立全局 preflight barrier。
tags:
  - configuration
  - product-contract
relations:
  - type: 替代
    target: prepare-check-options-before-execution.md
---

## 目的

- 让 optional Check preflight 继续准备 invocation-local options，同时不得绕过 relation、mutex、capacity、priority 或 cancellation 对 author work 的限制。
- 保持 Definition 只闭合 authored grammar，Check 继续拥有 options 的业务准备、diagnostic 与 execution 决策。

## 背景

- 全局 preflight barrier 会在每个 Task 的 dependency readiness 之前执行全部 author preflight；因此失败的 prerequisite 不能阻止 dependent preflight side effect。
- preflight 的 block/continue/success contract、canonical invocation-local prepared value 与四态 Check fact 仍然需要保留，但它们不要求一个 invocation-wide author-work barrier。

## 决策

- 采用: 每个 executable Check 只有在其 relation readiness、mutex、capacity、priority 和 cancellation admission 条件满足后，才按顺序执行自己的 optional preflight 与 optional execution。
- 采用: preflight `success` 提供 frozen prepared options；`continue` 提供 reason、fallback 与可选 ordered messages；`block`、throw 或 malformed result 结算 owning Check 为 `unavailable` 且不调用其 execution。
- 采用: preflight 与 execution 共用同次 invocation 的 cancellation signal、Check-local console capture 与 terminal feedback 顺序；preflight 不回写 Definition，也不改变 declarative fingerprint。
- 采用: 取消在任何新 admission 前生效并只 drain 已启动 author work；没有获准入的 Check 不执行 preflight 或 execution。
- 不采用: invocation-wide global preflight barrier、Definition-order preflight guarantee、把 preparation 伪装成 execution、Definition-owned Check-local options policy，或以第五种 Check status 表达 preparation。
