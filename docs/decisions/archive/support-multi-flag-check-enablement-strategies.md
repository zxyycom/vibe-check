---
title: 支持多 flag Check 启用策略
status: archived
alignment: aligned
createdAt: 2026-09-01T14:32:05Z
purpose: 让 Check 用一个闭合声明表达全部、任一、全无或非全部 flag 条件。
background: 单 token presence 无法承接多个 flag 的四种常见集合判断，继续放在 callback 会恢复重复控制逻辑。
decision: executable Check 使用 enabledByFlags 的非空 flags 集合与四态 mode，在 author work 前统一判定是否启用。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: use-string-flags-for-project-run-controls.md
---

## 目的

- 让项目不编写 callback 分支即可声明“全部存在、至少一个存在、一个都不存在、并非全部存在”四种常见多 flag 启用条件。
- 让四种策略共享同一个可验证、可规范化的 flags 集合与 preparation settlement，不形成四套字段或执行路径。
- 保留完整 Check facts、dependency、aggregation、静态 graph validation 与复杂条件的 Check-local 责任。

## 背景

- `RunControls.flags` 已经形成 canonical invocation-wide presence token 集合，Product 可以对普通 Check 的声明集合执行确定性比较。
- `all` / `any` / `none` / `not-all` 共享 exact token membership、Definition identity 和未匹配 settlement；稳定差异只有集合 predicate。
- 空声明集合会让 `all` / `none` 成为真而 `any` / `not-all` 成为假，产生没有实际 control token 的真空语义，不符合简易启动控制的使用目标。
- 决策形成时，单数 `enabledByFlag` 尚未提交或发布，不存在必须保留的 consumer compatibility；同时支持单数与复数 grammar 只会增加 authoring、validation 和文档成本。

## 决策

- 采用: executable Check 可以声明 `enabledByFlags: { flags, mode }`。`flags` 是非空 dense string-token array，每项为非空字符串；Definition 对它复制、去重、按文本排序并冻结。
- 采用: `mode` 只允许 `all`、`any`、`none`、`not-all`。`all` 要求每个声明 token 都存在；`any` 要求至少一个存在；`none` 要求一个都不存在；`not-all` 要求至少一个声明 token 不存在。
- 采用: Check 未声明 `enabledByFlags`，或声明 predicate 匹配时，继续普通 preflight、Task admission 与 callback 流程。predicate 不匹配时，Product 在任何 owning preflight、execution、scanner 或其它 Check-local work 前结算为 `not-applicable`，reason code 为 `flag-condition-not-matched`，duration 为 `null`，且不产生 started fact。
- 采用: `enabledByFlags` 是 executable Check 的 canonical declarative identity，进入 validation、normalization 与 fingerprint；container 不接受也不向 descendants 继承。完整静态 graph 仍在 control settlement 前验证，disabled Check 仍进入 facts、dependency readback 与显式 aggregation，并允许 downstream 正常 admission。
- 采用: callback 继续获得完整 canonical `project.flags`。超出四种集合 predicate 的领域条件继续由 owning Check 解释；Product 不定义 token vocabulary、value payload、任意 predicate 或嵌套布尔表达式。
- 不采用: 空 control 集合、exactly-one 策略、四个平行控制字段、单数 `enabledByFlag` 兼容 alias、动态 Check 注册或 container control inheritance。
