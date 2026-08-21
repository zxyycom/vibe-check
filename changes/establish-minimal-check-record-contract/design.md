# Design

本 Design 以 arbitrary public custom Check 为基础，分别确定 Record submission、execution inputs、typed readback、domain conclusion 和 presentation 的责任 owner。它只把真正通用且由 Product 拥有的义务放进公共基础契约。

## Context

### Authority and current state

- [`docs/configuration.md`](../../docs/configuration.md) 当前规定 Product defaults 与 project custom Checks 都是 ordinary public `Check` values；default 是公共 custom Check contract 的 Product-provided instances。
- [`docs/quality-metrics.md`](../../docs/quality-metrics.md) 当前规定 reporter 提交 Record candidates，Core 冻结 Check/Record facts，Check result 独立表达 outcome/verdict。
- 当前 public `Check` 同时暴露 `recordTypes`；`CheckRecordReporter` 同时提供 report/reference；`CheckExecutionContext.project` 同时包含 invocation facts、quality configuration、comparison 和 cache capability。
- 当前 policy、annotation 和 machine v3 都依赖 built-in-shaped Record fields。它们是需要迁移的 consumers，不是基础字段存在的证明。
- 本 Change 与关联 Decisions 都是 `active + unaligned` future direction。实现完成前，稳定 owner 与当前源码仍是现行事实。

### Target responsibility map

| Responsibility | Target owner | Product-wide contract |
| --- | --- | --- |
| Record ownership and identity | Product reporter scope + producing Check | Product supplies `checkId`; Check supplies local `id`。 |
| Record data shape | Producing Check | Local TypeScript type/helper；不注册到 Product。 |
| Record runtime safety | Product | Detached canonical JSON materialization、freeze、ownership、conflict、lifecycle。 |
| Typed readback | Producing Check or named consumer adapter | Optional local parser；不进入 Definition/Core/machine。 |
| Cross-Check typed readback | [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) | Direct dependency output、parser identity 与 downstream inference 由相邻 Change 承接。 |
| Per-run facts | Product invocation owner, only after common-consumer proof | Exact public placement由 Readiness 固定。 |
| Scanner、files、cache、network、baseline dependencies | Check/dependency owner unless proven common | 不因 current built-ins 使用而自动进入 base context。 |
| Domain conclusion | Producing Check | Structured Check result/outcome。 |
| Human presentation | Named presentation consumer | Explicit projection/parser；不猜测 arbitrary data。 |
| Policy/Gate | Product, over Product-owned Check facts | 不解释 custom data 或 comparison relation。 |

### Stable terms

| Term | Meaning |
| --- | --- |
| Record identity input | Reporter 第一个参数 `{ id: string }`；`id` 仅在 owning Check 内唯一。 |
| Custom data | Reporter 第二个参数；Check-owned non-array canonical JSON object。 |
| Composite Record identity | Product/Core pair `{ checkId, id }`。 |
| Core Record | Frozen `{ checkId, id, data }` fact。 |
| Invocation fact | 由一次 Product Run 产生、语义对所有合法消费者一致、不能由静态 Check options 可靠替代的值。 |
| Check dependency | 只有特定 Check 需要的 data source 或 capability，例如 scanner、file inventory、cache、network 或 baseline loader。 |
| Check-owned parser | 从 `unknown`/generic canonical data 恢复某个 Check domain type 的普通函数。 |
| Presentation projection | 将明确 Check data 转换为有界人读内容的 consumer-owned adapter。 |

## Goals / Non-Goals

### Goals

- 为任意 custom Check 提供不假设 file、finding、metric、baseline 或 annotation 的最小 Record API。
- 在调用边界分开 Product-owned identity input 与 Check-owned custom data。
- 保留 Product-owned canonical safety、ownership、conflict、lifecycle 与 publication，但不解释 domain shape。
- 让 write-side local typing 和 read-side optional parser 都留在 producing Check/consumer owner。
- 用 owner、lifecycle、consumer 和替代路径审计 execution inputs，而不是按重要性或现有位置决定基础 context。
- 让 default Checks 直接证明 public custom Check contract。

### Non-Goals

- 为多个 Records 推导、声明、验证或注册 shared Product data type。
- 让 Product 自动恢复 `RunResult.snapshot.records[].data` 的 Check-local TypeScript type。
- 在本 Change 实现 downstream Check 对 upstream output 的 typed dependency reader 或演进 `dependsOn` authoring。
- 提供 common comparison、reference、location、severity、message、kind 或 presentation semantics。
- 让 Product-wide policy 检查 arbitrary custom data。
- 为可能的 dependency delivery 预先建立 generic provider/capability framework。
- 保留 v3 bytes、opaque IDs、catalog、policy/reference evidence 或 reporter compatibility。

## Decisions

### 1. Public custom Check is the foundation

Every Product-provided default remains an ordinary `Check` value using the same public execution boundary as project-authored Checks. A default may own local types、parsers、dependencies and presentation adapters；这些局部能力不能改变 base reporter 或 Core Record。

No field or capability enters the public foundation only because all current defaults use it. A candidate must have the same semantics、owner、lifecycle and failure behavior for arbitrary custom Checks, and a named Product consumer must depend on it。

### 2. Reporter separates identity input from custom data

Target authoring:

```ts
records.report(
  { id: "benchmark:startup" },
  {
    benchmark: "startup",
    durationMs: 43.2,
    samples: 20
  }
);
```

Conceptual contract:

```ts
interface RecordIdentityInput {
  readonly id: string;
}

interface CheckRecordReporter {
  report(identity: RecordIdentityInput, data: object): void;
}
```

The first argument is a closed Product-owned parameter object. The second argument is the complete Check-owned carrier object. Readiness selects the smallest declaration that accepts readonly interfaces、literals and nested objects while rejecting obvious primitive misuse；runtime canonicalization remains final authority。

`RecordIdentityInput` and `CheckRecordReporter` do not become top-level package exports by default. Contextual typing through `execution` is sufficient；a named helper consumer is required before expanding the public type inventory。

### 3. Author supplies Check-local identity

`id` is a non-empty author string unique within one executable Check. Reporter scope supplies `checkId`；Product does not ask the author to repeat it or derive it from data、location、arrival order、selector or hash。

Core identity is `{ checkId, id }`. Different Checks may report the same local `id`；a second submission with the same composite identity is duplicate/conflict and settles through contained Record failure semantics。

Machine rows use the composite pair directly. A future named artifact consumer that points to a Record owns its own evidence grammar and carries the pair explicitly；the base contract does not create generic reference/relation entities。

### 4. Product materializes canonical data but does not validate domain shape

`data` must materialize to a non-array canonical JSON object. Product creates a detached snapshot and deep-freezes it before Core acceptance。Supported recursive values are `null`、boolean、string、finite number、dense array and plain object。Product rejects function、`undefined`、non-finite number、cycle、accessor、unsupported prototype、sparse array and unsafe reflection。

Product does not validate required properties、extra properties、union、business constraint or cross-report consistency。Check authors use ordinary local typing when useful：

```ts
interface ApiHealthData {
  readonly endpoint: string;
  readonly latencyMs: number;
  readonly statusCode: number;
}

const data = {
  endpoint,
  latencyMs,
  statusCode
} satisfies ApiHealthData;

records.report({ id: `endpoint:${endpoint}` }, data);
```

The local type does not enter `defineCheck` generic、Definition、Core、machine schema or package runtime dependencies。

### 5. Typed readback is an optional Check-owned adapter

`RunResult` exposes generic canonical `record.data`. Product cannot recover a TypeScript type that was erased at report time without reintroducing a catalog/schema relationship。Typed consumers instead use a normal parser owned with the producing Check：

```ts
function parseApiHealthData(value: unknown): ApiHealthData {
  // Check-owned domain validation.
}

const data = parseApiHealthData(record.data);
```

This parser may be handwritten or use a library selected by the Check owner. It receives one already selected data value；it does not search Records or encode data absence。This Change does not register、execute、serialize or publish it。Project-authored Checks can colocate the Check and parser in one module。Product defaults add a public parser export only after a named external consumer proves that import is required；internal presentation may use a private parser/projection。When a downstream Check must receive that parsed type through a declared dependency, [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) owns exact Record selection、call-local parser invocation、failure reporting、parser identity and inference relationship。

Parser failure means the consuming adapter cannot interpret an already selected Record；it does not retroactively change Core acceptance or the producing Check outcome。A cross-Check dependency getter may translate that call-local failure into its own structured read failure。

### 6. Execution inputs are selected by ownership and lifecycle, not importance

The Record API requires `options`、`records` and Product lifecycle cancellation. It does not by itself prove the rest of current `context.project`。

Readiness classifies every current input with this test：

1. Is Product the authoritative source for this value during one Run?
2. Does the value have the same semantics for arbitrary custom Checks?
3. Does a named public/default consumer need it during execution?
4. Would moving it to the owning Check/dependency create more public machinery or weaker lifecycle semantics?

A value enters base context only when the classification supports one shared boundary。Current candidates are：

| Current value | Formation-time classification | Required Readiness result |
| --- | --- | --- |
| `options` | Check-owned immutable execution input | Retain contextual typing and snapshot semantics。 |
| `records` | Product-owned Check-scoped submission capability | Retain with minimal reporter。 |
| `signal` | Product-owned cancellation lifecycle | Retain unless execution owner evidence disproves it。 |
| `root`、`flags`、`changedFiles` | Potential per-run invocation facts | Trace consumers and prototype a narrow invocation boundary versus Check/dependency delivery。 |
| `files` | Current quality/built-in configuration projection | Do not retain without arbitrary-custom-Check-wide semantics and named consumers。 |
| `cache` | Stateful Product capability | Decide from lifecycle、failure isolation and consumer evidence；do not treat it as a passive project fact。 |
| `comparison` | Built-in-specific domain input | Remove from Product-wide context。 |

The leading simple candidate is a narrow `invocation` value for the per-run facts that pass this test, with specialized capabilities remaining Check-owned。It is not an approved signature until declaration/runtime prototypes prove it。If a value is instead produced by another visible Check, this Change records the handoff to [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) rather than implementing a partial reader。If capability delivery needs a new generic `requires/use/provider` model, Readiness must show that it is simpler and serves multiple real consumers；otherwise keep dependencies local and stop scope expansion。

### 7. Comparison stays inside the producing Check

Product removes `RunControls.comparison`、`project.comparison`、`records.reportReference`、reference status and generic Record relations。A Check that needs baseline/reference input obtains it through the delivery mechanism selected for that Check—local options、captured dependency、project composition or another explicit owner—not through a universal comparison protocol。

The Check places current/baseline/delta/classification values in its own data when useful and returns its domain conclusion through structured Check result。Baseline absence becomes that Check's `not-applicable` or `unavailable` result according to its own semantics。

### 8. Policy and Gate consume Product-owned Check facts

Current policy branches that select `recordTypeId`、read field operands or evaluate comparison relations are incompatible with arbitrary custom data。The target generic Gate consumes Check identity、terminal outcome and completed verdict；producing Checks own domain blocking logic。

Readiness maps every current policy/Gate consumer to Check facts or removal。It may not solve migration by adding kind、data path or Schema to Core Record。Non-blocking Record data may coexist with a passed Check verdict；Record presence never implies blocking。

### 9. Presentation uses an explicit Check-owned adapter

Core Record is exactly `{ checkId, id, data }` and contains no kind、level、subject、message or location。Generic output may show owner/count/IDs, but it cannot traverse arbitrary data and guess human content。

[`add-check-associated-result-presentation`](../add-check-associated-result-presentation/) owns the public projection/payload choice。A Check-owned parser can support that projection, but typed readback and human presentation remain separate responsibilities：parser恢复 domain type；projection决定 what、where and how much to display。

### 10. Machine v4 projects the minimal Core model

Machine v4 Record row：

```json
{
  "schemaVersion": "vibe-check.record.v4",
  "checkId": "api-health",
  "id": "endpoint:health",
  "data": {
    "latencyMs": 820,
    "statusCode": 503
  }
}
```

V4 validators check schema identity、canonical JSON、composite uniqueness、Check ownership、ordering and complete Records set fingerprint。They do not interpret `data` or regenerate `id`。Run publication removes Record type catalog、opaque ID grammar、reference facts、record acceptance/views and data-aware policy evidence。V3 is rejected through the existing pre-stable hard-cut policy；no adapter or dual reader is added。

### 11. Migration changes consumers, not the foundation

Each default Check chooses local data types and stable local IDs。It keeps comparison、location、severity、message and parser/projection logic only when its own consumers need them。Scanner/process/file/cache inputs follow the execution-input classification；migration difficulty in one built-in is not grounds for expanding every custom Check's base context。

Repository Project Definition、Project Gate、examples and tests migrate as ordinary consumers。Stable owner docs are updated only after implementation evidence exists。

## Risks / Trade-offs

| Risk / trade-off | Control |
| --- | --- |
| Generic `data` loses automatic end-to-end TypeScript typing。 | Local write types and optional Check-owned parsers provide typing without Product registry。 |
| Parser logic can drift from producing Check data。 | Colocate parser/type with Check owner；built-ins use focused parser/data fixtures when a real consumer exists。 |
| Removing current `project` fields can make dependencies harder to supply。 | Readiness prototypes actual default/custom consumers before selecting context；do not introduce generic DI without multi-consumer evidence。 |
| Retaining all current `project` fields would preserve built-in leakage。 | Every field must pass owner/lifecycle/common-consumer test；importance alone is insufficient。 |
| Author IDs can change across Check revisions。 | Treat stability as Check compatibility responsibility；Product validates uniqueness, not domain meaning。 |
| Removing Record predicates changes Gate behavior。 | Move domain conclusions into producing Check verdict before deleting old grammar。 |
| Minimal data cannot directly drive current annotation renderer。 | Presentation owner uses explicit Check projection/parser；Core does not acquire file assumptions。 |
| `data: object` accepts some values later rejected at runtime。 | Runtime canonicalization remains authority；declaration tests document the compile-time boundary。 |

## Open Questions

The base Record fields are closed。Readiness must resolve these integration questions before implementation：

1. Which of `root`、`flags` and `changedFiles` remain shared per-run facts, what is their exact public container/name, and which values should instead become explicit owner dependencies or future typed Check outputs?
2. Which current DecisionPolicy/Project Gate rules map directly to Check outcome/verdict, and which record-aware branches are removed?
3. Which existing report/console/annotation outputs wait for [`add-check-associated-result-presentation`](../add-check-associated-result-presentation/), and which private Check-owned parser/projection is required during the hard cut?

If an integration appears to require a Product Record type、data Schema、generic relation or universal presentation field, implementation stops and returns to the named consumer/owner；it does not silently expand the base Record contract。
