---
title: 提供由 Check 配置的通用有界 Finding 展示
status: active
alignment: aligned
createdAt: 2026-08-31T09:23:56Z
purpose: 让内置与自定义 Check 共用有界 Finding 摘要机制，同时由 producing Check 决定安全字段、上限和完整明细入口。
background: Finding 没有统一数据形状或明细位置，固定在内置 Check 的私有机制又使自定义 Check 重复实现相同的有界投影。
decision: 提供公共纯函数接收 Check-owned 上限、单条格式化与超限 hook，只生成 messages，不拥有或截断完整 Finding facts。
tags:
  - product-contract
relations:
  - type: 修订
    target: present-bounded-safe-finding-summaries.md
---

## 目的

- 让 package-provided 与 custom Check 使用同一个可测试的有界 Finding presentation mechanism。
- 让每个 producing Check 继续决定哪些字段可安全显示、显示多少项，以及 consumer 应到哪里读取完整明细。
- 保持 Finding facts、Records、terminal status、aggregation 与 machine publication 的既有责任边界。

## 背景

- Records 没有统一 Finding shape；路径、位置、等级、敏感字段和完整明细所在位置都由 producing Check 决定。
- 只在四项随包 Check 内共享固定十条上限，能解决当前展示，却迫使 custom Check 重复切片、计数和 overflow 处理。
- Product 若自动读取 Records 或规定统一深入查看路径，会猜测并错误拥有 Check-specific data 与 output location。
- 已有 terminal messages 是 settlement-time 人读与程序化 readback 边界，能够承接 Finding 摘要而不建立第二事实模型。

## 决策

- 采用: package root 提供通用 `presentCheckFindings(...)` 纯函数；调用方传入已稳定排序的 Finding collection、非负安全整数 `limit`、单条 `message` hook 和 `omittedMessage` hook。
- 采用: helper 只调用前 `limit` 项的单条 hook；超限时向 overflow hook 提供 omitted references、omitted/presented/total counts，由 Check 决定省略项等级和完整明细的真实读取位置。
- 采用: helper 只返回冻结的 Check messages，不读取 Records、不发布 artifact、不保存或截断完整 Finding facts，也不改变 terminal status、aggregation 或 machine output。
- 采用: producing Check 对每条 message 的安全字段、code、level、文字和完整 Finding 存储负责；不得因为存在 generic helper 而建立统一 Finding schema 或默认输出路径。
- 采用: 四项随包质量 Check 继续各自选择十条上限与安全字段，并迁移到公共 helper；十条不是 custom Check 的 Product default。
- 不采用: 自动把任意 Record 当作 Finding、由 renderer 猜测深入查看位置、把完整 Finding 复制到 messages，或提供不可移植的交互式终端展开。
