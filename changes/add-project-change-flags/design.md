# Design

本设计用一个端到端 Change 交付以下链路：根级 change preparation → change-derived flags → `enabledByFlags` expression → preflight/execution change query。

## Context

- **Selection owner:** [`extending-check-lifecycle.md`](../../docs/guides/extending-check-lifecycle.md#按-flag-选择-check) 与 [`project-definition.md`](../../docs/development/project-definition.md#flag-enabled-checks) 定义 caller-supplied immutable flags、调度前 effective selection、`dependsOn` closure 和 effective aggregation。当前 `{ flags, mode }` 只能表达一个扁平集合谓词。
- **Callback lifecycle:** preflight 在 Scheduler admission 和 hard prerequisites 之后运行，当前只接收 authored options 与 signal；execution 接收 Product-owned context。Preflight 可结算 `unavailable`，尚不能直接结算 `not-applicable`。
- **File matching owner:** [`collecting-project-files.md`](../../docs/guides/collecting-project-files.md) 定义 `ProjectFileSelection` 的 source/include/exclude 契约；package-private `matchesAnyConfigGlob` 统一 slash-path 与 dot-path matching。
- **First consumer:** 模块化测试 lane 是首个性能验收场景，但公共能力不限定 Check 领域。
- **Decision owner:** [`prepare-project-change-flags-before-selection.md`](../../docs/decisions/prepare-project-change-flags-before-selection.md) 修订旧 provider 边界并替代 provider/wrapper 方向；本 Draft 细化其交付范围。

## Goals / Non-Goals

### Goals

1. 可选配置并一次准备一个可信的 project-wide change view。
2. 让 caller flags 与 change-derived flags 共用一个封闭、可序列化、可规范化的选择表达式。
3. 让声明式选择、preflight 和 execution 使用同一 invocation snapshot。
4. 复用现有文件匹配语义，并用代表性 workload 证明增量收益覆盖准备成本。

### Responsibility Boundaries

| Owner | Responsibility |
| --- | --- |
| Project `changes` | 拥有单一 source、baseline、路径语义、marker declarations、取消与不可用策略。 |
| Flag expression | 表达 caller-flag 与 change-marker 的无副作用布尔条件。 |
| Effective selection | 在 Scheduler 前消费冻结输入，并拥有 dependency closure 与 aggregation identity。 |
| Callback context | 向 preflight 和 execution 提供同一只读 change query。 |
| File matching | 以 `ProjectFileSelection` 和唯一 config-glob matcher 解释 marker declarations。 |

普通 Check 的版本、环境和运行结果仍通过显式 relation 组合；它们不修改 invocation flags。V1 提供一个 project-wide change view，领域 owner 可在局部处理其它 baseline/source。

## Decisions

### Intended Change

1. **Preparation boundary.** `ProjectDefinition` 新增可选根级 `changes`。Product 在完整 Definition/graph validation 后、flag control settlement 与 Scheduler admission 前准备一次 snapshot。省略配置时不采集 change facts，也不向 callback 注入 change capability。Source、baseline 与 comparison options 的封闭 shape 在进入 Plan 前确定。
2. **Matching and derived flags.** Change owner 规范化 changed paths，并通过现有 `ProjectFileSelection` 和 `matchesAnyConfigGlob` 计算 marker set。可信 snapshot 的 markers 投影为 Product-owned reserved flags；caller flags 与派生 flags 保持来源可辨，并共同形成冻结的 selection input。RunControls 拒绝 caller 使用保留命名空间。
3. **One expression and one selection.** `enabledByFlags` 扩展为封闭 expression AST，并提供只构造该 AST 的无副作用 builder。最小节点包括 caller-flag atom、change-marker atom、`all`、`any` 和否定组合；现有 `{ flags, mode }` 规范化为同一形式。Definition 引用 change marker 时必须配置根 `changes`。Evaluator 仍只形成一次 effective Check ID 集，再复用既有 dependency propagation、control settlement 和 aggregation。
4. **Conservative availability semantics.** Change-marker atom 使用 true/false/unknown。可信 snapshot 决定 true/false；acquisition、baseline 或 normalization 不可信时为 unknown。Selection 只排除明确为 false 的 Check，unknown 保守进入；caller-only false 分支不受无关 unknown 影响。完整运行由显式 caller-flag expression branch 表达。
5. **Shared query.** 启用根配置时，Product 构造冻结且可辨别 unavailable/available 的 `change` query。Execution 直接读取；preflight 通过向后兼容的可选 context 参数读取，并新增 `not-applicable` result branch。Preflight 保持现有时机，不改变 graph 或 effective selection。
6. **Evidence-led delivery.** 实施先以模块化测试 lane 建立 zero/small/representative-large/stress workload，观测 preparation、selection、query、memory 与端到端 wall time，再确定 eager/lazy index 和性能 guard。同步受影响的 exports/JSDoc、owner docs、示例、schema、changelog、package material 与 Semantic Cases；current docs 在实现前不宣称 API 已存在。

### Resulting Impacts

- **Public definition:** 根 `changes`、marker declarations 和递归 flag expression 需要 exact validation、normalization、freezing、snapshot/fingerprint 与 Check inheritance 规则。
- **Invocation lifecycle:** preparation 需要固定与 cancellation、output initialization、custom admission preparation 和 failure mapping 的顺序。
- **Callback lifecycle:** preflight signature/result grammar 与 execution context 成为兼容面；preflight `not-applicable` 与 control-level unselected 是不同事实。
- **Path safety:** owner 需要覆盖 tracked/untracked/staged/working-tree、comparison reference、rename/delete、outside-root、case/separator、symlink、I/O failure 与 cancellation；不可信状态映射为 unavailable/unknown。
- **Performance:** 所有启用 change 的 Run 都承担 preparation 和 expression evaluation 成本；索引保持 invocation-private，除非 Plan 证明 publication 需求。

## Risks / Trade-offs

- 递归 expression 提高组合能力，也扩大公共 grammar；Plan 需要限制节点类型、深度、大小与规范化规则。
- Combined flags 便于 introspection，但会改变 `project.flags` 只表示 caller input 的含义；代表性 authoring cases 应决定是组合暴露还是分别暴露来源。
- Unknown 的保守求值防止漏检，但 source 故障时可能运行更多 Check；这是增量优化的安全退化。
- Preflight 自定义跳过发生在 admission 和 dependencies 之后，不能当作 planning-level selection 衡量。

## Open Questions

| Topic | 进入 Plan 前必须确定 |
| --- | --- |
| Source and baseline | 封闭 Git/filesystem source 或受信 resolver 的选择，以及 invocation-specific comparison reference。 |
| Expression contract | AST/builder 命名、节点上限、旧 shorthand 映射、canonical ordering 和 unknown 真值表。 |
| Reserved flags | Namespace、RunControls 拒绝规则、marker 引用验证及 caller/effective/change flags 可见性。 |
| Preparation lifecycle | 与 validation、output initialization、custom admission、diagnostics 和 cancellation 的精确顺序及失败结果。 |
| Change query | Path/kind/rename、unavailable reason、最小方法集合、冻结边界及 machine/diagnostic publication。 |
| Performance gate | 代表性规模、采样协议，以及 timing、memory、build-count guard 或可复跑 observation 的选择。 |
