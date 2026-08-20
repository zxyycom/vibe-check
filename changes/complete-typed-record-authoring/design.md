# Design

本 Design 将现有 runtime Record catalog 投影为 `defineCheck` 的 authoring-time reporter 类型，并保持普通 Check 对象、单一 execution callback 与 runtime validation 边界不变。

## Context

当前事实与长期方向由以下 owner 定义：

- [`docs/configuration.md`](../../docs/configuration.md#public-authoring-surface) 规定 `defineCheck` 只改善 TypeScript inference，Check 的 `execution`、`options` 与可选 `recordTypes` 位于同一个普通对象上，runtime validation 仍是 authority。
- [`docs/quality-metrics.md`](../../docs/quality-metrics.md#check-and-record-facts) 规定 callback 可提交 Check-owned Record candidates，Product 负责 identity、field 与 ownership validation。
- [`expose-ordinary-check-values-with-define-check`](../../docs/decisions/expose-ordinary-check-values-with-define-check.md) 要求 `defineCheck` 保持可选 authoring helper，不附加 brand、metadata 或第二套对象语义。
- [`use-direct-check-execution-with-structured-results`](../../docs/decisions/use-direct-check-execution-with-structured-results.md) 规定 `records.report(...)` 可提交零到多个 Records，Records 与 Check terminal result 是独立通道。
- [`use-core-check-and-record-facts-from-run-resolution`](../../docs/decisions/use-core-check-and-record-facts-from-run-resolution.md) 规定最终 Core entity collections 仍只有 `checks` 与 `records`。

当前 `Check<Options>` 与 `CheckExecutionContext<Options>` 只通过 `Options` 关联 sibling options 和 callback。`recordTypes` 使用 runtime `RecordTypeDefinition[]`，而 reporter 接收宽泛的 `QualityRecordCandidate`；两者没有 authoring-time type relation。

## Goals / Non-Goals

### Goals

- 从一个 literal `recordTypes` catalog 推导 callback 可报告的 Record candidate union。
- 将 `recordTypeId`、field requiredness 与 `boolean` / `integer` / `number` / `string` value types 带入 LSP 和 compiler diagnostics。
- 对 `reportReference()` 中引用当前 Check Record identity 的 candidate 应用同一 catalog 约束。
- 保持 plain object、`satisfies Check`、inline `defineConfig` 与已拓宽/dynamic catalog 的可说明 fallback。
- 用 candidate declaration emit 与 isolated consumer type tests 证明 npm consumer 实际获得该类型能力。

### Non-Goals

- 不改变 Record runtime shape、Record identity、Core facts、policy semantics、machine v3 schema 或 readable output。
- 不把 Record presence 推断为 Check verdict，也不把 Record 合并进 `CheckResult`。
- 不增加注册表、builder DSL、runtime brand、hidden metadata 或第二 execution entry。
- 不在本 Change 设计 Record 的终端呈现或 live/intermediate output；该首版能力由 [`add-check-associated-result-presentation`](../add-check-associated-result-presentation/) 单独承接。

## Decisions

以下是 Draft 的建议性实现边界；它们不构成实施授权，精确 TypeScript signature 仍需在形成 Plan 前用 declaration probe 收敛。

### 1. Runtime catalog 仍是唯一语义来源

类型推导必须直接消费 Check 已声明的 `recordTypes` literal，不能维护另一份 TypeScript-only Record map。runtime 继续对不受信的 plain input、拓宽类型、JavaScript caller 与 mutation snapshot 做完整校验；编译通过不代表 Record 已通过 runtime acceptance。

### 2. `defineCheck` 负责 sibling Record inference

`defineCheck` 应像当前关联 `options` 与 `execution` 一样，关联当前 literal `recordTypes` 与 execution context 中的 reporter。候选 signature 可以给 `Check` / `CheckExecutionContext` 增加带默认值的 Record catalog generic，也可以把额外 generic 限制在 `defineCheck` overload 的 inference boundary；无论选择哪种，返回值仍是普通 Check object。

### 3. Reporter candidate 是按 `recordTypeId` 判别的 union

每个 Record type definition 投影一个 candidate variant：literal `recordTypeId` 选择对应 fields；required fields 必填，非 required fields 可省略；field `valueType` 按稳定规则映射到 TypeScript scalar。多个声明形成 discriminated union，未声明 identity 在 literal authoring 路径中应产生 compiler error。

`reportReference()` 的 nested Record identity candidate 使用同一 union 的 `recordTypeId`、`semanticSubject` 与 fields 投影，避免 reference authoring 回退为不相关的宽泛字符串/field map。

### 4. Dynamic authoring 必须有明确 fallback

并非所有项目都保留 const literal catalog。已标注为宽泛 `readonly RecordTypeDefinition[]`、运行时生成或跨非泛型边界传递的 catalog 无法恢复具体 union；这类输入必须显式回退到当前宽泛 candidate contract或要求调用方提供可验证的泛型类型，不能伪造精确 inference。

无 `recordTypes` 的 literal executable Check 应在 authoring-time 拒绝 `records.report()`，但普通 `Check` 宽泛注解与 JavaScript caller 仍由 runtime validation fail closed。

### 5. Public declarations 是直接验收边界

局部源码 type test 不足以证明 package consumer 体验。验证必须检查 declaration emit 保留所需 generics，并由 isolated candidate consumer 对正确的多类型 Record、错误 ID、缺失/额外 field、错误 scalar 和 reference candidate 运行正反 type assertions。

## Risks / Trade-offs

- **类型复杂度：** 从 tuple catalog 投影 exact fields 可能显著增加 declaration 大小或 compiler 工作量；必须用真实 consumer probe 而不是只观察仓库内 typecheck。
- **拓宽行为：** literal inference 与 dynamic fallback 的差异若没有清楚文档，会让同一对象在重构后突然失去精确提示。
- **兼容性：** 给公共 `Check` 类型增加 generics 可能影响显式 annotation 和第三方 wrapper；默认参数与 assignability 需要独立测试。
- **runtime/type 漂移：** TypeScript field mapping 必须来自同一 `RecordFieldValueType` vocabulary，并用 runtime fixtures 对照，不能形成第二 schema。
- **过度精确：** exact-field diagnostics 应服务真实 authoring；不得为了禁止所有 structural widening 引入难以组合的 branded values。

## Open Questions

- 精确 Record catalog generic 应成为 `Check` / `CheckExecutionContext` 的第二个公开 generic，还是只由 `defineCheck` overload 在返回类型与 callback context 中保留？该选择会改变 wrapper authoring、declaration readability 与兼容测试范围，形成 Plan 前必须通过最小 declaration/consumer probe 决定。
