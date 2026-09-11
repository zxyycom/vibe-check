---
title: 采用面向类型可靠性的 TypeScript 检查 profiles
id: 260911-adopt-soundness-oriented-typescript-typecheck-profiles
status: active
alignment: unaligned
createdAt: 2026-09-11T09:27:18Z
purpose: 让源码、脚本、package emit 与 installed consumer 获得职责相符的类型可靠性保证
background: 现有 strict 基线遗漏索引、optional 与控制流风险，而不同 compiler scope 的消费者义务并不相同
decision: 共享源码 soundness 规则，保留独立 consumer profile，拒绝低证明价值或重复规则
tags:
  - configuration
  - testing
  - workflow-policy
relations: []
---

## 目的

- 让 Product source、repository scripts/tests 和 package emit 在同一类型可靠性底线下显式处理缺失索引、optional 字段、override、返回路径与不可达代码。
- 让 exact installed package 的公共声明在代表性严格 consumer 配置中可用，同时不把仓库内部控制流规则误作消费者契约。
- 避免为规则数量、访问语法偏好或与 lint 重复的证据支付全仓迁移与长期维护成本。

## 背景

- 当前 `tsconfig.json` 与 `tsconfig.product.json` 都使用 `strict`，Product 配置继承 scripts 配置的 compiler 基线；package build 因 `--ignoreConfig` 显式重述 emit 参数；installed-consumer types acceptance 是独立临时 `tsconfig`。
- 在形成本判断的 HEAD 上，现有基线两个 scope 都通过。单独开启 `noUncheckedIndexedAccess` 产生 Product 73 条/29 文件和 scripts scope 125 条/40 文件诊断；`exactOptionalPropertyTypes` 分别产生 27 条/20 文件和 39 条/22 文件。scripts scope 会传递导入部分 `src/**`，所以这些跨 scope 计数不能相加当作唯一位置数。
- 同一基线上，`noImplicitOverride`、`noImplicitReturns`、`noFallthroughCasesInSwitch` 和禁止 unused labels 没有当前诊断；禁止 unreachable code 发现 3 个 Product 实现位置。`noPropertyAccessFromIndexSignature` 在 Product 产生 851 条、scripts scope 产生 1266 条诊断，这些数量只用于评估迁移规模，不是拒绝修复的理由。代表性微型编译证明：该规则只为来自 index signature 的 dot access 增加 TS4111 语法诊断；`noUncheckedIndexedAccess` 已同时对 dot 和 bracket access 强制处理 `undefined`。
- Oxlint 已负责 fallthrough、unused label/variables 和 switch exhaustiveness；tsgo 当前默认开启 side-effect import 检查与 import casing 检查。installed-consumer 已以 `strict + noUncheckedIndexedAccess` 验收公共导入，形成本判断时额外开启 `exactOptionalPropertyTypes` 的 exact candidate 也已通过。

## 决策

- 采用: Product source 与 repository scripts/tests 共享 `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`、`noImplicitReturns` 以及 `allowUnreachableCode: false` 的 soundness-oriented compiler 底线。规则的精确配置 owner 仍是根 `tsconfig.json`，Product 通过现有 extends 关系继承，不建立第二份同义配置。
- 采用: package emit 继续由 package artifact owner 用 `--ignoreConfig` 与显式 compiler roots 构建，但必须镜像上述会改变 Product 源码验收的六项语义规则，避免 development typecheck 通过而真实声明 emit 重新放宽。这是明确的同步义务，不为参数形状抽取无法被 JSON config 与 CLI 共用的伪抽象。
- 采用: installed-consumer types acceptance 保持独立 profile，只在现有 `strict + noUncheckedIndexedAccess` 上增加 `exactOptionalPropertyTypes`。它使用仓库锁定 compiler 证明 exact installed declarations 和代表性用法，不增加新 compiler invocation，也不宣称公开的 TypeScript 版本兼容承诺。`noImplicitOverride`、`noImplicitReturns` 与 unreachable code 只约束实现，不进入 consumer profile。
- 采用: 不启用 `noPropertyAccessFromIndexSignature`，因为在已启用 `noUncheckedIndexedAccess` 的前提下，它只要求把动态 key 的 dot access 改成 bracket access，不会额外拒绝缺失值未处理、非法赋值或其它错误程序。诊断数量只影响工作分批，不参与该取舍。不在 compiler 中重复开启已由 Oxlint 等价承接的 fallthrough、unused label/variables 和 switch exhaustiveness；当前 compiler 默认不额外记为项目自定义规则。
- 采用: 迁移按 `exactOptionalPropertyTypes` 、`noUncheckedIndexedAccess` 与其余零/少诊断控制流规则分阶段闭合，每阶段在修复该规则的 Product 和 scripts 诊断后立即将规则写入正式配置。优先使用类型建模或 runtime guard；只有相邻代码能证明局部不变量时才用 assertion。不建立 suppression 文件、诊断计数 baseline 或永久过渡 profile。
- 采用: 继续复用现有 required Gate 的 Product/scripts typecheck identities、`--all` package artifact emit 与 external-consumer types acceptance；新规则通过各 owner 的现有 invocation 生效，不建立第二套 typecheck runner、新 Gate Check 或重复 compiler profile。
