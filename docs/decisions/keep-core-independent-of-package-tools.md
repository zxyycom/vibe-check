---
title: 以两向依赖边界隔离可选随包工具
id: 260912-keep-core-independent-of-package-tools
status: active
alignment: aligned
createdAt: 2026-09-12T07:36:08Z
purpose: 让 Core 独立于可选工具成立，并让目录自动约束工具权限。
background: 分散工具容易混淆公开身份、Core 必需能力与可选实现，仅检查工具出向依赖不足以证明独立性。
decision: 采用统一 Non-core 工具目录与两向门禁，Core tools 留在实际机制 owner，保持公共入口和单一实现。
tags:
  - dependency-policy
  - product-contract
relations: []
---

## 目的

让 Core 在没有具体可选工具时仍完整成立，并让维护者通过目录和机械依赖检查维持这一边界。工具继续提供便利能力，核心机制保持单一语义来源。

## 背景

随包交付和从 package root 公开，不能单独说明能力是否被 Core 需要。分散的工具与私有 helper 容易让目录位置、纯函数性质或单向 import 检查代替职责判断。

Core 所需的 canonical/closed-data 与 admission reducer 即使自身实现纯净，也仍承接核心不变量。Finding presentation 与 admission-policy authoring helper 则可由调用方选择，Core 不依赖其具体实现。两类能力需要不同的归属和验收。

## 决策

- 采用: 以 Core 可独立成立作为 Non-core tool 的首要判据。移除具体工具及 facade 导出后，Core 的契约、默认行为和机制保持完整，无需用另一份实现替代该工具；Core 直接依赖或直接开放且缺少合理独立拆分位置的能力，按 Core tool 保留实际机制 owner。
- 采用: 用 `src/package-tools/<domain-owner>/` 承接符合条件的工具及独立支撑实现，统一门禁覆盖所有目录内生产模块。Core 禁止直接或间接依赖该层；该层只消费公开 Product 符号、目录内受检实现和审核的宿主/第三方模块，不设置 Core-private helper 例外。
- 采用: 同时核对 type/value imports、re-exports、符号 alias 和间接依赖。package facade 的组合导出，以及 Core 对 caller 注入的公共 strategy/Check 协议的调用，与依赖某个具体工具分别处理。
- 采用: Core 必需基础保留 Core owner，Core API 和 package Checks 保留各自责任。工具加入统一目录前解决实际耦合；保持 package root、公开契约和单一算法实现，不以目录统一扩大公开面或复制核心语义。
