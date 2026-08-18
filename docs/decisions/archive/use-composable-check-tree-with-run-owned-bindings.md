---
title: 在 Project Definition 使用可组合 Check tree 并由 Package Run 构造内置绑定
status: archived
alignment: aligned
createdAt: 2026-08-15T07:34:24Z
purpose: 让项目通过可组合 Check tree 选择和组织 Checks，同时让声明式规范化与私有运行时绑定各有明确 owner。
background: Check tree 需要在 work 前形成稳定声明式模型，而内置 binding 依赖当次运行输入，不应成为 normalization 产物。
decision: 使用 authoring-only Check tree；normalization flatten 声明式数据，Package Run 构造内置 binding。
tags:
  - configuration
relations:
  - type: 修订
    target: use-composable-check-tree-in-project-definition.md
---

## 目的

- 让项目直接用 Product 提供的内置 Check 或 project custom Check 组成所需 Checks，而不重复维护 built-in catalog、selected list 或空 schedule entries。
- 让 group inheritance、leaf selection、声明式 normalization 与私有执行准备保持明确边界，同时维持稳定的 Check/Record identity、policy surface 和扁平运行模型。

## 背景

- 扁平 `builtIn`、`custom`、`selected` 与完整 `schedules` arrays 会重复描述同一运行选择，并把 Product 的内部 catalog normalization 变成项目维护责任。
- Check group 的组织价值属于 authoring；把 group 变成 runtime Check 会额外产生 CheckRun、QualityRecord、policy identity 与 output coverage。
- 内置 Check 的 private binding、applicability 与 operational dependency resolution 依赖当次 invocation 输入。declarative normalization 可以验证和保留公开 Check 数据，但不应拥有这些 runtime concerns。
- Product 已有 Task system 负责 dependency、bounded concurrency 与 named resource coordination；Check tree 不建立第二个 scheduler。

## 决策

- 采用: `ProjectDefinition.checks` 使用 closed Task-like Check tree。直接存在的 leaf 表示 selected Check；删除或不包含 leaf 表示不选择。authoring surface 不再要求独立 `builtIn`、`selected` 或完整 `schedules` arrays。
- 采用: 内置 Check 与 project custom Check 都以 leaf 进入同一 tree。每个 leaf 在 validation 前后均拥有唯一稳定 Check identity；同一 resolved identity 不能出现两次，custom leaf 也不能覆盖内置 identity。
- 采用: group 只提供 authoring context，不产生 CheckRun、QualityRecord、policy operand、machine artifact identity 或独立 executable binding。normalization 在 work 前递归验证并确定性 flatten groups/leaves，形成 frozen public catalog、resolved dependency/resource/cap metadata 与内置 Check options；它不构造或保存 private built-in runtime binding。
- 采用: Package Run pre-work 根据 normalization 选出的内置 `checkId` 与当次运行输入构造 private binding、applicability 和 operational dependency snapshot。这些 runtime concerns 不进入 declarative fingerprint、Core、scheduler state 或 output。
- 采用: 无未满足 dependency 且不争用 named resource 的 resolved Check work 默认在 shared scheduler 预算内并发执行；不提供以“禁止并行”为目的的 Check `parallel` boolean。
- 采用: `maxParallel` 可以在 group 或 leaf authoring context 声明。它从最近父级继承，child 明确声明时覆盖父值；所有层级均未声明时使用 top-level scheduler 默认值。group 本身不产生独立 runtime cap。
- 采用: Task-like `dependsOn` 与 `mutex` 可以在 group 或 leaf 声明。normalization 按 root-to-leaf 顺序追加、去重并 flatten 到 descendant leaves；child 不隐式清除父级约束。最终 dependency/resource edges 在 work 前闭合、验证和冻结，并由既有 Task system 执行。
- 不采用: 在执行中动态增加 leaf/group、用 group 顺序隐式串行化、让 normalization 构造私有内置 binding，或把通用 JavaScript object deep merge 当作继承、覆写或追加语义。
