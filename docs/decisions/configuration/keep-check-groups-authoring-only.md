---
title: 保持 Check group 仅为 authoring context
status: archived
alignment: aligned
createdAt: 2026-08-15T12:28:01Z
purpose: 让 Project Definition 用可组合 Check tree 表达 leaf 选择与继承，同时保持声明式规范化和 Run-owned 执行准备的边界。
background: Group 的组织价值属于 authoring；把它提升为运行实体会复制事实、身份和调度责任。
decision: Check tree 只规范化 leaf；Package Run 构造私有运行准备，group 不产生 Core/Record/policy/output 实体。
relations:
  - type: 修订
    target: configuration/use-composable-check-tree-with-run-owned-bindings.md
---

## 目的

- 让项目直接组合内置与 custom Check leaves，不重复维护 built-in catalog、selected list 或空 schedule entries。
- 让 group inheritance、leaf selection、声明式 normalization、私有 function slots 与 Run-owned execution preparation 各有明确 owner，同时维持稳定的 Check/Record identity 和扁平运行模型。

## 背景

- 多个 `builtIn`、`custom`、`selected` 与完整 `schedules` collections 会重复表达同一 leaf 选择，并将 Product normalization 责任转移给项目。
- Group 只提供可读的 authoring 组织和可继承的约束；runtime 只对规范化后的 leaves 形成 Check 事实和执行工作。
- 内置 binding、custom applicability 和 operational dependency resolution 依赖当次 invocation 输入，不能成为 declarative normalization 的产物或 fingerprint/output/Core 内容。

## 决策

- 采用: `ProjectDefinition.checks` 使用 closed composable Check tree。直接出现的 leaf 表示 selected Check；未出现的 leaf 不产生选择、Core fact 或 executable work。authoring surface 不再要求独立 `builtIn`、`selected` 或完整 `schedules` collections。
- 采用: 内置 Check 与 project custom Check 都以 leaf 进入同一 tree。每个 leaf 在 validation 前后均有唯一稳定 Check identity；同一 resolved identity 不得重复，custom leaf 不得覆盖内置 identity。
- 采用: group 只提供 authoring context，不产生 Core Check、QualityRecord、policy operand、machine/output row、独立 executable binding、Task scope 或 scheduler cap。normalization 在 work 前递归验证并确定性 flatten groups/leaves，只形成冻结的 declarative Check data、继承后的 dependency/resource/cap metadata 与内置 Check options。
- 采用: `maxParallel`、`dependsOn` 与 `mutex` 可以在 group 或 leaf authoring context 声明。cap 取最近祖先或 leaf 的明确值；dependency/resource constraints 按 root-to-leaf 顺序追加、去重并 flatten 到 leaves，在 work 前闭合、验证和冻结。group reference 只展开到其 leaves，不成为独立 prerequisite。
- 采用: Custom applicability、direct execution 与 TaskPlan factory 保留为 trusted private function slots。Package Run pre-work 对每个 normalized leaf 一次性构造 built-in private binding、applicability 和 operational dependency snapshot，形成唯一 Resolved Check collection；这些 runtime concerns 不进入 declarative fingerprint、Core、policy input、scheduler state 或 output。
- 采用: resolved leaf work 在 shared Task engine 的 root budget 和已验证 dependency/resource constraints 下执行；Check `maxParallel` 只作为 Product adapter 投影的 scoped cap，不建立 per-Check scheduler 或以 `parallel` boolean 伪造串行化。
- 不采用: 将 group 作为 runtime Check 或任何 Core/entity lifecycle，把私有 binding 放入 normalization，在执行中动态增加 leaf/group，用 group order 隐式串行化，或把通用 JavaScript object deep merge 当作继承、覆盖或追加语义。
