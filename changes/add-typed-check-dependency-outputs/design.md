# Design

本 Design 记录这个 Change 在形成时选择的 API 与 architecture：Product 负责 string-based runtime read，producing Check 负责自己的 data type。20/20 任务现已完成，但 Change 因未获归档授权仍为 active；`active` 不表示这份 Design 仍是 current Product contract owner。

当前 authoring/invocation contract 由 [Configuration](../../docs/configuration.md) 拥有，runtime flow 由 [Architecture](../../docs/architecture.md) 拥有，事实语义和 machine boundary 分别由 [Quality Metrics](../../docs/quality-metrics.md) 与 [Output](../../docs/output.md) 拥有。Proposal 保留结果和范围，Readiness Audit 只保存形成 Plan 时的事实与 prototype 证据。

## Context

### Reading contract

实施者应按以下顺序使用本Change：

1. 恢复当前行为时，先读上段列出的 stable owners；不要把本 Design 的形成时约束当作新的当前事实来源。
2. 需要理解已选 API、runtime rules、scope 或 owner boundary 的形成理由时，再读本 Design。
3. 需要确认任务完成或实际验证时，读 [`tasks.md`](tasks.md)；20/20 完成不自动提供归档授权。
4. 只在需要核对形成时基线或 prototype 结论时读取 [`readiness-audit.md`](readiness-audit.md)。
5. 用 [`proposal.md#success-criteria`](proposal.md#success-criteria) 审阅最终语义验收。

### Terms

| Term | Meaning in this Change |
| --- | --- |
| Author data | Check `execution`在`passed` / `failed`结果中返回的ordinary JavaScript object。 |
| Canonical final data | Core从author data重新materialize的detached、null-prototype、deep-frozen `CanonicalJsonObject`。它是runtime object，不是author原引用或JSON text。 |
| Typed provider | 同时拥有`execution`和`parseData`的executable Check；parser return锚定该provider的local `Data` generic。 |
| Dependency read | Downstream callback调用`dependencies.get(checkId)`读取一个declared direct dependency的settled canonical final data。 |

### Formation-time constraints

- 在 Plan 形成时，`dependsOn` 是 exact/inherit string collection，normalized strings 已经是 Task graph identity 与 runtime authorization 的共同输入。
- 当时 `passed` / `failed` 有 canonical final data；`not-applicable` / `unavailable` 没有 data。Records 是独立 supplemental facts。
- 当时 Run 把 `unavailable` 转换成 Task failure 并阻断 downstream。若目标 getter 要对该 status 返回 read failure，downstream 必须在 ordinary `unavailable` settlement 后被 admit。
- 当时 runtime roots 只有 `defineConfig`、`defineCheck`、`inherit`、`run` 与 default Check values；本 Change 不增加顶层 operation。
- 当时 repository 没有需要 dependency Record getter 的 named consumer。

## Goals / Non-Goals

### Goals

- 用一个non-generic string getter完成direct dependency runtime authorization和raw canonical read。
- 用一个provider-local `Data` generic同步parser return与execution final data。
- 让consumer显式组合read与parse，不让Product拥有business parsing。
- 让四态Check都完成normal dependency settlement，并保持Core facts唯一。
- 用runtime、type declarations和installed consumer分别证明各自边界。

### Non-Goals

- 不静态关联`dependsOn` literals与getter call。
- 不读取Records，不支持transitive/live/partial reads或query。
- 不提供parser registry、schema catalog、identity-cast helper或第二facts store。
- 不把parser输出建模成不同于execution data的第二domain model；两者表达同一个`Data` contract。
- 不迁移project callback inputs，不修改presentation、aggregation或machine schema。

## Decisions

### Intended Change

#### Contract overview

```text
producer execution(): CheckResult<Data>
              │
              ▼ Core settlement
CanonicalJsonObject final data
              │
              ▼ dependencies.get(checkId: string)
raw success or closed read failure
              │
              ▼ producer.parseData(raw.data)
Data
```

Access control只发生在getter runtime。Type recovery只发生在producer parser。两者没有跨Check generic关系。

#### Public dependency read API

The following public shape was implemented. Its current contract owner is [Configuration](../../docs/configuration.md#typed-dependency-data):

```ts
export interface CheckDependencies {
  get(checkId: string): DependencyReadResult;
}

export type DependencyReadResult =
  | Readonly<{
      ok: true;
      checkId: string;
      status: "passed" | "failed";
      data: CanonicalJsonObject;
    }>
  | Readonly<{
      ok: false;
      error: DependencyReadError;
    }>;

export type DependencyReadError =
  | Readonly<{
      code: "dependency-not-declared";
      checkId: string;
    }>
  | Readonly<{
      code: "upstream-data-unavailable";
      checkId: string;
      status: "not-applicable" | "unavailable";
    }>;

export interface CheckExecutionContext<Options extends object> {
  readonly options: DeepReadonly<Options>;
  readonly project: CheckProjectContext;
  readonly records: CheckRecordReporter;
  readonly signal: AbortSignal;
  readonly dependencies: CheckDependencies;
}
```

如果public inventory需要减少named type roots，可以内联supporting type名称；但以上字段、union、error codes和`get(checkId: string)`签名是本Design固定的public行为。

Runtime result rules：

| 请求条件 | Getter结果 |
| --- | --- |
| Declared direct upstream是`passed` | `ok: true`，携带status和canonical data。 |
| Declared direct upstream是`failed` | `ok: true`，携带status和canonical data；read success不表示quality passed。 |
| Declared direct upstream是`not-applicable`或`unavailable` | `upstream-data-unavailable`，携带settled status。 |
| ID未声明、仅transitive、malformed或其它未授权情况 | `dependency-not-declared`；不返回任何upstream facts。 |
| 已授权upstream不存在或尚未settled | Trusted Product invariant failure；不伪造成第三种public read error。 |

Getter runtime rules：

- Authorization使用current Check的normalized effective direct dependency IDs，包括inherited direct IDs。
- Getter、allowed-ID set、success/error wrapper和callback context都是frozen values。
- Success `data`就是`CoreCheck.outcome.data`的原引用；getter不clone data。
- Getter不读取supplemental Records，也不调用producer code。

#### Typed provider contract

Observable type relation：

```ts
export type CheckResult<Data extends object = object> = Readonly<
  (
    | { readonly status: "passed"; readonly data: Data }
    | { readonly status: "failed"; readonly data: Data }
    | { readonly status: "not-applicable"; readonly reason?: CheckNotApplicableReason }
    | { readonly status: "unavailable"; readonly reason: CheckDeclaredUnavailableReason }
  ) &
    CheckResultMessages
>;

interface TypedCheckFields<Options extends object, Data extends object> {
  /**
   * Restores provider data from canonical runtime data.
   *
   * Heuristic: a same-version trusted provider may implement this only as an
   * identity/type anchor when provider tests guarantee the shape. That does
   * not validate JavaScript or cast-based producers, historical or
   * cross-version artifacts, or untrusted input.
   */
  parseData(this: void, data: CanonicalJsonObject): Data;

  execution(
    this: void,
    context: CheckExecutionContext<Options>
  ): CheckResult<NoInfer<Data>> | Promise<CheckResult<NoInfer<Data>>>;
}
```

`TypedCheckFields`这里只表示required relationship；implementation可用overload、intersection或等价declaration实现。必须满足：

1. `Data`只从`parseData` return推导；`execution`不能反向拓宽它。
2. `passed` / `failed` execution data必须assignable to同一个`Data`。
3. Defined Check与emitted declaration中的`parseData`保持required；consumer无需undefined guard。
4. `parseData`是synchronous runtime function，输入始终是canonical final data；即使 provider 把返回值注解为 broad `CheckDataParser`，async / `PromiseLike` return 仍不合法。canonical data 的 non-callable `then` property 仍是 data，不会因此被拒绝。
5. Parser与execution表达同一个logical data contract；本Change不支持separate stored/parsed generics。
6. Typed provider必须executable；container不能声明parser。
7. Existing options/no-options inference、ordinary no-parser Check、recursive composition与native spread保持合法。
8. TypeScript typed provider只通过`defineCheck({ execution, parseData })`建立上述关联；broad `Check`保持ordinary recursive/container surface且不声明`parseData`。Runtime unknown grammar仍接受trusted JavaScript或cast author object上的executable function parser，但validation不为其制造静态关系，shape责任仍属于provider。Own `parseData: undefined`按ordinary optional field规范化为omitted，materialized Check不保留该key。

Parser function是producer Check value的consumer capability，不是producer execution步骤。Product在settlement或getter中都不调用它。

#### Authoring and consumption example

```ts
interface ChangedFilesData {
  readonly version: 1;
  readonly files: readonly string[];
}

const changedFiles = defineCheck({
  checkId: "changed-files",
  displayName: "Changed files",

  parseData(data): ChangedFilesData {
    if (
      data.version !== 1 ||
      !Array.isArray(data.files) ||
      !data.files.every((value): value is string => typeof value === "string")
    ) {
      throw new TypeError("Unsupported changed-files data");
    }

    return { version: 1, files: data.files };
  },

  execution() {
    return {
      status: "passed",
      data: { version: 1, files: ["src/index.ts"] }
    };
  }
});

const analyzeChangedFiles = defineCheck({
  checkId: "analyze-changed-files",
  displayName: "Analyze changed files",
  dependsOn: [changedFiles.checkId],

  execution({ dependencies }) {
    const read = dependencies.get(changedFiles.checkId);
    if (!read.ok) {
      return { status: "unavailable", reason: { code: read.error.code } };
    }

    const data = changedFiles.parseData(read.data);
    return {
      status: read.status,
      data: { analyzedFileCount: data.files.length }
    };
  }
});
```

Getter只使用string ID。`changedFiles.parseData`是ordinary function call，因此`data`自然推导为`ChangedFilesData`，不需要getter generic或consumer cast。

#### Parser responsibility and type-anchor heuristic

Normative parser contract：

- Provider拥有business-shape validation、version discrimination和error policy。
- Parser接收canonical runtime data，不接收author data或JSON text。
- Parser在Check callback内throw时服从existing callback containment；external caller自行选择catch或safe-parse策略。
- Product不返回`parser-rejected`，不检查parser output，也不序列化parser function。

> **启发，不是保证：** Canonical final data仍然是JavaScript runtime object。当producer与consumer使用同一个trusted version，且provider tests保证shape时，`parseData`可以只作为identity/type anchor，而不重复校验每个字段。该做法不能验证JavaScript或cast-based producer、historical artifact、cross-version data或untrusted input。Product API不会提供public unchecked-cast helper。

上方 `TypedCheckFields.parseData` 中的 JSDoc 是 public declaration 的最低提示，不能只保留在 guide 或 Change 中。

#### Four-state dependency settlement

四种Check outcome都是normal dependency settlement：

| Upstream outcome | Scheduler admits downstream | Getter can return data |
| --- | --- | --- |
| `passed` | Yes | Yes |
| `failed` | Yes | Yes |
| `not-applicable` | Yes | No |
| `unavailable` | Yes | No |

Run删除current `CheckUnavailableSignal`适配，不再为ordinary upstream status合成`prerequisite-unavailable`。Downstream检查read result后自行决定terminal result。Cancellation-before-start、invalid graph和trusted Core/engine failure仍是独立边界，并可阻止callback开始。

#### Runtime architecture

```text
Check authoring
  ├─ declarative fields ──> Definition snapshot / fingerprint / Task graph
  └─ execution + parseData ──> trusted caller-runtime functions

Task graph settles upstream in Core
  └─ Core package-private readSettledCheck(checkId)
       └─ Run callback-local dependencies view
            ├─ authorize effective direct ID
            ├─ return canonical data or closed failure
            └─ never call parseData

Consumer callback
  └─ producer.parseData(read.data) ──> Data
```

Layer responsibilities：

| Layer | 负责 | 不负责 |
| --- | --- | --- |
| Definition | Closed parser field validation；把parser排除在declarative fingerprint之外。 | Parser execution或business schema。 |
| Task scheduler | Graph validation、ordering、concurrency、cancellation和generic task failure。 | 解释Check domain status。 |
| Core | Canonical settled Check/Record facts和package-private settled read seam。 | Typed parser、dependency authorization或第二output store。 |
| Run | Effective direct-ID authorization和frozen callback-local getter。 | Persistent facts、Record query或parser execution。 |
| Check provider | `Data` contract、parser implementation和round-trip evidence。 | Access authorization。 |
| Consumer | Read-failure handling和显式parser invocation。 | Unchecked access to undeclared/transitive facts。 |

#### Acceptance evidence

Completion evidence covers the following boundaries; the completed commands and results are recorded by [`tasks.md`](tasks.md):

| Evidence | 证明内容 |
| --- | --- |
| Provider type fixtures | Parser-return Data anchor、execution mismatch rejection、broad `CheckDataParser` 仍拒绝 async / `PromiseLike` return、canonical non-callable `then` data 可用，以及 options/ordinary/recursive compatibility 和 required emitted parser。 |
| Core/Run tests | Direct-only authorization、same canonical reference、frozen view、两种failure code和trusted invariant boundary。 |
| Orchestration tests | Four-state admission、cancellation和implicit unavailable cascade已移除。 |
| Changed-files fixture | Producer只执行一次、两个consumers显式parse并处理status。 |
| Candidate/external consumer | Published declarations在无cast和ancestry import时仍保留types。 |
| Machine/RunResult test | 同一个versioned parser读取existing canonical final data，machine schema不变。 |

### Resulting Impacts

- **Public types：** 增加provider-local data relation和non-generic read surface；不增加cross-Check readable-ID types。
- **Definition：** 只在executable typed provider接受`parseData`；parser不进入portable snapshot或fingerprint。
- **Core/Run：** 增加package-private settled read和callback-local direct dependency view，不复制facts。
- **Orchestration：** 不再把ordinary`unavailable`当作Task failure；迁移blocked、progress和lifecycle evidence。
- **Package：** Declarations和installed consumer同时证明ordinary/typed Check authoring；runtime root inventory不变。
- **Stable docs：** Configuration拥有authoring；Architecture拥有data/control flow；Quality Metrics拥有status/data semantics；Output确认canonical machine compatibility。
- **Decision：** [`read-direct-dependency-final-data-by-string.md`](../../docs/decisions/read-direct-dependency-final-data-by-string.md) 已承接这个 final-data-first contract；implementation、stable owners 与验收证据闭合后已核对为 `active + aligned`。

## Risks / Trade-offs

| Risk | Required control |
| --- | --- |
| Execution inference拓宽`Data`并隐藏mismatch | 只从parser return锚定；使用`NoInfer`或等价约束；要求可理解的negative diagnostic。 |
| New overload破坏existing Check authoring | 覆盖options/no-options、ordinary/typed、container、recursive、heterogeneous、native spread和declaration emit。 |
| String getter没有compile-time dependency checking | Runtime direct-ID authorization是mandatory并完整测试；docs明确TypeScript不是access control。 |
| Parser被误认为JSON parser或收到错误对象 | JSDoc、runtime identity tests和example明确命名canonical runtime object。 |
| Type-anchor启发被复制成validation | 明确标记non-normative和失效条件；不提供public cast helper。 |
| Provider parser在consumer callback内throw | Provider拥有round-trip tests；需要恢复时暴露provider-owned safe API，不增加Product-wide error code。 |
| `unavailable`不再阻断ordering-only dependent | 文档固定new admission semantics；downstream显式选择outcome；保留cancellation和trusted-failure boundaries。 |
| Read view成为第二facts source | 返回existing Core data reference；不持久化view、不读取Records、不增加machine field。 |

## Open Questions

无。Internal helper和overload layout只有在以上emitted/public behavior、error union、four-state settlement与layer responsibility保持不变时才可调整。

## Formation-time readiness evidence

形成这个 Plan 时使用的 baseline、consumer/Test Evidence audit 与 isolated TypeScript readiness prototype 见 [`readiness-audit.md`](readiness-audit.md)。它们当时证明设计可进入 implementation；它们不证明现在的 Product state，当前完成状态以 stable owners、代码、测试和 [`tasks.md`](tasks.md) 为准。
