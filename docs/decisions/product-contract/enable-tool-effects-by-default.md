---
title: 默认启用工具运行副作用
status: active
alignment: unaligned
createdAt: 2026-08-12T10:30:31Z
purpose: 让 public package API 默认完成工具本身应提供的日志、缓存和输出工作，而不是退化为只返回内存数据的无状态计算函数。
background: 产品是执行型质量工具；程序化调用改变集成入口，但不取消工具对可观察进度、可复用缓存和持久输出的责任。
decision: Public package API 默认通过 Product-owned runtime 启用受控日志、缓存和工具输出，并同时返回结构化结果；调用方可用公开配置显式调整或关闭这些效果。
relations: []
---

## 目的
- 让普通 API consumer 无需自行重建 reporter、cache 或 artifact publication 才能获得完整工具行为。
- 同时保留结构化返回值，使调用方能够组合领域结果，而不解析 console 或回读文件才能理解执行结果。

## 背景
- 质量扫描是具有 filesystem、Git、subprocess/thread、日志、缓存和输出生命周期的工具工作，不是单一纯计算函数。
- API-first 的价值是移除 argv、help、exit-code 和 console-text parsing 作为产品协议，不是禁止实现所需的副作用或要求调用方注入全部低层能力。
- 默认副作用如果没有 closed configuration、ownership 和 completion semantics，会污染宿主或让缓存、日志和结果输出互相漂移。

## 决策
- 采用: 普通工具运行 invocation 默认启用 Product-owned 日志/progress、适用缓存和 canonical tool output；这些效果由 default runtime 执行，不要求消费者实现 filesystem、Git、process/thread、cache store 或 reporter ports。
- 采用: Public Project Definition 与 invocation configuration 明确控制支持的 reporter、cache、output target、verbosity 和禁用选项；环境变量只覆盖已声明的 operational values，不能改变 policy、network、安全或 gate 授权。
- 采用: 工具运行操作无论是否产生副作用都返回 closed structured result，其中包含领域执行、diagnostics、decision 和每项 effect 的实际 completion/status；调用方不需要解析日志或重新读取 artifact 才能恢复相同核心事实。
- 采用: Product 为默认 output/cache 路径、写入 ownership、atomicity、collision、cleanup、cache invalidation 和敏感材料边界负责；具体公共名称和默认路径必须经过公共命名与配置决策。
- 采用: 调用方可以通过公开配置显式静默 reporter、禁用 cache 或禁止持久 output，供编辑器、测试和特殊宿主使用；这些是受支持的工具模式，不改变正式 execution entry。
- 不采用: 把“程序化 API”解释为默认无日志、无缓存、无文件输出，或把所有效果责任转交给使用方自行包装。
