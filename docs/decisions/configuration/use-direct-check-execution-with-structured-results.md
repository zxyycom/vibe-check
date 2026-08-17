---
title: 使用直接 Check execution 与结构化结果
status: active
alignment: unaligned
createdAt: 2026-08-17T16:29:25Z
purpose: 让普通 Check 用一个直接 callback 读取当前配置和运行输入，并以分层状态表达完成、不适用或无法执行。
background: passed 和 failed 是完成后的质量 verdict，not-applicable 与 unavailable 是不同执行状态；把它们压入一个 verdict 会丢失原因和恢复语义。
decision: execution 返回三类结构化结果；Check 可主动 unavailable，Product failures 保留独立 typed reasons。
relations: []
---

## 目的

- 为 Product 默认 Check 与项目 Check 提供同一种简单 execution callback，同时完整表达质量 verdict 和执行状态。
- 让 Check 可以如实报告外部因素造成的 unavailable，而 Product 仍能区分 throw、非法 result、取消和其它 protocol failures。
- 保持 Check result 与 QualityRecord 是两条独立输出通道，不从 Records 推断 verdict 或 availability。

## 背景

- `passed` 与 `failed` 只在 Check 正常完成时形成质量 verdict；`not-applicable` 表示本次不需要执行，`unavailable` 表示本次无法完成。
- Check 不是纯函数。它可能依赖 executable、filesystem、network 或其它外部状态，因此需要主动返回 unavailable 及其原因。
- throw/rejection、非法 callback return 和 invocation cancellation 的 owner、恢复方式与诊断含义不同；提前合并成一个 generic error 会丢失可行动证据。
- execution wrapper、kind union 或 TaskPlan 不会为这些状态增加价值；一个 execution-bearing Check 仍只贡献一个 callback 和一个 Task。

## 决策

- 采用: public Check 直接声明 `execution: CheckExecution`，不使用 `{ execute }` wrapper、execution `kind` 或 TaskPlan variant。
- 采用: execution context 只含 `{ options, project, records, signal }`。`options` 是当前 typed effective options；`project` 提供规范化 root、immutable changed files、file configuration、一次性 materialized comparison 与 cache activity capability；`records` 提供 Check-scoped Record 和 reference candidate reporting。Check-specific external dependencies 由当前 options 拥有，不由 context 按来源注入。
- 采用: execution 可以返回以下三类结构化 result：`{ status: "completed", verdict: "passed" | "failed" }`、`{ status: "not-applicable", reason? }` 或 `{ status: "unavailable", reason }`。
- 采用: Check 可以主动返回 `unavailable`；not-applicable/unavailable reason 使用 closed `{ code: string }` envelope。Product 为自己生成的 throw、非法 result、取消等事件使用固定 code values，但 reason string 不作为 authority/provenance 边界，也不禁止项目 Check 使用同一 spelling。
- 采用: Product 把 throw/rejection、非法 result、需要关闭未完成 Check 的 execution-phase cancellation 以及其它 Product-owned protocol failures 映射为 unavailable terminal outcome，并为不同来源保留专属 typed reason values；pre-work cancellation 不伪造 Check fact。只有后续证据证明两个 reason 的含义、恢复和 consumer 行为都相同时，才另行归并。
- 采用: `records.report(...)` 可以提交零到多个 Record candidates，`records.reportReference(...)` 可以引用同一 Check 的完整 Record identity；return result 关闭 reporter 并关闭当前 Check。Records/reference facts 不进入 result，也不暗示 completed verdict。
- 采用: `defineCheck(...)` 为 options、context 和 result 提供 contextual typing；plain object、`satisfies Check` 与 `defineConfig` inline declaration 继续合法。
- 不采用: 把 `not-applicable` 或 `unavailable` 当作 passed/failed verdict、只用一个无原因 generic failure、从 Record presence 推断结果，或让 callback 提供 Check identity/Core outcome envelope。
