---
title: 删除已完成 Change 与 OpenSpec 历史
id: 260908-delete-completed-change-and-openspec-history
status: active
alignment: aligned
createdAt: 2026-09-08T04:03:42Z
purpose: 让仓库只保留当前 Change，并由稳定 owner 承接完成后的现行事实。
background: 最新版 Change Plan 以 complete 删除完成目录，用户也明确要求清除既有 Change 与 OpenSpec 归档。
decision: 完成 Change 不保留目录，既有 Change archive 与 OpenSpec 历史树一次性删除。
tags:
  - workflow-policy
relations:
  - type: 修订
    target: 260814-record-paused-change-state-in-artifacts
---

## 目的

- 让 `changes/` 只表示当前仍需恢复和推进的 Draft / Plan，不让完成历史参与当前成员发现、检查或协调。
- 让完成结果由代码、测试、当前文档和长期治理记录承接，避免 Change 与 OpenSpec 历史成为平行事实来源。

## 背景

- 最新完整上游 `change-plan` 只定义 `draft`、`plan` 与 `complete`；完成动作在严格任务、Git tree 和恢复门禁后删除目录，不再建立 `archive/` 生命周期。
- 现有 `changes/archive/` 保留 131 个已完成 Change，`archive/` 只保存迁移前 OpenSpec 与其入口说明；两者已退出当前规范和验证，却仍产生链接、发现和维护成本。
- Active Change 的暂停原因、恢复条件和任务进度仍属于自身 artifacts；删除完成历史不改变这项责任，也不授权删除未完成 Change。

## 决策

- 采用: 当前 Change 继续在 `changes/<change>/` 使用规范 `draft` / `plan` artifacts；暂停原因和恢复条件写入该 Change 的 design、tasks 与相关实施说明，不增加自定义 metadata 状态。
- 采用: Change 满足成功标准、稳定 owner 已接管结果、全部任务与验证有证据且取得当次删除授权后，使用上游 `complete` 删除整个目录；不再创建或保留 `changes/archive/`。
- 采用: 一次性删除既有 `changes/archive/` 和仅承载历史 OpenSpec 的 `archive/` 树；当前说明移除对这些路径的依赖，不建立替代历史目录、索引或内容副本。
- 采用: Git 历史可以在明确历史审计时提供版本控制证据，但不充当当前规范、计划、调查或长期判断 owner；后续工作从当前 owner、活动 Decision / Investigation 和当前 Change 恢复。
