---
title: 公开配置定义函数与 Package Run
status: archived
alignment: unaligned
createdAt: 2026-08-14T08:18:33Z
purpose: 让 package 只提供配置定义函数与 Package Run，并由项目运行脚本向其他调用方提供已绑定入口。
background: 配置 authoring 与一次运行是两个稳定角色；文件生成、CLI 和私有协议不属于 package API。
decision: Package 公开配置定义函数与 Package Run 两个 callable operations；项目运行脚本绑定配置并向其他调用方暴露项目 Run。
tags:
  - product-contract
relations:
  - type: 修订
    target: expose-two-public-operations.md
---

## 目的

- 让项目维护两个清楚的集成材料：一个定义项目函数和政策的配置文件，以及一个绑定配置并供其他调用方执行的运行脚本。
- 让 package API 只提供形成配置值和执行该值所需的最小能力，不把项目 Run、文件管理、命令协议或内部执行 owner 公开出去。

## 背景

- TypeScript Project Definition 需要组合普通数据、custom runner 和 TaskPlan factory；配置定义函数可以提供可靠推导与 authoring 体验，而不建立第二种配置 authority。
- 项目运行脚本需要导入自己的配置，并调用 Package Run；其他调用方只需要调用该项目 Run 及其允许的 controls。
- Product-owned CLI、配置 discovery、worker protocol、Core、manager 和 scheduler export 都会建立不必要的额外集成 surface。

## 决策

- 采用: Public package API 恰好提供两个 callable operations。配置定义函数接受并返回同一 closed Project Definition authoring value；Package Run 接受该 definition value 与少量 Run Controls，并返回完整异步执行结果。
- 采用: 配置定义函数不建立 brand、builder state、registration lifecycle 或第二种 runtime input；完整 runtime validation 仍在 Package Run work 前执行。
- 采用: 项目配置文件 default export 配置定义函数的结果。项目运行脚本普通 import 该值、调用 Package Run，并可以把项目允许的 controls 通过项目 Run 暴露给其他 JavaScript/TypeScript consumer 或项目自有命令适配器。
- 采用: Package Run 直接通过既有 Check/Record、TaskPlan 与 shared scheduler owners 调用配置中的 custom functions；Task dependency、bounded parallelism 和 named resources 继续由 Task system 管理。
- 采用: 支撑两个 callable operations 所必需的 public definition/control/result types 可以导出，但不授权公开 internal Core、manager、scanner adapter、scheduler 或 execution bindings。
- 不采用: Package `init`、bootstrap、scaffold、create-file、template/resource API、Product CLI、`bin`、配置 discovery、public worker/process entry、IPC protocol 或任意内部源码路径。
- 采用: “配置定义函数”和“Package Run”是 package callable roles；“项目 Run”是项目运行脚本导出的绑定入口。本决策不选择 package、function、type 或 environment identifier 的具体公共字符串，也不固定项目配置文件或运行脚本的路径。
