---
title: 将 Vibe Check 描述为通用 TypeScript 质量门禁工具
id: 260906-describe-vibe-check-as-a-typescript-quality-gate-tool
status: active
alignment: aligned
createdAt: 2026-09-06T16:23:01Z
purpose: 让产品描述准确表达工具用途，而不把 Node 运行宿主误写成被检查项目的类型限制。
background: 既有描述使用“面向 Node 项目”，会让非 Node 项目的使用者误以为 Vibe Check 不适用。
decision: 将 Vibe Check 定位为通用 TypeScript 质量门禁工具，并把 Node 仅作为 package 运行环境约束表达。
tags:
  - product-contract
relations:
  - type: 修订
    target: 260906-describe-vibe-check-as-a-general-project-quality-gate
    summary: 将 Vibe Check 描述为通用 TypeScript 质量门禁工具
---

## 目的

- 让首次接触 Vibe Check 的用户从 npm、GitHub 或 README 准确理解它是一个通用 TypeScript 质量门禁工具。
- 区分工具的 TypeScript API、Node 运行宿主与被检查项目的技术栈，不从宿主要求推导项目适用范围。
- 保持 registry discovery 文案简洁一致，并继续避免引入未设计的主页或无关产品承诺。

## 背景

- Vibe Check 通过 TypeScript 程序化 API 定义、组合和运行质量 Check；内置能力覆盖代码、JSON、Schema、Markdown 与维护检查，也允许调用方定义项目自己的规则。
- 当前 package 运行时要求 Node，但这只约束执行 Vibe Check 的宿主，不表示被检查的项目必须是 Node 项目。
- 前序描述“面向 Node 项目的通用 TypeScript 质量门禁库”混淆了运行环境与适用对象，会无意排除非 Node 项目。
- README 是 package consumer 的完整说明入口；GitHub 与 npm 的短 description 应保持相同。当前仍没有需要投影到 npm manifest 的独立产品主页。

## 决策

- 采用: npm manifest 与 GitHub repository 使用完全相同的 description：“通用 TypeScript 质量门禁工具，提供可组合 Check、类型安全 API 和结构化结果。”
- 采用: README 开头使用同一核心定位，并由后续正文解释内置 Check、自定义 Check、运行方式和边界。
- 采用: Node 继续作为 package `engines` 和运行前提表达，不进入产品短描述，也不成为被检查项目的隐含范围限制。
- 采用: Generated npm manifest 继续提供围绕 quality gate、项目验证、代码质量、CI、TypeScript 与 Node 运行生态的稳定关键词；不在 npm manifest 增加 homepage，也不借本次修订修改 GitHub homepage 或 topics。
