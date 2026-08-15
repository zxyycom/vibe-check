---
title: 在 Project Definition 使用可组合 Check tree
status: active
alignment: aligned
createdAt: 2026-08-14T13:50:47Z
purpose: 让项目通过嵌套、Task-like Check authoring 直接选择和组织内置与自定义 Checks，同时保持默认并发和稳定的扁平运行模型。
background: 扁平 builtIn、selected 与完整 schedules 数组重复描述同一 Check；项目需要组合父级约束、子级覆写和任务式依赖资源语义，而不应维护内部 catalog。
decision: Project Definition checks 使用 authoring-only tree；leaf presence 表示选择，groups 继承 context 后验证并 flatten。
relations: []
---

## 目的

- 让项目直接以 exported built-in Check value 或 custom leaf 组成所需 Checks，而不重复 built-in catalog、selected list 或空 schedule entries。
- 让 Check authoring 能以 Task-like 分组组合 shared constraints，并保持 Check/Record identity、policy surface 与结果投影的稳定边界。

## 背景

- 该决策形成前，Project Definition 用 `builtIn`、`custom`、`selected` 与 `schedules` 多次表达同一运行选择，且把 Product 的内部 catalog normalization 变成了项目维护责任。
- Product 已有 Task system，它负责依赖、全局 bounded concurrency 与 named resource coordination；“默认并发”不需要一个每 Check 的 `parallel` 开关。
- Check group 的组织价值属于 authoring；把每个 group 变成 runtime Check 会额外产生 CheckRun、record/policy identity 和 output coverage，改变不相关的产品语义。

## 决策

- 采用: `ProjectDefinition.checks` 使用 closed Task-like Check tree。直接存在的 leaf 即为本次 invocation 的 selected Check；删除或不包含 leaf 即不选择它。authoring surface 不再要求 `builtIn`、`selected` 或完整 `schedules` arrays。
- 采用: 内置 Check value 与 project custom Check 都以 leaf 形式进入同一 tree。每个 leaf 在 validation 前后均拥有唯一稳定 Check identity；同一 resolved Check identity 不能出现两次，也不能由 custom leaf 覆盖内置 identity。
- 采用: group 仅是 authoring context，不产生 CheckRun、QualityRecord、policy operand、machine artifact identity 或独立 executable binding。normalization 在 work 前递归验证并确定性 flatten groups/leaves，生成 Core 所需的 frozen public catalog、private bindings 和 planning metadata。
- 采用: 无未满足 dependency 且不争用 named resource 的 resolved Check work 默认在 shared scheduler 预算内并发执行；不提供以“禁止并行”为目的的 Check `parallel` boolean。`maxParallel` 是独立的 invocation-wide scalar，其 runtime semantics 由专门调度决策拥有。
- 采用: `maxParallel` 可以在 group 或 leaf authoring context 声明。它作为 scalar 从最近父级继承，child 明确声明时覆盖父值；所有层级均未声明时由 top-level scheduler 提供默认值。group 本身不产生独立 runtime cap。
- 采用: Task-like `dependsOn` 与 `mutex` 可以在 group 或 leaf authoring context 声明。normalization 将父级与子级声明按 root-to-leaf 顺序追加、去重并 flatten 到每个 descendant leaf；不提供让 child 隐式清除父级约束的 replace 语义。最终 dependency/resource edges 在 work 前闭合、验证和冻结，并由既有 Task system 执行。
- 不采用: 让 Check tree 在执行中动态增加 leaf/group，使用 group 顺序隐式串行化，或把通用 JavaScript object deep merge 当作继承、覆写或数组追加的语义。
