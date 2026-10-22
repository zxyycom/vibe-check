---
title: 分离快速反馈、受影响验收与完整 Gate
id: 261022-tier-gate-validation
status: active
alignment: aligned
createdAt: 2026-10-22T09:59:19Z
purpose: 让日常反馈更轻且交付验收范围明确
background: 默认增量混合慢验收，快检成功容易被误认为完成全部验收
decision: 默认 fast、显式 changed 验收受影响输入、all 保留独立全量兜底
tags:
  - configuration
  - performance
  - workflow-policy
relations: []
---

## 目的

- 日常提供小而明确的工程反馈，交付与发布保留可独立核对的验收范围。

## 背景

- 原默认增量检查混合基础工程检查、全仓扫描与多组行为验收；即使变更选择准确，也不适合每轮编辑都运行。
- 只保留变更相关路径会把选择规则漏判变成长期盲区；把这个路径称为 all 又会误导使用者，以为已完成完整验收。

## 决策

- 采用: 默认 fast 只运行有稳定快速资格且受影响的基础检查及必要测试，加上固定 provider/whitespace。资格由工程职责和输入边界明确声明，不按一次实测快慢自动分类。
- 采用: changed 是交付前全部受影响验收，包含相关行为、质量、材料与 artifact/consumer；以真实输入及共享依赖保守选择，未知路径和不可用 Git 证据扩大选择，不按零变更放行。
- 采用: all 保留不依赖变更命中的完整 manifest，服务发布、大范围变更及选择规则兜底。完整验收仍执行自己的 Git whitespace 等实际检查，不承诺完全不访问 Git。
- 采用: fast 提供快速反馈，正式 Gate 交付验收运行 changed，发布和大范围变更运行 all；局部改动的最低验证由文档导航路由。focused 保持可组合定向检查，不替代正式验收；参数、摘要、导航与测试按同一语义闭合。
- 采用: 保留单一 Gate 进程入口、exact candidate、receipt 只配合 all、Product 依赖传播与严格聚合。不同档位减少工作量与同一工作量的性能优化分别解释；性能策略由其 owner 独立拥有，精确当前行为见 [Project Gate](../tooling/project-gate.md)。
