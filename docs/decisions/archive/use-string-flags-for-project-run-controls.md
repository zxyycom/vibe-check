---
title: 对 Project Run controls 使用字符串 flag
status: archived
alignment: aligned
createdAt: 2026-08-20T02:15:14Z
purpose: 让 Project Run 的共享 invocation control 使用简单且可验证的字符串 flag 集合。
background: value payload 或 Product 对 token 的解释会扩大 Run Controls 责任，并模糊 Check 自有配置边界。
decision: RunControls 使用可选字符串 flags；callback 获得规范化的必需 flag 集合，Product 只传递而不解释 token。
tags:
  - configuration
relations: []
---

## 目的

- 让项目可在单次 Run 中把本地布尔 control 传给 Check，而不把它写入 Project Definition 或 Check options。
- 让每个 Check 在 callback 中根据稳定、不可变的共享 flag 集合决定本地执行或既有 `not-applicable` 结果。
- 保持 Run Controls 是有限的 invocation 输入，而非通用项目数据通道。

## 背景

- 已对齐的 Run Controls 边界只允许共享 invocation 输入，Check-owned options 继续拥有执行配置。
- 布尔 map 会同时引入缺失与 `false` 两种等价表示，以及 key/value grammar 和额外 validation 责任。
- caller 输入顺序、重复项和可变引用不应影响同一次 Run 中各 Check 观察到的 control 事实。

## 决策

- 采用: `RunControls` 提供可选 `flags?: readonly string[]`，作为 Project Run 的唯一 Product-level flag 输入；每个 token 必须是非空字符串。
- 采用: token 的 presence 表示 `true`，absence 表示 `false`；不接受显式 `false`、value-bearing payload 或第二种 flag input grammar。
- 采用: Product 对已提供的 flags 验证后复制、去重、按字典序排序并冻结，省略或 `undefined` 规范化为冻结的空集合。
- 采用: 每个 callback 的 `context.project.flags` 是必需的 `readonly string[]` snapshot；Check 用本地 `includes` 判断自己的条件，不能依赖输入顺序、重复次数或 caller array identity。
- 采用: Product 只验证、规范化和传递 token；不定义 token vocabulary、层级或业务含义，也不据此修改 Check options、动态 Task graph、scheduler admission 或 dependency semantics。
- 不采用: boolean map、任意结构化 invocation data、Product-provided token helper、Product CLI flag grammar，或将 token 解释扩张为 value payload。
