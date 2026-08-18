---
title: 只公开配置定义与工具运行两个操作
status: archived
alignment: unaligned
createdAt: 2026-08-12T10:54:44Z
purpose: 让使用者只调用一个 TypeScript 配置定义操作和一个配置驱动的工具运行操作。
background: 额外 callable helper、CLI、bootstrap、资源入口或内部协议都会形成第三种产品操作和新的兼容承诺。
decision: Public package API 恰好公开配置定义与工具运行两个 callable operations；必要 public types 不计为操作，具体名称另行确认。
tags:
  - product-contract
relations: []
---

## 目的
- 让使用者只学习一条稳定路径：在 TypeScript 文件中调用配置定义操作，然后调用工具运行操作。
- 让 public runtime surface 与配置驱动架构一致，不把内部实现、迁移工具或便利功能扩展成额外产品操作。

## 背景
- Project Definition 已被确定为 policy、Checks、gate、scheduler、reporting、cache 和 output 的主要公开配置入口。
- 程序化 API 已被确定为唯一正式执行入口；Product CLI、argv contract、worker/child-process protocol 和 internal Core 都不属于消费者契约。
- 创建配置文件、定义配置值、运行工具和维护内部 execution lifecycle 是不同责任。使用者需要定义配置值和运行工具，但不需要 Product 创建文件或公开内部 runtime。
- TypeScript input/result declarations 支撑两个操作的类型安全，不是独立 runtime behavior。

## 决策
- 采用: Public package API 恰好提供两个 callable operations：一个操作在使用者拥有的 TypeScript Project Definition 文件中定义并类型检查 closed project configuration；另一个操作加载该 definition 并运行完整工具。
- 采用: 配置定义操作返回 Product runtime 能直接验证和执行的同一 plain definition shape，不建立 brand、builder state、registration lifecycle 或第二种配置 authority。
- 采用: 工具运行操作接收 project root、definition source selection 与必要的 invocation-scoped operational context；policy、Check selection、gate、scheduler、logs、cache 和 output 继续由 Project Definition 驱动。
- 采用: 支撑两个操作所必需的 public input/result/type declarations 可以导出，但它们不增加 callable operation，也不授权公开 internal model。
- 采用: Project Definition 文件由使用者创建并拥有。Package 不提供其它 public callable helper、`init`、bootstrap、scaffold、create-file、template/resource API、CLI、`bin`、worker/child-process entry、IPC protocol、Core、manager、scanner adapter 或 scheduler surface。
- 采用: “配置定义”和“工具运行”是语义角色，不选择 package、export、function、type、file path 或 environment identifier 的具体公共名称；当前文字 `run` 也不自动成为 future function name。
