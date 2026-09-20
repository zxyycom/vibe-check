---
title: 通过构造器选项配置随包 Check
id: 260920-configure-package-checks-through-constructor-options
status: active
alignment: unaligned
createdAt: 2026-09-20T03:58:05Z
purpose: 让固定身份的随包 Check 在一次构造调用中同时表达领域政策与项目声明。
background: 随包构造器已返回完整类型化 Check，但固定声明字段迫使多实例项目在构造后重新组合对象。
decision: 固定身份构造器以顶层选项接收共享声明字段，并保留原生执行、结果与默认身份。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让项目通过随包构造器直接创建多个同类、不同身份的 Check，并保留每个实例的选择、关系、调度、资源和展示声明。
- 让专用构造器继续拥有领域默认值、执行、Finding、Record 和 final-data parser，避免调用方为项目声明重新组合 Check 行为。
- 让全部固定身份构造器遵循同一输入规则和兼容策略。

## 背景

- `fileMetrics`、`functionMetrics` 等固定身份构造器已经返回完整的 `TypedCheckWithOptions`，直接保留 resolved options、execution 与 final-data parser；但固定声明字段使多实例 Project Definition 只能在构造后通过 object spread 改写 identity、选择、关系和调度。
- `commandCheck` 已证明领域 policy 与 ordinary Check authoring fields 可以在一个 closed input 中分流。相同需求覆盖全部固定身份构造器，因此统一公共 contract 比 scanner-specific 参数更稳定。

## 决策

- 采用: 所有固定身份的随包 Check 构造器在现有顶层输入中接收共享项目声明字段；不增加构造后 adapter、`defineCheck(base, metadata)` overload 或单个 Check 专用的 identity 参数。
- 采用: 共享字段为 `checkId`、`displayName`、`enabledByFlags`、`checks`、`dependsOn`、`observes`、`maxParallel`、`admissionPriority`、`mutex`、`resourceClaims` 与 `omitQuietPassedRow`。构造器对 closed input 一次校验，将领域字段解析到 `options`，将这些字段投影到最终 Check；`omitQuietPassedRow: false` 解析为不声明该 raw Check field。
- 采用: `checkId` 与 `displayName` 省略时使用现有 package defaults；显式 `checkId` 的 literal type 传播到返回的 `TypedCheckWithOptions`。自定义 identity 不改变 display name 默认值。
- 采用: `options`、`prepare`、`execute`、`parseData` 与 `handoff` 继续由 package 拥有，不进入构造器可覆盖集合。新增项目字段不进入 resolved options 或 execution `context.options`。
- 采用: 无参、现有领域 options、`secretDetection` 的必填 policy 与 `maintenanceReminders(entries)` 保持兼容；`maintenanceReminders` 另提供包含 `entries` 和共享字段的 object input。
- 采用: `commandCheck` 保持现有 contract。从 package root 导出 `PackageCheckAuthoringOptions<Id>`，因为项目需要命名并复用跨构造器的 selection、relation 与 scheduling 配置片段；同时由隔离 consumer 直接 import 验收该名称。
