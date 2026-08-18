---
title: 使用运行时解析的 Check 与 QualityRecord 核心
status: archived
alignment: unaligned
createdAt: 2026-08-05T10:31:20Z
purpose: 让内置与项目自定义检查共享两个独立、可组合且可观察的产品对象。
background: 编译期 capability 同时承载执行、质量结论和记录，限制动态接入并混淆失败语义。
decision: 执行前解析并冻结 Check 目录；CheckRun、CheckResult 与逐条 QualityRecord 分别管理，已提交记录不因后续失败撤销。
tags:
  - product-contract
relations:
  - type: 替代
    target: use-standard-quality-record-stream.md
---

## 目的
- 让内置检查和项目自定义检查进入同一产品核心，同时保持检查执行、质量结论与逐条数据各自可解释。
- 让后续接入方式可以变化，而不要求 Core 理解每项检查的领域语义。

## 背景
- 编译期封闭的 capability registry 不能承接受信任 Project Definition 在调用期贡献的检查。
- 一项检查可以没有记录但得到失败结论，也可以先提交有效记录再发生执行错误；把这些状态合并会丢失证据或误报质量结论。
- 可执行绑定、公共检查目录和记录数据具有不同的序列化与生命周期要求。

## 决策
- 采用: Resolution 组合内置来源与受支持的项目来源，形成可序列化 `CheckDefinition` 目录和独立的私有执行绑定；完整目录在任何检查执行前验证并冻结，执行期间不得追加或替换检查。
- 采用: CheckManager 拥有 `CheckRun` 的执行状态与覆盖，以及独立 `CheckResult` 的领域 verdict；执行失败不等同于检查正常完成后给出的失败 verdict，一项检查可以合法地产生零条记录。
- 采用: RecordManager 独立接收、验证和提交绑定到所属 check/run 的 final `QualityRecord`；已经有效提交的记录不因后续 runner、work 或普通协议失败而撤销。
- 采用: Core 只管理公共 envelope、身份、归属、确定性汇集和最终快照，不从记录或执行状态重新推断领域 verdict；决策与输出消费冻结后的 Check 和 Record 快照。
- 不采用: 将 compile-time-only `CapabilityRun` 继续作为扩展边界，或以整项检查的原子成功决定此前记录是否存在。
