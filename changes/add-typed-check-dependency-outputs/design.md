# Design

本Design是typed Check dependency output的契约owner。主要设计只覆盖dependency authorization、getter、parser、type inference与runtime read boundary；minimal contract引起的final-data/Record source变化在这里消化，但Record storage、aggregation与human presentation仍由各自owner承接。

## Context

- 当前已实现的`dependsOn`只提供static Task order；形成时方向见已归档的[`project-executable-checks-into-validated-task-graph`](../../docs/decisions/archive/project-executable-checks-into-validated-task-graph.md)。
- Future Decision[`let-dependent-checks-read-settled-upstream-outputs`](../../docs/decisions/let-dependent-checks-read-settled-upstream-outputs.md)授权declared direct dependency在upstream settled后读取其output，但当前为`active + unaligned`。
- [`establish-minimal-check-record-contract`](../establish-minimal-check-record-contract/)是implementation前置。其目标facts分为：passed/failed Check的single final data，以及零到多个supplemental Records。旧Record-only Draft假设不再有效。
- 本Change仍是Draft。Decisions固定责任边界；Open Questions决定首版exact grammar和是否包含supplemental Record getter。

## Goals / Non-Goals

### Goals

- 让declared direct dependency同时提供Task order与settled output access。
- 让getter只接受declared upstream的parser descriptor，并从parser推导success value type。
- 让single primary output优先读取upstream final data；只有真实consumer需要时才增加exact supplemental Record读取。
- 继续使用Core Checks/Records作为唯一facts source。
- 让upstream status、missing source和parser rejection形成diagnosable failure。

### Non-Goals

- 不把所有shared data或invocation facts变成Checks。
- 不删除、重命名或迁移现有execution-context fields；后续cleanup需要真实consumer与独立范围。
- 不新增第三类Core output、第二份grouped storage、global mutable store或callback closure data channel。
- 不公开transitive/live reader、custom data search、query/index service、parser registry或通用provider framework。
- 不让Product持有custom data Schema、parser function或output type catalog。
- 不实现multi-Check aggregation，也不用dependent Check替代Gate aggregation配置。
- 不用presentation visibility删除facts或改变dependency correctness。

## Decisions

### 1. Target responsibility map

| Concern | Target |
| --- | --- |
| Producer | 普通executable Check；拥有一个terminal outcome/final data及零到多个Records。 |
| Authorization | Declared direct dependency同时建立Task order和settled read permission。 |
| Read timing | Reporter关闭且upstream terminal settlement完成后，downstream才读取frozen facts。 |
| Fact source | Existing Core Checks/Records；runtime index与view都是derived state。 |
| Primary data address | Exact upstream Check identity；读取该Check的terminal final data。 |
| Supplemental data address | Exact`{ checkId, recordId }`；只有首版consumer成立时公开。 |
| Parser | Upstream-owned descriptor；绑定Check，并在Record场景额外绑定Record ID。 |
| Getter | 验证dependency、读取status、选择source、调用parser并返回typed success/failure。 |
| Presentation | 不属于dependency contract；renderer不从dependency graph推断supporting role。 |

Supporting Check不成为hidden computation node。无论human visibility如何配置，它的lifecycle events、structured RunResult、Core Check/final data与Records都正常产生。

### 2. Final data is the leading source for a single dependency output

一个Check的single primary domain result已经由terminal final data表达。Dependency consumer需要这个结果时，直接绑定upstream Check的result parser；不得要求producer把相同data复制成一个`id: "result"`Record。

领先descriptor：

```ts
interface CheckResultDataParser<CheckId extends string, Value> {
  readonly checkId: CheckId;
  parse(data: CanonicalJsonObject): Value;
}
```

Exact factory/function names由prototype固定。Descriptor身份必须来自producing Check value，不能仅靠consumer手写string伪造ownership。

### 3. Supplemental Record readback is a separate optional variant

如果一个producer确实拥有多个可独立标识、可分别消费的facts，可以为exact Record IDs导出parsers：

```ts
interface CheckRecordDataParser<
  CheckId extends string,
  RecordId extends string,
  Value
> {
  readonly checkId: CheckId;
  readonly recordId: RecordId;
  parse(data: CanonicalJsonObject): Value;
}
```

这不是所有dependency output的基础。Plan readiness必须用named consumer证明Record variant；若final data足够，首版只保留result parser/getter。首版即使包含Record variant，也只支持exact ID，不提供predicate、prefix、dynamic matching或query grammar。

### 4. Public type relationship

领先settled view：

```ts
interface SettledCheckOutput {
  readonly checkId: string;
  readonly outcome: CheckOutcome;
  readonly records: readonly CoreRecord[];
}

type DependencyDataResult<Value> =
  | {
      readonly ok: true;
      readonly data: Value;
      readonly upstream: SettledCheckOutput;
    }
  | {
      readonly ok: false;
      readonly error: DependencyDataError;
      readonly upstream: SettledCheckOutput;
    };
```

TypeScript必须保持：

```text
upstream Check literal identity
  -> declared dependency set
  -> getter accepts only parsers from that set
  -> parser Value becomes result.data after ok narrowing
```

Parser只转换selected canonical data；authorization、source absence、upstream status与parser rejection都由getter表达。

### 5. Runtime read flow

1. Definition normalization建立完整static graph，并在work前验证dependency existence、cycle和scheduling constraints。
2. Upstream Task settled后关闭reporter，形成terminal Check outcome/final data与完整owned Records。
3. Downstream`dependencies.get(parser)`验证parser的`checkId`属于declared direct dependency。
4. Getter读取upstream status；只有source语义允许时才选择final data或exact Record data。
5. Getter调用parser；成功返回inferred`Value`，失败返回structured error。
6. Getter result携带同一`SettledCheckOutput`，使downstream不把failed、not-applicable、unavailable或missing Record混为一类。

Runtime不允许undeclared、transitive、live或partial reads。内部可以维护per-Check index，但最终bytes、ordering与ownership必须与Core facts一致。

### 6. Failure boundary

| Source | Required behavior |
| --- | --- |
| Undeclared dependency / identity mismatch | Fail closed；不得返回其它Check data。 |
| Upstream not-applicable/unavailable | 返回包含upstream outcome的failure；不得伪装成empty data。 |
| Upstream failed | Prototype明确consumer是否可以读取failed final data；不得由data presence隐式决定。 |
| Exact supplemental Record missing | 若首版支持Record parser，返回diagnosable failure；parser不参与missing判断。 |
| Parser rejection | Getter捕获并返回read failure；不修改producer outcome或Core acceptance。 |
| Product cancellation / impossible state | 由Product containment映射，不能交给arbitrary parser决定。 |

Passed final data可进入parser。Failed final data是否可读必须由Plan prototype显式选择，因为它可能同时是有价值的失败详情，也可能不满足downstream前置条件。

### 7. External readback

Machine v4发布Check terminal final data与`{ checkId, id, data }`Records。External consumer按Check identity读取final data，或在需要supplemental fact时按exact composite Record identity读取，再使用相同版本的upstream-owned parser。

Parser function不进入artifact；需要durable readback的Check在自己的data中携带version或discriminant。Dependency runtime view不另行持久化。

### 8. Presentation handoff

Human direct display不属于dependency contract，也不阻塞本Change。相邻已归档的[`add-check-terminal-messages-and-visibility`](../archive/add-check-terminal-messages-and-visibility/)（archived）提供structured terminal messages、`RunResult` readback与显式Check visibility；messages不进入dependency/Core/Record/machine facts，也不改变本Change的dependency authorization与correctness。

## Risks / Trade-offs

| Risk | Control |
| --- | --- |
| `defineCheck` generics演变成第二套类型系统 | 只保留dependency set、parser identity和inferred value关系；不要求手写tuple generic。 |
| Final data与Record getter形成重复API | Final data是single output默认；Record variant必须由多个/独立identified facts的真实consumer证明。 |
| Runtime暴露错误或未完成output | Direct-edge authorization、settlement barrier、status mapping、exact lookup与immutable view。 |
| Parser与producer data漂移 | Colocate parser/type、durable data使用Check-owned版本，并把rejection作为getter failure。 |
| Derived view漂移为第二facts source | 所有view从Core Checks/Records派生，不另行持久化。 |
| Human visibility被误解为facts隐藏 | Presentation metadata只交给renderer；facts/events始终产生。 |

## Open Questions

形成Plan前只需关闭：

1. **Dependency grammar：** 领先候选是`dependsOn: [checkValue]`；与string edge、named binding的对照只验证inference/composition，不承诺compatibility layer。
2. **Getter grammar：** 固定result parser/getter的exact generic、failure codes和upstream status mapping。
3. **Supplemental Record variant：** 是否存在final data不能承接的首版named consumer；没有则首版删除Record parser/getter。
4. **Failed data access：** downstream能否解析failed upstream的final data，还是必须先返回dependency failure。
5. **Composition evidence：** 证明inline/exported/recursive Checks、`inherit`、heterogeneous collections、declaration emit与isolated package consumer保留类型关系。

### Evidence Required by Plan

- Type-only fixtures：合法dependency/result-parser inference与cross-Check parser rejection。
- Runtime fixtures：settlement barrier、status mapping、missing/parser failures与immutability。
- Changed-files consumer：一个producer、至少两个downstream consumers、一次data collection；优先使用final data。
- Supplemental Record consumer：只有决定纳入该variant时才要求exact-ID runtime/type fixtures。
- Machine/external consumer：按Check identity或exact Record identity读取并使用version-matched parser。
- Candidate package：emitted declarations与ancestry-external consumer无cast typecheck。
