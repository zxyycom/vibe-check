---
title: 以单一 README 分级组织 package 文档
status: active
alignment: aligned
createdAt: 2026-08-27T14:56:42Z
purpose: 让 package consumer 从唯一总入口理解常用自定义 API，并按需进入 Check 或机制说明。
background: 现有 README 同时承载入门、内置 Check、进阶机制和结果边界，另有 Check 索引页形成不必要的导航层级。
decision: package 文档只以 README 作为总入口，直接链接每项 Check 指南，并最多提供一份深入 API 机制说明。
tags:
  - product-contract
  - workflow-policy
relations: []
---

## 目的
- 让取得 package 的 consumer 从一个明确入口先理解自定义 Check、Project Definition、Run 及其可观察效果，再按需要阅读内置 Check 或深入机制。
- 保持每项 package-provided Check 的独立说明，同时避免用多个 `index.md` 建立重复导航。

## 背景
- 当前 package README 同时包含快速开始、特定内置 Check、维护提醒、自定义 Check、typed dependency、Controls 和结果边界，首次阅读路径偏长。
- `docs/checks/index.md` 位于 README 与每项 Check 指南之间，但没有提供 README 不能直接承担的独立说明责任。
- 已有文档投影与 isolated consumer acceptance 能保证示例和最终 package material 精确一致；结构调整不能退化这些证据。

## 决策
- 采用: package 根 `README.md` 是唯一总入口，主要说明 package 定位、常用自定义 API、最小使用路径及运行后的可观察效果。
- 采用: README 只用一个简短章节概览 package-provided Checks，并直接链接每项独立 Check 指南；不保留 Check `index.md` 或新增 package `docs/index.md`。
- 采用: 每项 package-provided Check 继续拥有一份独立指南，承载其 options、工作方式、结果、不可用边界、安全边界、最小用法和非目标。
- 采用: package 最多额外提供一份深入 API 机制说明，承载 preflight、typed dependency、Controls、outputs 与完整结果边界等非入门内容；局部 API 参考继续由 declarations JSDoc 承接。
- 采用: 可执行文档示例继续来自 allowlisted TypeScript example source，并在 ancestry-external candidate installation 中运行；拆分文档不得复制未经验证的示例事实源。
- 不采用: 为每类内容建立额外索引页、生成完整 API dump，或把仓库维护和打包流程混入 consumer package 文档。
