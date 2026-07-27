---
title: 采用完整上游包维护项目工程 skills
status: active
alignment: aligned
createdAt: 2026-07-27T06:40:00Z
purpose: 让项目工程判断 skill 可持续升级，同时保持上游分发内容与项目接线的清晰边界。
background: 项目需要 OpenSpec、架构边界、共同分母、最小实现和调查报告等专用工作流。
decision: 将选定上游 skill 作为完整分发单元安装，项目触发规则和适配只写在包外。
relations: []
---

## 目的
- 让 agent 能按任务阶段使用稳定、可审计的工程判断与 OpenSpec 工作流。
- 让后续升级可以替换完整上游包，而不丢失项目自己的 owner、入口和验证要求。

## 背景
- OpenSpec 的探索、提案、实施和归档具有不同退出条件，需要分别使用对应 skill。
- 产品架构、依赖边界、跨实现共同契约、最小完整实现和持久调查报告是可独立复用的判断能力。
- 若把项目路径、命令或局部规则写进上游包，完整升级会产生不可审计的混合来源；若只复制
  `SKILL.md`，又会遗漏随包脚本、引用和 updater。

## 决策
- 采用: 把 `openspec-apply-change`、`openspec-archive-change`、`openspec-explore`、
  `openspec-propose`、`product-architecture-judgment`、`dependency-boundary-design`、
  `common-denominator-design`、`minimal-implementation` 与 `investigation-report` 作为完整
  上游分发单元维护。
- 采用: 项目触发规则、owner 路由、package scripts 和验证接线只写在 `AGENTS.md`、
  `docs/**` 或 `scripts/**`，不修改上游 skill 包来保存项目适配。
- 采用: 升级时核实上游 revision，替换所选包的完整文件集，并运行每包结构 validator、
  内部引用检查和项目级验证；不顺带升级未选择的 skill。
- 采用: 每项任务只组合必要的 skill；专用判断 skill 提供决策方法，不替代项目 owner、
  OpenSpec change、测试证据或长期决策记录。
