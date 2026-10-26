---
title: 在独立项目 Skill 集合中纳入测试设计
id: 261026-maintain-distinct-project-skills-with-test-design
status: active
alignment: aligned
createdAt: 2026-10-26T06:54:25Z
purpose: 让项目以有限且职责独立的 Skill 集合承接特殊工作流和工程判断，并明确测试设计与证据审查的互补责任。
background: 既有七项集合已明确限制扩展，但测试设计形成独立方法并已接入当前 owner，需以真实后继恢复一致的长期依据。
decision: 保留原七项并纳入 test-design；以独立责任而非同义通用方法选择 Skill，维护上游包、本地方法层和项目 owner 的边界。
tags:
  - skills
  - test-evidence
  - testing
  - workflow-policy
relations:
  - type: 修订
    target: 260812-keep-seven-distinct-project-skills
    summary: 保留独立职责边界并纳入测试设计
---

## 目的

让 agent 从有限、职责可辨认的项目 Skill 集合恢复特殊工作流和独立工程判断。自动化测试的设计与最终证据审查相互补充，行为 owner、编码规范、测试策略和项目接线保持单一归属。

## 背景

- 前序真实采用过固定七项安装集合，并规定扩大集合须有新的长期决策；它保留治理 artifact、项目证据及独立工程判断能力，排除与编码规范同义的通用方法。本记录以真实后继纳入第八项，而非改写原七项的采用事实。
- 形成本记录时，工作区 owner 已列入上游 `test-design`，测试策略已区分设计与证据审查，导航和本地入口也已接通；本次修订长期集合边界，不再发起安装或测试实现。
- 测试设计在尚无直接测试时，就要从行为契约选择最小充分边界、场景、独立预期与观察，并权衡失败传播、隔离和成本；证据审查则判断最终测试的证明目的、信号、维护价值及项目声明的 Case 连续性与闭合。设计方案、可执行证据和账本闭合各有责任。
- 完整上游包、本地方法层与项目 runtime 各有维护 owner；方法 Skill 提供工程方法，项目仍拥有 runner、Case、CLI 和闭合实现。

## 决策

### 有限集合与独立职责

- 采用: 保留原七项并纳入 `test-design`，安装集合为 `change-plan`、`common-denominator-design`、
  `decision-records`、`investigation-report`、`performance-optimization`、`product-architecture-judgment`、
  `test-design` 和 `test-evidence-review`。八项是本次确认的有限基线，价值由独立职责判断，不由数量判断。
- `test-design` 承接自动化测试的方案、编写、改进与设计审查，从行为契约形成有辨错能力、容忍合理实现替换且成本适当的行为证明。
  `test-evidence-review` 审查最终测试入口、证明范围和证据质量，并按项目声明的能力维护 Case 语义连续性与全树闭合。
  两者可以协同；设计阶段无直接测试的方案不创建名义 Case，账本操作或通用编码规范不能替代这两项责任。
- 普通实现、调试、审查、重构、接口和自动化从文档导航进入行为 owner，再遵循编码规范与相邻验证；不另装同义通用方法 Skill。测试方法入口保持上述独立职责。
- 未来扩大集合须有新的长期决策，候选必须具有现有八项、行为 owner 和编码规范不能承接的独立责任，并说明触发、维护来源与验证边界。
  独立职责是必要条件，不是自动扩展、安装或更新授权；已有同主题 Skill 或上游新增能力也不改变这一门槛。

### 来源与更新

- `change-plan`、`common-denominator-design`、`decision-records`、`investigation-report`、
  `product-architecture-judgment` 和 `test-design` 按可追溯的完整上游包维护。包内指引、契约、runtime 与更新入口保持同一来源版本；项目语义和接线在包外维护。
- `performance-optimization` 是无 runtime 的本地独立方法目录，`test-evidence-review` 是项目特有方法层；两者不复制上游治理 runtime，也不接管项目 runner、Case、CLI 或闭合实现。已退出安装的 OpenSpec workflow Skill 保持退场，历史 artifacts 不构成恢复维护依据。
- 更新须显式选择，按分发单元完整更新并验证受影响边界，不顺带升级无关 Skill。
  `test-design` 的固定提交来源、方法版本和更新防降级要求由工作区 owner 维护；普通指令使用不因此新增依赖安装。

### 当前规则与接线 owner

每个 Skill 的入口描述拥有通用触发条件；`AGENTS.md` 只补充项目特有 owner、命令和验证路由，文档导航连接行为 owner。
`docs/tooling/workspace.md` 拥有当前安装清单、来源、分发边界和项目接线；测试策略与 Case owner 拥有项目测试契约。
Skill 提供方法，不替代当前规则或改变授权。
