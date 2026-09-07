# Proposal

本 Draft 记录已获批准的 package 文档重整范围及其后续验证边界。

## Why

用户要求按 ai-ready-docs 重新审查文档重心、负向描述和迁移残留，并已批准执行结构调整。
逐句清理否定词仍留下 API 机制页承载独立工具与内部诊断算法、调度示例偏验收程序、旧策略描述和日志数量残留。

## Outcome

用户从 README 选择集成路径，从 API 机制恢复公共生命周期与结果，从工具/调度指南获得可执行用法；
维护者从内部 owner 维护实现协议。表达清理保留安全、失败与公开兼容边界。

## Scope

### Intended Change

- 重排 README 入口；独立呈现 Finding 摘要工具；精简 API 内部细节和 prepared 示例。
- 将人读输出实现协议交由内部文档，清理直接受影响文档的迁移残留。
- 按用户后续批准，修复 Check 指南中摘要生成与 progress preview 混淆、function waiver 示例失配，
  收敛共性规则重复，并把与 consumer 操作无关的 analyzer/cache 维护细节交回内部 owner。

### Resulting Impacts

- 同步随包 Markdown inventory、示例 projection、内部链接、Case owner 和验证。
- 构建并验收新的 exact candidate，区分文档已更新与实际包已更新。

## Success Criteria

1. 用户可区分随包 Check、自定义 Check、独立工具与 Scheduler policy 的接入路径。
2. API 页保留公开 outputs、readback、失败优先级及 RunResult 分支；实现协议可从内部 owner 恢复。
3. 示例自足且由 installed consumer 执行；迁移的契约和 Case owner 可追踪。
4. 不修改产品行为，不提交、不发布、不清理历史生成目录。

用户已明确本轮先修文档；progress preview 数量选项与截断 Hook 只形成待确认方案，不作为本轮 API 实施范围。

## Affected Owners

README、API 机制、guides、development architecture/human-output/project-definition、Project Gate 文档、
package documentation registry、API example sources、相关测试 Case。
