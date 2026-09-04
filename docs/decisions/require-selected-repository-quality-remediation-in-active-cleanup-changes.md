---
title: 将活动质量清理中的已选记录作为必需修复
status: active
alignment: aligned
createdAt: 2026-09-04T15:20:40Z
purpose: 区分 Gate 的 advisory 聚合与已启动清理 Change 对其选定质量记录的必需处置。
background: 仓库质量 Finding 保持 non-blocking，但已授权清理不能以微小超限、waiver 或任意排除代替已选记录的修复。
decision: 活动质量清理 Change 必须消除其明确纳入范围的每条记录，并逐条列出未豁免的延期记录；Gate advisory 状态不降低该 Change 的验收要求。
tags:
  - repository-automation
  - workflow-policy
relations: []
---

## 目的
- 保持 Project Gate 的质量 Finding 是完整、可审阅的 advisory evidence，同时让已明确开始的清理工作具有可验证的修复出口。

## 背景
- Gate 的 duplicate、file 与 function metrics 保留 non-blocking Finding；该聚合策略不表示每一项 Finding 都已经被接受、修复或豁免。
- 用户已确认质量阈值是强 remediation signal：不因仅超限 4、10 或 20 行而放弃拆分，也不得以 waiver 代替本可进行的 owner split。
- 仅 `docs/investigations/_resources/**` 获得 file-metrics selection exclusion 授权，且 investigation validation 必须保留；其它范围外记录仍应保持可见、逐项列出且未豁免。

## 决策
- 采用: 任何明确以 repository-quality remediation 为 Outcome 的 active Change，必须为其 `Intended Change` 中逐项选定的 Gate Record 提供实际消除证据；不以 advisory aggregation、微小阈值差、waiver 或提高阈值替代修复。
- 采用: 每个此类 Change 必须在 plan 中保存同一基线运行的 in-scope 与 deferred Record inventory；deferred Record 保持未豁免，并按后续独立 Change 或重新评估处理。
- 采用: 只有经当前任务明确授权的 selection exclusion 可以在该 Change 中消除 Record；该 exclusion 只改变对应 metrics 的 file selection，不能删除 owner 所要求的其它验证。
- 不采用: 将所有 advisory Finding 升格为 Gate process failure，建立隐式“全部清零”发布门槛，或在没有显式 Change 范围的情况下把清理义务推及任意 Record。
