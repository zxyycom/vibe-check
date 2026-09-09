---
title: 隔离冻结发布源码与持续推进的 Change 工作区
id: 260908-isolate-package-release-source-from-change-work
status: active
alignment: aligned
createdAt: 2026-09-08T16:34:47Z
purpose: 让正式包保持精确源码身份，同时允许发布计划与证据持续维护
background: 发布校验要求同一干净提交，计划更新与构建共用工作区会制造不必要的源码漂移
decision: main 保持集成主线，发布 Change 独立推进，冻结工作区绑定源码提交并在发布验证后合回
tags:
  - workflow-policy
relations: []
---

## 目的

让发布包始终对应一个可复核的源码提交，同时允许发布计划、进度和证据持续维护。

## 背景

正式发布工具要求 receipt 对应同一干净 HEAD。计划与构建共用 checkout 时，修改发布记录也会破坏该条件。main 已承担开发集成；将其强制停在已发布快照既不必要，也不能替代精确 artifact 身份。

## 决策

- 采用: main 保持开发集成主线，每次发布在独立的 Change 分支和实现工作区推进；分支命名遵循[项目命名规则](use-unprefixed-project-branch-names.md)。
- 采用: 从发布分支选定干净源码提交 S，在独立 detached worktree 固定 S；正式构建、同产物完整 Gate、发布与验收都绑定该提交及 receipted tarball。
- 采用: Change 及非敏感交接记录只在实现工作区维护，冻结工作区仅产生受控构建与验证输出。需要纳入发布的源码或材料变更重新选定提交并验收；另一工作区的计划更新不改变既有 artifact。
- 采用: 正式发布和分发验证成功后，Git 版本标签绑定 S，再按授权将发布修正与交接材料合回 main。合并或证据提交单独记录，不冒充已发布源码。
- 采用: [Package release](../tooling/package-release.md)拥有具体流程、失败处理及 artifact/log 保存边界；各发布 Change 拥有当次输入和执行结果。本方向保留现有 clean-source、same-artifact 验收及外部写入授权，不要求回退 main 或重建旧版本。
