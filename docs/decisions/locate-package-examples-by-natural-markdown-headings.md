---
title: 以自然 Markdown section 定位 package 可执行示例
status: active
alignment: aligned
createdAt: 2026-08-28T09:58:28Z
purpose: 让发布文档不携带投影标记，同时保持可执行示例与最终 Markdown 精确同步。
background: 成对注释虽能限定替换范围，却会把生成机制痕迹保留在 consumer 可检查的 package 文档原文中。
decision: 使用自然 heading path 定位 section 中唯一的 TypeScript fence，并拒绝歧义目标和旧投影标记。
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: author-package-markdown-at-published-paths.md
---

## 目的
- 让 package consumer 与仓库维护者读取的最终 Markdown 只呈现文档结构、说明和示例，不暴露 projection comment 或 target ID。
- 继续由 allowlisted TypeScript source 提供可执行示例 payload，并让正文、链接和自然 section 直接保留在发布路径 Markdown 中。

## 背景
- 发布路径 Markdown 已经是正文事实源，renderer 只需要精确定位可执行示例，而不需要生成整篇文档。
- 前序方案用成对 HTML comments 界定替换范围；这些 comments 不参与渲染，但仍存在于 package 原始文件并成为 consumer 可见的生成痕迹。
- 自然 heading path 与 section 中唯一的 TypeScript fence 已能提供稳定、可验证且不增加发布元数据的定位边界。

## 决策
- 采用: package root `README.md` 与 `docs/api-mechanics.md` 继续直接拥有正文、heading、普通链接和最终发布路径。
- 采用: projection registry 以自然 H2-H6 heading path 定位 Markdown target；每个目标 section 恰好拥有一个 `ts` 或 `typescript` fenced example。
- 采用: renderer 只替换该完整 code fence，保留 surrounding Markdown；heading 缺失或重复、section 中 TypeScript fence 缺失或不唯一、fence 未闭合时 fail closed。
- 采用: 最终 Markdown 不保存 projection comment 或 target ID；validation 明确拒绝旧 package example marker，防止迁移残留重新进入发布材料。
- 采用: allowlisted TypeScript example source、JSDoc projection、check-only validation 与 package material audit 继续提供相同的可执行性和精确同步证据。
