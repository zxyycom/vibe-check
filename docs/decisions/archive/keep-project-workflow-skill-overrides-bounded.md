---
title: 保持项目工作流 Skill 语义覆盖有界
status: archived
alignment: aligned
createdAt: 2026-08-06T01:44:09Z
purpose: 让项目治理语义可靠进入 agent 方法层，同时保持上游工具实现和本地例外边界可追溯。
background: 完整上游包适合通用能力，但项目对决策、change 和测试证据的 owner 分工需要更具体的方法指引。
decision: Skill 默认保持完整上游分发；项目登记并维护由 owner 与验证支撑的最小方法层覆盖，工具 runtime 与数据契约继续由上游拥有。
tags:
  - workflow-policy
relations:
  - type: 修订
    target: use-upstream-skills-with-project-local-exceptions.md
---

## 目的
- 让通用 Skill 能持续从上游完整升级，同时让 Vibe Check 的决策、change 和测试证据治理在 agent 实际执行入口中无歧义地生效。
- 让每个项目本地例外都有明确理由、owner、文件边界、验证入口和升级审查要求。

## 背景
- 通用 Skill 承接跨项目方法，项目方法入口还需要读取本仓库的 owner 分工。
- `decision-records` 的工具 runtime、schema、索引和生命周期事务可完整复用；项目方法层负责限定未对齐方向如何影响当前任务。
- OpenSpec 的探索、提案和实施方法需要共同读取项目 change 阶段与长期决策分工。
- 测试证据的 runner、Case 和闭合语义已经由项目 owner 与 wrapper 承接，仍需要能力感知的方法层例外。

## 决策
- 采用: 通用 Skill 默认按完整、可追溯的上游分发单元维护；项目 wrapper、owner 数据和产品 runtime 继续留在 Skill 包外。
- 采用: 项目可以登记最小方法层语义覆盖，但必须由当前 owner 文档、长期决策和仓库验证入口支撑，并明确受影响文件；工具 runtime、schema、索引、配置和产品行为继续由原 owner 承接。
- 采用: `decision-records` 的 agent 指引与领域契约、OpenSpec explore/propose/apply 的 agent 指引，以及 `test-evidence-review` 的能力感知评审方法是当前项目本地例外；精确文件边界由脚本工具 owner 文档维护。
- 采用: 上游同步时先比较覆盖语义和受影响文件；上游已经满足项目 owner 时，通过新的决策演进缩小或取消例外，否则重放已登记的最小覆盖。
- 不采用: 因方法层覆盖而 fork 工具实现，或把未登记的局部修改伪装成完整上游包。
