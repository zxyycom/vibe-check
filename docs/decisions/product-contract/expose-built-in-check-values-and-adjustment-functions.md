---
title: 公开内置 Check 值与独立调整函数
status: archived
alignment: unaligned
createdAt: 2026-08-15T06:16:14Z
purpose: 让 package 同时提供 Project Definition 构造、Product Run 和普通内置 Check 的字段调整能力。
background: 内置 Check 不再携带调整 methods，原有 exactly-two-callable surface 无法交付独立 replace 与 append。
decision: 目标 package 导出四个职责明确的 functions 和三个 non-callable 内置 Check values，不公开第二执行入口或内部 runtime surface。
relations:
  - type: 修订
    target: product-contract/expose-built-in-check-values-alongside-config-and-run.md
---

## 目的

- 让项目能从同一 package 构造 Project Definition、执行 Product Run，并通过受支持的辅助函数调整 Product 提供的内置 Check 默认值。
- 让公开 callable inventory 直接表达每个 function 的责任，不用“非 operation”之类分类隐藏真实 exports。

## 背景

- 三个内置 Check 是可直接放入 Project Definition Check tree 的普通数据值；它们不公开 scanner binding、applicability、operational dependency resolution 或 executable object。
- 早期 surface 把调整能力放在内置值 methods 上，因此可以把顶层 callable exports 限定为配置定义函数和 Package Run。改用独立辅助函数后，继续声称 exactly two callable exports 会与实际 entry、declarations 和 acceptance 矛盾。
- `replace` 与 `append` 只构造内置 Check 数据，不执行 Product Run、不注册 global state，也不形成第二个产品执行入口。

## 决策

- 采用: 目标 package runtime 顶层恰好导出四个 functions：Project Definition construction、Product Run、内置 Check replacement 和内置 Check append。具体 public symbol names 由 publication naming decision 拥有。
- 采用: Project Definition construction 只形成 typed value；Product Run 是唯一执行产品工作的 function；两个 Check adjustment functions 只返回新的普通内置 Check 数据。
- 采用: package 另外导出 duplicate detection、file metrics 与 function metrics 三个 non-callable 内置 Check values。它们表达稳定 Check identity、public metadata、typed default options 与可选叶子排程字段，可直接作为 Check tree leaf。
- 采用: Package Run 在 invocation 内根据已验证的内置 Check data 解析 private binding、applicability 与 operational dependency snapshot。项目不能通过公开值或 adjustment functions 替换这些 private runtime concerns。
- 采用: 支撑 Project Definition、内置 Check adjustment、Check tree 和结果消费所需的 public types 可以导出；它们不得泄漏 Core、manager、scheduler、Task、binding、host implementation 或 internal module paths。
- 不采用: 额外 public callable export、builder/registration API、global mutable registry、Product-owned CLI / `bin`、第二执行入口，或让项目以同名 custom declaration 覆盖内置执行语义。
