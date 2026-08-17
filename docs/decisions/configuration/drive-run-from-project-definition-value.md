---
title: 由 Project Definition 值驱动 Package Run
status: archived
alignment: unaligned
createdAt: 2026-08-14T08:18:34Z
purpose: 让一个已导入的项目定义值拥有运行语义，而 Package Run 只补充当次控制参数。
background: 项目运行脚本已经绑定配置；再次传入 source selection 或命令语法会复制配置 owner。
decision: Package Run 接收 Project Definition 值和少量 Run Controls，并由该定义驱动完整 Task 执行与效果。
relations:
  - type: 修订
    target: configuration/drive-product-execution-from-project-definition.md
---

## 目的

- 让项目政策、Checks、门禁、调度和工具效果由一个类型化且可验证的配置 owner 统一驱动。
- 让项目运行脚本只绑定配置并向其他调用方暴露少量当次控制参数，不复制旧 CLI command grammar 或产品政策。

## 背景

- Project Definition 已被选择为组合 policy、Product-provided 与项目提供的 Checks/functions、TaskPlan、scheduler 和 effects 的单一 TypeScript value。
- 项目运行脚本已经用普通 import 获得该值，因此 public API 不需要 project root 下的配置发现、source selector 或 module-loading protocol。
- Changed files、reference、effect destination、取消信号等信息只在特定 invocation 才存在，适合作为 run controls；它们不应重新拥有稳定项目政策。

## 决策

- 采用: Project Definition value 是产品执行语义的主要公开配置输入，拥有 policy catalog、Check declarations/selection、gate policy、scheduler、reporting、cache、output 和 operational dependency configuration；各字段继续由对应领域 owner 定义和验证。
- 采用: Package Run 接受一个 Project Definition value 与一个 closed Run Controls object，并通过既有 Check/Record、TaskPlan 和 shared scheduler owners 完成完整运行。
- 采用: Run Controls 只表达无法稳定写入项目定义的当次信息，例如 changed-file set、显式 comparison reference、取消信号、调用方要求的 effect override 或外部依赖位置覆盖；它们不能注册 Check、改写 policy 或提升授权。
- 采用: 项目拥有的运行脚本绑定其 Project Definition，并决定向其他调用方暴露哪些受支持 controls；该脚本是 package API consumer，不是 Product CLI、`bin` 或第二套产品行为 owner。
- 采用: Gate 是配置中 selected policy 对 execution records 的结果，不是另一种 run method 或 command。配置定义函数只形成同一 definition value，不建立第二套执行模型。
- 不采用: 让 Product 根据路径发现配置，或以 `scan`、`gate`、`init` 等旧 CLI 动词设计 public methods、source selection 或 command union。
