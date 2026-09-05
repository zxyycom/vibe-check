---
title: 以可读 ESM 模块树交付 package 运行时
status: active
alignment: aligned
createdAt: 2026-08-24T08:04:05Z
purpose: 让 Bun consumer 能检查 ESM 模块边界，并恢复对应的权威 TypeScript 源码。
background: 单文件 bundle 难以检查和调试；额外运行时格式会扩大尚未承诺的维护责任。
decision: 交付可读 ESM 模块树、类型声明和源码材料，只公开 package 根路径。
tags:
  - product-contract
  - workflow-policy
relations: []
---

## 目的

- 让 package 的 ESM 运行时保留可识别的 Product 模块 owner，使开发者能够检查实现、定位堆栈并恢复对应的 TypeScript 源码。
- 在提升 artifact 可读性的同时，不扩大公开 package 根路径、Bun 宿主和程序化 API 的既有边界。

## 背景

- 将全部实现打入一个入口文件会掩盖 `src/**` 已有的模块职责与调用边界，也不利于源码级调试。
- tarball 中存在一个内部路径，不代表该路径自动成为公开 API；consumer 可依赖的导入路径仍由 `package.json` 的 `exports` 定义。
- CJS、`require`、browser 或压缩产物分别意味着额外的加载方式、宿主或交付承诺，当前没有对应的 consumer 验证需求。
- 本决策拥有 package 的物理运行时布局和源码恢复材料；当前实现与 audit 规则由[脚本工具](../tooling/package-lifecycle.md#package-artifact-与-candidate)承接。
- 本决策不建立新的 subpath API、宿主或执行入口。程序化入口和 Bun 宿主范围继续由各自已有决策承接。

## 决策

- 采用: 从权威 `src/index.ts` 的传递模块图逐模块生成 `dist/esm/**.mjs`；package 根部的 `index.mjs` 只转发 `dist/esm/index.mjs`。
- 采用: 同一版本同时交付 `types/**.d.ts`、运行时源码映射和 `src/**.ts` 源码材料。这些材料服务于检查和调试，不建立手工维护的第二套运行时。
- 采用: manifest 只通过 `exports["."]` 公开 import 与类型入口；物理存在的 `dist`、`types` 与 `src` 路径不构成稳定的 consumer contract。
- 采用: 继续只承诺 Bun 宿主和程序化 API；不能根据 ESM 文件、npm distribution 或可见源码推断 CJS、`require`、browser、Node.js 宿主或压缩产物支持。
- 不采用: 为了表面上的格式完整性，同时发布未经专门实现、测试和文档承诺的 CJS、browser 或压缩运行时。
