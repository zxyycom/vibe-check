# Configuration

Vibe Check configuration is a project-owned TypeScript **Project Definition**. `defineConfig` creates its plain value; a project-owned wrapper calls `run(definition, controls)`. Product never discovers, reloads, or accepts a second configuration module.

本文拥有 Project Definition 与 Run Controls 的 authoring、defaults、validation 和 invocation input。Check/Record 通用语义
属于 [Quality Metrics](quality-metrics.md)，每项随包 Check 的 consumer contract 属于对应[随包 Check 指南](navigation.md#随包-check-指南)，
owner-local external-tool adapter boundary 属于 [Check-owned scanner dependencies](scanner-dependencies.md)，result/output
DTOs 属于 [Output](output.md)。

`ProjectDefinition` 只拥有 ordinary Check tree、scheduler 与明确的 diagnostic logging、machine publication/progress rendering outputs。它没有 package-specific `quality`、file
scope 或 code-area 字段；需要项目文件或领域 policy 的 Check 在自己的完整 `options` 中声明并消费这些输入。

## Public authoring surface

package surface 包含 `defineConfig`、`defineCheck`、`inherit`、`run`，六个可补齐默认值的 Check constructors
`duplicateDetection(options?)`、`fileMetrics(options?)`、`functionMetrics(options?)`、`jsonValidation(options?)`、
`jsonSchemaValidation(options?)`、`markdownLinkValidation(options?)`，以及 `maintenanceReminders(entries)`。这些函数都返回
ordinary Check object，不引入第二种 execution model。仓库 private consumer 的 Definition 由
[`scripts/project/gate/definition.ts`](../scripts/project/gate/definition.ts) 组装；下例只说明 Project Definition 的 authoring 形状，不是该 Gate Definition 的逐行副本。

```ts
import {
  defineCheck,
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  jsonSchemaValidation,
  jsonValidation,
  markdownLinkValidation
} from "@zxyycom/vibe-check";

const licenses = defineCheck({
  checkId: "licenses",
  displayName: "Dependency licenses",
  async execution({ records, signal }) {
    if (signal.aborted) return { status: "unavailable", reason: { code: "cancelled" } };

    const disallowed = await inspectDependencyLicenses();
    for (const dependency of disallowed) {
      records.report(
        { id: `dependency:${dependency.name}` },
        { license: dependency.license, name: dependency.name }
      );
    }
    return disallowed.length === 0
      ? { status: "passed", data: { disallowedCount: 0 } }
      : { status: "failed", data: { disallowedCount: disallowed.length } };
  }
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
        licenses
      ]
    }
  ],
  scheduler: { maxParallel: 4 }
});
```

`defineCheck` 只改善 TypeScript inference。Definition validation 负责关闭 ordinary Check grammar、拒绝 unknown Check keys 或 malformed declarative fields，并把 authored `options` snapshot 为 canonical immutable JSON；它不解释 options 的领域 shape。没有 `execution` 的 Check 是 container，只能携带递归 `checks` 和 scheduling fields；空 container 会产生 definition warning，而不会被静默当作 executable Check。

### Check options preflight

executable Check 可以提供 `preflight(options, signal)`，在本次 invocation 内准备 execution options。默认的同形 authored/prepared options 可以省略 preflight；如果 `Check<AuthoredOptions, PreparedOptions>` 声明了不同的 prepared shape，TypeScript 会要求提供 preflight。Definition 只保存 trusted function；Run 在任一 author Check execution 前，按 Definition 顺序完成所有已提供 preflight 的全局 barrier。

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

Run 把同一 invocation cancellation signal 传给 preflight 和 execution；异步 preflight 应在等待工作中协作退出。barrier 属于 execution phase，可能晚于 invocation preparation 或 progress setup，但保证 author Check execution、scanner 及其它 Check-local execution work 尚未开始。取消以现有 execution-phase `cancelled` RunResult 结束。preflight throw 使用 `preflight-threw`；malformed result/message/reason 或 noncanonical prepared/fallback 使用 `invalid-preflight-result`。这些 preparation failure 只结算 owning Check，不把整个 Definition 变为 configuration failure。

blocked Check 没有 started fact，duration 为 `null`；它仍保留 unavailable fact、accepted preflight messages、dependency readback、aggregation、settled lifecycle 与 progress。Check facts 不识别 package-provided Check ID，也不解释 files、thresholds、scanner commands、schemas、links 或 reminder policy。

An executable Check returns exactly one terminal result, optionally with ordered terminal messages:

```ts
{ status: "passed", data: object, messages?: readonly CheckMessage[] }
{ status: "failed", data: object, messages?: readonly CheckMessage[] }
{ status: "not-applicable", reason?: { code: string }, messages?: readonly CheckMessage[] }
{ status: "unavailable", reason: { code: string }, messages?: readonly CheckMessage[] }
```

`passed` and `failed` require an object final data value; an empty object is the authoring form for no domain data. A callback may separately call `records.report({ id }, data)` zero or more times. These final returns and two-argument reporting are the complete shared result surface: a Check owns its data shape, and a Project Run supplies only explicit invocation controls.

### Typed dependency data

This section is the current owner for the public typed-provider and `dependencies.get` contract. [Architecture](architecture.md) owns the runtime handoff, [Quality Metrics](quality-metrics.md) owns four-state final-data availability, and [Output](output.md) owns the separate machine-publication boundary.

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

`dependencies.get(checkId: string)` is deliberately non-generic. At runtime it authorizes only the current
Check's normalized effective direct dependency IDs, including inherited direct IDs. An undeclared,
transitive, malformed, or otherwise unauthorized ID returns `dependency-not-declared` without upstream
facts. A declared `passed` or `failed` dependency returns its status and its canonical final data;
`not-applicable` or `unavailable` returns `upstream-data-unavailable` with that status. TypeScript types do
not grant access: the consumer first performs the string read, narrows its result, and then calls the
producing Check's parser.

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

`maxParallel` is a positive safe integer. The definition scheduler supplies the root value (default `4`), and a node's value is inherited by descendants unless a child supplies its own value. `dependsOn` and `mutex` accept an exact string collection or `inherit({ add, remove })`:

- an exact collection replaces the inherited collection, including `[]` to clear it;
- `inherit` changes the parent collection deliberately, then canonicalizes and de-duplicates it;
- dependencies name executable Check IDs; mutex values name shared resources.

The following field fragments are the only three collection forms. They belong on an ordinary Check; they are not a second configuration format. Use Check IDs that are executable in the same Definition.

```ts
import { inherit } from "@zxyycom/vibe-check";

const inheritedScheduling = {
  // Omit `dependsOn` or `mutex` to retain the parent's collection.
};

const exactScheduling = {
  dependsOn: ["compile"], // Replace the inherited dependencies.
  mutex: [] // Deliberately clear inherited mutexes.
};

const editedScheduling = {
  dependsOn: inherit({ add: ["test"], remove: ["lint"] }),
  mutex: inherit({ add: ["network"] })
};
```

An executable Check may declare `visibility: "always" | "attention"`. Omission and explicit `undefined`
normalize to `always`; a container cannot declare visibility, does not pass it to children, and unknown
values fail Definition validation. Visibility is declarative presentation identity: normalized executable
declarations always carry it, so `always` has the same fingerprint whether omitted or explicit and
`attention` changes that fingerprint. It does not change scheduling, execution, options, Check/Record
facts, machine output, Run Controls, or invocation-wide progress configuration.

The declaration order of `checks` is not execution order. After validation, Product flattens executable nodes to a canonical Check catalog and runs their direct callbacks subject to dependencies, mutexes, and the effective parallel budget.

## Package-provided Check composition

本节只拥有随包 Check 与 Project Definition 的共同组合边界。每项 Check 的 consumer options、默认值、领域校验、结果、
Records、不可用原因和定制依赖用法由[随包 Check 指南](navigation.md#随包-check-指南)中的对应 owner 完整表达。

七个函数都返回 ordinary executable `Check`，Product core 不注册或特殊解释这些 Check ID。前六个 constructor 接受
可省略的 authoring policy、同步拒绝未知或非法输入，并产生完整、冻结的 resolved options；
`maintenanceReminders(entries)` 要求调用方显式提供提醒政策。若调用方在 constructor 后用原生对象组合替换完整
`options`，owning Check 的 preflight 仍负责拒绝缺失、未知或非法 resolved shape；Definition 只保存 canonical authored
JSON，不把领域错误提升为整个 Definition 的 configuration failure。

六个读取文件的 constructor 共用 package root 导出的深冻结 `defaultProjectFileSelection` 作为可组合基线，但各 Check
仍拥有自己的精准 include、领域字段和 exact-input eligibility。公共文件选择、默认排除和原生组合方式见
[Project files and Check exact inputs](scan-scope.md#check-owned-file-selection)；每项 Check 的 resolved 默认值只见对应指南。
scanner executable、command marker 和 adapter protocol 由 owning Check 及
[Check-owned scanner dependencies](scanner-dependencies.md#check-owned-command-options)承接，不是 Definition、Run Controls 或
环境变量中的共享 override。

## Invocation and results

`run(definition, controls?)` 先验证一个 Project Definition 和一个 closed `RunControls` value。一次调用的 controls 只可设置
`projectRoot`、`flags`、显式 `checkAggregation`、`signal` 和 output overrides；它不能替换 Checks、改变 scanner
commands、注册 dependencies 或选择另一份 Definition。

`flags` 是可省略的 dense string-token array。省略、显式 `undefined` 和 `[]` 都向 callback 提供冻结空数组；合法 token
必须是非空字符串，并在进入 callback 前复制、去重和按文本排序。非数组、sparse hole、空 token 或非字符串形成
`invalid-run-controls`。Flags 只进入 callback-local project context，Product 不用它选择或调度 Check。

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
领域 policy 和 cache 仍由 owning Check options 承接。四种 upstream outcome 都完成 dependency ordering；需要数据的
consumer 通过已声明 direct dependency 的 `dependencies.get` 显式判断可用性。

invalid Definition、controls 或 aggregation selection 在 author work 前返回 configuration result。ordinary callback throw、
malformed result、Record misuse 与 cancellation 按 owning execution boundary 结算；精确 `RunResult` branches、durations、
messages、output failure priority 和 readback 见[深入 API 机制的 outputs 与 RunResult 边界](api-mechanics.md#outputs-与-runresult-边界)。

## Run outputs and compatibility boundary

Definition 为三项相互独立的 Run output 建立以下 defaults；RunControls 只覆盖当前调用明确提供的字段：

| Output | Definition default | 配置责任 |
| --- | --- | --- |
| machine publication | `{ enabled: true, directory: "artifacts/vibe-check" }` | 发布完整 machine artifact set；字节契约见 [Output](output.md)。 |
| progress rendering | `{ enabled: true }` | 呈现 invocation 与 Check lifecycle；终端和 console capture 边界见 [API mechanisms](api-mechanics.md#check-输出与受管-progress)。 |
| diagnostic logging | `{ enabled: false, directory: ".log/vibe-check" }` | 记录 Product core 时间线；格式与失败边界见 [API mechanisms](api-mechanics.md#outputs-与-runresult-边界)。 |

两个 directory 都必须是位于 effective `projectRoot` 内的非空相对目录。Definition、controls 或 aggregation selection 无效时
尚无可信 effective output configuration，因此不会创建 output。三项 output 的 status、failure isolation、machine/non-machine
边界与读取顺序由上表链接的 owner 完整表达。

Product 没有共享 comparison/reference channel 或 policy-selection layer。Producing Check 通过自己的 options 或 composition
拥有 baseline/comparison behavior；repository Gate 只在 project-owned Run 中绑定 selected Check IDs 和 aggregation。

Product 不发现 JSON/JSONC configuration，也不提供 editor profile、adjustment helper、generic parser/materializer registry、
operational dependency map、CLI 或 `bin`。Project-owned TypeScript Definition 与 bound Run 是唯一支持的执行集成路径；
随包 Check 仍各自导出 final-data parser。
