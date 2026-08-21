# Design

本 Design 是 typed Check dependency output 的契约 owner。它只完整描述 dependency authorization、getter、parser descriptor、类型推导与 runtime read boundary；Record storage 和人读 presentation 由相邻 Change 拥有。

## Context

- 当前已实现的 `dependsOn` 只提供静态 Task 顺序；形成时方向见已归档的 [`project-executable-checks-into-validated-task-graph`](../../docs/decisions/archive/project-executable-checks-into-validated-task-graph.md)。
- Future Decision [`let-dependent-checks-read-settled-upstream-outputs`](../../docs/decisions/let-dependent-checks-read-settled-upstream-outputs.md) 授权 declared direct dependency 在 upstream settled 后读取其 output，但当前为 `active + unaligned`。
- [`establish-minimal-check-record-contract`](../establish-minimal-check-record-contract/) 是 implementation 前置：只有它实施并把 Check-local Record ID、canonical `data` 与 Core `{ checkId, id, data }` 同步为当前事实后，本 Draft 才进入 Plan。
- 本 Change 仍是 Draft。以下 Decisions 是已收敛目标；Open Questions 尚未成为实施事实。

## Goals / Non-Goals

### Goals

- 让 declared direct dependency 同时提供 Task order 与 settled output access。
- 让 getter 只接受 declared upstream 的 parser descriptor，并从 parser 推导成功值类型。
- 继续使用 Core `checks` / `records` 作为唯一事实源。
- 让 missing data、upstream outcome 和 parser rejection 通过 getter 形成可诊断 failure。

### Non-Goals

- 不把所有 shared data 或 invocation facts 变成 Checks；`root`、`flags` 等仍按各自 owner 判断。
- 不删除、重命名或迁移现有 execution-context fields；本 Change 只证明 settled output capability，后续 cleanup 需要真实消费者与独立范围。
- 不新增第三类 Core output、第二份 grouped storage、global mutable store 或 callback closure data channel。
- 不公开 transitive/live reader、custom data search、query/index service、parser registry 或通用 provider framework。
- 不让 Product 持有 custom data Schema、parser function 或 output type catalog。
- 不用 presentation visibility 删除 facts 或改变 dependency correctness。

## Decisions

### 1. Target Contract

| Concern | Target |
| --- | --- |
| Producer | 普通、可见的 executable Check；拥有 outcome、duration 和零到多个 Records。 |
| Authorization | Declared direct dependency 同时建立 Task order 和 settled output read permission。 |
| Read timing | Reporter 关闭且 upstream terminal settlement 完成后，downstream 才能读取 frozen output。 |
| Fact source | Existing Core `checks` / `records`；runtime index 和 grouped view 都是派生状态。 |
| Data address | Exact `{ checkId, recordId }`；首版不提供 predicate、prefix 或 custom-data search。 |
| Parser | Check-owned `{ checkId, recordId, parse }` descriptor；只解析已选 data。 |
| Getter | 校验 dependency、读取 outcome、选择 exact Record、调用 parser，并返回 typed success 或 structured failure。 |
| Presentation | 不属于 dependency contract；renderer 不从 dependency graph 推断 supporting role。 |

Supporting Check 不成为隐藏 computation node。无论人读 visibility 如何配置，它的 lifecycle events、structured RunResult、Core Check 和 Records 都正常产生。

### 2. Public Type Relationship

领先 parser descriptor：

```ts
interface CheckDataParser<
  CheckId extends string,
  RecordId extends string,
  Value
> {
  readonly checkId: CheckId;
  readonly recordId: RecordId;
  parse(data: CanonicalJsonObject): Value;
}
```

领先 getter result：

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

TypeScript 必须保持以下关系：

```text
upstream Check literal identity
  -> declared dependency set
  -> getter accepts only parser descriptors from that set
  -> parser Value becomes result.data after ok narrowing
```

Descriptor 已确定 Check 和 Record ID。Parser 只转换已选 data；Record selection、absence 和 parser rejection 都由 getter 表达。

### 3. Runtime Read Flow

1. Definition normalization 建立完整静态 graph，并在 work 前验证 dependency existence、cycle 和现有 scheduling constraints。
2. Upstream Task settled 后关闭 reporter，形成 terminal Check outcome 与完整 owned Records。
3. Downstream `dependencies.get(parser)` 验证 parser 的 `checkId` 属于 declared direct dependency。
4. Getter 在 upstream Records 中选择 exact `recordId`。
5. 找到 data 后调用 parser；成功返回 inferred `Value`，失败返回结构化 error。
6. Getter result 携带同一 `SettledCheckOutput`，使 downstream 不把 zero Records、not-applicable 或 unavailable 混为一类。

Runtime 不允许 undeclared、transitive、live 或 partial reads。内部可以维护 per-Check index，但最终 bytes、ordering 和 ownership 必须与 Core facts 一致。

### 4. Getter Failure Boundary

Getter 必须区分以下来源，但 exact code/name 由 prototype 固定：

| Source | Required behavior |
| --- | --- |
| Undeclared dependency / identity mismatch | Fail closed；不得返回其它 Check 的 data。 |
| Upstream unavailable or not-applicable | 返回包含 upstream outcome 的 failure；不得伪装成 empty data。 |
| Exact Record missing | 返回可诊断 failure；parser 不参与 missing 判断。 |
| Parser rejection | Getter 捕获并返回 read failure；不修改 producing Check outcome 或 Core acceptance。 |
| Product cancellation / impossible protocol state | 由 Product containment 映射，不能交给 arbitrary parser 决定。 |

尚需 prototype 决定：一个 `completed/failed` upstream 若仍提交目标 Record，downstream 是否可以读取 data，还是必须先处理 failure outcome。该选择必须显式，不能由 Record presence 推断。

### 5. Producer and External Readback

一个 producer 可以为多个 stable Record IDs 导出多个 parsers。列表型结果优先由一个 known Record ID 承载数组；首版不为动态 Record matching 增加查询 grammar。

Machine v4 继续发布 Check outcomes 与 `{ checkId, id, data }` Records。External consumer 按 exact IDs 选择 Record，再使用相同版本的 Check-owned parser。Parser function 不进入 artifact；需要 durable readback 的 Check 在自己的 data 中携带版本或 discriminant。

### 6. Presentation Handoff

人读直接显示不属于 dependency contract，也不阻塞本 Change。Supporting Check 默认按普通 Check 显示；相邻 [`add-check-associated-result-presentation`](../add-check-associated-result-presentation/) 可以独立增加类似以下的显式字段：

```ts
presentation: {
  visibility: "always" | "problems-only"
}
```

该字段只控制 renderer。`problems-only` 不抑制 prepared/started/settled events，也不删除 structured facts；exact field name 和 normalized/Core metadata 位置由 presentation Change 固定。Typed dependency Plan 不读取或等待该字段。

## Risks / Trade-offs

| Risk | Control |
| --- | --- |
| `defineCheck` generics演变成第二套类型系统 | 只保留 dependency set、parser identity 和 inferred value 三段关系；不要求手写 tuple generic。 |
| Runtime 暴露错误或未完成 output | Direct-edge authorization、settlement barrier、exact-ID lookup 和 immutable view。 |
| Parser 与 producer data 漂移 | Colocate parser/type、为 durable data加Check-owned版本，并把 rejection作为getter failure。 |
| Grouped output 漂移为第二事实源 | 所有 view 从 Core `checks` / `records` 派生，不另行持久化。 |
| Human visibility 被误解为事实隐藏 | 显式 presentation metadata只交给renderer；facts/events始终产生。 |

## Open Questions

形成 Plan 前只需关闭三项：

1. **Dependency grammar：** 领先候选是 `dependsOn: [checkValue]`；与 string edge、named binding 的对照只验证 inference/composition，不承诺兼容层。
2. **Getter grammar：** 固定 `dependencies.get(parser)` 的 exact generic、failure codes 和 upstream outcome mapping。
3. **Composition evidence：** 证明 inline/exported/recursive Checks、`inherit`、heterogeneous collections、declaration emit 和 isolated package consumer 都保留类型关系。

### Evidence Required by Plan

- Type-only fixtures：合法 dependency/parser inference 与 cross-Check parser rejection。
- Runtime fixtures：settlement barrier、exact-ID selection、missing/upstream/parser failures 与 immutability。
- Changed-files consumer：一个 producer、至少两个 downstream consumers、一次数据收集；不把其它 execution-input cleanup 计入本 Change。
- Machine/external consumer：按 `{ checkId, id }` 读取并使用版本匹配 parser。
- Candidate package：emitted declarations 和 ancestry-external consumer 无 cast typecheck。
