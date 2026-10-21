---
title: "TypeScript 7.0.2 升级的 compiler API 阻断"
id: "261021-assess-typescript-upgrade"
formedAt: "2026-10-21T03:31:24Z"
question: "TypeScript 6.0.3 能否直接升级到 7.0.2，原生编译器是否仍提供本项目需要的程序化 API？"
tags:
  - "compiler-api"
  - "dependency-upgrades"
  - "typescript"
relations: []
---

## 形成时背景

调查时，根声明 `^6.0.3`，lockfile/安装 `6.0.3`。本项目已另用 native-preview 的 `tsgo` 负责 typecheck/emit；`typescript` 本身的重要用途是[ESM module/Worker URL parser](../../scripts/package/artifact/esm-module-specifiers.ts)和[模块边界验证](../../scripts/validation/module-specifier-analysis.ts)等工具 API，不只是 tsc 命令。

## 调查目的

判断原生 TS7 能否机械替换现有 API package，避免把上游相对 JS 编译器的提速套用已用 native compiler 的项目。

## 调查范围与依据

2026-10-21 UTC 核对 [npm latest manifest](https://registry.npmjs.org/typescript/latest)、官方 [7.0.2 release](https://github.com/microsoft/TypeScript/releases/tag/v7.0.2)和 [TypeScript 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)，并读取本项目 artifact parser、toolchain fingerprint 与[artifact owner](../tooling/package-artifact.md)。最新稳定为 `7.0.2`（不是 7.1 beta/next），Node `>=16.20.0`；它不在 `^6.0.3` 内。

## 调查结果与边界

**建议：暂缓直接升级根 `typescript` 到 7.0.2；API 兼容是明确阻断，不是 Node engine 阻断。**

官方宣布 TS7 将主 compiler 改为 Go/native，提供并行 typecheck/emit、原生 watch/LSP 等；相对 TS6 的性能数字是其样本，不能证明本项目已用 tsgo 的流程再获同等提升。官方还明确 TS7.0 不携带旧 compiler API，并给出保留 TS6 compatibility package 的并行方案。registry 的根 export 是 version stub，另有 `unstable/*` 新接口，而不再是 TS6 的旧 API；不能把这些新路径当 drop-in 兼容层。

本项目真实调用 `ts.createSourceFile`、`createCompilerHost`、`createProgram`、`getSyntacticDiagnostics`、`forEachChild` 等节点工具。仅把版本换成 7.0.2 无法满足当前 API contract；即使 `tsc --version` 成功，也不能证明 package build/validation 可用。

可行方向是保留已验收的 TS6 API owner，单独评估稳定 TS7 compiler 取代 native-preview；或另行规划 API port/官方 compatibility alias。两者都需显式依赖、路径/入口与 fingerprint 设计，不在本次调查中实施。若未来迁移，验收 ESM specifier/Worker URL exact-once rewrite、声明 JSDoc、schema/API 投影、emit/cache 与 exact installed consumer；不要顺带替换 parser 以扩大任务。

本轮未安装执行 TS7，也未实现 alias/新 API port；“直接替换不满足现有 API”来自官方契约和实际调用的交叉证据，不是一次已运行失败的记录。
