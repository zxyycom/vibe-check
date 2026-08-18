---
title: 使用单一 TypeScript Project Definition
status: archived
alignment: unaligned
createdAt: 2026-08-12T09:38:14Z
purpose: 用一个可执行且类型化的项目入口组合政策、内置检查和项目自定义检查。
background: JSON 配置无法自然组合运行时 Check 与函数绑定；固定发现仍需要独立确认未来公共路径名称。
decision: 只选择一个 TypeScript Project Definition 并由 Bun 在执行前加载、归一化和冻结；固定路径名称在发布前另行确认。
tags:
  - configuration
relations:
  - type: 修订
    target: use-bun-typescript-project-definition.md
---

## 目的
- 让项目使用普通 TypeScript 组合内置与自定义 Check，同时继续向 Core 提供可验证的政策和公共 metadata。
- 只维护一个 Project Definition source、发现规则和迁移方向，不让 JSON 配置与 executable definition 长期并存，也不让当前内部路径未经命名判断成为未来公共入口。

## 背景
- 项目自定义 Check 需要提供函数绑定，JSON 无法表达这一能力；另建命令协议或插件配置会复制模块组合机制。
- Bun 是当前产品 runtime，可以直接承接 TypeScript module 的加载与类型化 authoring；扫描项目本身不因此必须使用 Bun 或 TypeScript。
- 固定 discovery path 会进入项目目录、文档、脚本和迁移诊断，是 public Project Definition contract；当前 repository 中已有路径只证明当前实现，不证明未来 package 应继续承诺相同名称。
- 产品尚未发布，不需要为当前 JSON workflow 保留兼容包袱，但 hard cut 旧格式与选择新的固定路径/API 标识是两个不同判断。

## 决策
- 采用: Product 每次 invocation 只选择一个受支持的 TypeScript Project Definition source；选择方式包括调用方显式提供的 source 与一个固定 discovery path，后者的具体目录和文件名称必须在 publishable candidate 前按公共命名决策确认。
- 采用: Bun 负责 selected module evaluation；Product 在任何 Check work 前一次性归一化、验证并冻结 policy data、resolved Check catalog 与 execution contributions。动态组合只发生在加载与 planning 阶段，不允许执行中注册。
- 采用: Project Definition 可以用 TypeScript 组合检查，但只向 Core 贡献 owner-validated serializable policy/metadata 与位于明确 slot 的 opaque custom runner binding；loader 不序列化、检查或哈希函数实现。
- 采用: 当前 JSON config reader、comment grammar、JSON Schema 与 fixed semantic config v2 退出目标 contract；新 runtime 不建立 dual reader、自动转换或静默 fallback，并在 hard cut 时为当前遗留入口提供明确迁移诊断。
- 采用: Project Definition fixed path、public authoring import 与相关 operational identifiers 从同一个 current public-contract source 取得已确认值；本决策不选择这些字符串，示例也不建立名称契约。
- 不采用: 再增加一套 command/plugin 配置来表达 TypeScript 已能直接提供的 runner，或把任意 Project Definition 数据未经 owner validation 交给 Core。
