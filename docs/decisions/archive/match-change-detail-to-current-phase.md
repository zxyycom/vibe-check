---
title: 让 change 细节服务当前阶段
status: archived
alignment: aligned
createdAt: 2026-08-06T01:44:08Z
purpose: 让 change 在探索阶段保留支持方向判断的信息，并在进入实施准备后形成可执行细节。
background: 探索需要约束、证据和开放问题，实施方案依赖届时基线，而暂停后的详细 artifacts 仍有审计价值。
decision: change 按当前阶段保存必要信息；探索保留方向依据，实施准备形成设计与任务，暂停后恢复时重新核对仍需使用的内容。
tags:
  - workflow-policy
relations:
  - type: 修订
    target: defer-future-feature-detail-until-prioritized.md
---

## 目的
- 让 OpenSpec change 的细节足以支持当前探索或实施，并让稳定契约建立在对应阶段的当前依据上。
- 保留已形成方案的审计价值，让详细程度反映 change 的真实阶段。

## 背景
- 仍在探索阶段的 change 需要保存目标、约束、依赖、风险、证据、开放问题和启动条件，才能可靠恢复方向。
- public fields、schema、算法、状态机、缓存、并发和完整测试矩阵依赖届时事实，过早冻结会制造虚假精度和返工。
- 已经为实施形成的详细 artifacts 是形成时方案和取舍的审计上下文，即使 change 后来暂停也有保留价值。

## 决策
- 采用: 探索阶段按当前问题需要保存目标、范围与非目标、关键边界、依赖、风险、证据、开放问题、启动条件和高层验收方向；细节以能否支持恢复和判断为准。
- 采用: 精确 public fields、schema shape、CLI 细节、算法、状态机、缓存键、并发策略和完整测试矩阵在实施准备阶段根据届时事实形成。
- 采用: `change` 进入实施准备后，根据届时 owner 规范、运行时代码、活动决策和已落地依赖形成所需的设计、任务和验收依据，并完成阻塞级审计后再实施。
- 采用: 跨 change 仍有长期影响的已确认判断进入长期决策；只约束本次 change 的方案和取舍留在对应 artifacts。
- 采用: 已形成详细 artifacts 的 change 暂停后保留审计上下文；恢复时根据当前基线、活动决策和实现状态更新仍需使用的内容。
- 采用: 既有 change 保留形成时上下文，并在恢复或实质修改时按其当前阶段收敛。
