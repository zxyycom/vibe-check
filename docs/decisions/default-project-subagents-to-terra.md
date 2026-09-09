---
title: 项目子代理默认使用 Terra
id: 260908-default-project-subagents-to-terra
status: active
alignment: aligned
createdAt: 2026-09-08T06:34:52Z
purpose: 让项目子代理模型选择遵循用户明确偏好
background: 用户要求常规子代理使用 Terra，仅明确需要高智能时使用 Sol，并排除 Astra
decision: 默认 Terra，明确高智能任务才用 Sol，项目子代理不用 Astra
tags:
  - workflow-policy
relations: []
---

## 目的

- 项目子代理的默认与升级选择遵循用户明确的模型偏好，避免后续任务自行扩大模型使用范围。

## 背景

- 用户明确要求：后续项目子代理默认使用 Terra，只有明确需要更高智能时使用 Sol，不使用 Astra。
- 该偏好约束项目子代理选择，不改变当前任务的实施范围或外部操作授权。

## 决策

- 采用: 项目子代理默认选择 `gpt-5.6-terra`；仅在任务明确需要更高智能时选择 `gpt-5.6-sol`，并说明原因；不选择 `gpt-6-astra`。
- 当前执行规则由项目 `AGENTS.md` 承接；本记录保存选择理由，不把模型选择变成新的任务或授权。
