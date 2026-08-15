---
title: 分离 Check 身份与 Record 类型身份
status: archived
alignment: aligned
createdAt: 2026-08-05T10:31:35Z
purpose: 让检查执行单元和其产生的数据种类分别拥有稳定且可查询的身份。
background: 一个 Check 可以产生多种 Record，共用同一层身份会混淆执行对象、数据类型和策略选择。
decision: checkId 标识 Check，recordTypeId 标识其记录类型；Record 绑定所属 CheckRun，消费者按目标层级显式引用。
relations:
  - type: 替代
    target: configuration/use-semantic-check-ids-in-quality-records.md
---

## 目的
- 让检查的运行状态、检查产生的数据类型和单条记录实例各自拥有清楚且稳定的身份。
- 让配置、策略和机器消费者能够明确选择 Check 或 Record，而不依赖旧 warning 或 scanner identity。

## 背景
- 一个 Check 可以产生零种或多种 Record 类型，而同一种执行状态并不能替代这些记录的领域分类。
- 把 `checkId` 同时用作检查身份和记录目录身份，会让动态组合、策略选择和机器目录无法说明自己引用的是哪一层对象。
- Scanner、command 或 library 名称属于私有实现，不应成为公共身份的替代品。

## 决策
- 采用: `CheckDefinition` 拥有稳定 `checkId`；每项检查的记录目录拥有稳定 `recordTypeId`，`(checkId, recordTypeId)` 唯一标识 resolved catalog 中的一种记录语义。
- 采用: 每条 `QualityRecord` 携带 `recordTypeId`，并由 Core 绑定所属 `checkId` 与 `checkRunId`；单条记录实例继续拥有独立稳定 record identity。
- 采用: Check selector、Record selector、acceptance 和 decision evidence 必须显式使用对应层级的身份，不建立把 `checkId`、`recordTypeId` 或 legacy warning identity 互当别名的映射。
- 采用: 底层 scanner、命令、库和 adapter 身份保持私有；替换实现不得要求迁移稳定 Check 或 Record 类型身份。
