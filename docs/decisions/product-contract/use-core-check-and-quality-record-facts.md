---
title: 使用 Core Check 与 QualityRecord 两类事实
status: archived
alignment: unaligned
createdAt: 2026-08-15T03:46:51Z
purpose: 让每个 resolved Check 以一个 Core Check 表达声明与结论，并让最终快照只保留 Check 和 QualityRecord。
background: definitions 与 CheckRun 平行投影重复关联同一 checkId，Project Definition leaf presence 已经表达本次选择。
decision: 每个 canonical resolved Check 恰有一个 Core Check，QualityRecord 直接绑定 checkId，快照只保留 checks 和 records。
relations:
  - type: 归并
    target: product-contract/use-runtime-resolved-check-and-record-core.md
  - type: 归并
    target: product-contract/separate-check-and-record-type-identities.md
---

## 目的
- 让内置与项目自定义 Check 共享一套最小、可组合且可观察的 Core facts。
- 让 Check 声明、当次 invocation 结论与 QualityRecord 归属不再通过 definitions、runs 和 instance ID 重新拼接。

## 背景
- Project Definition Check tree 的 leaf presence 已经表示本次 invocation 选择；不存在于 canonical resolved collection 的 leaf 不需要额外 unselected fact。
- 当前 Core 分别保存 CheckDefinition、CheckRun、QualityRecord、integrity 与 completeness，并以 `checkRunId` 关联记录和运行，形成重复的生命周期与输出投影。
- 一个 Check 可以得到质量结论而不产生 Record，也可以在后续普通执行失败前已经提交有效 Record，因此 Check outcome 与逐条 Record 仍需保持独立。

## 决策
- 采用: Definition normalization 在执行前形成唯一、冻结且确定性排序的 canonical resolved Check collection；每个 collection member 在 Core snapshot 中恰有一个 Core Check，不为缺席 leaf 生成 `unselected` fact。
- 采用: Core Check 同时承载稳定 Check definition projection 与一个闭合 invocation outcome：`not-applicable`、`completed` 且 verdict 为 `passed`/`failed`，或带安全 diagnostic 的 `unavailable`。blocked、execution、protocol 与 Record failure 归入明确的 unavailable diagnostic category。
- 采用: `checkId` 标识 Core Check，`recordTypeId` 标识其 Record 类型；QualityRecord 由 Core 绑定所属 `checkId` 并保留独立稳定 `recordId`，不建立 `checkRunId`、替代 instance ID 或 retry identity。
- 采用: 最终 Core snapshot 的 entity collections 恰好为 `checks` 与 `records`。完整性或 integrity summary 如需保留，只能从 Core Check diagnostic 与 Record commit facts 派生，不形成第三类实体或第二事实源。
- 采用: Core 不从 Record 推断领域 verdict；已经有效提交的 Record 不因之后的普通 execution/protocol failure 被撤销。
- 不采用: definitions+runs 双投影、每次运行 identity、为缺席 leaf 生成 skipped row，或以重命名后的 CoreCheckRun 保留同一 lifecycle。
