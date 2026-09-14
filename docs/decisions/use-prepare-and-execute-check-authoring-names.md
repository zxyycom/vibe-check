---
title: 用 prepare 与 execute 表达 Check authoring 权限
id: 260914-use-prepare-and-execute-check-authoring-names
status: active
alignment: aligned
createdAt: 2026-09-14T06:21:03Z
purpose: 让 Check 作者函数名称直接表达准备输入与执行领域工作的权限
background: 现有 preflight 与 execution 名称弱化实际职责，生命周期整理要求按当前权限直接切换且不保留兼容层
decision: 将字段直接改为 prepare 与 execute，保留 task-local 时序、结果语义和 execution context
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: 260901-run-check-preflight-with-task-admission
    summary: 保留 task-local 准备语义并直接切换公开命名
---

## 目的

- 让 Definition 作者从字段名称直接区分 invocation-local options 准备与领域结果执行。
- 保留已验证的 task-local admission、取消、结算和 fingerprint 边界，同时一次性移除旧命名。
- 让公共类型、运行时诊断和内部 owner 使用同一 preparation / execution 词汇。

## 背景

- 当前 `preflight` 只在 Check 获准入后运行，可以准备 options、阻止执行或提供 fallback；它不是 invocation-wide 预检。
- 当前 `execution` 是 Check 真正形成 result、messages、Records 与 handoff 的领域函数。字段名是名词，和相邻 `prepare` / `decide` 的可操作命名不一致。
- `260901-run-check-preflight-with-task-admission` 已固定 task-local 时序与结果语义，但也固定了旧名。本次生命周期整理已获准直接不兼容切换，不保留 alias、双读或 deprecation。
- `CheckExecution` 与 `CheckExecutionContext` 描述领域执行类型和上下文，不是扩展槽位名称；改字段不要求把所有 execution 领域术语机械改名。

## 决策

- 采用: `Check.preflight` 直接改为 `Check.prepare`，根导出 `CheckPreflight` / `CheckPreflightResult` 直接改为 `CheckPreparation` / `CheckPreparationResult`。结果的 `success.preparedOptions`、`failure/block` 与 `failure/continue.fallback` 分支保持不变。
- 采用: `Check.execution` 直接改为 `Check.execute`；保留 `CheckExecution` 与 `CheckExecutionContext` 类型名称和现有 result、Record、message、dependency、handoff 权限。
- 采用: `prepare` 继续只在 owning Check 满足 relation、mutex、capacity、priority 与 cancellation admission 后至多一次运行，再决定是否调用 `execute`。省略、success、continue、block、throw、malformed 和 cancellation 的行为继续遵循 task-local preparation owner。
- 采用: closed Definition grammar 只接受新字段；旧字段、混合新旧字段和旧类型导出立即失败。内部文件/类型/变量、诊断事件、reason code、settlement phase、默认 Checks、示例、测试、已安装消费者与文档在同一批次切换。
- 采用: `prepare` / `execute` 与 terminal effects 的函数身份、闭包和存在性继续排除在 declarative snapshot 之外；等价声明的 fingerprint 不因本次改名改变。
- 不采用: compatibility alias、双读/双写、全局 preparation barrier、第五种 Check status、把 preparation 当 execution、公开 invocation event bus，或机械改名仍准确表示领域 execution 的类型和事实。
