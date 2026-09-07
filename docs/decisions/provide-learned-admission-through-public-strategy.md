---
title: 通过公共策略接口提供可选学习准入
status: candidate
alignment: null
createdAt: null
purpose: 让开发者与使用者以同一公开接口显式接入和配置学习准入能力。
background: 内置 learned kind 使历史输入和诊断拥有普通策略作者没有的特权，无法体现同层扩展。
decision: 删除专用 learned kind，以公开策略工厂和调用方配置承接学习、选择与终态记录。
tags:
  - configuration
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: learn-check-task-durations-for-critical-path-admission.md
---

## 目的

- 调用方主动 import 可配置策略并放入正式 public prepared hook；仓库开发者采用相同路径。
- Scheduler 只负责执行和硬合法性检查，不知道调用方选择是否来自学习模型。

## 背景

- closed Definition union 的 learned 分支及 Product-private history/observer 让“显式启用”仍不同于“通过公共接口接入”。
- prepared strategy 已提供 graph-ready preparation、同步选择和 sealed terminal completion，可以承接跨 Run 模型而不扩大调度控制权。
- 用户已明确选择移除专用 kind，不保留旧 authoring 兼容分支；模型参数与状态应由使用者显式配置。

## 决策

- 采用: package root 提供可选 learned strategy 工厂，返回现有 public prepared strategy；caller 显式放入 custom policy。不存在 Product 对该工厂、策略身份或闭包的特殊识别。
- 采用: static 仍是默认，未接入工厂时不产生 learned history I/O。存储位置、历史 identity 所需输入及少量实际模型参数由 caller 提供或选择 helper 文档化默认值；不从 Invocation 取得 normalized options/flags 特权。
- 采用: helper 通过 public graph/context 形成 prediction 与 critical-path ranking，通过 public terminal timing 保存 admitted-to-settled sample。history、prediction、score 与 observation 均属于 helper/caller，不进入 Scheduler mutable state。
- 采用: 默认选择保留既有 critical-path score、effective priority 同分规则和 canonical tie-break；不能绕过 dependency、mutex、capacity、cancellation 或 finite-progress guard。算法与统计模型可演进，不承诺固定 admission order 或性能。
- 采用: 本地状态服务相近环境中的重复运行；missing/incompatible history 正常 cold start，malformed/read/write/clock/concurrent failure 只降低优化质量，不改变 Check/Record facts、aggregation、machine publication 或 Run result kind。观察回调失败也不能改变执行结算。
- 采用: 仓库 Gate 是普通 consumer，采用同一公开接线；不以 private provider、专属 diagnostic channel、隐藏全局目录或 history failure 质量结算补偿公共接口。
- 采用: 通过 custom path 的真实测量开销与旧 private path 不自动等价；性能采用或后续算法优化必须基于新的公共接线重新取得证据，不沿用旧 private baseline 的结论。
