---
title: 从 package root 导出消费者需要命名的 supporting types
id: 260906-export-consumer-named-supporting-types-from-package-root
status: active
alignment: aligned
createdAt: 2026-09-06T16:12:41Z
purpose: 让消费者可直接命名公共配置、回调与结果 helper 所需类型，同时避免批量冻结内部 declarations。
background: 部分公共签名中的 supporting types 只能被推断或复制，妨碍消费者编写可复用 helper 与配置片段。
decision: 只从 package root 导出具有独立消费者命名场景的公共 supporting types，并以真实 installed consumer 验收。
tags:
  - product-contract
relations: []
---

## 目的

- 让 package 消费者从唯一 root import 边界直接命名公共 Check 回调、JSON Schema 配置和 Run 输出适配所需的稳定类型。
- 防止为了声明闭包或便利而批量公开可推断或缺少独立调用场景的 declarations；既有公共名称不由本次审计重新分类。

## 背景

- `CheckExecutionContext.dependencies`、JSON Schema authoring options 的组成部分与 `RunResult.outputs` 已经是公共签名的一部分，但消费者不能从 package root 直接复用其中若干有意义的类型。
- 消费者可以从上层结构推断部分嵌套返回类型；这不自动产生每个 declaration 的稳定命名义务。
- Vibe Check 只提供一个 package root 公共入口，不建立 subpath export；新增 type-only export 仍会扩大版本化公共契约，必须有真实使用证据。

## 决策

- 采用: 从 package root 导出 `CheckDependencies`，用于消费者拥有的 Check dependency helper；导出 `RunOutputStatus` 与 `RunOutputStatuses`，用于消费者拥有的 Run 结果适配与输出状态 helper。
- 采用: 从 package root 导出 JSON Schema authoring 所需的 `JsonSchemaIdentity`、`JsonSchemaIdentityMode`、`JsonSchemaReferenceSource`、`JsonSchemaReferenceResolution`、`RegisteredJsonSchema` 与 `JsonSchemaInstanceBinding`，使可复用配置片段无需复制公共 option shape。
- 采用: supporting type 只有在已有公共签名中承担消费者可独立命名的 helper、配置或结果适配边界时才进入 root；每个新增名称同时进入公共 inventory，并由从 exact candidate 安装的隔离消费者直接 import 和使用。
- 不采用: 批量导出声明闭包中的所有类型。`DependencyReadResult`、`DependencyObservation` 与专用 diagnostic logging 子状态继续由上层公共类型推断，除非以后出现新的独立消费者场景并另行审定；本次审计不移除或重新分类既有公共类型。
