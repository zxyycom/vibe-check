---
title: 由 Product progress 统一预览 Record 与 Check message
status: active
alignment: aligned
createdAt: 2026-09-04T13:51:37Z
purpose: 让任何已接受 Record 都在默认 progress 中有受管预览，并把 Check message 保持为独立输出。
background: Native Gate adapter 的预览只覆盖自身 diagnostics，且同一事实还会重复成为 Check message。
decision: Product progress 统一预览完整 Records 与 messages，并让 Native adapter 只保留 owner-safe Record 和独立命令提示。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: publish-detailed-native-gate-diagnostic-records.md
---

## 目的

- 让 progress rendering 成为唯一默认 terminal presentation owner：任何 Check 的 accepted Records 都能在其 settled block 中看到有界预览，且不要求 producer 发明一个重复的 message。
- 保持 Record 的完整 canonical data 在 Core snapshot（及其 `RunResult` readback）和 machine output 中不截断；保持已接受的 Check messages 在 `RunResult.checkMessages` 中完整且不截断。
- 让 Record 与 Check message 是两类独立预览：每类最多展示五条，每条都在转义 terminal text 后限制为 240 个 Unicode code points（含截断 marker），并以准确 omitted 数提示余量；disabled progress 不产生 preview 或 writer。

## 背景

- 本记录修订已归档的 Native Gate diagnostics 决策：保留其 owner-safe、逐项 Record、unsafe-input fail-closed 与 private transcript 边界，但替换其 adapter-local preview（前十项）的 owner 和展示上限。Project Gate private adapter 无法为 package Check 或普通 custom Check 的 Records 提供同样体验，也让 native diagnostics 与 Check message 发生重复。
- Record data 是 producer-owned canonical JSON；Product 不能读取或猜测字段语义来组织文本。它只能展示稳定 structural identity 与 canonical JSON text。
- progress 已拥有 terminal writer、TTY 重绘、file tee 和 writer-failure containment；在 settlement 后把 accepted facts 投影到它，不改变 Core settlement、machine publication 或 RunResult readback 的责任。

## 决策

- 采用: Core session 只接受并保留 Check settlement 的完整 Record facts；Check execution 在 settlement 后向 Product-private lifecycle feedback 交付它们和 accepted messages。该 handoff 不进入 public Check callback API，也不增加 machine 或 RunResult 的新字段，Core 也不拥有 terminal text。
- 采用: 仅 enabled progress renderer 在同一 settled block 先渲染最多五条 Records，再独立渲染最多五条 messages。Record 行只显示 local Record id 与 canonical JSON text；不使用 producer data 的字段 registry、formatter hook 或领域推断。两类行各自的省略计数准确，单条 text 在 terminal-control escaping 后按 Unicode code point 截断到 240（marker 计入），不会回写或改造完整事实。disabled progress 不创建 writer 或 preview。
- 采用: `visibility: "attention"` 的 passed Check 只要存在 Record 或 message 就呈现 settled block。无 Record/message 的 attention passed Check 继续隐藏。
- 采用: Native Gate adapter 删除 diagnostic-to-message preview 与已失效的 `presentation` payload，保留一条独立 focused command message；native protocol 只接收 `{ id, data }` safe projections，docs adapter 显式从其 direct-CLI diagnostics 投影该子集。owner-safe Record projection、unsafe-input fail-closed、external process transcript 和 owner-local diagnostics 方向继续有效。
- 采用: external process 的 `command-failure` Record 只发布 basename command label；完整 executable path、arguments 与 child output 仍只在 Check-owned transcript。这使 generic canonical Record preview 不扩大既有 terminal disclosure。
- 不采用: 让 Core settlement 写 terminal、在 `RunResult`/machine 中存储 preview、由 Check 为通用 Record presentation 提供文本、从 arbitrary data 字段拼接人读消息，或为该能力新增 public output option。
