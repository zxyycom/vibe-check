# Design

本 Design 只拥有最小 Record hard cut 的 contract、runtime boundary 和直接消费者迁移。Cross-Check typed access、human presentation 与非 Record execution-input 重构由各自 owner 承接。

## Context

### Authority and current state

- [`docs/configuration.md`](../../docs/configuration.md) 当前规定 Product defaults 与 project custom Checks 都是 ordinary public `Check` values；default 是公共 custom Check contract 的 Product-provided instances。
- [`docs/quality-metrics.md`](../../docs/quality-metrics.md) 当前规定 reporter 提交 Record candidates，Core 冻结 Check/Record facts，Check result 独立表达 outcome/verdict。
- 当前 public `Check` 暴露 `recordTypes`；reporter 同时提供 report/reference；policy、annotation 和 machine v3 都读取 built-in-shaped Record fields。
- `CheckExecutionContext.project` 还提供多种 invocation facts 与 capabilities。其中只有 common comparison/reference vocabulary 是本次 Record hard cut 的直接删除对象；其它字段仍以当前 owner 和实现为事实。
- 本 Change 与直接相关 Decisions 都是 `active + unaligned` future direction。实现完成前，稳定 owner 与当前源码仍是现行事实。

### Responsibility map

| Responsibility | Owner in target state | This Change |
| --- | --- | --- |
| Record identity | Product reporter scope + producing Check | Product supplies `checkId`; Check supplies local `id`。 |
| Record data shape | Producing Check | Product 不注册 domain type 或 Schema。 |
| Record runtime safety | Product | Materialize detached canonical JSON、freeze、ownership、conflict 与 lifecycle。 |
| Domain conclusion | Producing Check | Structured Check outcome/verdict；不从 Record presence 推断。 |
| Generic readback | `RunResult` / machine consumer | 读取 generic canonical `data`。 |
| Typed local readback | Producing Check or named consumer | 普通 local parser；Product 不注册或执行。 |
| Cross-Check typed access | [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) | 本 Change 只提供其上游 Core shape。 |
| Human presentation | [`add-check-associated-result-presentation`](../add-check-associated-result-presentation/) | 本 Change 只移除旧 fields 假设并提供安全 generic fallback。 |
| Other execution inputs | Current configuration/run owners；未来按真实 consumer 再评估 | 不在本 Change 重命名、移动或删除。 |
| Policy/Gate | Product over Product-owned Check facts | 删除 Record data、type 与 relation predicates。 |

### Stable terms

| Term | Meaning |
| --- | --- |
| Record identity input | Reporter 第一个参数 `{ id: string }`；`id` 仅在 owning Check 内唯一。 |
| Custom data | Reporter 第二个参数；Check-owned non-array canonical JSON object。 |
| Composite identity | Product/Core pair `{ checkId, id }`。 |
| Core Record | Frozen `{ checkId, id, data }` fact。 |
| Check-owned parser | 从 generic canonical data 恢复一个 domain type 的普通 consumer adapter。 |

## Goals / Non-Goals

### Goals

- 为 arbitrary custom Check 提供不假设 file、finding、metric、baseline 或 annotation 的最小 Record API。
- 分开 Product-owned identity input 与 Check-owned custom data。
- 保留 Product-owned canonical safety、ownership、conflict、lifecycle 与 publication，但不解释 domain shape。
- 删除旧 Record 模型直接拥有的 catalog、comparison/reference、policy 和 machine vocabulary。
- 让 default Checks 作为 ordinary public Checks 证明同一 contract。

### Non-Goals

- 为 custom data 推导、声明、验证或注册 shared Product domain type。
- 让 Product 自动恢复 `RunResult.snapshot.records[].data` 的 Check-local TypeScript type。
- 实现 downstream dependency reader、parser descriptor 或 `dependsOn` 类型演进。
- 设计 terminal/live presentation grammar。
- 全面重审 `CheckExecutionContext` 或建立 invocation/provider/capability framework。
- 保留 v3 bytes、Record catalog、opaque IDs、reference facts 或 reporter compatibility。

## Decisions

### 1. Arbitrary custom Check defines the foundation

Every Product-provided default remains an ordinary public `Check` value。一个字段只有在 arbitrary custom Checks 具有相同 owner、semantics、lifecycle 和 named Product consumer 时，才可进入 base Record。当前 built-ins 共同使用某字段本身不是共同契约的证据。

### 2. Reporter separates identity from custom data

Target authoring：

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

Conceptual contract：

```ts
interface RecordIdentityInput {
  readonly id: string;
}

interface CheckRecordReporter {
  report(identity: RecordIdentityInput, data: object): void;
}
```

第一个参数是 closed Product-owned parameter object；第二个参数是完整的 Check-owned carrier object。Readiness 选择能够接受 readonly interfaces、literals 与 nested objects，同时拒绝明显 primitive misuse 的最小 declaration；runtime canonicalization 是最终 authority。

`RecordIdentityInput` 与 `CheckRecordReporter` 不默认成为 top-level exports。只有 named helper consumer 才能扩大 public type inventory；ordinary authoring 依靠 `execution` contextual typing。

### 3. Author identity is local to one Check

`id` 是 non-empty author string，在一个 executable Check 内唯一。Reporter scope 提供 `checkId`；Product 不要求 author 重复它，也不从 data、location、arrival order、selector 或 hash 生成 identity。

Core identity 是 `{ checkId, id }`。不同 Checks 可以使用相同 local `id`；同一 composite identity 的再次提交按 duplicate/conflict fail closed。Machine consumer 直接使用 composite pair，不重算 author ID，也不建立 generic reference/relation entity。

### 4. Product validates canonical safety, not domain shape

`data` 必须 materialize 为 non-array canonical JSON object。Product 建立 detached snapshot 并 deep-freeze；递归允许 `null`、boolean、string、finite number、dense array 与 plain object，拒绝 function、`undefined`、non-finite number、cycle、accessor、unsupported prototype、sparse array 与 unsafe reflection。

Product 不验证 required properties、extra properties、union、business constraints 或 cross-report consistency。Author 使用 local typing：

```ts
const data = {
  endpoint,
  latencyMs,
  statusCode
} satisfies ApiHealthData;

records.report({ id: `endpoint:${endpoint}` }, data);
```

Local type 不进入 `defineCheck` generic、Definition、Core、machine schema 或 Product runtime dependency。Check-owned parser 可以手写或使用其选择的 schema library；这不改变 Product acceptance contract。

### 5. Typed readback is a consumer adapter

`RunResult` 与 machine v4 暴露 generic canonical `record.data`。需要领域类型的 consumer 可以调用 producing Check 自己维护的普通 parser：

```ts
const data = parseApiHealthData(record.data);
```

Parser 只解释一个已经选中的 data value；它不搜索 Records、不判断缺失，也不反向修改 Core acceptance 或 producing Check outcome。本 Change 不注册、执行、序列化或发布 parser。Cross-Check selection、authorization、failure 与 inference 由 typed dependency Change 完整拥有。

### 6. Only Record-owned comparison/reference inputs leave the execution boundary

Product-wide `RunControls.comparison`、`project.comparison`、`records.reportReference`、reference status 与 generic Record relations 属于旧 Record/comparison contract，因此随本 Change 删除。需要 baseline 的 Check 从自己的 options、captured dependency、project composition 或未来 typed dependency output 获得输入，并通过自己的 verdict 表达结论。

`root`、`flags`、`changedFiles`、`files`、`cache` 与其它现有 execution inputs 不在本 Change 中重新命名、移动或删除。这是范围边界，不是长期 owner 结论或兼容承诺。只有 typed dependency capability 已实施且存在明确迁移消费者后，才另行建立 execution-input migration Change。

### 7. Policy and Gate consume Check facts

Current policy branches that select `recordTypeId`、read field operands or evaluate comparison relations cannot interpret arbitrary custom data。Target generic Gate consumes Check identity、terminal outcome 与 completed verdict；producing Check owns domain blocking logic。

Readiness 将每个现有 policy/Gate branch 映射到 Check facts 或删除结果。迁移不得通过给 Core Record 增加 kind、data path 或 Schema 来恢复旧 grammar。Non-blocking Record data 可以与 passed verdict 共存。

### 8. Presentation is an explicit downstream projection

Core Record 不包含 kind、level、subject、message 或 location。Generic output 只可安全显示 owner、count 和 IDs，不得遍历 arbitrary data 猜测内容。

Presentation Change 拥有 public projection/payload、visibility 和 terminal/live behavior。Check-owned parser 可以帮助 projection 恢复 domain type，但 parser 决定“data 是什么”，projection 决定“显示什么”；两者不能合并为 base Record obligation。

### 9. Machine v4 projects the minimal Core model

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

Validators 检查 schema identity、canonical JSON、composite uniqueness、Check ownership、ordering 与 complete Records set fingerprint；它们不解释 `data` 或重算 `id`。Publication 删除 Record type catalog、opaque ID grammar、reference facts、record acceptance/views 和 data-aware policy evidence。依据 pre-stable hard-cut policy，v3 被拒绝，不增加 adapter 或 dual reader。

### 10. Consumer migration cannot expand the foundation

Default Checks 选择自己的 local data type、local ID 和 verdict。Repository Project Definition、Project Gate、output consumers、examples、tests 与 package declarations 作为直接消费者迁移。

迁移遇到 typed dependency、presentation 或其它 execution-input 需求时，记录并交给对应 Change；本 Change 只提供 minimal Record handoff。稳定 owner 文档只在实现证据形成后同步为当前事实。

## Risks / Trade-offs

| Risk / trade-off | Control |
| --- | --- |
| Generic `data` 不提供自动端到端 TypeScript typing。 | Local write types 与 optional Check-owned parsers 提供类型，不建立 Product registry。 |
| Parser 与 producer data 可能漂移。 | Parser/type 与 Check owner 共置；只有真实 consumer 需要时才导出并增加 focused fixtures。 |
| Author ID 可能随 Check revision 改变。 | 稳定性由 Check compatibility 拥有；Product 只验证非空和唯一性。 |
| 删除 Record predicates 会改变 Gate behavior。 | 先把 domain conclusion 映射到 producing Check verdict，再删除旧 grammar。 |
| Minimal data 不能直接驱动当前 annotation renderer。 | Generic output 只显示安全 identity；领域 projection 交给 presentation owner。 |
| Consumer 迁移可能再次触发 execution-context 讨论。 | 只删除 comparison/reference；其余输入不在本 Change 迁移，后续以已实施 capability 与真实 consumer 另立范围。 |
| `data: object` 会接受部分 runtime 拒绝的值。 | Runtime canonicalization 保持 authority；declaration 和 negative runtime tests 共同说明边界。 |

## Open Questions

Base Record fields、identity、runtime safety 与 machine shape 已闭合。Implementation Readiness 只需关闭两个直接迁移问题：

1. 当前每个 DecisionPolicy/Project Gate branch 应映射到哪个 Check outcome/verdict，或应直接删除？
2. 当前 report、console 与 annotation consumers 中，哪些可以使用 owner/count/IDs generic fallback，哪些必须等待 presentation Change？

如果迁移要求 Product Record type、domain Schema、generic relation、universal presentation field 或非 comparison execution-input 重构，实施停止扩大本 Change，并把需求交给对应 owner。
