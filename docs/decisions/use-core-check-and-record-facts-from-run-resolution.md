---
title: 从 Run resolution 建立 Core Check 与 Record 事实
status: active
alignment: aligned
createdAt: 2026-08-15T10:28:59Z
purpose: 让每个 Run-owned Resolved Check 形成一个 Core Check，并让最终 Core snapshot 只保留 Check 与 QualityRecord。
background: Definition 只产出 Normalized Checks；Resolved Checks 归 Run pre-work 所有，二者不能混为同一 owner。
decision: Run pre-work 形成 Resolved Checks，Core 为每项关闭一个 Check；Record 绑定 checkId，snapshot 只含 checks 和 records。
tags:
  - product-contract
relations:
  - type: 修订
    target: use-core-check-and-quality-record-facts.md
---

## 目的

- 让内置与项目自定义 Check 共享一套最小、可组合且可观察的 Core facts。
- 保持 Definition declarative normalization 与 Package Run invocation resolution 的 owner 边界，同时让 Check 声明、当次结论与 QualityRecord 归属不再通过 definitions、runs 和 instance ID 重新拼接。

## 背景

- Project Definition Check tree 的 leaf presence 表达声明选择；Definition normalization 只形成一个 canonical Normalized Check collection 和私有 trusted function handoff，不解析 built-in runtime binding、applicability 或 invocation-only inputs。
- Package Run pre-work 把每个 Normalized Check 与当次 private execution binding、applicability 和 operational inputs join 一次，形成唯一 canonical Resolved Check collection。这个 collection 才是 Core registration、planning 与 policy catalog projection 的 runtime input。
- 旧 Core 分别保存 CheckDefinition、CheckRun、QualityRecord、integrity 与 completeness，并以 `checkRunId` 关联记录和运行，形成重复 lifecycle。一个 Check 可以得到质量结论而不产生 Record，也可以在后续普通执行失败前已经提交有效 Record，因此 Check outcome 与逐条 Record 仍需独立。

## 决策

- 采用: Definition normalization 产生冻结、确定性排序的 canonical Normalized Checks；Package Run pre-work 在任何 executable work 前对每项只 resolution 一次，形成冻结、确定性排序的 canonical Resolved Checks。join 后的 planning/Core/policy consumers 不按 ID 从平行 definitions、bindings、schedules、options 或 selection collections 重建它们。
- 采用: 每个 canonical Resolved Check 在 Core snapshot 中恰有一个 Core Check；不为缺席 leaf 生成 `unselected` fact。Core Check 同时承载稳定 Check definition projection与一个闭合 invocation outcome：`not-applicable`、`completed(passed|failed)` 或带安全 diagnostic 的 `unavailable`。
- 采用: `checkId` 标识 Core Check，`recordTypeId` 标识其 Record 类型；QualityRecord 由 Check-scoped RecordSink 绑定所属 `checkId` 并保留独立稳定 `recordId`，不建立 `checkRunId`、替代 instance ID 或 retry identity。
- 采用: 最终 Core snapshot 的 entity collections 恰好为 `checks` 与 `records`。completeness 或 integrity summary 不形成第三类实体、derived lifecycle view 或第二事实源。
- 采用: Core 不从 Record 推断领域 verdict；已经有效提交的 Record 不因之后的普通 execution、protocol 或其它 contained Check failure 被撤销。
- 不采用: normalization-owned runtime binding/applicability、definitions+runs 双投影、每次运行 identity、为缺席 leaf 生成 skipped row，或以重命名后的 CoreCheckRun 保留同一 lifecycle。
