# Design

本 Change 以读者任务和稳定 owner 为边界，说明已交付文档重整及其正式化。

## Context

前序功能重构已通过完整 Gate。本轮针对用户批准的文档结构审查，不改变 runtime、machine schema 或公共 API。
主代理审查信息保真与维护者 owner；Terra 负责用户文档、示例及发布 inventory。

## Goals / Non-Goals

以读者任务和内容 owner 恢复文档主线。非目标为机械删除否定句、全仓重写、性能优化、旧产物清理或正式发布。

## Decisions

### Intended Change

- README 先分流随包与自定义 Check，工具表按用途导航。
- `presenting-findings` 拥有独立工具完整用法；API 仅在 terminal messages 中引用。
- API 承接配置、lifecycle、公开结果和状态；`development/human-output` 承接 console router、writer 与 summary 投影。
- prepared 示例实际捕获异步配置并参与 decide，终态离散计数与 timing availability 分开。
- Check 指南引用共同规则并完整保留本 Check 的选择、阈值、waiver identity、安全字段和失败差异。
  四项 Check 的十条 Finding message 上限与 Run renderer 的五条 message/Record preview 分层说明；
  function waiver 使用真实 `{ identity, reason }` grammar。analyzer 与 Markdown cache 的实现材料由内部 owner 承接。

### Resulting Impacts

- 公开声明、输入/输出、路径与失败语义保持；内部移出的公式、采样和 writer 规则有明确去向。
- secret/path/cancellation、proposal 与 admission、complete 非必达、observer 不等待等必要边界继续保留。
- 目录与文档角色变化通过 registry、链接、Case 与 installed consumer 验证闭合。

## Risks / Trade-offs

压缩可能误删公开 readback 或让示例与正文失配，故主代理独立反查并要求完整 package acceptance。
前轮治理命令被拒绝的事实保留在 tasks 的形成时证据中；本轮按用户要求通过正式命令完成状态收尾，不手改 Plan baseline。

## Open Questions

前轮验证与独立审查已完成，后续 Check 指南修复单独记录验证。当前无文档实施待办；本轮完成正式化与复核，生命周期以正式查询为准。
用户提出的 preview 配置/截断 Hook 已交由[独立 Draft](../../configure-progress-preview/proposal.md)讨论；
其余 files/waiver/parser 文档共性的收敛与保留差异结论见[已归档共同契约整理](../refine-check-guide-shared-contracts/proposal.md)。
本 Change 保留已完成修复的交付证据，不扩大为这些新能力的实施计划。
