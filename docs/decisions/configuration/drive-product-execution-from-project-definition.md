---
title: 由 Project Definition 驱动产品执行
status: archived
alignment: unaligned
createdAt: 2026-08-12T10:30:34Z
purpose: 让工具行为由一个类型化项目定义统一配置，而不是把公开 API 设计成第二套命令或操作语法。
background: 产品核心是配置驱动的质量工具；把 scan、gate、reporting、cache 和 output 重复编码成调用方法或 command union 会形成并行行为 owner。
decision: Project Definition 拥有执行配置；public package API 只加载并运行它，另接收必要的当次上下文。
relations: []
---

## 目的
- 让项目政策、检查选择、门禁、调度和工具效果由一个类型化且可验证的配置 owner 统一驱动。
- 让 public package API 保持为稳定调用边界，而不是把旧 CLI command grammar 搬成函数、method 或 discriminated command union。

## 背景
- Project Definition 已被选择为组合政策、built-in Checks、custom Checks 和 scheduler authoring 的单一 TypeScript source。
- Scan、gate、reporting、cache 与 output 彼此相关；若同时由 Project Definition 和公开 operation-specific methods 决定，会产生 precedence、重复配置和行为漂移。
- 调用仍需要 project root、definition selection、changed-file/reference input 或当次环境覆盖等上下文，但这些 operational inputs 不应重新拥有项目政策。

## 决策
- 采用: Project Definition 是产品执行语义的主要公开配置入口，拥有 policy catalog、Check declarations/selection、gate policy、scheduler、reporting、cache 和 output configuration；各字段继续由对应领域 owner 定义和验证。
- 采用: Public package API 提供一个配置驱动的正式执行 capability：调用方提供 project root、Project Definition source selection 与确有必要的 invocation-scoped operational overrides，Product 加载、验证并执行完整定义。
- 采用: Invocation overrides 只表达无法稳定写入项目定义的当次上下文，例如 changed-file set、显式 reference、宿主提供的 output destination override 或禁用 effect；它们使用 closed schema 和明确 precedence，不能注册 Check、改写 policy 或提升授权。
- 采用: Gate 是 Project Definition 中选定政策对 execution records 的决策结果，不作为第二套产品 command。Neutral observation 使用 Product-owned neutral definition；需要项目 gate 时必须成功加载 Project Definition。
- 采用: Project Definition authoring 只负责形成同一 closed definition，不建立与 execution 并列的 command model；是否以及如何公开 authoring operation 由更具体的 public-surface 与命名决策承接，本决策不授权 bootstrap 或 file creation surface。
- 不采用: 以 `scan`、`gate`、`init` 等旧 CLI 动词预先决定 public methods，或使用一个公开 command discriminant 复制 argv routing。
