---
title: 使用 Bun 托管的 TypeScript Project Definition
status: active
alignment: unaligned
createdAt: 2026-08-05T10:31:35Z
purpose: 用一个可执行且类型化的项目入口组合政策、内置检查和项目自定义检查。
background: JSON 配置只能表达固定数据，无法自然组合运行时 Check 与其函数绑定，继续扩展会形成第二套动态接入协议。
decision: 固定发现 .vibe-check/config.ts，以 Bun 加载 Project Definition 并在执行前归一化冻结；不保留 JSON 双读或固定 semantic config v2。
relations:
  - type: 归并
    target: configuration/use-json-filename-for-commented-config.md
  - type: 归并
    target: configuration/use-fixed-semantic-config-v2.md
---

## 目的
- 让项目使用普通 TypeScript 组合内置与自定义 Check，同时继续向 Core 提供可验证的政策和公共 metadata。
- 只维护一个 project entry、发现规则和迁移方向，不让 JSON 配置与 executable definition 长期并存。

## 背景
- 项目自定义 Check 需要提供函数绑定，JSON 无法表达这一能力；另建命令协议或插件配置会复制模块组合机制。
- Bun 是 Vibe Check 的产品 runtime，可以直接承接 TypeScript module 的加载与类型化 authoring。
- 产品尚未发布，不需要为 `.vibe-check/config.json`、commented JSON 或固定 semantic config v2 保留兼容包袱。

## 决策
- 采用: 默认 project entry 固定为 `<project-root>/.vibe-check/config.ts`，显式 config selection 也选择受支持的 TypeScript Project Definition；Bun 负责 module evaluation，扫描项目本身不因此必须使用 Bun 或 TypeScript。
- 采用: Project Definition 可以用 TypeScript 组合检查，但只向 Core 贡献 owner-validated serializable policy/metadata 与位于明确 slot 的 opaque custom runner binding；loader 不序列化、检查或哈希函数实现。
- 采用: Module evaluation 完成后，Product 在任何 check work 前一次性归一化、验证并冻结 policy data、resolved Check catalog 和 execution contributions；动态组合只发生在加载与 planning 阶段，不允许执行中注册。
- 采用: `.vibe-check/config.json`、commented JSON、JSON Schema 和 fixed semantic config v2 退出 active contract；新 runtime 不建立 dual reader、自动转换或静默 fallback，并对遗留入口提供明确迁移诊断。
- 不采用: 再增加一套 command/plugin 配置来表达 TypeScript 已能直接提供的 runner，或把任意 Project Definition 数据未经 owner validation 交给 Core。
