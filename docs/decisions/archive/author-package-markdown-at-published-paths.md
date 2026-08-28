---
title: 让发布路径 Markdown 直接拥有 package 文档正文
status: archived
alignment: aligned
createdAt: 2026-08-28T08:30:34Z
purpose: 让维护者在最终 package 路径直接找到并编辑完整文档，同时只自动更新明确标记的受管片段。
background: 旧流程把 Markdown 正文源与最终发布文件分开，维护者无法从发布路径直接恢复编辑边界。
decision: 发布路径 Markdown 拥有正文与链接，投影代码只替换成对标记之间的已验证示例，不再生成整篇文档。
tags:
  - product-contract
  - workflow-policy
relations: []
---

## 目的
- 让 package consumer 与仓库维护者看到同一份完整 Markdown，并能从最终路径直接识别正文、受管片段和编辑入口。
- 保留可执行示例投影与 package material audit，同时由 published-path Markdown 维持唯一正文源。

## 背景
- package 根 README 与深入 API 机制说明此前分别由 `*.template.md` 生成到最终发布路径；正文虽然以 Markdown 编写，但可编辑源和最终文档分处不同文件。
- 最终文档不保留投影标记，维护者只看到生成结果时无法直接判断正文 owner、可编辑范围和生成边界。
- Check 指南已经在最终发布路径由手写 Markdown 直接拥有；可执行 TypeScript example 与 declaration JSDoc 也已有独立责任。

## 决策
- 采用: package 根 `README.md` 与 `docs/api-mechanics.md` 同时是 checked-in 正文事实源和最终发布材料；正文、标题与普通 Markdown 链接直接在这两个路径维护。
- 采用: 需要同步可执行示例的位置使用成对 managed-region 标记；投影代码只验证标记并替换标记内部 payload，保留标记外的 Markdown 原文。
- 采用: allowlisted TypeScript examples 继续拥有可执行 payload，declaration source JSDoc 继续拥有 IDE 与 declarations 说明；它们不会反向成为 package Markdown 正文 owner。
- 采用: package build 直接发布这两份 Markdown，普通链接按最终路径维护；Check 指南继续作为最终路径上的手写 Markdown 直接发布。
