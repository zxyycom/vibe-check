---
title: 在独占运行目录显式使用固定诊断文件名
id: 260908-allow-channel-only-diagnostic-filenames-in-invocation-controls
status: active
alignment: aligned
createdAt: 2026-09-08T01:32:41Z
purpose: 简化 Gate 等独占运行目录中的日志定位，同时保留共享目录默认命名与防覆盖行为。
background: 已独占的 invocation 目录重复携带时间和 UUID 后缀，但全局删除后缀会破坏共享 target 的隔离。
decision: 通过单次 RunControls 选择 unique 或 channel 文件名，默认不变，Gate 显式使用固定 channel 名。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations: []
---

## 目的

- 调用方已拥有独立运行目录时，Core/Scheduler 日志可直接按职责定位，不再重复 filename identity。
- 普通 Product 用户继续复用现有默认目录与唯一文件名，不被 Gate 的局部便利改变行为。

## 背景

- Gate 必须从 exact installed public entry 调用 Product，不能借 private hook、环境变量或路径识别改变内部路径策略。
- 目录独占由调用方安排，Product 不能从目录名称推断它；现有 logger 已通过 exclusive create 拒绝同名目标。
- 文件名与日志内容 correlation 是不同职责，缩短文件名不要求删除 Product UUID、sequence 或 elapsed。

## 决策

- 采用: invocation-only `diagnosticLogFileNaming` 只接受 `unique` 或 `channel`。省略保持 unique；channel 只将既有 channel 文件映射为 `core.log`、`scheduler.log`，不接受任意模板、callback 或 basename。
- 采用: Gate 在已准备的 invocation root 中显式选择 channel；Product 不新建每次运行的子目录，不从路径形状推断模式，也不在关闭后 rename。
- 采用: 同名文件保持 exclusive-create failure，不覆盖、追加或自动回退唯一名；channel 独立创建与结算，不引入整组原子 claim、锁或回滚。调用方对独占目录和其它外部修改负责。
- 采用: 该字段属于 RunControls path choice，不进入 Definition、outputs merge 或 declarative fingerprint。非法值在 author work 前以既有 invalid-run-controls 失败；禁用 diagnostic 时不创建文件。
- 采用: 保持 per-channel readback 为真实预计算 target，并沿现有 setup/write/close failure、其它输出与最终结果优先级结算。Product invocation identity、timestamp、global sequence 与 monotonic elapsed 不变。
- 不采用: 全局固定文件名、Product 统一目录布局、Gate 绕过公共 API、writer/readback 之后重命名或通用日志配置框架。
