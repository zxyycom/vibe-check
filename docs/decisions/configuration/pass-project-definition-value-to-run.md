---
title: 将 Project Definition 值交给 Package Run
status: active
alignment: unaligned
createdAt: 2026-08-14T08:18:34Z
purpose: 让项目用普通 TypeScript 导入配置，并把完整定义值直接交给 Package Run。
background: 项目已经拥有配置文件和运行脚本；Product 无需再次发现、加载或传输其中的函数。
decision: 项目运行脚本导入唯一 Project Definition 并把该值传给 Package Run；Product 验证定义但不拥有配置文件发现或加载。
relations:
  - type: 修订
    target: configuration/use-single-typescript-project-definition.md
---

## 目的

- 让项目用普通 TypeScript 组合政策、内置 Checks、自定义函数和 TaskPlan factories，并以一个配置值驱动一次完整运行。
- 让配置文件与运行脚本各自只有一个清楚责任，不让 Product 复制 Bun module loading、固定路径发现或函数传输机制。

## 背景

- 项目需要维护两项集成材料：一个定义项目行为的 TypeScript Project Definition 文件，以及一个绑定该定义并供其他调用方使用的项目运行脚本。
- 项目运行脚本可以通过普通 import 获得配置 default export；同一 Bun runtime 中的函数和 closures 可以直接交给 Check/Task planning 与 execution owners。
- Product 再按路径发现或重新加载同一文件会建立第二套 selection、module identity 和 failure semantics，也会迫使函数跨执行边界传输。
- JSON 无法自然表达项目函数；这一点仍要求 TypeScript hard cut，但不要求 Product 拥有配置文件路径或 module loader。

## 决策

- 采用: 项目自行创建并持有一个 TypeScript Project Definition 文件；canonical authoring 通过配置定义函数形成 closed definition，并由该文件 default export。
- 采用: 项目自行创建并持有一个运行脚本。该脚本用普通 TypeScript import 获得 Project Definition 值，并把它作为 Package Run 的第一个语义输入；一次 invocation 只接受一个 definition value。
- 采用: Product 在任何 Check work 前验证 authoring value、归一化并冻结 declarative policy/metadata/scheduler/effect data，再把明确 function slots 中的 custom runner 与 TaskPlan factory 直接交给既有 execution owners；执行中仍不得注册新的 Check 或 Task。
- 采用: Product 不发现、选择、import 或重新 evaluate 使用者的配置文件，也不拥有其固定路径。项目可以自行命名和组织配置文件与运行脚本；文档示例不是路径兼容承诺。
- 采用: 当前 JSON reader、comment grammar、JSON Schema 与旧配置选择退出目标 contract；不建立 dual reader、自动转换或静默 fallback。
- 不采用: 用 module URL、配置文件路径、worker message、function serialization 或 Product-owned loader 代替项目运行脚本已经完成的普通 import。
