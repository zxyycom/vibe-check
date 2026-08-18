---
title: 使用决策驱动的 Change Plan 并完整归档 OpenSpec
status: archived
alignment: aligned
createdAt: 2026-08-11T02:50:06Z
purpose: 让长期方向直接作为跨 change 规格依据，以持久 Change Plan 管理实施，并让 OpenSpec 只保留一个深层历史 owner。
background: 决策记录和 Change Plan 已能分别承接长期方向与单次实施，继续暴露或复制 OpenSpec 会增加载体同步与默认上下文成本。
decision: 长期方向由决策记录承接，单次 change 由 Change Plan 承接；OpenSpec 完整下沉到深层归档，原活动方向重新建立为 draft Change。
tags:
  - workflow-policy
relations:
  - type: 修订
    target: match-change-detail-to-current-phase.md
---

## 目的
- 让跨 change 持续有效的方向、理由和约束拥有一个成熟、可演进且可查询的规格来源。
- 让单次 change 的范围、当前设计、任务、验证和暂停恢复状态由专门的计划生命周期承接。
- 让迁移前 OpenSpec 只有一个深层历史 owner，只在明确历史回顾时进入上下文。

## 背景
- `docs/decisions/` 已能保存完整、自包含且带生命周期、对齐状态和演进关系的长期判断；这些判断足以作为后续 change 的方向规格输入。
- 当前稳定事实继续由 owner 文档、代码、测试和 release artifact 承接，长期决策不需要再经 OpenSpec spec 投影才可用于实施判断。
- OpenSpec 同时承接方向、delta、设计和任务时，会与成熟决策及当前 owner 重复，并要求额外同步、校准和验证。
- `change-plan` 能以 `proposal.md`、`design.md`、`tasks.md` 和 `.change-plan.json` 保存一个明确 change 的临时实施上下文、Git 基线、阶段与暂停恢复状态。
- 迁移前的 OpenSpec active change 含有仍值得恢复的方向与形成时设计，但其 lifecycle 未经 Change Plan 确认；OpenSpec 主 specs、active changes、archives 和配置作为一个完整集合才具有可靠的历史审计价值。

## 决策
- 采用: 已确认且跨 change 持续有效的方向、理由和约束由长期决策记录直接承接，并作为后续 change 的方向规格；它不替代当前事实 owner，也不自行产生任务、优先级或实施授权。
- 采用: 需要跨文件、owner 或验证阶段持久交接的明确 change 使用 `changes/<change>/` 下的 Change Plan，按 draft、plan、implementation、shelved/resume 和 archive 生命周期管理 proposal、design、tasks、验证与 Git 基线。
- 采用: 仍在探索的问题不为获得形式而预建计划；目标和边界已经明确的局部改动可以直接同步 owner、实现与验证。进入持久计划时，只保存该 change 当前实施所需的设计和任务，不复制长期决策全文。
- 采用: 迁移时把每个 OpenSpec active change 的方向重新建立为 `draft` Change Plan；当前 proposal 只恢复可继续收敛的目标，不继承旧 active、readiness、任务完成状态或实现基线。
- 采用: 整个 `openspec/` 原样移动到 `archive/legacy/openspec/`，作为唯一迁移前历史 owner，退出仓库根、默认上下文、当前规范、active change 与验证 gate；不在各 Change 中复制历史 artifacts，只有明确历史审计时才读取。
- 采用: 恢复任一旧方向时共同读取当前 owner、相关活动决策与实现事实；归档 OpenSpec 只提供形成时证据，必须重新收敛当前 Change Plan，不能直接继续旧 tasks 或旧基线。
