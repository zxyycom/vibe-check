---
title: 使用完整上游治理 Skill 包
status: active
alignment: aligned
createdAt: 2026-08-11T02:39:52Z
purpose: 让成熟治理能力按完整上游分发单元接入，同时把项目 owner、入口和少量必要例外留在包外。
background: change-plan、decision-records 与 investigation-report 已覆盖项目所需的生命周期、关系事务、资源和分段暂存语义，原有方法层覆盖不再必要。
decision: 三个治理 Skill 使用完整上游包且不作项目内修改；项目只在包外接线，现有显式本地例外缩减为 test-evidence-review。
relations:
  - type: 修订
    target: workflow-policy/keep-project-workflow-skill-overrides-bounded.md
---

## 目的
- 让 `change-plan`、`decision-records` 与 `investigation-report` 可以按上游 release 完整升级，不形成混合来源或项目 fork。
- 让 Vibe Check 的 owner 路由、存储位置、package scripts 和验证策略仍由本仓库明确拥有。
- 只保留确实由项目特有数据与 runtime 契约支撑的方法层例外。

## 背景
- `decision-records` 已提供候选审核、完整关系事务、对齐语义、索引迁移和一致 `pending` 决策快照，项目原先为这些工作流语义维护的本地覆盖已经由上游完整承接。
- `investigation-report` 已提供可选随附资源、资源完整性、派生索引与按主题分段暂存；项目不需要复制报告或索引 runtime。
- `change-plan` 已提供 proposal、design、tasks、Git 基线、阶段 assessment、搁置恢复与归档的完整机械契约，可以取代项目中的 OpenSpec workflow skill 组合。
- `test-evidence-review` 仍需要读取 Vibe Check-owned runner、语义 Case 与全树闭合能力，因此其有界方法层例外仍有独立依据。

## 决策
- 采用: `change-plan`、`decision-records` 与 `investigation-report` 以完整、可追溯的上游 release 包安装在 `.codex/skills/`，包内 Skill、agent 指引、契约、schema、runtime、声明、source map 和 updater 均保持同一上游版本。
- 采用: Vibe Check 的触发规则、owner 分工、默认存储位置、package scripts、开发适配器和验证入口只写在 `AGENTS.md`、`docs/**`、`scripts/**` 与 `package.json`，不通过修改三个上游包保存项目语义。
- 采用: 同步上游 release 时使用包内 updater 或同一 release asset 完整替换，并运行包的机械检查、项目文档检查、脚本检查及受影响 workspace 验证；不顺带升级无关 Skill。
- 采用: `test-evidence-review` 是当前唯一登记的项目方法层 Skill 例外；项目测试 owner 继续拥有 runner、Case、CLI 与闭合 runtime。
- 采用: OpenSpec workflow Skill 包随当前治理迁移退出项目安装；既有 OpenSpec artifacts 的历史保留不构成继续维护其 Skill 或 CLI 接线的理由。
