# Design

审查先分别以 AI 消费契约和项目编码规范得出具体问题，再以最小改动收敛，避免把风格偏好或迁移历史变成新的事实源。

## Context

- 审查基线是 feature commit `8638ed77` 及其当前 owner 文档；随后的 Change 归档提交不改产品契约。
- `ai-ready-docs` 要求先恢复文档主承诺、实际 AI 消费路径和唯一 owner；坏示例、负向表达和旧版说明只能提炼为当前边界，不能继续担任主线。
- `docs/development/coding-style.md` 明确规定相邻代码只提供调用事实，不得覆盖 owner、编码规范或工具配置；审查信号必须关联到具体语义障碍才形成整改。
- 当前 public contract 已固定为 string-leaf AST、`{ when, propagateDependsOn? }`、Git `{ compareWith }` 与 selection/callback 共用的 effective flags；本 Change 不重新设计它们。

## Goals / Non-Goals

### Goals

1. 从文档实际用途而非字面格式恢复主线和信息密度。
2. 对上一轮所有相关代码适用完整编码规范，区分符合、有据可查的例外和必须整改。
3. 保持行为、公开类型、测试身份和生成投影契约。

### Non-Goals

本 Change 不重新设计 flag/change 产品能力，不治理无关旧代码，不按行数或个人偏好拆分文件，不为 AI 创建与 owner 分叉的第二份文档。

## Decisions

### Intended Change

文档切面先为每份材料标记用途（公开指南、机制解释、内部 owner、迁移边界、决策回放或证据账本）与实际 AI 任务，再核对标题/开头/篇幅/结论是否围绕同一主承诺。当前使用路径以正向概念和可执行示例为主；迁移差异只由 changelog 完整承接，Decision 仅保留回放长期取舍所需的背景，Case 只保留能从当前实体证伪的 Proves。

代码切面依次核对 owner/实现归属、边界校验、领域类型与 readonly 不变量、实现模型、局部数据流/失败路径、命名/注释/抽象、目录归属、外部 Git 边界和验证。编码规范是裁决源；相邻实现只用于理解调用关系。每个实施项必须指出被遮蔽的语义或违反的阻断性规则，并采用最小整改。

### Resulting Impacts

| Slice | Required result | Evidence |
| --- | --- | --- |
| Public docs | 当前用法为主线，示例与投影同源 | AI 阅读任务 + docs projection/validation |
| Internal docs | owner 职责局部自足，不复制教程 | 语义 diff review + links |
| Changelog / Decision | 迁移与决策背景各在自己 owner | 当前/历史语义分离审查 |
| Cases | Proves 只声明当前证据 | Test Evidence check + 实体审查 |
| Product code | 边界、类型、主数据流和失败路径可局部恢复 | Definition/Run/Git 目标测试 + typecheck/lint |
| Gate/package code | consumer 使用公开契约，不复制 compatibility | Gate/package acceptance + full Gate |

## Risks / Trade-offs

- 删减负向或迁移表达时可能丢失必要拒绝边界；只在当前正向契约已足以推导使用，或 changelog 已完整承接迁移时删减。
- 编码规范审查容易扩大到相邻旧代码；只处理 feature diff 与其直接影响范围，除非旧代码阻止本轮代码满足语义下限。
- 文档压缩不能让实现者失去 depth/node bound、revision failure 或 unavailable conservative injection 等必要边界。

## Open Questions

无。审查范围、裁决源、产品契约与验收路径已由当前请求与项目规则确定。
