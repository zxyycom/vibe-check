---
title: 让程序化 API 成为唯一正式产品执行入口
status: active
alignment: aligned
createdAt: 2026-08-12T09:12:51Z
purpose: 让 package 消费者通过类型化调用获得稳定结果，而不依赖产品拥有的 argv、console 或退出码协议。
background: 使用方需要把产品组合进自己的工具与流程；正式 CLI 会把调用方差异固化为额外产品契约。
decision: 版本化 package 只以 public package API 提供正式执行入口；产品不发布 CLI 或 bin，并提供可直接使用的默认 runtime。
tags:
  - product-contract
relations:
  - type: 拆分
    target: use-versioned-npm-package-release-unit.md
---

## 目的
- 让 JavaScript/TypeScript 消费者通过受支持的 package API 直接调用产品能力，并获得类型化、可组合且不依赖文本解析的结果。
- 让使用方可以按自己的命令、服务、编辑器或 agent 场景选择参数来源、交互形式和进程状态，而不把这些差异扩展成产品 CLI surface。

## 背景
- argv spelling、help 文案、stdout/stderr 排版和 exit code 属于命令适配器责任；把它们作为主要产品入口会让调用方必须围绕进程协议集成。
- 产品执行本身仍需要 filesystem、Git、environment、subprocess、worker 或其它 runtime 能力；程序化 API 不应要求每个消费者重新实现这些基础能力。
- Package 内部执行模块、worker entry 或进程协议可以服务实现隔离和调度，但内部可执行机制不等于面向消费者的 CLI contract。

## 决策
- 采用: 版本化 package 的 public package API 是唯一正式产品执行入口；Project Definition authoring operation 与必要公共类型由更具体的 public-surface 决策承接，但不建立第二个执行入口。
- 采用: 产品 package 不发布正式 CLI、package `bin`、argv contract、help contract 或产品级 exit-code mapping；需要 CLI 的 repository tooling 或外部消费者自行拥有适配器，并通过 public package API 调用产品。
- 采用: 工具运行操作接受经过 runtime validation 的类型化 invocation input，并返回结构化执行结果、diagnostics、decision evidence 与已请求的 publication 结果；调用方不需要通过 console 文本或落盘 artifact 反向恢复核心结果。
- 采用: 产品提供可直接使用的默认 runtime，负责快照受支持的 ambient environment、解析平台前提，并提供 Product-owned filesystem、Git 与实际执行所需的 process/thread adapters。调用方只在受支持的类型化 operational input 上选择覆盖；显式 operational input、受支持的环境变量与产品默认值必须拥有确定 precedence。
- 采用: Ambient environment 和 operational overrides 不得改变 Project Definition 拥有的语义政策，也不得提升 network、安全或 gate 授权。
- 采用: Product 可以使用 package-private module、worker 或 child process 实现 public package API；这些入口不通过 public exports 或 `bin` 暴露，也不成为调用方必须理解的协议。
- 采用: Product contract 对 CLI surface 执行 hard cut，不保留 deprecated public alias、argv compatibility 或双入口迁移期；repository tooling 与其它命令适配器始终作为 public package API 的普通消费者存在。
- 采用: 本决策不选择 registry package、export subpath、函数名、类型名或环境变量名；这些 package 公共契约名称遵守独立的命名决策，Vibe Check 产品显示名不由本决策重新打开。
- 不采用: 直接导出内部 Core、manager、scanner adapter、scheduler 或任意源码路径作为通用 embedding API。
