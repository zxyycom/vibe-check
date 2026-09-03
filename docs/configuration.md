# Configuration

Vibe Check configuration is a project-owned TypeScript **Project Definition**. `defineConfig` creates its plain value; a project-owned wrapper calls `run(definition, controls)`. Product never discovers, reloads, or accepts a second configuration module.

本文拥有 Project Definition 与 Run Controls 的 authoring、defaults、validation 和 invocation input。Check/Record 通用语义
属于 [Quality Metrics](quality-metrics.md)，每项随包 Check 的 consumer contract 属于对应[随包 Check 指南](navigation.md#随包-check-指南)，
owner-local external-tool adapter boundary 属于 [Check-owned scanner dependencies](scanner-dependencies.md)，result/output
DTOs 属于 [Output](output.md)。

`ProjectDefinition` 只拥有 ordinary Check tree、scheduler 与明确的 diagnostic logging、machine publication/progress rendering outputs。它没有 package-specific `quality`、file
scope 或 code-area 字段；需要项目文件或领域 policy 的 Check 在自己的完整 `options` 中声明并消费这些输入。

## Public authoring surface

package surface 包含 `defineAdmissionPolicy`、`defineConfig`、`defineCheck`、`inherit`、`run`，六个可补齐默认值的 Check constructors
`duplicateDetection(options?)`、`fileMetrics(options?)`、`functionMetrics(options?)`、`jsonValidation(options?)`、
`jsonSchemaValidation(options?)`、`markdownLinkValidation(options?)`，以及必填输入的 `secretDetection({ files })` 与
`maintenanceReminders(entries)`。八项函数都返回 ordinary Check object，不引入第二种 execution model；其余 authoring helper、Definition
value 与 invocation operation 各自保持其显式责任。仓库 private consumer 的 Definition 由
[`scripts/project/gate/definition.ts`](../scripts/project/gate/definition.ts) 组装；下例只说明 Project Definition 的 authoring 形状，不是该 Gate Definition 的逐行副本。

Finding waiver 分为两层 public authoring：`reconcileFindingWaivers(...)` 是任意 producer 可在完整 Finding 集合上调用的
独立 helper；`fileMetrics`、`functionMetrics`、`duplicateDetection` 与 `secretDetection` 另外在自己的 options 中接受
`findingWaivers`。四项 identity grammar、Records、messages 和 settlement 分别由对应 Check 指南拥有；其它 constructor
没有因为 generic helper 存在而自动接受同名字段。完整 helper grammar 见
[Finding waiver reconciliation](api-mechanics.md#finding-waiver-reconciliation)。

```ts
import {
  defineCheck,
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  jsonSchemaValidation,
  jsonValidation,
  markdownLinkValidation,
} from "@zxyycom/vibe-check";

const licenses = defineCheck({
  checkId: "licenses",
  displayName: "Dependency licenses",
  async execution({ records, signal }) {
    if (signal.aborted)
      return { status: "unavailable", reason: { code: "cancelled" } };

    const disallowed = await inspectDependencyLicenses();
    for (const dependency of disallowed) {
      records.report(
        { id: `dependency:${dependency.name}` },
        { license: dependency.license, name: dependency.name },
      );
    }
    return disallowed.length === 0
      ? { status: "passed", data: { disallowedCount: 0 } }
      : { status: "failed", data: { disallowedCount: disallowed.length } };
  },
});

export default defineConfig({
  checks: [
    {
      checkId: "repository-checks",
      displayName: "Repository checks",
      maxParallel: 2,
      checks: [
        duplicateDetection(),
        fileMetrics(),
        functionMetrics(),
        jsonValidation(),
        jsonSchemaValidation(),
        markdownLinkValidation(),
        licenses,
      ],
    },
  ],
  scheduler: { maxParallel: 4 },
});
```

`defineCheck` 只改善 TypeScript inference。Definition validation 负责关闭 ordinary Check grammar、拒绝 unknown Check keys 或 malformed declarative fields，并把 authored `options` snapshot 为 canonical immutable JSON；它不解释 options 的领域 shape。没有 `execution` 的 Check 是 container，只能携带递归 `checks` 和 scheduling fields；空 container 会产生 definition warning，而不会被静默当作 executable Check。

### Flag-enabled Checks

当启用条件只取决于本次 `RunControls.flags` 中是否存在指定 token 时，可以在 executable Check 上声明
`enabledByFlags`，不必在 callback 中重复编写控制分支：

```ts
const deepAudit = defineCheck({
  checkId: "deep-audit",
  displayName: "Deep audit",
  enabledByFlags: {
    flags: ["deep-audit", "release"],
    mode: "all"
  },
  execution: () => ({ status: "passed", data: {} })
});

await run(defineConfig({ checks: [deepAudit] }), {
  flags: ["deep-audit", "release"]
});
```

**声明与规范化。** `enabledByFlags.flags` 必须是非空 string-token array，不允许 sparse hole，且每项都是非空字符串。
Definition 会复制、去重、按文本排序并冻结这组 token。`mode` 的精确语义如下；本次 Run 中未被声明的
其它 flags 不影响判断：

| Mode | Check 启用条件 |
| --- | --- |
| `all` | 每个声明 token 都存在。 |
| `any` | 一个或多个声明 token 存在；全部存在时也启用，不是“恰好一个”。 |
| `none` | 没有任何声明 token 存在。 |
| `not-all` | 一个或多个声明 token 不存在；全部不存在时也启用。 |

该字段只属于 executable Check，并作为 canonical declarative identity 进入 Definition fingerprint。container
不接受该字段，也不向 children 继承它。空 flags 集合没有有效的控制含义，因此属于 malformed Definition。

**执行顺序。** Run 在任何 control settlement 或 author work 前验证包含全部 executable Checks 的完整静态 graph。
如果 invocation signal 此时已经取消，Scheduler 直接关闭 pending Tasks，不再把它们结算为 flag 未命中；否则 Run
按 Definition 顺序一次完成所有 `enabledByFlags` 判断。字段省略或条件匹配的 Check 继续留在 Scheduler pending 集合，
只有获得 admission 后才执行自己的 task-local preflight 和 execution；条件不匹配时，Product 在这些 Check-local work 前把它结算为
`{ status: "not-applicable", reason: { code: "flag-condition-not-matched" } }`。该 Check 没有 started fact，
duration 为 `null`，但仍作为 pre-admission non-passed result 留在同一张 Scheduler graph、Check facts、dependency readback
与显式 aggregation 中。以它为 `dependsOn` 的 Check 在自己的 preflight 前结算为 `unavailable / dependency-not-passed`；
以它为 `observes` 的 Check 仍可 admission 并读取该 `not-applicable` outcome。默认 progress 在 invocation flag control 完成时
用一个原因说明和 `displayName` 列表呈现全部这类
未启动 Checks，不为每项重复完整 settled row；其它未启动或非成功结果不进入该分组。完整人读输出边界见
[深入 API 机制](api-mechanics.md#outputs-与-runresult-边界)。

**责任边界。** callback 仍会收到完整的 canonical `project.flags`。Product 不提供“恰好一个”、带值 flags、
嵌套布尔表达式或通用 predicate，也不定义 token vocabulary。需要这些复杂条件时，owning Check 在 callback 中解释
`project.flags` 并返回领域适当的终态。

`scheduler.admissionPolicy` 是 closed `static | custom | learned-critical-path` authoring field。省略与显式
`{ kind: "static" }` 都规范化为同一个 static policy；`defineAdmissionPolicy(...)` 只保留 literal inference，与同形
inline object 没有额外运行语义。custom branch 是 `{ kind: "custom", strategy }`，其中：

- simple strategy 为 `{ kind: "simple", decide(context) }`；
- prepared strategy 为 `{ kind: "prepared", prepare({ graph }) }`，它可 return 或 resolve 当前 Run 的
  `{ decide(context), complete? }`；
- 两种 `decide` 都同步返回精确 `{ kind: "select", taskId }` 或 `{ kind: "wait" }`。

exact validation 以这个 closed grammar 作为 compatibility hard cut：retired `proposeAdmission`、unknown authoring fields
与 async/thenable `decide` 都被拒绝。prepare throw/reject 或 malformed prepared result 在 Scheduler 启动前映射为
`admission-strategy-preparation-failed`。strategy kind 进入 declarative snapshot/fingerprint；callback
identity/source/closure 不进入。调用顺序、冻结 context 和 output/result matrix 由
[API mechanisms](api-mechanics.md#custom-admission-policy) 完整拥有。

`{ kind: "learned-critical-path", stateDirectory }` 让 Product 在每次 Run 为该 Definition 使用 caller-managed
local state。`stateDirectory` 是非空、不得含 U+0000 的字符串；relative text 在 invocation 的 effective
`projectRoot` 解析，absolute text 直接作为 target。它不是 filesystem sandbox、清理、锁、remote store 或跨项目共享承诺；
调用方负责目录可写性、retention 和不把 secrets 放进 path。该 policy 没有 `expectedDurationMs`、Check-level duration
grammar 或可配置 model 参数。`stateDirectory` 是 declarative snapshot/fingerprint 的一部分；custom callback identity
继续不进入 fingerprint。

learned policy 在 author preflight/execution 前按 canonical Check ID、authored options、effective flags 与 model
version 的 digest 查找本地时长样本，并将 immutable prediction/critical-path table 交给 private Scheduler selection。
当前 v1 实现每个 identity 最多保留 32 个样本、全目录最多保留最近更新的 4096 个 identity；已知 identity 使用
arithmetic mean，未知 Task 先使用本次 Run 已知 estimate 的 median，仍无 prior 时使用正的 cold-start weight `1`。同一窗口按
nearest-rank 计算 `p90`，但不参与 score。以上数字、file envelope 和 selection heuristic 是
当前优化实现说明，不是 public storage/model compatibility promise。
missing、malformed、incompatible 或 read-failed state 只形成 empty learned model；无法形成 canonical inputs，或 local
setup、prediction 或 score-table construction 失败时，该 invocation 才回退 static selection。Scheduler 闭合后的 record/write
failure 与 concurrent last-writer 只影响未来样本；上述优化降级均不改变 quality result 或 public output。
priority 只在 critical-path score 相同的既有 Scheduler selection layer 中作为 tie-breaker，绝不绕过 relation、mutex、
capacity 或 cancellation hard guard。完整 pre-admission / post-closure state flow、privacy 与 failure containment 见
[Architecture](architecture.md#execution-boundary) 和 [API mechanisms](api-mechanics.md#learned-critical-path-准入)。

`scheduler.measurementHooks` 是可选的 readonly function array；省略时规范化为冻结空数组。validation 只接受
exact function entries，normalization 复制并冻结列表。每个 callback 接收同一个递归冻结的
`SchedulerMeasurementContext`，可同步返回或返回 `Promise<void>`。该 context 只交付 canonical graph、
admitted/settled kind observation 与 Scheduler-owned raw measurement；它不交付 Task value/error/callback、clock、
mutable Scheduler 或完整 interval history。

这是一项 Definition-owned runtime callback，而不是可由 `RunControls.outputs` 配置、覆盖或注入的 output。Hook
function 的 identity、source 与 closure 不进入 declarative snapshot/fingerprint；nonempty configured list 或 successful
prepared result 实际包含 `complete` 才启用 `outputs.measurementHooks`。终态调用顺序、context 形成、closed status 与主 Run
failure 的优先级由
[Architecture](architecture.md#execution-boundary) 和 [API mechanisms](api-mechanics.md#outputs-与-runresult-边界)
完整拥有。

`AdmissionPolicyContext` 是每次**实际** custom callback 新建的 detached、deep-frozen ordinary data snapshot。

- `graph` 是 invocation 内一次规范化、递归冻结后供所有 callback 共享的唯一 `SchedulerGraphSnapshot`；所有公开 Task identity 都是 `taskId`，topology 与 `admissionPriority` 只在 `graph.tasks` 的 Task metadata 中出现。
- `admissionState` 是当前同型 immutable admission boundary。重复读取在同一 callback 内保持同一 handle identity；调用方可保留 predecessor 并以 `select` / binary `settle` 推演 hypothetical successor，但不能启动、取消、reservation、等待或结算真实 Task。
- 其余动态 facts 包含 relation/mutex candidates 的 `{ taskId, canAdmit }`、root/effective capacity、running/settled/active-scope IDs、cancellation runtime facts，以及调用前已 flush 的 `measurement`。

`measurement.cumulative` 只给有界累计 scalar/peak/discrete facts，完整 per-Task table 只属于 terminal raw measurement；`measurementCount` 和 `measurementAt(index)` 是 context 创建时捕获的 invocation-local append-only frozen action-observation prefix reader。`measurementAt(index)` 是同步 getter，不返回 live array 或 per-round slice；index 不在 `[0, measurementCount)` 时返回 `undefined`，即使 Scheduler 在该 callback return 后继续执行也不能读取后续 append。每条 observation 给出 accepted `select`/`wait` 的 sequence/kind/task identity、从其 post-action state 开始到下一次实际 custom callback 前结束的 occupancy interval，以及期间 admitted/settled effects。该 interval 是 closed union：`availability: "available"` 才含数值 `contribution`，`availability: "unavailable"` 只含 reason，绝不以全零伪造失效 timing；合法 zero span 仍是 available contribution。它不表达 action 因果、duration 或 critical path，也不暴露 private Scheduler object、`Set`/`Map`、Check options/functions/data、Records、messages、logger、clock、signal 或真实 Task command。完整 callback 的 trusted、reentrancy、hard guard 与 fault 边界见
[深入 API 机制](api-mechanics.md#custom-admission-policy)。

### Check options preflight

executable Check 可以提供 `preflight(options, signal)`，在本次 invocation 内准备 execution options。默认的同形 authored/prepared options 可以省略 preflight；如果 `Check<AuthoredOptions, PreparedOptions>` 声明了不同的 prepared shape，TypeScript 会要求提供 preflight。Definition 只保存 trusted function。Run 先处理 invocation cancellation precedence 并完成 `enabledByFlags` control；未结算的 Check 在 Scheduler admission 后、该 Check 的 author execution 前运行 task-local preflight。它受 direct relation、mutex、capacity、priority 与 cancellation 约束，不形成按 Definition 顺序的全局 preflight barrier。

preflight 只能返回以下 closed result 之一：

```ts
{ status: "success", preparedOptions, messages? }
{ status: "failure", action: "block", reason, messages? }
{ status: "failure", action: "continue", reason, fallback, messages? }
```

- `success` 以 `preparedOptions` 进入 execution。
- `failure/block` 不允许 `fallback`，不调用 execution，并把 reason 原样用于 owning Check 的 `unavailable` outcome。
- `failure/continue` 必须同时提供 reason 与 `fallback`，再以 fallback 进入 execution。reason 是 Check-owned diagnostic identity，当前不单独形成 outcome；需要调用方观察的详情应写入 `messages`。

prepared/fallback 会被重新 snapshot 为 detached、canonical、deep-frozen 的 invocation-local value；它既不回写 Definition authored options，也不改变 declarative fingerprint。preflight、execution 与 typed-provider parser 都是 trusted functions，不进入 fingerprint、Check facts 或 machine output。preflight 中捕获的 console messages、accepted preflight messages、execution 中捕获的 console messages 与 accepted terminal messages 依次排列；即使 execution 随后抛错，前两组仍会保留。

Run 把同一 invocation cancellation signal 传给 preflight 和 execution；异步 preflight 应在等待工作中协作退出。preflight 是已经通过 `dependsOn` prerequisite、`observes` terminal wait、mutex 与 capacity admission 的单 Check task-local work，而不是 invocation-wide barrier；互不相关的 preflight 可以按 Scheduler 约束并行。取消以现有 execution-phase `cancelled` RunResult 结束。preflight throw 使用 `preflight-threw`；malformed result/message/reason 或 noncanonical prepared/fallback 使用 `invalid-preflight-result`。这些 preparation failure 只结算 owning Check，不把整个 Definition 变为 configuration failure。

preflight `block` 的 Check 没有 author execution started fact，duration 为 `null`；它仍保留 unavailable fact、accepted preflight messages、aggregation、settled lifecycle 与 progress。因 direct `dependsOn` 非 `passed` 而未获 author work 的 Check 同样以 Product-owned `unavailable / dependency-not-passed` 结算，带稳定的 direct blocker `checkIds` 与 `null` duration；它不调用 preflight 或 execution，也没有 author Record/message。Check facts 不识别 package-provided Check ID，也不解释 files、thresholds、scanner commands、schemas、links 或 reminder policy。

An executable Check returns exactly one terminal result, optionally with ordered terminal messages:

```ts
{ status: "passed", data: object, messages?: readonly CheckMessage[] }
{ status: "failed", data: object, messages?: readonly CheckMessage[] }
{ status: "not-applicable", reason?: { code: string }, messages?: readonly CheckMessage[] }
{ status: "unavailable", reason: { code: string }, messages?: readonly CheckMessage[] }
```

`passed` and `failed` require an object final data value; an empty object is the authoring form for no domain data. A callback may separately call `records.report({ id }, data)` zero or more times. These final returns and two-argument reporting are the complete shared result surface: a Check owns its data shape, and a Project Run supplies only explicit invocation controls.

### Typed dependency data

本节拥有 public typed provider 与 `dependencies.get` / `dependencies.list` contract。[Architecture](architecture.md) 拥有 runtime handoff，[Quality Metrics](quality-metrics.md) 拥有四态 final-data availability，[Output](output.md) 拥有独立 machine-publication boundary。

A TypeScript typed provider is authored through `defineCheck({ execution, parseData })`. Its synchronous
parser return type is the provider-local data contract: the same type constrains that Check's `passed` and
`failed` execution data, and the returned value retains `parseData` as a required function. The broad `Check`
type deliberately remains the ordinary recursive/container surface and does not declare `parseData`; using
`satisfies Check` or an inline `defineConfig` Check cannot establish the provider type relation. Ordinary
executable Checks without a parser and recursive containers remain valid; a container cannot declare
`parseData`.

The parser constraint carried by `defineCheck` preserves that synchronous boundary even when its result type is
broad: an `async` parser or any parser returning `PromiseLike` is rejected. This does not add a separate named package-root
type. It does not reject canonical
JSON data merely because it has a `then` property: a non-callable `then` value remains ordinary data; only a
callable `then` would make the returned value thenable.

Runtime Definition validation still accepts a function parser on an executable trusted author object so that
JavaScript and explicitly cast inputs reach the same closed grammar. That validation preserves the function
but does not manufacture the TypeScript relation; the provider remains responsible for those shapes. An own
`parseData: undefined` follows ordinary optional-property semantics: Definition normalizes it to omission and
the materialized Check does not retain that key, so it does not create a typed provider.

完整的 producer、consumer 与 `run(...)` 组合示例见[深入 API 机制的类型化依赖数据](api-mechanics.md#类型化依赖数据)。

`dependencies.get(checkId: string)` 有意保持 non-generic。它只授权当前 Check 的 normalized effective
`dependsOn ∪ observes` direct ID，并包含两类 relation 各自继承得到的 ID；未声明、transitive、malformed 或其它未授权
ID 都返回不携带 upstream fact 的 `dependency-not-declared`。已声明的 `passed` 或 `failed` outcome 返回其 status 与 canonical
final data；`not-applicable` 或 `unavailable` 返回带该 status 的 `upstream-data-unavailable`。TypeScript type 不授予访问权：consumer
先完成 string read、收窄结果，再调用 producing Check 的 parser。

`dependencies.list()` 不接收 selection input。它返回冻结的 `{ checkId, outcome }` array，精确覆盖上述 normalized effective
direct ID 并集，并按稳定 normalized ID 顺序排列。每个 `outcome` 是完整冻结的 Core `CheckOutcome`：`passed` 与 `failed` 保留 canonical
final data，`not-applicable` 与 `unavailable` 保留原始 reason。结果包含两类 relation 各自继承的 direct ID，但绝不包含 ambient executed
Checks、transitive dependencies、undeclared IDs、scheduler timing、Records 或改变 upstream execution 的方式。从 observation 读取 final
data 的 consumer 仍调用 producing Check 的 parser，并且只能用 observations 形成自身 I/O、Records、messages 与 terminal result。

The parser receives the Check-facts-owned canonical runtime object: a detached, deeply frozen object with canonical
JSON values. It does not receive the author's original object or JSON text. The provider owns business-shape
validation, version discrimination, thrown-error policy, and parser round-trip tests; Product neither calls
the parser nor adds a parser-rejection result.

As a heuristic rather than a guarantee, a same-version trusted provider whose tests guarantee the shape may
implement `parseData` only as an identity/type anchor. That does not validate JavaScript or cast-based
producers, historical or cross-version artifacts, or untrusted input. Validate those boundaries in the
provider instead of treating TypeScript inference as runtime proof.

每个 package-provided Check 都附带 Check-specific `parseData`，并从 package root 导出同一 final-data parser 与对应
final-data type。它们验证单个 `passed` / `failed` data object 的 closed shape 与业务不变量；不解析 machine bytes，也不
替代 v4 publication-set/schema validation。自定义 Check 仍自行决定是否提供 parser，Product 不建立 generic
parser registry。

Terminal messages and explicit visibility are two distinct primary Check capabilities. Messages provide final supplemental detail; visibility controls whether a settled human row remains visible. Neither changes the Check outcome, scheduling, Records, Check facts, or machine publication.

`messages` is an optional dense ordered array of exact `{ level, code, message }` items. `level` is
`info | warning | error`; author attachment 的 `code` 是 non-empty Check-owned string，`message` 是 non-empty string，
without trimming, Unicode normalization, or a Product item/length cap。Product 捕获的 console call 使用
`console-<method>` code 和对应 level；它不是 author attachment，但复用相同 settlement/readback presentation shape。
`CheckMessage` is a supporting declaration used by `CheckResult`; it does not expand the package-root named-type inventory.
Omitted, own-property `undefined`, and an empty array all mean no messages. Product keeps author item order
without de-duplication or normalization. It validates the complete attachment
descriptor-safely with the terminal result: a malformed item or attachment makes the author result
unavailable and no partial messages are accepted. Messages are supplemental human/programmatic detail,
not final data or supplemental Records.

`presentCheckFindings({ findings, limit, message, omittedMessage })` 是公共 Check-authoring helper：producer
决定非负上限和安全单条格式，超限 hook 决定省略项等级，并提供实际的完整明细读取位置。它只形成已冻结 messages，
不建立统一 Finding/Record shape，也不替 producer 保存完整 facts。完整使用契约见
[深入 API 机制](api-mechanics.md#finding-presentation)。

## Recursive Check tree

Every node has a unique `checkId` and non-empty `displayName`. An executable node can also contain children; execution and containment are independent ordinary fields. Containment contributes scheduling inheritance only: it does not create a separately published Check or a hierarchy in the final snapshot.

`maxParallel` is a positive safe integer. The definition scheduler supplies the root value (default `4`), and a node's value is inherited by descendants unless a child supplies its own value.

`admissionPriority` is a signed safe integer. It inherits from the nearest explicit ancestor and defaults to `0`. It is immutable Task metadata: static/custom policies can read it only through the full graph, and it only orders otherwise-ready work in the same scheduler selection layer. It does not change declaration order or bypass direct dependencies, mutexes, root or scoped capacity, or lifecycle cancellation. Use a few relative bands rather than a unique number for every Check.

`dependsOn`、`observes` 与 `mutex` 都接受 exact string collection 或 `inherit({ add, remove })`：

- an exact collection replaces the inherited collection, including `[]` to clear it;
- `inherit` changes the parent collection deliberately, then canonicalizes and de-duplicates it;
- `dependsOn` 与 `observes` 都命名同一 Definition 中的 executable Check IDs；mutex values 命名 shared resources。
- `dependsOn` 只在所有 direct provider 都已 `passed` 后授权本 Check 的 preflight/execution；`observes` 只等待所有 direct provider 形成任意 terminal outcome。两类 relation 的 union 授权 `dependencies.get` / `list`，同一 provider 不得同时出现在两者。

The following field fragments are the only three collection forms. They belong on an ordinary Check; they are not a second configuration format. Use Check IDs that are executable in the same Definition.

```ts
import { inherit } from "@zxyycom/vibe-check";

const inheritedScheduling = {
  // Omit `dependsOn`, `observes`, or `mutex` to retain the parent's collection.
};

const exactScheduling = {
  dependsOn: ["compile"], // Replace the inherited dependencies.
  observes: ["publish-summary"], // Replace the inherited terminal observations.
  mutex: [], // Deliberately clear inherited mutexes.
};

const editedScheduling = {
  dependsOn: inherit({ add: ["test"], remove: ["lint"] }),
  observes: inherit({ add: ["report"] }),
  mutex: inherit({ add: ["network"] }),
};
```

An executable Check may declare `visibility: "always" | "attention"`. Omission and explicit `undefined`
normalize to `always`; a container cannot declare visibility, does not pass it to children, and unknown
values fail Definition validation. Visibility is declarative presentation identity: normalized executable
declarations always carry it, so `always` has the same fingerprint whether omitted or explicit and
`attention` changes that fingerprint. It does not change scheduling, execution, options, Check/Record
facts, machine output, Run Controls, or invocation-wide progress configuration.

The declaration order of `checks` is not execution order. After validation, Product flattens executable nodes to a canonical Check catalog and runs task-local preflight plus direct callbacks subject to `dependsOn` / `observes` relation semantics, mutexes, and the effective parallel budget.

## Package-provided Check composition

本节只拥有随包 Check 与 Project Definition 的共同组合边界。每项 Check 的 consumer options、默认值、领域校验、结果、
Records、不可用原因和定制依赖用法由[随包 Check 指南](navigation.md#随包-check-指南)中的对应 owner 完整表达。

八个函数都返回 ordinary executable `Check`，Product core 不注册或特殊解释这些 Check ID。前六个 constructor 接受
可省略的 authoring policy、同步拒绝未知或非法输入，并产生完整、冻结的 resolved options；
`secretDetection({ files })` 要求完整显式 files policy，`maintenanceReminders(entries)` 要求显式提醒政策。若调用方在 constructor 后用原生对象组合替换完整
`options`，owning Check 的 preflight 仍负责拒绝缺失、未知或非法 resolved shape；Definition 只保存 canonical authored
JSON，不把领域错误提升为整个 Definition 的 configuration failure。

六个读取文件的 defaulted constructor 共用 package root 导出的深冻结 `defaultProjectFileSelection` 作为可组合基线；`secretDetection` 则要求 caller 提供完整 explicit selection，但各 Check
仍拥有自己的精准 include、领域字段和 exact-input eligibility。公共文件选择、默认排除和原生组合方式见
[Project files and Check exact inputs](scan-scope.md#check-owned-file-selection)；每项 Check 的 resolved 默认值只见对应指南。
scanner executable、command marker 和 adapter protocol 由 owning Check 及
[Check-owned scanner dependencies](scanner-dependencies.md#check-owned-command-options)承接，不是 Definition、Run Controls 或
环境变量中的共享 override。

## Invocation and results

`run(definition, controls?)` 先验证一个 Project Definition 和一个 closed `RunControls` value。一次调用的 controls 只可设置
`projectRoot`、`flags`、显式 `checkAggregation`、`signal` 和 output overrides；它不能替换 Checks、改变 scanner
commands、注册 dependencies 或选择另一份 Definition。

`flags` 是可省略的 dense string-token array。省略、显式 `undefined` 和 `[]` 都形成冻结空数组；合法 token
必须是非空字符串，并在进入 invocation flag control 前复制、去重和按文本排序。非数组、sparse hole、空 token 或非字符串形成
`invalid-run-controls`。Product 只用 token presence 解释 executable Check 显式声明的 `enabledByFlags` 四种 predicate，并继续把完整集合交给 callback-local project context；它不定义 token vocabulary、value payload 或其它 Check 领域语义。

`checkAggregation` 没有默认值，是唯一的多 Check aggregation 输入：

```ts
{
  checks: "all" | readonly string[],
  mode: "all" | "any",
  unavailable: "propagate" | "fail" | "exclude",
  notApplicable: "exclude" | "pass" | "fail",
  empty: "passed" | "failed" | "not-applicable"
}
```

selection 在执行前拒绝 unknown、duplicate 或 non-normalized Check ID。未配置时 final facts 的 `aggregate` 为 `null`；配置
后只从 selected settled statuses 派生四态 aggregate，原始 Check/Record facts 始终保留。具体状态折叠由
[Quality Metrics](quality-metrics.md#explicit-aggregation-and-repository-gate-mapping)拥有。

每个 callback 恰好收到 `{ dependencies, options, project, records, signal }`。`options` 是 invocation-local canonical
snapshot 或 preflight prepared/fallback；`project` 只含 normalized root 与 flags；Check-specific 输入、file selection、
领域 policy 和 cache 仍由 owning Check options 承接。需要成功 provider data 的 consumer 用 `dependsOn`；需要四态 outcome
审计的 consumer 用 `observes`。两者的 direct union 都可由 `dependencies.get` 显式判断 data 可用性，或由 `dependencies.list()`
稳定枚举；二者都不授予 transitive、未声明或 scheduler-duration-model access。

invalid Definition、controls 或 aggregation selection 在 author work 前返回 configuration result。ordinary callback throw、
malformed result、Record misuse 与 cancellation 按 owning execution boundary 结算；精确 `RunResult` branches、durations、
messages、output failure priority 和 readback 见[深入 API 机制的 outputs 与 RunResult 边界](api-mechanics.md#outputs-与-runresult-边界)。

## Run outputs and compatibility boundary

Definition 为三项相互独立的 Run output 建立以下 defaults；RunControls 只覆盖当前调用明确提供的字段：

| Output              | Definition default                                     | 配置责任                                                                                                                         |
| ------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| machine publication | `{ enabled: true, directory: "artifacts/vibe-check" }` | 发布完整 machine artifact set；字节契约见 [Output](output.md)。                                                                  |
| progress rendering  | `{ enabled: true }`                                    | 呈现 invocation 与 Check lifecycle；终端和 console capture 边界见 [API mechanisms](api-mechanics.md#check-输出与受管-progress)。 |
| diagnostic logging  | `{ enabled: false, directory: ".log/vibe-check" }`     | 记录 Product core 时间线；格式与失败边界见 [API mechanisms](api-mechanics.md#outputs-与-runresult-边界)。                        |

machine publication 与 diagnostic logging 的 `directory` 共用同一受信任 target grammar：值必须是非空且不含 U+0000 的字符串。
相对值从 effective `projectRoot` 解析，`..` 保持合法；绝对值直接作为明确 target。Definition 与 RunControls 对两项 output 使用相同 grammar，且两项仍独立配置、独立 status/failure，也可以显式填写同一目录。grammar 不 trim author text、不建立跨平台字符禁用表，也不提供 lexical/realpath/symlink containment、directory allowlist、清空或 filesystem sandbox。Definition 中的 author directory string 仍进入 declarative fingerprint；因此可移植、可重复的 Definition 应优先使用相对目录，而 invocation-specific 外部 target 通常放在 RunControls。

Definition、controls 或 aggregation selection 无效时尚无可信 effective output configuration，因此不会创建 output。三项 output 的 status、failure isolation、machine/non-machine 边界与读取顺序由上表链接的 owner 完整表达。

Product 没有共享 comparison/reference channel 或 policy-selection layer。Producing Check 通过自己的 options 或 composition
拥有 baseline/comparison behavior；repository Gate 只在 project-owned Run 中绑定 selected Check IDs 和 aggregation。

Product 不发现 JSON/JSONC configuration，也不提供 editor profile、adjustment helper、generic parser/materializer registry、
operational dependency map、CLI 或 `bin`。Project-owned TypeScript Definition 与 bound Run 是唯一支持的执行集成路径；
随包 Check 仍各自导出 final-data parser。
