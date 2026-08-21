# Design

本 Design 只用两个主契约定义目标基础：Check final result 是一个 Check 的唯一主结论，minimal Record 是该 Check 可选的补充事实。其它删除、迁移和下游能力均按“由主契约变化引起的次级影响”归位。

## Context

### 当前事实与目标方向

- [`docs/configuration.md`](../../docs/configuration.md) 当前规定 Product defaults 与 project custom Checks 都是 ordinary public `Check` values；default 是公共 Check contract 的 Product-provided instances。
- [`docs/quality-metrics.md`](../../docs/quality-metrics.md) 当前规定 reporter 提交 Record candidates，Core 冻结 Check/Record facts；现行 Check result 使用 `completed + verdict`，Record 使用 built-in-shaped catalog/fields。
- 当前 `RunResult` 的 completed facts 保存 `snapshot.checks` / `snapshot.records`，同时带有由 DecisionPolicy 产生的 decision/reference facts。Project Gate 又读取这些 facts执行自己的 closure。
- 本 Change 是 `active + plan`。目标 Decisions 仍是 `active + unaligned` future direction；实现完成前，稳定 owner、aligned Decisions 与当前源码仍是现行事实。

### 主设计与次级影响判定

一项内容只有直接决定下面两个问题时才属于主设计：

1. 一个 Check 如何返回自己的最终领域结论与主数据；
2. 一个 Check 如何提交零到多个不决定终态的补充事实。

如果一项工作只因为旧字段、旧状态或旧 Record model 被现有消费者读取而需要改变，它属于次级影响。次级影响可以是本 Change 必须完成的直接迁移，也可以由独立 Change 承接；它不能反向向 base Check/Record 增加字段或语法。

| Responsibility | Target owner | Classification in this Change |
| --- | --- | --- |
| Check terminal conclusion and primary data | Producing Check + Product settlement | 主设计：单一四态 result；passed/failed 携带 final data。 |
| Supplemental Record identity/data | Producing Check + Product reporter scope | 主设计：Check-local `id` 与 custom data。 |
| Canonical safety and frozen Core facts | Product | 主设计：final data 与 Record data共用安全边界。 |
| Completed Run facts | Product Run | 主设计的直接载体：返回 Checks/Records，不决定 aggregate policy。 |
| Machine v4 | Output owner | 次级直接迁移：投影新的 Core facts。 |
| Legacy comparison/reference/DecisionPolicy | Existing policy owners | 次级清理：直接输入消失后退出。 |
| Minimal Check aggregation | Product Run + repository Gate adapter | 次级直接迁移：显式`RunControls`配置，package求值，adapter消费。 |
| Repository Gate optimization | [`align-project-gate-with-native-check-authoring`](../align-project-gate-with-native-check-authoring/) | 下游影响：catalog、native composition、CLI/process与profile优化。 |
| Typed dependency readback | [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) | 下游次级影响：选择并解析 upstream final data/Records。 |
| Human presentation | [`add-check-associated-result-presentation`](../add-check-associated-result-presentation/) | 下游次级影响：显式投影 final data/Records。 |
| Other execution inputs | Current configuration/run owners | 非目标；不因本次 hard cut重新归属。 |

### Stable terms

| Term | Meaning |
| --- | --- |
| Check final result | Producing Check callback 返回的唯一终态；passed/failed 同时返回 Check-owned primary data。 |
| Check final data | 一个 passed/failed Check 的主结构化结果；Core 中是 canonical JSON object。 |
| Supplemental Record | 一个 Check 可提交的零到多个补充事实；存在与否不决定 Check status。 |
| Record identity input | Reporter 第一个参数 `{ id: string }`；`id` 仅在 owning Check 内唯一。 |
| Record data | Reporter 第二个参数；Check-owned non-array canonical JSON object。 |
| Composite Record identity | Product/Core pair `{ checkId, id }`。 |
| Canonical JSON object | 通过安全 descriptor traversal 得到的 prototype-safe、detached 且 deep-frozen JSON object；canonical text/bytes 另由显式 lexical-key serializer 形成。 |
| Check aggregation | 多个 settled Check statuses 的可配置派生判断；不是 Check/Core/Run lifecycle fact。 |

## Goals / Non-Goals

### Goals

- 用一个 closed result union直接表达 Check 的 terminal status 与 primary data，删除 `completed + verdict` 双层状态。
- 为 arbitrary custom Check 提供不假设 file、finding、metric、baseline、Gate 或 presentation 的最小 Record API。
- 明确 final data 是主结果、Records 是补充事实；两者均由 producing Check 解释 domain shape。
- 保留 Product-owned canonical safety、ownership、repeated-identity rejection、lifecycle 与 Core/Run publication，但不解释 domain semantics。
- 让 default Checks 作为 ordinary public Checks证明同一 contract。
- 对 machine、legacy policy、output、package 与 repository Gate 的直接影响建立可验证迁移，不让迁移便利重新塑造基础契约。

### Non-Goals

- 不为 final data 或 Record data推导、声明、验证或注册 shared Product domain type。
- 不让 Product 自动恢复 Check-local TypeScript type；local parser与schema由 Check/consumer拥有。
- 不为未配置consumer提供hidden aggregate default，也不把aggregation并入Run lifecycle kind。
- 不在本Change设计typed dependency getter、repository Gate catalog/native composition或terminal/live presentation grammar。
- 不全面重审 `CheckExecutionContext`，也不迁移 `root`、`flags`、`changedFiles`、`files`、`cache` 等其它 inputs。
- 不保留 v3 bytes、Record catalog、opaque IDs、reference facts、DecisionPolicy compatibility 或旧 reporter adapter。

## Decisions

### 1. Check final result and Records have different obligations

一个 executable Check 恰好产生一个 terminal result，并可以产生零到多个 Records。

- Final result 回答“这个 Check 最终处于什么状态，以及 passed/failed 的主数据是什么”。
- Record 回答“这个 Check 还提交了哪些可独立标识的补充事实”。

Product 不从 Record absence、presence、数量、identity 或 data 推断 Check status。Check 也不需要为表达主结果而创建一个伪 Record。两者可以包含相近数据，但事实 owner必须明确；consumer不得假定 Record 是 final data 的镜像。

### 2. Public CheckResult uses one terminal status layer

Public authoring contract：

```ts
type CheckResult = Readonly<
  | {
      readonly status: "passed";
      readonly data: object;
    }
  | {
      readonly status: "failed";
      readonly data: object;
    }
  | {
      readonly status: "not-applicable";
      readonly reason?: CheckNotApplicableReason;
    }
  | {
      readonly status: "unavailable";
      readonly reason: CheckDeclaredUnavailableReason;
    }
>;
```

`passed` 和 `failed` 已经是 terminal status；不再另存 `status: "completed"` 或 `verdict`。`data` 必须存在；没有领域内容时返回 `{}`，而不是引入 optional data并让 consumer区分“缺失”和“空结果”。

`not-applicable` 表示该 Check 对本次 invocation 不适用；`unavailable` 表示无法可靠给出 passed/failed。两者不携带 final data，避免 partial/unknown data被误读为主结果。声明原因与 Product containment reason继续使用各自受控类型，不能由 arbitrary thrown error直接进入公共结果。

Public write boundary 使用 `object`，使 readonly interfaces、object literals 与 nested objects 不需要 index signature，并在 TypeScript层拒绝 primitive。Runtime canonicalization仍是 acceptance authority；array、function、class instance 等 TypeScript 可接受但 runtime-invalid values会被拒绝。

### 3. Reporter separates Record identity from custom data

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

Public contract：

```ts
interface RecordIdentityInput {
  readonly id: string;
}

interface CheckRecordReporter {
  report(identity: RecordIdentityInput, data: object): void;
}
```

第一个参数的 public declaration只暴露 `id`，fresh object literal得到 excess-property检查，runtime要求 exact closed shape。第二个参数沿用 final data 的宽 `object` write boundary。Product不为缩小 TypeScript/runtime差异引入 Record generic、catalog、Schema或registry。

`RecordIdentityInput` 与 `CheckRecordReporter` 不默认成为 top-level exports；ordinary authoring依靠 `execution` contextual typing。只有命名 helper consumer经过public-contract审阅后才扩大 type inventory。

### 4. Record identity is local to one Check

`id` 是 non-empty author string，在一个 executable Check内唯一。Product保留 exact string，不执行 trim、Unicode normalization或case folding；兼容性由 producing Check拥有。Reporter scope提供 `checkId`；author不重复提供它，Product也不从data、location、arrival order、selector或hash生成identity。

Core identity是结构化 pair `{ checkId, id }`。不同 Checks可以使用相同local `id`。同一 composite identity 的第二次及后续提交一律无效，即使 canonical data相同也不视为幂等 replay。Runtime、ordering、fingerprint与validators按两个字段处理，不能用未转义delimiter拼成可能碰撞的单string key。

### 5. Product validates canonical safety, not domain shape

Final data与Record data使用同一 materialization规则。Input必须是non-array canonical JSON object；Product通过own-property descriptors建立detached snapshot，不用普通property access读取value，也不调用getter、setter或`toJSON`。Proxy/reflection failure必须被containment，不能越过owning Check。

精确边界：

- Root与所有nested objects只允许`Object.prototype`或`null` prototype；root不能是array。
- Recursive value只允许`null`、boolean、string、finite number、dense array与plain object；`-0`规范化为`0`。
- Object只接受enumerable own string-keyed data properties；array只接受`0..length-1`完整dense entries。
- Accessor、symbol key、non-enumerable custom property、array named property、unsupported prototype、cycle、function、`undefined`、`bigint`、`symbol`、non-finite number与unsafe reflection全部拒绝。
- Snapshot使用prototype-safe container；`__proto__`等input key作为普通data key保留，arrays保持index order，然后递归freeze。普通JavaScript object的own-key枚举顺序不是contract；需要canonical text、bytes或fingerprint时，serializer在每一层显式按text比较排序object keys，不能依赖`Object.keys`或`JSON.stringify`的整数形态key枚举顺序。

Product不验证required properties、extra properties、union、business constraints或cross-result consistency。Author使用local typing，consumer按需使用Check-owned parser；local type/parser不进入Definition、Core、machine schema或Product runtime dependency。

Canonicalization不是redaction。Producing Check必须在return/report前移除不应进入`RunResult`、machine artifacts或日志的secret、credential URL、raw source等材料。

### 6. Settlement contains invalid author output without rewriting accepted facts

Invalid final data使owning Check结算为Product-controlled `unavailable`。Invalid Record identity/data、repeated identity或reporter protocol violation也使owning Check unavailable，并记录safe diagnostic；callback自报结果不再生效。

此前已接受的Records保持提交，其他Checks不受影响。Reporter在callback return/throw后关闭；escaped async late call抛出closed-reporter error且不能修改冻结事实。Public `report`返回`void`，不暴露Core submission state。

Callback throw、cancellation与Product impossible state继续由execution/Core containment产生受控unavailable reason。它们不能直接复制arbitrary error text到公共facts。

### 7. Core and Run publish facts；aggregation只在显式RunControls下派生

Core Check保存一个terminal outcome：

```ts
type CheckOutcome =
  | { status: "passed"; data: CanonicalJsonObject }
  | { status: "failed"; data: CanonicalJsonObject }
  | { status: "not-applicable"; reason?: CheckNotApplicableReason }
  | { status: "unavailable"; reason: CheckUnavailableReason };
```

Core Record固定为：

```ts
interface CoreRecord {
  readonly checkId: string;
  readonly id: string;
  readonly data: CanonicalJsonObject;
}
```

Completed/effect `RunResult`返回canonical Check/Record facts、durations、effects与其它run evidence。`kind`继续表达configuration/planning/cancelled/execution/effect/completed等run lifecycle事实；multi-Check quality decision不进入`kind`或固定top-level status。

Raw facts始终可用。本Change在per-invocation`RunControls`中加入唯一aggregation入口：

```ts
interface CheckAggregation {
  readonly checks: "all" | readonly string[];
  readonly mode: "all" | "any";
  readonly unavailable: "propagate" | "fail" | "exclude";
  readonly notApplicable: "exclude" | "pass" | "fail";
  readonly empty: "passed" | "failed" | "not-applicable";
}
```

`checks`在work前解析并验证；unknown、duplicate或不属于当次normalized Check集合的ID使Run在work前失败。`"all"`表示本次全部Core Checks；显式ID集合允许Project Gate只聚合eligible Checks，excluded Checks仍保留raw not-applicable facts。`mode`只组合included passed/failed statuses；unavailable、not-applicable和empty-set严格按配置处理。

派生结果保持最小：

```ts
type CheckAggregate = "passed" | "failed" | "not-applicable" | "unavailable";
```

`RunResultFacts`增加`aggregate: CheckAggregate | null`。没有`RunControls.checkAggregation`时固定为`null`；有配置时package从settled Core Check facts确定性求值。Aggregate不复制evidence；consumer从raw Checks读取详情。Aggregate也不读取Record data、definition warning、effect status或presentation，这些继续属于各自run/adapter事实。配置和派生结果都不恢复selector、predicate、reference、view、evidence或recursive policy grammar。

### 8. Machine v4 is a secondary projection of the new facts

Machine v4保留当前fingerprint-bound `run.json` + `records.ndjson` two-file set、candidate-before-write validation、canonical-path replacement failure cleanup与complete-set trust boundary。它不新增跨两个filesystem paths的atomic snapshot、generation pointer或reader lock。

`run.json`的Check rows投影新的terminal statuses；passed/failed rows包含canonical final `data`，not-applicable/unavailable rows包含其合法reason。它不发布mandatory aggregate decision。

Record row固定为：

```json
{
  "schemaVersion": "vibe-check.record.v4",
  "checkId": "api-health",
  "id": "sample:health",
  "data": {
    "latencyMs": 820,
    "statusCode": 503
  }
}
```

Validators检查schema identity、canonical JSON、composite uniqueness、Check ownership、ordering与complete Records set fingerprint；不解释domain data或重算author ID。依据pre-stable hard-cut policy，v3 writer、reader、schema、current examples与default docs entry同步退出；不增加dual reader、adapter或permissive fallback。

### 9. Minimal aggregation replaces only the direct Gate consumer

Current DecisionPolicy的Record selectors/operands、acceptance、views、reference requirements/relations、readiness、`blockWhen`、GateResult与evidence依赖旧Record catalog/comparison model。新基础事实不保留这些operands，因此对应public Definition、evaluator、RunResult与machine evidence在直接consumer迁移后退出。

本Change不把旧policy重写成fixed Check-status precedence、dependent Check或新GateResult。它只提供上一节的显式status aggregation，并让repository Gate从selection得到eligible Check IDs、绑定required/full配置、消费`RunResult.aggregate`。CLI adapter不再遍历snapshot重建summary；definition warnings、run/effect failure仍在exit mapping中按各自事实处理。旧`result.decision.gate`只能在正式`required/full`完成该迁移后删除。

Product-wide `RunControls.comparison`、`project.comparison`、`records.reportReference`、reference status与generic Record relations同样随旧Record/comparison contract退出。需要baseline的Check从自己的options、captured dependency、project composition或未来typed dependency output获得输入，并通过自己的final status/data表达结论。

### 10. Downstream Changes own new uses of the facts

| Downstream Change | Input from this Change | Question it owns |
| --- | --- | --- |
| [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) | Upstream terminal status/final data + supplemental Records | Dependency如何授权、选择、解析和传播failure。 |
| [`align-project-gate-with-native-check-authoring`](../align-project-gate-with-native-check-authoring/) | 新Check facts、package aggregate与已迁移adapter | Catalog去重、native Check composition、CLI/process与profile优化。 |
| [`add-check-associated-result-presentation`](../add-check-associated-result-presentation/) | Check final data + supplemental Records | 哪个显式projection进入terminal/live human output。 |

这些Changes可以删除因新事实而不再需要的功能，但不能要求本Change为假想consumer增加generic关系、query、presentation field或aggregation default。对应Draft必须记录输入变化，避免继续按旧`completed/verdict`或Record-only模型设计。

## Risks / Trade-offs

| Risk / trade-off | Control |
| --- | --- |
| Final data与Records看起来都能承载对象，author可能重复事实。 | 文档和examples固定“final data是主结果，Records是supplemental”；consumer不假定镜像关系。 |
| `data: object`接受部分runtime拒绝的值。 | Runtime canonicalization保持authority；declaration与negative runtime tests共同说明边界。 |
| Generic data不提供自动端到端TypeScript typing。 | Local write types与optional Check-owned parsers提供类型；不建立Product registry。 |
| Parser与producer data可能漂移。 | Parser/type与Check owner共置；只有真实consumer需要时才导出并增加focused fixtures。 |
| Arbitrary nested data可能携带秘密。 | Producing Check在return/report前脱敏；canonicalization不宣称secret detection/redaction。 |
| Hostile descriptors、Proxy或prototype-sensitive keys触发reflection failure。 | 不调用accessor/`toJSON`、使用prototype-safe containers，并以adversarial fixtures证明owning-Check containment。 |
| 删除legacy GateResult可能中断正式验证入口。 | 本Change先实现explicit aggregation并迁移required/full；随后才删除old decision dependency。 |
| 下游Change继续按Record-only或fixed aggregate假设设计。 | 本Plan显式更新三个downstream Draft，并把交接检查列入readiness/success criteria。 |
| 新方向取代现行Core ID、DecisionPolicy与machine v3 Decisions。 | Readiness建立Decision evolution map；完成时不留下互相冲突的active方向。 |

## Open Questions

无。主契约、minimal aggregation、直接consumer迁移、Decision evolution与下游owner已经由[`readiness-audit.md`](readiness-audit.md)闭合。Typed dependency getter、repository Gate catalog优化与presentation payload仍由对应Draft决定，但不阻塞本Plan实施。
