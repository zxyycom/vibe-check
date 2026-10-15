---
title: 在展开前拒绝重复 executable Check 声明
id: 261015-reject-duplicate-executable-checks-before-expansion
status: active
alignment: aligned
createdAt: 2026-10-15T06:12:18Z
purpose: 让无效共享声明在展开前失败，避免重复子树放大解析成本
background: 共享 executable DAG 会在规划拒绝前指数展开，用户接受提前映射为配置错误
decision: 在声明校验时提前拒绝重复 executable Check ID 与循环，不限制合法树规模
tags:
  - algorithmic-complexity
  - performance
  - product-contract
relations: []
---

## 目的

- 在声明展开前识别明确无效的循环或重复 executable Check ID，避免仅少量共享对象造成指数级解析工作。
- 将合法声明的能力与无效声明的失败策略分开，不以性能优化为由引入合法树深度或节点数上限。

## 背景

- 当前声明解析按 occurrence 递归展开 children；共享 executable DAG 会在 Task Graph 的重复 ID 拒绝之前重复解析整棵子树。此前公开 Run 的该分支是 `planning / task-graph-invalid`。
- 只做 parsed-subtree memo 不能消除后续展开、完整 normalized snapshot 与 fingerprint 的输出成本；保留原规划阶段的全部事实需要更复杂的失败 handoff，超出最小修复。
- 用户已明确允许无效结构提前拒绝，并在获知错误类别变化后确认：重复 executable Check ID 可以提前返回 `configuration / invalid-project-definition`。这不是对其它错误分类或诊断契约的普遍放宽。

## 决策

- 采用: 在声明校验的 occurrence 遍历中维护本次解析的 executable Check ID 集合，并在重复声明进入后续 children 展开前拒绝。同一对象与不同对象的重复 executable ID 采用相同唯一性规则。
- 采用: 以当前递归路径的对象身份识别循环，避免依赖栈耗尽才失败；非循环共享 container 仍按原有 authoring 与 warning 义务处理，不把全部共享对象一概判为非法。
- 采用: 接受上述重复 executable ID 从规划错误提前变为配置错误，使独立 Definition 校验和公开 Run 在声明边界拒绝。尽量保留准确的声明位置；不新增合法树的规模限制，不改变合法输入的继承、排序、执行、取消或产物语义。
- 不采用: 不为保持无效输入的原指数展开 fingerprint 而新增专用图失败传输机制；不把本记录扩展为 Analyzer 改写、缓存容量管理、schema 读取快照或其它错误分类变化的授权。
- 采用: 当前行为与失败定位由 Project Definition owner 和公开 API 机制承接；实现须以合法树、container 共享、重复 executable ID、循环和有界操作计数证明，并完成相邻与集成验收后再确认对齐。
