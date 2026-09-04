---
title: 在 progress 中按名称分组未命中 flag 的 Checks
status: archived
alignment: aligned
createdAt: 2026-09-01T15:57:07Z
purpose: 保留终态消息和 visibility 的同时，集中呈现因 flag 条件未匹配而未启动的 Checks。
background: 逐项输出相同的未运行状态会放大可预期控制结果，并掩盖真正执行或需要关注的 Check。
decision: 终态消息和 attention visibility 保持独立；progress 在 invocation flag control 完成时按名称分组明确的 flag 条件未匹配结果。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: allow-check-terminal-messages-and-explicit-visibility.md
---

## 目的

- 让需要补充说明的 Check 继续在终态附带可程序化读取、由 owning Check 解释的结构化 messages。
- 让 `attention` visibility 继续减少已执行 supporting Check 的成功输出噪音，同时保留运行中反馈、非成功结果和完整 accounting。
- 让 invocation 开始即可确定的 flag 未命中结果集中说明原因并列出 Check 名称，不重复展示相同的状态、duration 和 reason 列。

## 背景

- `enabledByFlags` 条件未匹配会在 invocation-wide flag control 内形成 Product-owned
  `not-applicable / flag-condition-not-matched`，没有 started fact 或 messages，`durationMs` 为 `null`；完整 Check facts 仍可从
  `RunResult` 和 machine output 读取。
- 现有 `attention` 是 Check 自己声明的 presentation identity，只隐藏无消息的 `passed` row。把 flag 压缩映射为
  `attention` 会混淆执行结果 visibility 与 Product 已知的 invocation control 结果。
- preflight failure、cancellation、其它 `not-applicable` / `unavailable` 或带 messages 的未启动 Check 具有不同的操作含义；
  仅凭“没有 started fact”合并它们会隐藏需要关注的信息。
- 人读 progress 与 machine publication 已有独立 owner。presentation 可以压缩重复结构，但不能删除或改写 terminal facts、
  dependency、aggregation、Records、messages、duration readback 或 final counts。

## 决策

- 采用: Check terminal messages 继续是可选 dense ordered `{ level, code, message }` items；Product 在 settlement 边界完整校验，
  renderer 统一转义 terminal controls，`RunResult.checkMessages` 保留实际文本。Messages 不进入 CheckOutcome、Records、
  dependency、aggregation、cache 或 machine publication，也不增加同级 author result 尚未采用的数量或文本长度 hard cap。
- 采用: Check visibility 默认保留 running 与 settled presentation；`attention` 仍只隐藏 `passed` 且无 messages 的永久 row。
  任何带 messages 的 Check，以及除下述 flag 分组外的 `failed`、`not-applicable` 和 `unavailable` 都显示 owning settled block。
  Visibility 继续作为 declarative Check identity 进入 Definition fingerprint，不决定 execution、outcome 或 machine facts。
- 采用: progress renderer 只把 Product 形成的 `not-applicable / flag-condition-not-matched`、`durationMs: null` 且无 messages 的
  invocation-control settlements 收集为一个 block。flag control 完成时先用原因说明报告数量，再按 Definition 顺序逐行列出
  terminal-escaped `displayName`；不再为这些 Checks 分别输出完整 settled row。
- 采用: 该分组是默认的 Product progress presentation，不增加 Check-level visibility 值、每项 opt-in、Run Control 或第二套
  flag grammar。其它未启动状态保持独立呈现；需要完整结构化明细的 consumer 读取 `RunResult` 或 machine output。
- 采用: 分组中的每项 Check 仍计入 prepared total、settlement ordinal、final counts，并完整保留 outcome、duration readback、
  lifecycle、Check/Record facts、dependency 和 aggregation。progress writer failure 仍只使 progress output 失败，不改写这些事实。
