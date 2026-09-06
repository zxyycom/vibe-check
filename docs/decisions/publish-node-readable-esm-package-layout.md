---
title: 以 Node 可读 ESM 模块树交付 package 运行时
status: active
alignment: aligned
createdAt: 2026-09-06T11:54:53Z
purpose: 让 Node consumer 可检查运行时模块边界，并恢复对应的权威 TypeScript 源码。
background: 既有可读布局满足调试目标，但只承诺 Bun 加载；Node-only Product 必须显式验证模块、Worker 与依赖解析。
decision: 继续交付只公开根路径的可读 ESM、声明、源码与映射，并以 Node exact consumer 验证完整运行时布局。
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: publish-readable-esm-package-layout.md
---

## 目的

- 让 Node consumer 能够检查 package ESM 模块边界、定位堆栈并恢复对应 TypeScript 源码。
- 在替换产品宿主时保持单一可读运行时格式，不扩大 public import surface。

## 背景

- 既有逐模块 `dist/esm/**.mjs`、declarations、source maps 和 `src/**.ts` 已提供可检查的运行时布局。
- 物理文件存在不代表 public API；稳定 import surface 仍只由 manifest `exports["."]` 定义。
- Node 的 ESM、Worker 和 package dependency 解析必须由实际 installed consumer 验证，不能从扩展名或 Bun build 成功推断。
- CJS、`require`、browser 和压缩产物各自扩大格式与宿主责任，当前没有对应需求。

## 决策

- 采用: 继续从权威 Product roots 逐模块生成 `dist/esm/**.mjs`，根 `index.mjs` 只转发 runtime entry，并同步发布 `types/**.d.ts`、source maps 与 `src/**.ts`。
- 采用: Manifest 只通过 `exports["."]` 公开 import 和类型入口；`dist`、`types` 与 `src` 物理路径不构成 consumer contract。
- 采用: Function-metrics Worker 以 shipped `.mjs` URL 和 Node `node:worker_threads` 运行；artifact audit 必须保持 parent→Worker 引用唯一且封闭在 package 内。
- 采用: Exact installed Node consumer 必须验证 root import、production dependencies、Worker URL、source maps 和代表性 Product Run；Bun build/install 仍可作为 repository tooling，但不提供 Product host 证据。
- 不采用: 同时发布未经专门需求和验收的 CJS、browser、Bun 专用或压缩运行时。
