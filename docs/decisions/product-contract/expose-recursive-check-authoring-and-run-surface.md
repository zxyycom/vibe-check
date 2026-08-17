---
title: 公开递归 Check authoring 与 Run surface
status: active
alignment: unaligned
createdAt: 2026-08-17T16:53:01Z
purpose: 让 package 只公开一种递归 Check authoring model、三个普通默认值和唯一 Run，并提供实际 consumer 需要的类型根。
background: 已确认 authoring helpers；来源、TaskPlan 或 adjustment inventory 会把已取消的模型带入 package。
decision: 固定四个 runtime functions、三个普通默认 Check values，以及单一 Check/Result/Record/Project/Run type roots。
relations:
  - type: 替代
    target: product-contract/confirm-single-check-authoring-and-derivation-names-before-publication.md
---

## 目的

- 让 Project authoring、runtime import、declarations、docs、examples、dogfood 与 package acceptance 使用同一组已确认 symbols。
- 让 `Check` 是唯一描述 tree node 的 public type，不再按来源、tree role 或 execution variant 导出另一种 Check family。
- 保留 standalone authoring、direct execution、Record authoring 和 structured Run consumer 真正需要命名的类型，同时排除 implementation-only Task/Core/binding types。

## 背景

- `defineConfig` 是 Project Definition 入口，`defineCheck` 是可选的 TypeScript contextual-typing helper，`inherit` 是 collection scheduling edit helper，`run` 是唯一 Product execution operation。
- `duplicateDetection`、`fileMetrics` 与 `functionMetrics` 已选择为完整普通 Check values；项目通过 native object composition 修改它们。
- `BuiltInCheck | CustomCheck | CheckGroup`、TaskPlan 和 `replace` / `append` 分别编码来源、tree role、多阶段 execution 与 patch semantics；目标模型不再拥有这些差异。
- Project Definition、Run result 和 Check execution callback 仍需要可导入的类型 roots，但 supporting declaration types 不应自动变成新的 runtime operations 或 Check variants。

## 决策

- 采用: public runtime functions 恰好是 `defineConfig`、`defineCheck`、`inherit` 与 `run`。只有 `run` 执行 Product work；其余三个函数只帮助形成普通 authoring values/expressions。
- 采用: public runtime values 包含 `duplicateDetection`、`fileMetrics` 与 `functionMetrics`。它们都是完整 ordinary `Check<Options>` values，不带来源 brand、registry identity、member methods 或特殊 binding。
- 采用: named public type roots 为：authoring 的 `Check`、`CheckExecution`、`CheckExecutionContext`、`InheritableCheckCollection`；Check facts 的 `CheckResult`、`CheckOutcome`、`CheckUnavailableReason`；Records 的 `QualityRecordCandidate`、`RecordTypeDefinition`；Project/Run 的 `ProjectDefinition`、`ProjectEffects`、`ProjectQualityConfiguration`、`SchedulerPolicy`、`DecisionPolicy`、`RunControls`、`RunResult`；以及 `DuplicateDetectionOptions`、`FileMetricsOptions`、`FunctionMetricsOptions`。
- 采用: supporting reason、context、reporter、record-field 与 result-detail types 可以出现在 generated declarations 中，但不因此成为额外 runtime export；是否提供额外 named type export 必须由独立 consumer import evidence支持，不能恢复第二种 Check node 或 execution model。
- 采用: public entry、current-contract inventory、declarations、docs、examples、repository dogfood 与 exact-tarball consumer acceptance 必须单向核对同一 symbol set。
- 不采用: `BuiltInCheck`、`CustomCheck`、`CheckGroup`、`CheckNode`、`CheckPlanningContext`、TaskPlan/factory/leaf/completion types、operational dependency types、`replace`、`append`、`deriveCheck`、adjustment/patch/materialization types、deprecated aliases 或 wildcard/internal subpath exports。
