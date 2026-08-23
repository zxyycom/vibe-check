---
title: 将 foundation 固化为仓库自有脚本工具
status: archived
alignment: aligned
createdAt: 2026-08-18T09:24:16Z
purpose: 让开发脚本使用仓库直接拥有且可复现的 foundation 源码，而不依赖独立 Git 子仓库或上游 checkout。
background: 形成此决策时，foundation 是唯一遗留 toolkit gitlink，且其工作树包含本仓已验证的 Oxlint/Oxfmt 迁移；继续保留 gitlink 会让该状态无法由主仓独立交付。
decision: 将 foundation 工作树 vendor 到既有路径，停止 Git/upstream ownership，保留 workspace package 与产品用户项目 submodule scan。
tags:
  - workflow-policy
relations: []
---

## 目的
- 让 `scripts/tools/foundation` 成为主仓直接拥有、可由普通 clone 获得的开发脚本工具源码。
- 消除开发环境初始化、验证和日常修改对 Git submodule checkout、固定上游 revision 与远端可用性的依赖。

## 背景
- 形成此决策时，foundation 是主仓唯一仍处于 `160000` gitlink 状态的 toolkit，内部工作树已包含本仓需要的 Oxlint、Oxfmt 和 package-boundary 迁移。
- 该工作树若只保留在子仓本地修改中，fresh clone 无法得到同一工具入口和验证行为。
- 产品 runtime 仍需正确扫描被检查用户项目中的 gitlink/submodule；那是独立的产品能力，不能因本仓工具 ownership 变化而移除。

## 决策
- 采用: 以迁移开始时 `scripts/tools/foundation` 的工作树作为 vendor 输入，保留目录路径、源码 import、private pnpm workspace package 与独立 package gates。
- 采用: 移除主仓 `.gitmodules`、foundation gitlink、内层 Git pointer，以及项目环境脚本和相关文档中的 toolkit submodule 初始化/固定 revision 假设。
- 采用: 在移除内层 Git metadata 前生成可恢复的工作树与 Git-history 备份；备份不进入仓库追踪，也不成为运行时依赖。
- 不采用: 同步上游、重写 foundation 历史、移动到新 package 路径，或删除 Product 对被扫描项目 submodule 的输入处理。
