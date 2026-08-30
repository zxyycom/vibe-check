---
title: 扩展格式感知的 Product-provided Checks
status: archived
alignment: unaligned
createdAt: 2026-08-05T11:15:25Z
purpose: 让 Vibe Check 为常见文档和结构化资料风险提供开箱即用的格式感知检查。
background: Markdown、路径、JSON、Schema、秘密和网络链接是常见项目问题，但不属于通用代码指标。
decision: 将这些方向作为可独立选择的未来 Product-provided Checks；现有 Run、Task graph 与 Core 承接执行，领域事实由 producing Check 拥有。
tags:
  - product-priority
relations:
  - type: 修订
    target: expand-format-aware-quality-checks.md
---

## 目的
- 让项目无需先编写项目 Check binding，也能检查 vibe-coding 中常见的文档、结构化数据和敏感内容问题。
- 保持不同格式和风险类型各自的领域语义，不把非代码文件误交给通用代码 scanner。

## 背景
- Markdown 结构与链接、文本路径、JSON 与 Schema、秘密和网络外链具有不同于行数、复杂度和重复代码的质量含义。
- 这些未来方向尚未实施，其字段、算法、状态和测试应在进入实现准备时依据新的 Check/Record 基础重新细化。
- 网络访问和敏感材料还需要独立安全决策，不能因统一为 Product-provided Check 而消失。

## 决策
- 采用: 将 Markdown、路径引用、JSON、JSON Schema、秘密检测和网络外链保留为可独立选择的未来 Product-provided Checks，而不是一个最低共同能力的“非代码扫描器”。
- 采用: Run resolution、单一 Task graph 和 Core trusted settlement 分别承接每项 Check 的解析、执行和关闭；producing Check 判断 applicability，并提交 QualityRecords。Core 不恢复 capability completion 或 generic finding owner，也不增加独立 lifecycle 或 coverage entity。
- 采用: 各 Product-provided Check 只消费 resolution 分配的合格输入，并遵守其独立安全边界；精确 public fields、算法和状态机在对应 feature 排期实施前重新基线。
- 不采用: 把 Markdown、JSON 或 Schema 重新纳入通用代码指标，或提前把未来功能的推测性细节固化为当前 Core 契约。
