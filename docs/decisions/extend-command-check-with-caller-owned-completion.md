---
title: 让 commandCheck 承接调用方完成阶段
id: 260920-extend-command-check-with-caller-owned-completion
status: active
alignment: aligned
createdAt: 2026-09-20T05:59:14Z
purpose: 让单次命令 Check 在受控进程结果后执行调用方领域结算。
background: 退出码模式无法复用 Product 进程边界完成 typed data、Records 与依赖派生环境。
decision: 增加闭合环境解析与 afterCommand 完成阶段，同时保留默认退出码模式和输出边界。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的
- 让需要 typed final data、messages 或安全 Records 的单次命令 Check 复用 Product 的进程生命周期。
- 让 invocation-time environment 可以来自已声明的 direct dependencies，同时保持 closed environment 和敏感值边界。
- 保持简单 exit-status consumer 的默认输入与 `{ exitCode }` 结果。

## 背景
- [公共 command Check](provide-public-command-check.md)已经统一 no-shell spawn、取消、超时、有界输出和进程终态，但当前公共构造器只提供 exit-status 模式。
- Project Gate 的 `prepared-external-package-consumer` 与 `lint-product` 分别证明 dependency-derived environment、typed stdout 和 owner-approved structured failure 是现实调用方义务；Gate 因此重复维护通用 process adapter。
- 工具协议和持久化安全属于调用方，spawn 与 raw child material 边界属于 Product。扩展公共能力必须保持这个责任划分。

## 决策
- 采用: `commandCheck` 增加与静态 `environment` 互斥的 `resolveEnvironment(context)`；它只读取本次 prepared options、project、direct dependencies 和 signal，返回既有闭合 environment policy。非法返回或非取消异常 fail closed，不启动进程、不回退 ambient environment、不发布环境值。
- 采用: 增加 `afterCommand: { execute, parseData? }`。只有命令完整结束、输出未截断且具有 numeric exit 时，Product 才提供有界 `{ exitCode, stdout, stderr }`；调用方 `execute` 返回普通 `CheckResult`，可形成领域 data、messages 和安全 Records。
- 采用: `afterCommand.parseData` 将返回 Check 声明为 typed provider。完成阶段对象用于绑定 callback 与 parser，并与返回 Check 上 Product-owned 的 execution 分开；没有现实 consumer 的 handoff 不进入本次公共 contract。
- 采用: 省略新扩展点时保留当前 `{ exitCode }` 模式、closed defaults 和终态分类。Raw output、解析出的环境值和工具语义不会自动进入 final data、Records、messages、diagnostics 或 machine publication。
- 采用: 选择 `output: { mode: "transcript" }` 时，Product 将 Check-local `process.log` 在 `afterCommand` 前写成；artifact capability 或写入失败结算为 `command-transcript-unavailable` 且不调用 callback。迁移 consumer 使用该 Product transcript，未迁移 Gate adapter 继续拥有其独立 schema、reason 与 fallback。
- 采用: 首轮以一个 dependency-backed typed stdout provider 和一个 owner-approved failure projection 验收公共边界，不迁移多步骤工具协议或整个 Gate adapter。
