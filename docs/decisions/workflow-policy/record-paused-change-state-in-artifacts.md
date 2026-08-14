---
title: 在 Change artifacts 中记录暂停状态
status: active
alignment: aligned
createdAt: 2026-08-14T03:28:15Z
purpose: 让 active Change 使用上游规范 metadata，同时把只约束当前 Change 的暂停原因和恢复条件保存在可恢复的 artifacts 中。
background: Change Plan 的 stage 只表示计划结构成熟度；把暂缓实施编码为额外 metadata stage 会使 active Change 偏离上游契约，并掩盖恢复前仍需审阅的内容。
decision: 长期方向由决策记录承接，单次 Change 由 Change Plan 承接；active Change 的暂停状态写在其 artifacts，恢复前重新审阅并记录新的 Plan baseline。
relations:
  - type: 修订
    target: workflow-policy/use-decision-led-change-plans-and-archive-openspec.md
---

## 目的
- 让跨 Change 持续有效的方向、理由和约束仍有可查询、可演进的决策 owner，而单次 Change 的实施上下文保持在自身 artifacts。
- 让 agent 能从 active Change 的规范 metadata 与文档正文分别恢复结构成熟度、暂停原因、恢复条件和实施授权边界。
- 让 OpenSpec 继续只作为深层历史 owner，不重新进入默认上下文或当前 Change 生命周期。

## 背景
- 上游 `change-plan` 完整拥有 Change 目录、artifacts、metadata、合法 stage、Git 距离和 CLI；项目不复制或扩展这些固定契约。
- `plan` 表示 artifacts 已形成可恢复的计划结构，不表示 Readiness 已完成、实施已获授权或当前 Change 正在实施。
- 暂缓实施的原因、依赖和恢复条件会随单次 Change 的范围与当前事实变化，属于该 Change 的设计、开放问题、任务和实施观察，而不是跨 Change 的长期方向。

## 决策
- 采用: 已确认且跨 Change 持续有效的方向、理由和约束由长期决策记录直接承接；明确 Change 使用 `changes/<change>/` 下的 Change Plan 管理 proposal、design、tasks、验证与 Git baseline。OpenSpec 保持在深层归档，只在明确历史审计时读取。
- 采用: Active Change 的 metadata 只使用上游契约定义的规范 `draft` 或 `plan` stage。`plan` 只表达计划结构成熟度，不承担实施进度、授权或暂停语义。
- 采用: 暂缓实施的 Change 在自身 artifacts 中完整记录当前状态、暂停原因和恢复条件：Design 的 `Implementation Observations`、Open Questions、Resume Conditions 与 Tasks Readiness 按各自内容职责承接；不新增项目自定义 metadata 字段或 stage。
- 采用: 恢复暂缓的 Change 前，先读取当前 owner、相关活动决策和实现事实，更新仍适用的 artifacts，完成阻塞 Readiness，再运行 `plan` 刷新 Git baseline。只有当前任务授权开始实施时才进入 Implementation 任务。
