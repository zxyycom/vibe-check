---
title: 治理记录使用日期前缀显式身份
id: 260908-use-dated-governance-record-identities
status: active
alignment: aligned
createdAt: 2026-09-08T04:03:38Z
purpose: 让 Decision 与 Investigation 的稳定身份脱离文件名并直接携带形成日期。
background: 上游治理契约已提供显式 ID、独立 sourcePath 与可恢复的 rename 事务。
decision: 既有与新建治理记录统一使用由权威形成时间派生的日期前缀 ID。
tags:
  - workflow-policy
relations:
  - type: 修订
    target: 260721-use-project-decision-records
---

## 目的

- 让 Decision 与 Investigation 的稳定身份直接表达形成日期和语义 name，而不是由当前文件位置反向决定。
- 让关系、资源 owner、索引和查询在 sourcePath 变化后仍引用同一领域对象，并具有统一的迁移与恢复入口。

## 背景

- 项目已经用完整上游 `decision-records` 和 `investigation-report` 包维护两类治理记录；项目只拥有集合位置、root command 与 adapter 接线。
- 新版上游契约把 `id` 写入权威 frontmatter，并把 `sourcePath` 降为可变化的独立 locator；标准 ID 使用形成时间 UTC 日期与 kebab-case name。
- 既有 307 条 Decision 和 37 份 Investigation 都有权威 `createdAt` 或 `formedAt`，可以确定性地产生无冲突 dated ID；关系和调查资源可由领域 rename 事务同步。

## 决策

- 采用: Decision 与 Investigation 的新建和既有正式记录统一使用 `YYMMDD-<name>` 标准 ID；日期分别来自 Decision `createdAt` 与 Investigation `formedAt` 的 UTC 日，不从文件时间、Git 或 sourcePath 猜测。
- 采用: frontmatter `id` 是稳定领域身份，语义 basename 只作为 name/source locator；关系 target、索引 key、查询结果和 Investigation 资源 owner 保存完整 dated ID。
- 采用: 身份变化只通过上游 `rename` 事务维护，使来源、全部受管关系、派生索引以及 Investigation 资源引用和 owner 目录保持同一提交边界；项目不增加 ID alias 或第二索引。
- 采用: 完整上游 Skill 包继续保持无项目内修改，Vibe Check 的 root command、默认目录、Gate 安全投影与验证入口留在包外 owner。
