---
title: 观察使用中性定义，门禁要求 Project Definition
status: archived
alignment: unaligned
createdAt: 2026-08-05T10:31:36Z
purpose: 让项目无需配置即可观察，同时让阻断行为始终由项目持有且已验证的政策驱动。
background: 观察需要通用起点；门禁需要可审阅政策，但其权威入口已从 JSON 文件转为 TypeScript Project Definition。
decision: 无 Project Definition 的非门禁运行使用 Product 中性定义；任一 gate 在工作前要求成功解析并验证项目定义中的 named policy。
tags:
  - configuration
relations:
  - type: 修订
    target: use-neutral-default-for-observation-and-file-policy-for-gates.md
---

## 目的
- 保留外部项目零配置运行 non-blocking observation 的体验。
- 确保 blocking gate 使用项目明确拥有、可提交且在执行前通过验证的完整政策。

## 背景
- Product-owned neutral behavior 适合作为通用观察起点，但不能代表项目对阻断范围、检查选择和接受条件的决定。
- 固定 JSON file 不再是权威 authoring surface；Project Definition 中的 serializable policy data 承接相同治理责任。
- 不可信项目需要跳过 executable definition 的路径，该路径不能同时假装拥有项目门禁政策。

## 决策
- 采用: 未选择 Project Definition 的 ungated invocation 使用 Product-owned、repository-neutral 的完整中性定义，只运行 Product 明确提供的观察行为。
- 采用: 任一 gate 在 check work 前要求显式或固定发现的 Project Definition 成功 evaluation、normalization 和 validation，并显式选择其中 resolved named `DecisionPolicy`。
- 采用: 主动绕过 project-owned executable definition 与 gate 互斥；Product 不从环境、repository history 或 neutral default 推断缺失的阻断政策。
- 采用: `init` 生成当前 Project Definition 入口的中性 starter，使项目可在审阅后将其作为政策 owner；初始化本身不执行项目 module。
