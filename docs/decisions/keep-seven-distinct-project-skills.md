---
title: 只保留七项独立项目 Skill
status: active
alignment: aligned
createdAt: 2026-08-12T05:41:33Z
purpose: 让项目只维护具有独立治理、证据或工程判断职责的 Skill，通用编码方法由行为 owner 和编码规范承接。
background: 编码规范已经统一实现模型和代码质量边界，继续安装同义编码 Skill 会形成重复指令和维护面。
decision: 项目只保留三项治理、测试证据、共享契约、产品架构和性能优化七项能力，不再安装通用编码方法 Skill。
tags:
  - workflow-policy
relations:
  - type: 修订
    target: use-complete-upstream-governance-skills.md
---

## 目的
- 让 agent 从一个明确、有限的项目 Skill 集合恢复特殊工作流和判断能力，不在多个同义方法之间
  猜测优先级。
- 让行为 owner、编码规范和相邻验证继续完整承接普通实现质量，避免 Skill 成为第二套编码规范。
- 保留拥有持久 artifact、项目特有证据，或无法从编码规范直接推导的独立工程判断能力。

## 背景
- `docs/development/coding-style.md` 已经统一拥有实现归属、边界处理、领域类型、实现模型、局部表达、错误、
  模块、依赖和验证规则；文档导航还能把具体行为路由到唯一领域 owner。
- 通用 API、CI、review、refactor、debugging、增量实现、TDD 和外部资料使用方法没有项目专属
  runtime 或状态，其有效规则已经能够从行为 owner、编码规范、测试策略和当前任务恢复。
- Decision、Change 和持久调查各自拥有 artifact 与 lifecycle；测试证据评审消费 Vibe Check
  特有的 Case 闭合能力。产品架构、跨场景公约数和有测量依据的性能优化分别解决编码规范不能
  代替的结果责任、共享契约和性能证据判断。

## 决策
- 采用: 项目安装集合固定为 `change-plan`、`common-denominator-design`、`decision-records`、
  `investigation-report`、`performance-optimization`、`product-architecture-judgment` 和
  `test-evidence-review`。
- 采用: 每个 Skill 的入口描述拥有其通用触发条件；`AGENTS.md` 只补充 Vibe Check 特有的 owner、
  命令和验证路由，`docs/tooling/workspace.md` 拥有当前安装清单、分发边界和项目接线。
- 采用: 普通实现、调试、审查、重构、接口、自动化和测试实施直接从文档导航进入行为 owner，
  再遵循编码规范、测试策略与相邻验证，不为同义通用方法安装项目 Skill。
- 采用: `change-plan`、`common-denominator-design`、`decision-records`、`investigation-report` 和
  `product-architecture-judgment` 继续作为完整上游包维护；`performance-optimization` 作为无
  runtime 的独立方法目录维护；`test-evidence-review` 继续作为唯一项目特有方法层 Skill。
- 采用: 只有候选能力拥有现有七项、行为 owner 和编码规范无法承接的独立责任，并有明确触发、
  维护来源和验证边界时，才通过新的长期决策扩大项目安装集合。
