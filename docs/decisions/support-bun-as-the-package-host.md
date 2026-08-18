---
title: 首个 package 只支持 Bun 宿主
status: active
alignment: unaligned
createdAt: 2026-08-12T10:30:27Z
purpose: 让首个 npm package 的可运行宿主与当前 TypeScript Project Definition 和产品运行时能力保持一致。
background: npm 是分发机制，不代表 package 已经能够由 Node.js 直接加载和执行；同时承诺多个宿主会扩大构建、依赖和验收责任。
decision: 首个公开 package 只承诺由 Bun 直接 import 和执行；Node.js 与 dual-runtime 支持必须作为独立后续方向建立。
tags:
  - product-contract
relations: []
---

## 目的
- 为首个可安装产品建立一个诚实、可验证且与现有 runtime 一致的宿主边界。
- 防止消费者从 npm 分发方式或 Node-compatible 类型依赖推断出未经实现和验收的 Node.js 运行承诺。

## 背景
- 当前产品测试、脚本和计划中的 TypeScript Project Definition module evaluation 都以 Bun 为运行时前提。
- npm registry 可以分发由 Bun 执行的 package；选择 npm 不要求同一 package 同时支持 Node.js import。
- Node.js 或 dual-runtime 支持会改变 module loading、build output、manifest engines、production dependency closure、Project Definition authoring 限制和 isolated consumer acceptance，具有独立演进成本。

## 决策
- 采用: 首个公开 package 只支持消费者在 Bun 宿主中直接 import 和调用 public package API；package manifest、安装说明、diagnostics 与 acceptance 必须明确实际最低 Bun 版本和平台前提。
- 采用: Runtime、declarations 与其它明确承诺的 package materials 可以通过 npm 分发，但不得把 npm、ESM、Node 类型或 repository workspace 的 Node engine 表述成 Node.js product-runtime compatibility。
- 采用: Build、dependency audit 与 exact-tarball acceptance 只需证明已声明的 Bun contract；未测试的 runtime 或平台必须以 actionable unsupported-host result 拒绝，而不是 best-effort 运行。
- 采用: 未来若要求 Node.js 直接 import 或同时支持 Bun/Node，必须用独立决策和 Change 重新定义 loader、build、dependency 与验收契约，不能通过放宽 `engines` 字段隐式扩大支持面。
