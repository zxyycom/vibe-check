> **核心句：**本 change 仅保留“为项目 Markdown 提供内置结构与可读性检查”的未来产品方向；具体规则、字段和实现方案必须在排期实施前重新收敛。

## Why

Vibe coding 经常快速生成和改写 Markdown，容易留下标题层级混乱、内容组织失衡等影响阅读和维护的问题。Vibe Check 应提供开箱即用的 Markdown 结构检查，而不是要求每个项目自行拼接脚本。

当前能力尚未排期，也从未实施。现阶段的价值是固定产品问题、责任边界和安全范围，不是提前冻结 parser、阈值、record 字段或配置结构。

## What Changes

- 新增一个未来的内置 Markdown structure check，由其 `CheckRunner` 解释 Markdown 语义并判断结构或可读性问题。
- Runner 通过 `quality-records` 逐条提交最终领域 records；`quality-checks` 只管理 check 定义、运行状态与结果，不解析 Markdown 或重新判断 record 级别。
- Project Definition 负责项目是否启用该 check 以及最终采用什么声明式规则；本 change 不预设其 TypeScript authoring shape。
- 实施前重新基线届时已落地的 Core、Project Definition、源码与主规范，再细化规则、record contract、解析策略和验证证据。

## Capabilities

### New Capabilities

- `markdown-structure-validation`: 检查获准 Markdown 输入中的结构与可读性问题，并发布可定位的最终质量 records。

### Modified Capabilities

无。本 change 不推测性修改共享主 spec；共享契约由其 owner change 提供。

## Impact

- 直接依赖 `establish-check-record-core` 的 `quality-checks` 与 `quality-records` 契约，以及 `adopt-typescript-project-definition` 的 `project-definition` authoring/resolution 边界。
- 未来实现应位于 `src/product/**`，作为内置 CheckRunner 接入；具体 parser、规则 catalog、配置字段、输出字段和测试矩阵均留待实现前审计。
- 本 change 当前只是方向性 artifact，不能据此开始实现。
