# Proposal

本 Change 新增由文件区域变更自动产生的 project change flags，并以可组合的 flag DSL 统一表达人工运行意图与变更驱动选择。

## Why

当前 `RunControls.flags` 只能提供 caller intent，`enabledByFlags` 也只能对一个扁平 token 集合应用四种 mode。项目无法声明“区域变化时生成 flag”，因而要么完整运行高成本 Check，要么由每个 Check 重复获取和匹配 changed paths。

本 Change 把区域匹配放到 selection 前：Project 一次取得 changed paths，生成带 Product 保留前缀的 flags，再由现有 effective selection 统一处理 Check、`dependsOn` closure、progress 和 aggregation。Callback 同时取得 Product 已完成匹配的文件记录，无需重新关联 path 与 flag。

## Outcome

Project author 可以声明 Git comparison 与“change flag ID → 文件区域”。Run 为每个命中文件生成其对应的全部 change flags，并以封闭 DSL 组合 caller flags 与 change flags。可信零命中生成空结果；检测不可用时保守启用全部已声明 change flags，同时通过可判别 context 明确缺少可信文件记录。

## Scope

### Intended Change

1. `ProjectDefinition.changes` 声明一个 Git comparison 和 change flag regions；完整 flag 使用 `vibe-check:change:<id>`，caller controls 不能提供该保留前缀。
2. Product 在 effective selection 前计算一次 changed-path snapshot。成功 context 直接返回稳定排序的 `{ path, flags }` records；失败 context 返回 reason，并为 selection 启用全部声明 flags。
3. `enabledByFlags` 接受现有 shorthand 或递归 DSL。DSL 提供 `flag`、`all`、`any`、`none`、`not-all`、`exactly-one` 与 unary `not`。
4. DSL 仍只形成现有 effective selection，并继续复用 `propagateDependsOn`、control settlement、progress 与 `checkAggregation.checks: "effective"`。
5. Project Gate 的 `tests-product-runtime` 作为首个 consumer：默认 required selection 同时要求对应 change flag；`--test` 与 `--all` 继续显式强制运行。

### Resulting Impacts

1. Definition validation、normalization、declarative snapshot 与 fingerprint 增加 changes 和 DSL。
2. Run lifecycle 在 graph/controls validation 后、effective selection 前增加 change preparation，并向 `prepare` / `execute` 投影同一 result context。
3. Git comparison 需要覆盖 committed、staged、unstaged、untracked、rename 与 delete，并把不可信结果映射为保守选择。
4. Public types、root exports、JSDoc、用户指南、API examples、changelog、package acceptance 与 Semantic Cases 同步新契约。
5. Project Gate 增加区域声明、组合表达式、不可用退化和增量 workload 证据。

## Success Criteria

1. 配置的 changed path 只产生其命中区域对应的保留 flags；重叠区域产生全部匹配 flags 并稳定去重。
2. Caller 提供 `vibe-check:change:` 前缀下的 token 时，在任何 author callback 前得到 closed Controls failure。
3. 成功 context 的每个 record 直接包含一个规范化 path 及其全部 flags；可信零命中返回 `ok: true` 与空 records。
4. 检测失败返回 `ok: false`、稳定 reason 且没有 records，同时所有声明 change flags 参与 selection。
5. DSL 节点、当前 shorthand、嵌套表达式、raw child multiplicity、dependency propagation 和 effective aggregation 使用同一规范化选择结果；raw `exactly-one` 的重复 children 不被去重。
6. 未配置 `changes` 的 Definition 与只使用当前 shorthand 的调用保持现有行为。
7. `tests-product-runtime` 的 region 完整覆盖其 Product upstream，并对 changed、unchanged、unavailable、`--test` 和 `--all` 场景提供端到端证据；相同 workload 记录 change preparation 与总 wall time。

## Affected Owners

- [`docs/development/project-definition.md`](../../docs/development/project-definition.md)：Definition grammar、normalization 与 fingerprint。
- [`docs/development/project-run.md`](../../docs/development/project-run.md)：invocation lifecycle、Controls 与 callback projection。
- [`docs/guides/extending-check-lifecycle.md`](../../docs/guides/extending-check-lifecycle.md)：公开 flag DSL、`prepare` 与 `execute` context。
- [`docs/guides/collecting-project-files.md`](../../docs/guides/collecting-project-files.md)：region 使用的 relative slash-path 与 glob 语义。
- [`docs/tooling/project-gate.md`](../../docs/tooling/project-gate.md)：首个 Gate consumer 与显式强制运行。
- [`docs/testing/cases/quality-runtime.md`](../../docs/testing/cases/quality-runtime.md) 与 [`docs/testing/cases/repository-tooling.md`](../../docs/testing/cases/repository-tooling.md)：产品与 Gate 的 Semantic Cases。
