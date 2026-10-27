---
title: 按任务归属优先定向验证并保留快速默认
id: 261027-prefer-task-owned-targeted-validation
status: active
alignment: aligned
createdAt: 2026-10-27T03:51:25Z
purpose: 让日常任务只取得自身改动及真实依赖所需的验证证据
background: 交付自动升级和共享工作区的大量他人改动导致过度执行Gate
decision: 默认fast按需反馈，补证据先选相关目标，整体与发布验收显式升级
tags:
  - change-selection
  - gate-selection
  - project-gate
  - testing
  - workflow-policy
relations:
  - type: 修订
    target: 261024-separate-routine-release-and-explicit-gate-selection
    summary: 保留选择机制与发布义务，改为按任务归属选择日常验证
---

## 目的

- 让代理围绕本次任务取得最小充分证据，避免将交付阶段或共享工作区的大量无关改动转换为反复执行整个 Gate 的义务。

## 背景

- 前序已区分 fast、changed、routine all、正式发布和显式诊断，但日常指引仍按跨 owner、package 输入或大范围 diff 自动升级。多个任务共用工作区时，Git snapshot 不识别改动归属，自动升级会执行与当前任务无关的检查。
- 用户明确选择按任务归属优先定向验证：需要快速反馈时默认 fast，真正需要补充证据时先选择自己的目标检查；他人变更再大也不单独构成升级理由。这接受了部分集成缺陷延迟到明确整体验收或发布时发现的取舍，不是同工作量性能优化。

## 决策

- 采用: 验证范围由本次任务的已知改动及其真实依赖确定，先查局部 diff。需要 Gate 快速反馈时默认 `bun run check`；不把 Gate 作为每次编辑、交付或提交的固定步骤。补充证据优先使用最窄目标测试、owner 独立命令，已有 focused preset 与所需范围吻合时再使用。
- 采用: 其他任务的改动量、跨文件或跨 owner 本身不触发 `--changed` / `--all`。共享依赖确实影响本任务时仍须覆盖；命令读取共享工作区、无法隔离或遇到范围外失败时说明影响，不删除他人工作、隐瞒失败或自动扩大修复范围。材料、测试与治理检查按实际影响选择，不因普通文档修改默认执行全量 Test Evidence。
- 采用: 测试仅断言/输入变化且身份、映射未变时，审查相关 Case 与 owner 并运行目标测试；触及实体身份、Case/owner 引用、runner profile 或发现/身份规则时，修改后执行完整 Test Evidence。起点全树检查仅用于定位既有阻断或明确的完整性审计，不固定前后双跑；完整命令的静态/注册/Case 双向闭合契约保持，不冒充局部查询已经证明全局。
- 采用: changed 用于明确需要工作区整体受影响证据的任务，all 用于明确要求的完整 routine 验收，或定向证据无法覆盖的具体整体回归风险；运行前说明补足什么证据。fast、目标检查和 focused 成功只证明已选范围，不冒充整体或发布验收通过。
- 采用: 现有 Gate 选择机制保持：fast 的稳定资格、输入边界与固定 prepared candidate/whitespace；changed 的完整输入 region 与未知输入/Git 不可用时的保守 routine 回退；all 的完整 routine manifest 与实际 Git 检查均不变。既有扫描、artifact 和 installed docs/runtime Checks 保留，不通过缩小单个 Check 的内部契约或隐藏输入实现本次频率调整。
- 采用: focused presets 仍可组合且替换默认选择；`--test` 选择全部 routine 测试 lanes，不等于单个目标测试。当前没有任意 Check ID 或任务归属 selector，优先复用 owner 最窄入口，不编造参数或为一次验证新增 Gate entry。精确接线由 [Project Gate](../tooling/project-gate.md)拥有，日常调用策略由[交付验证](../navigation.md#交付验证)拥有。
- 采用: consumer types 保持 release-only，仅正式 all+receipt 或显式 consumer-types 诊断选择；workbench 保持 explicit-only，不被 fast/changed/all、test preset 或回退自动带入。正式发布仍由同一 receipt 绑定完整 routine 与 installed types/docs/runtime，保持[发布前完整证据要求](require-complete-project-gate-evidence-before-public-release.md)。需要真实 artifact 或安装后行为证明时，不能用源码测试、import 成功或选择摘要冒充。
- 采用: 单一 Gate 进程入口、exact candidate、唯一物理准备与共享安装、Product dependsOn 传播及严格有效集合聚合、版本化性能预算和失败证据规则保持。本次只改变日常验证选择与频率，不修改 Product API、Gate 参数、Check membership 或性能阈值，不把减少运行范围报告为同 workload 加速。
