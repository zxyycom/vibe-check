---
title: 将 Vibe Check 描述为通用项目质量门禁
id: 260906-describe-vibe-check-as-a-general-project-quality-gate
status: archived
alignment: aligned
createdAt: 2026-09-06T16:08:54Z
purpose: 让 registry、repository 与用户入口使用同一段准确、可检索的 Product 定位。
background: Product 已迁移到 Node host，但 GitHub 仍描述为 Bun 项目，npm candidate 尚无 description 与 keywords。
decision: 将 Vibe Check 定位为面向 Node 项目的通用 TypeScript 质量门禁，并同步 npm、GitHub 与 README 描述。
tags:
  - product-contract
relations: []
---

## 目的

- 让首次接触 Vibe Check 的用户从 npm、GitHub 或 README 都能恢复同一核心用途与受支持宿主。
- 让 registry discovery 使用少量稳定关键词，而不把未设计的官网或内部实现当成产品身份。

## 背景

- Vibe Check 的正式 Product host 已是 Node，Bun 只继续服务 repository tooling；GitHub description 仍写“面向 Bun 项目”，与当前事实冲突。
- Generated npm manifest 当前没有 description 与 keywords，无法在 package metadata 中直接表达通用 Gate 定位。
- README 是 package consumer 的完整说明入口；GitHub 与 npm 的短 description 应一致，但不需要复制 README 的完整使用说明。
- 当前没有独立产品主页设计。GitHub 已有的 npm package URL homepage 属于既有远端状态，本判断不要求把它投影为 npm manifest homepage，也不授权借此改变远端 homepage。

## 决策

- 采用: npm manifest 与 GitHub repository 使用完全相同的 description：“面向 Node 项目的通用 TypeScript 质量门禁库，提供可组合 Check、类型安全 API 和结构化结果。”
- 采用: README 开头使用同一核心定位，并继续由后续正文解释内置 Check、自定义 Check、运行方式和边界。
- 采用: Generated npm manifest 提供围绕 quality gate、项目验证、代码质量、CI、TypeScript 与 Node 的小而稳定关键词集合；具体 serialization 由 package manifest owner 承接。
- 采用: 当前不在 npm manifest 增加 homepage，不修改 GitHub 既有 homepage 或 topics；以后出现独立主页或需要修订 topics 时另行审定。
