---
title: 将 Project Definition 的 Check functions 交给 Run
status: active
alignment: unaligned
createdAt: 2026-08-17T15:28:18Z
purpose: 让项目导入唯一 Project Definition value，并把其中的普通 Check execution functions 直接交给 Package Run。
background: 项目已经负责加载配置 module；Product 无需重新发现文件或把 functions 传输到另一 runtime。
decision: 项目运行脚本把完整 definition value 传给 Run；Product 验证数据并在调用方 runtime 执行其中的 Check functions。
relations:
  - type: 修订
    target: configuration/pass-project-definition-value-to-run.md
---

## 目的

- 让项目用一个 TypeScript value 组合政策、Product 默认 Checks 与项目 Check execution functions，并驱动完整运行。
- 保持配置文件加载和运行绑定由项目拥有，不建立 Product-owned source discovery 或 function transport。

## 背景

- 项目运行脚本通过普通 import 已经获得 Project Definition，definition 中的 functions 和 closures 已存在于调用方 Bun runtime。
- 当前 Check model 的每项 execution 只是一项独立 Check callback；不需要 TaskPlan factory 或 execution-time Task registration。
- JSON 无法自然表达项目 functions，因此继续使用 TypeScript hard cut。

## 决策

- 采用: 项目自行持有一个 TypeScript Project Definition file，并由项目运行脚本普通 import 后作为 Package Run 的第一个语义输入。
- 采用: Product 在任何 Check work 前验证完整 definition，并形成冻结的 normalized declarative snapshot；输入对象保持普通值，每个 execution-bearing Check function 随后交给既有 Run/Task owner。
- 采用: 执行中不得注册新的 Check 或 Task；recursive children 必须在 work 前完整展开并验证。
- 采用: Product 不发现、选择、import 或重新 evaluate 使用者配置文件，也不序列化、反编译或跨 runtime 重建 functions。
- 不采用: TaskPlan factory、Product-owned configuration loader、固定配置路径、dual JSON reader 或静默 fallback。
