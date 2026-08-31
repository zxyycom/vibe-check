# Configuration

Vibe Check configuration is a project-owned TypeScript **Project Definition**. `defineConfig` creates its plain value; a project-owned wrapper calls `run(definition, controls)`. Product never discovers, reloads, or accepts a second configuration module.

本文拥有 authoring 与 invocation。Check/Record 通用语义属于 [Quality Metrics](quality-metrics.md)，每项随包 Check 的 consumer options 属于对应 `docs/checks/*.md` 指南，owner-local external-tool adapter boundary 属于 [Check-owned scanner dependencies](scanner-dependencies.md)，result/output DTOs 属于 [Output](output.md)。

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

prepared/fallback 会被重新 snapshot 为 detached、canonical、deep-frozen 的 invocation-local value；它既不回写 Definition authored options，也不改变 declarative fingerprint。preflight、execution 与 typed-provider parser 都是 trusted functions，不进入 fingerprint、Check facts 或 machine output。preflight messages 排在 execution terminal messages 之前，即使 execution 随后抛错也会保留。

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

```ts
import { defineCheck } from "@zxyycom/vibe-check";

const CHANGED_FILES_DATA_VERSION = 1 as const;

interface ChangedFilesData {
  readonly version: typeof CHANGED_FILES_DATA_VERSION;
  readonly files: readonly string[];
}

const changedFiles = defineCheck({
  checkId: "changed-files",
  displayName: "Changed files",

  parseData(data): ChangedFilesData {
    if (
      data.version !== CHANGED_FILES_DATA_VERSION ||
      !Array.isArray(data.files) ||
      !data.files.every((value): value is string => typeof value === "string")
    ) {
      throw new TypeError("Unsupported changed-files data");
    }
    return { version: CHANGED_FILES_DATA_VERSION, files: data.files };
  },

  execution() {
    return {
      status: "passed",
      data: { version: CHANGED_FILES_DATA_VERSION, files: ["src/index.ts"] }
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
`info | warning | error`; `code` is a non-empty Check-owned string; and `message` is a non-empty string, without trimming, Unicode normalization, or a Product item/length cap.
`CheckMessage` is a supporting declaration used by `CheckResult`; it does not expand the package-root named-type inventory.
Omitted, own-property `undefined`, and an empty array all mean no messages. Product keeps author item order
without de-duplication or normalization. It validates the complete attachment
descriptor-safely with the terminal result: a malformed item or attachment makes the author result
unavailable and no partial messages are accepted. Messages are supplemental human/programmatic detail,
not final data or supplemental Records.

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

本节只拥有随包 Check 的普通 Check 组合规则、export inventory 与跨 Check 共性。每项 Check 的完整 consumer input、
默认值、领域约束、结果和 custom dependency 用法由对应 `docs/checks/*.md` 指南拥有。

七个 package-provided Check exports 都是返回 ordinary `Check` values 的函数；其中六个接收可省略 authoring policy 并补齐
defaults，`maintenanceReminders(entries)` 接收必须显式声明的提醒政策。Product core 不按 Check ID 注册或特殊处理它们。
每项 Check 都拥有 block preflight、execution、完整 resolved options 与 domain result；execution 也防御性复用 Check-local
validator。

六个 defaulting constructor 都同步拒绝未知/非法 authoring input、按各自字段规则补齐 defaults 并返回完整冻结 options；
无参或只覆盖单个字段时，consumer 不需要读取默认对象或使用 nested spread。constructor 返回后若再用普通对象组合替换完整 options，
owning preflight 仍会拒绝缺失、未知或非法 resolved shape。Definition 不把这些问题升级为全局 configuration failure。

`jsonValidation`、`jsonSchemaValidation` 与 `markdownLinkValidation` 各自拥有完整
`options.files` branch；三个 metric constructor 则为每个 `options.codeAreas[id]` 物化同样完整的 `files` branch。
Package root 公开以下深冻结的 `defaultProjectFileSelection: ProjectFileSelection`。该 value 是六个 constructor 共同使用的
通用组合基线，而不是所有 constructor 的同值 work set：

```ts
{
  source: "filesystem",
  include: ["**/*"],
  exclude: [
    "**/.cache/**", "**/.git", "**/.git/**", "**/.log/**",
    "**/.pytest_cache/**", "**/.tmp/**", "**/.venv/**", "**/.vibe-check/**",
    "**/__pycache__/**", "**/artifacts/**", "**/build/**", "**/coverage/**",
    "**/dist/**", "**/generated/**", "**/*.generated.*", "**/node_modules/**",
    "**/target/**", "**/tmp/**", "**/vendor/**", "**/venv/**"
  ]
}
```

六个 file-selecting constructor 都以 `filesystem` 作为 source 默认值，并采用上述对象的 exclude；source 只能是
`"filesystem" | "git-worktree"`。`duplicateDetection`、`fileMetrics` 与 `jsonSchemaValidation` 的 include 默认值是
`["**/*"]`；`functionMetrics` 从 Lizard 1.23.0 官方 extension registry 产生大小写不敏感的精确 globs，`jsonValidation`
使用 `["**/*.json"]`，`markdownLinkValidation` 使用 `["**/*.[mM][dD]", "**/*.[mM][aA][rR][kK][dD][oO][wW][nN]"]`。
显式提供某个数组时，该数组完整替换 owning Check 的对应默认值，不会自动追加或深度合并。
`include` 与 `exclude` 都匹配相对项目根目录且使用 `/` 的路径，`exclude` 优先。filesystem 不解释 `.gitignore`；
git-worktree 使用已跟踪文件和未被 Git 标准忽略规则排除的未跟踪文件。文件选择始终只使用配置的来源；来源失败会让
owning Check 结算为 unavailable，不会切换来源。默认对象本身不能修改；需要保留基线并增加项目规则时，项目通过普通
TypeScript composition 建立新对象：

```ts
import { defaultProjectFileSelection } from "@zxyycom/vibe-check";

const projectFiles = {
  ...defaultProjectFileSelection,
  exclude: [...defaultProjectFileSelection.exclude, "**/fixtures/**"]
};
```

这段 composition 是 consumer-owned、显式 `include: ["**/*"]` 的完整 selection，不是 Product-wide global config。
传给 `functionMetrics`、`jsonValidation` 或 `markdownLinkValidation` 时，Check 会为每个不受支持但实际选中的路径发布
non-blocking `input-rejected` Record。若要追加项目排除并保留目标 Check 的精准默认 include，应 author
`{ exclude: [...defaultProjectFileSelection.exclude, projectGlob] }` 而不显式提供 include；也可以同时提供目标 Check 的精准
include。nested threshold、allowance 与 finding-policy 字段仍按各 constructor 的下述规则独立补齐。

无参 `duplicateDetection()` 的 `codeAreas.project` 恰为
`{ files: <上述 branch>, findingPolicy: "non-blocking", minimumLines: 4, minimumTokens: 100 }`；其顶层 options 没有
`files` 或默认/override 阈值。
无参 `fileMetrics()` 建立一个 area-owned `project` policy 并使用默认 `scc` executable；完整字段与默认值见
[`fileMetrics` 指南](checks/file-metrics.md#参数与默认配置)。
无参 `functionMetrics()` 以 `"non-blocking"` 作为 constructor 的 area policy 默认值；产物不保留第二份顶层 policy，
`codeAreas.project` 直接拥有 Lizard-supported precise files、effective finding policy，以及
`codeLines: { maximum: 60, lowComplexityAllowance: { maximum: 180, cyclomaticComplexityBelow: 6 } }`、
`cyclomaticComplexity: { maximum: 12 }` 与 `parameters: { maximum: 6 }`。
这些 defaults 是 owning Check 的 policy，不是
`ProjectDefinition` 中的共享配置。项目需要统一 policy 时，应像 repository dogfood Definition 一样用普通 TypeScript
value 显式组合。

| Package export           | Kind        | Check ID                   | 初始 execution option                       | 其它 Check option                       |
| ------------------------ | ----------- | -------------------------- | ------------------------------------------- | --------------------------------------- |
| `duplicateDetection`     | constructor | `duplicate-detection`      | `scanner: { command: { kind: "package" } }` | cache；area files/thresholds/finding policy |
| `fileMetrics`            | constructor | `file-metrics`             | `scanner: { executable: "scc" }`            | area files/code lines/finding policy；finding waivers |
| `functionMetrics`        | constructor | `function-metrics`         | `scanner: { executable: "lizard" }`         | area-owned files/limits/finding policy  |
| `jsonValidation`         | constructor | `json-validation`          | —                                           | files；`maximumBytes: 1_048_576`         |
| `jsonSchemaValidation`   | constructor | `json-schema-validation`   | —                                           | files；schema registry 与 bindings       |
| `markdownLinkValidation` | constructor | `markdown-link-validation` | —                                           | files；local-link policy 与 work limits  |

`jsonValidation(options?)` 的 authoring input 可省略 `files` 与 `maximumBytes`，resolved options 恰好包含
`{ files, maximumBytes }`，其中 files 默认以 common baseline 的 source/exclude 配合 `include: ["**/*.json"]`，
`maximumBytes` 必须是正安全整数；constructor 后用普通 object composition 替换 `options` 时必须同时提供两个字段。
显式 files 选中但不是小写 `.json` suffix 的路径会产生 non-blocking `input-rejected` Record，只有 invalid JSON document
使 Check failed。`duplicateDetection(options?)` 的 input 只含可省略的 `{ cache,
codeAreas, findingPolicy, scanner }`；显式 area 必须提供 `files` branch，其中 `source`、`include`、`exclude`、finding
policy 和两个阈值均可省略。constructor 产物的完整
`options` 恰好包含 `{ cache, codeAreas, scanner }`；`codeAreas` 至少有一个非空 id，每个 value 恰好包含
`{ files, findingPolicy, minimumLines, minimumTokens }`，两个阈值都是正安全整数。顶层 `findingPolicy` 默认为
`"non-blocking"`，area 可覆盖并在 resolved area 中物化。resolved `scanner` 恰为 `{ command }`；package
command 恰为 `{ kind: "package" }`，custom command 恰为 `{ kind: "custom", executable }`。version probe、exact-input
config、JSON report output 和自动 worker policy 全部由 jscpd adapter 拥有；正确示例与 wrapper 边界见
[`duplicateDetection` 指南](checks/duplicate-detection.md#定制-jscpd-executable)。

`fileMetrics(options?)` 的 input 只含可省略的 `{ codeAreas, findingPolicy, findingWaivers, scanner }`，resolved options
恰为 `{ codeAreas, findingWaivers, scanner }`。它以 area ID 共同组织 files、code-line policy 与 effective finding policy，
并只允许 consumer 选择 SCC executable；顶层 `findingPolicy` 默认为 `"non-blocking"`，area 可覆盖。`findingWaivers`
省略时物化为 `[]`，由 owning Check 在完整 finding 集合形成后对账。完整字段、有效上限、重叠 area、waiver 和 adapter
protocol 见 [`fileMetrics` 指南](checks/file-metrics.md)。

`functionMetrics(options?)` 的 input 只含可省略的 `{ codeAreas, findingPolicy, scanner }`；顶层 finding policy 只能是
`"blocking" | "non-blocking"`。显式 area 必须提供 `files` branch，可省略 nested limits 与 area finding-policy override。
constructor 产物恰为 `{ codeAreas, scanner }`，每个 area 恰为 `{ files, findingPolicy, limits }`，resolved
scanner 恰为 `{ executable }`。Lizard version probe、exact paths、CSV protocol 与 timeout 不属于 public input；area paths
先完整分类为 accepted/rejected，accepted union 只扫描一次，重叠 area 使用最严格 maximum 和 blocking policy。所有 metric
与 input-rejection findings 都保留为 Records；input rejection 固定 non-blocking，只有 effective blocking metric findings
使 Check failed。完整 contract 见 [`functionMetrics` 指南](checks/function-metrics.md)。

Run 调用 preflight 时不会 import 该 Check 或解释其领域字段。environment variables、Run Controls 和 repository tool state 都不会成为 scanner override。

表中的 `fileMetrics` 与 `functionMetrics` 行给出各自完整的初始 `options.scanner` branch。`duplicateDetection`
行给出 constructor 形成的 portable package marker；只有 owning jscpd adapter 会把该 marker 解析成 installed manifest 的
bin target 并通过 active Bun 执行。consumer 需要 custom executable 时通过 constructor 选择 custom command，而不是依赖
environment lookup、executable discovery 或共享 scanner adapter。完整 handoff 见
[Check-owned scanner dependencies](scanner-dependencies.md#check-owned-command-options)。

### `jsonSchemaValidation` option contract

无参 `jsonSchemaValidation()` 物化以下完整 resolved options：

```ts
{
  files: defaultProjectFileSelection,
  maximumBytes: 1_048_576,
  schemaIdentity: { mode: "require-match" },
  referenceResolution: { mode: "offline" },
  schemas: [],
  bindings: []
}
```

authoring input 的六个顶层字段均可省略，`files` 中的字段也可分别省略；显式 discriminated branch 必须完整，显式数组是
完整替换值。resolved options 的所有 branch 与数组都是 closed、dense shape。`schemas` 包含 `{ id, path }` records；
`bindings` 包含 `{ id, instancePath, schemaId }` records。Schema ID 与 HTTPS source ID 必须是不含 userinfo、query 或
fragment 的安全绝对 `https:` 或 `urn:` identifier。binding ID 使用安全 label；schema 与 instance path 必须是规范化、
相对项目根目录且使用小写 `.json` 后缀的路径。

`schemas` 内的 schema ID、`sources` 内的 HTTPS source ID、binding ID、schema path 与
`(instancePath, schemaId)` pair 分别唯一；每个 binding 必须引用已声明 schema。execution 前，Run 会调用 owning Check 的
普通 block preflight。未知字段、sparse array、非法 path/ID、未声明 schema、重复项、不完整 branch、非法 `files` branch
或非正 byte limit 只会令该 Check 结算为 `unavailable / invalid-options`，不会把整个 Definition 变为 configuration result。

#### 根 schema identity

`schemaIdentity` 是 Check-level 单选 policy，不是 per-schema toggle：

| Mode                          | Root requirement and engine identity                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `require-match` (default)     | Root `$id` must equal `schemas[].id`; that configured ID is the engine identity.                                                                                       |
| `configuration-authoritative` | The configured schema ID is the engine identity. An object root receives a private compile copy with that `$id`; a boolean root uses the configured identity directly. |
| `document-authoritative`      | Root `$id` must be safe and becomes the engine identity. The configured schema ID remains the public binding and Record label.                                         |

#### 引用解析 policy

`referenceResolution: { mode: "offline" }` makes no network request and still permits the package-fixed JSON Schema
2020-12 catalog. Only the allowlisted branch admits extra references:

```ts
{
  mode: "allowlisted",
  sources: [
    { kind: "bundled", catalog: "json-schema-2020-12" },
    {
      kind: "https",
      id: "urn:example:schema-source",
      origin: "https://schemas.example.test",
      pathPrefix: "/catalog/"
    }
  ]
}
```

An HTTPS source has an exact HTTPS origin and normalized absolute path prefix. No headers, credentials, redirects,
environment registry, generic callback loader, or ambient network policy is accepted. The Check still reads only
its declared, Check-selected local files; remote settlement is owned by
[Quality Metrics](quality-metrics.md#package-provided-ordinary-checks-and-exact-inputs).

#### JSON Schema 兼容边界

本 Check 把 JSON Schema `format` 作为 2020-12 annotation，不安装或加载 format assertion plugin。Ajv `$async` schema 与
`$dynamicRef` / `$recursiveRef` 会形成 closed schema-compile failure。该 policy 只作用于真实 schema 位置；JSON instance 中
字面命名为 `$ref`、`$dynamicRef` 或 `$async` 的 property 仍是普通 instance data。

### Markdown Link Validation

`markdownLinkValidation(options?)` 构造 `checkId` 为 `markdown-link-validation` 的完整 ordinary Check。它校验受支持的
Markdown occurrence 的本地引用完整性；它不是通用 Markdown syntax、network reachability 或 repository-wide path policy。
source 与 direct target 的边界由 [Project files and Check exact inputs](scan-scope.md) 定义；finding 与 four-state result 由
[Quality Metrics](quality-metrics.md) 定义。

其 authoring options 均可省略，`files` 与 `limits` 的 fields 也可分别省略；无参调用物化的完整 resolved default 为：

```ts
{
  files: {
    source: "filesystem",
    include: ["**/*.[mM][dD]", "**/*.[mM][aA][rR][kK][dD][oO][wW][nN]"],
    exclude: defaultProjectFileSelection.exclude
  },
  findingPolicy: "non-blocking",
  requireExistingTargets: true,
  validateSameDocumentAnchors: true,
  validateCrossDocumentAnchors: true,
  rootExternalTargetMode: "report",
  requireNonEmptyDirectories: false,
  limits: {
    maxMarkdownBytes: 1_048_576,
    maxOccurrences: 10_000,
    maxTargetReads: 1_000
  }
}
```

`findingPolicy` 只能是 `"blocking" | "non-blocking"`，默认 `"non-blocking"`：它只决定 normal local-reference finding
使 owning Check `failed`，还是保留全部 Records/final data 并以 warning message 结算为 `passed`；它不处理 source、parse
或 target unavailable，也不改变 Run aggregation。`requireExistingTargets` 使缺失的 direct regular-file 或 directory target
成为普通 `missing-target` finding；它为 `false` 时，该缺失 target 的 anchor work 停止。`validateSameDocumentAnchors` 和
`validateCrossDocumentAnchors` 分别启用 same-document anchor 与 direct Markdown target anchor lookup。关闭
cross-document anchor validation 时，direct regular-file target 上的 fragment 不触发 Markdown eligibility 或 heading lookup。
`requireNonEmptyDirectories` 是独立作用的 directory policy。`rootExternalTargetMode` 严格为
`"ignore" | "report" | "validate"`；默认 `report` 不读取 root-external target。`limits` 只能包含上面所列的三个
positive safe integer。runtime 拒绝超过 `16_777_216` bytes、`100_000` occurrences 或 `10_000` target reads 的上限。
constructor input 中的 partial `limits` 会补齐其它默认 fields；constructor 返回后通过 native composition 替换完整 resolved
`limits` 时必须提供三个字段。Product 不静默提高调用方的 bound。

## 维护提醒

`maintenanceReminders(entries)` 是唯一的专用编写构造函数。它只创建一个普通、可执行的 Check，固定
`checkId: "maintenance-reminders"`、显示名 `Maintenance reminders` 和
`visibility: "attention"`。多个条目仅保留在该 Check 的局部最终数据中，不会成为子 Check、Record、依赖、聚合目标、进度行或机器输出行。

每个稠密条目都必须有唯一的小写短横线命名 `id`、不可变的 40 或 64 位十六进制 `baseCommit`、至少一个正安全整数 `limits.commits` 或 `limits.changedLines`、非空 `message`，以及可省略的 `mode`。省略 `mode` 等同于 `advisory`；`enforcing` 是唯一会阻断的模式。构造函数固定提供 package 持有的 `git.executable: "git"`，且不接受 Git 覆盖参数。返回值是带 owning block preflight 的合法普通 Check，因此调用方可以用原生对象组合替换**完整**的 `options` 分支；只替换 `git` 或省略 `entries` 会在 Run preflight 中结算 owning Check unavailable，Product 不会深度合并默认值。

```ts
import { defineConfig, maintenanceReminders } from "@zxyycom/vibe-check";

// 下列 baseCommit 都是示例占位值；实际使用时，每条都必须替换为该提醒最近一次真实复核对应的完整 commit ID。
const maintenance = maintenanceReminders([
  {
    id: "documentation-review",
    baseCommit: "0123456789abcdef0123456789abcdef01234567",
    limits: { commits: 40, changedLines: 2_000 },
    message: "Review the documentation structure after this body of change."
  },
  {
    id: "optimization-audit",
    baseCommit: "89abcdef0123456789abcdef0123456789abcdef",
    limits: { commits: 80 },
    message: "Audit optimization quality before this becomes older.",
    mode: "enforcing"
  }
]);

export default defineConfig({ checks: [maintenance] });
```

完成真实复核后，维护者必须手动将每个条目的 `baseCommit` 替换为对应的完整 commit ID；Product 不会自动推进它。已提交历史的计算、逐条数据、`advisory`/`enforcing` 状态折叠和聚合边界由[质量指标](quality-metrics.md#维护提醒评估)定义。

## Invocation and results

`run` first validates one Project Definition and one closed `RunControls` value. For one invocation, controls can set `projectRoot`, `flags`, explicit `checkAggregation`, `signal`, and output overrides. They cannot replace Checks, alter scanner commands, register dependencies, or select another definition.

`flags` is an optional caller-supplied dense string-token array: sparse array holes are invalid input. The array itself may be empty: omission, `flags: undefined`, and `[]` all provide callbacks a frozen empty array. Every array item is one non-empty string token, rather than a nested collection or value-bearing payload. Valid values are copied, deduplicated, and lexically sorted before they reach callback context. A non-array, sparse hole, empty token, or non-string token is an `invalid-run-controls` diagnostic at `controls.flags`.

`checkAggregation` has no default and is the only multi-Check aggregation surface:

```ts
{
  checks: "all" | readonly string[],
  mode: "all" | "any",
  unavailable: "propagate" | "fail" | "exclude",
  notApplicable: "exclude" | "pass" | "fail",
  empty: "passed" | "failed" | "not-applicable"
}
```

Unknown, duplicate, or non-normalized Check IDs fail validation before work. With no `checkAggregation`, completed/output facts contain `aggregate: null`; when present, Run derives `passed | failed | not-applicable | unavailable` only from the selected settled Check statuses. Raw canonical Check/Record facts are always retained for generic readback.

A callback receives exactly `{ dependencies, options, project, records, signal }`. `options` is the canonical immutable invocation-local authored snapshot or preflight prepared/fallback value. `project` contains only the normalized root and canonical `flags`; owning Check options define Check-specific input acquisition, file selection, domain policy, and cache configuration, while declared dependencies provide shared final data. All four ordinary upstream outcomes complete dependency ordering and admit downstream callbacks; Product does not translate an `unavailable` outcome into an implicit prerequisite failure. A downstream Check uses `dependencies.get` when its own result depends on upstream data. Cancellation before start, an invalid graph, and trusted engine/Check-facts failures remain separate boundaries that can prevent callback admission. Product contains ordinary execution, record, and cancellation failures as an unavailable Check outcome. Malformed ordinary grammar returns configuration. A throwing, malformed or blocking preflight settles only its owning Check unavailable before callback work; custom Checks may omit preflight. Every `RunResult` branch includes `definitionWarnings`; planning/execution diagnostics use documented run vocabulary. A progress writer failure marks `outputs.progressRendering` failed; when final facts are available it returns the `output` branch with `progress-rendering-failed`, without changing Check facts. A branch with a final `snapshot` also includes `checkDurations`, a frozen canonical-order array of `{ checkId, durationMs }` entries aligned one-for-one with `snapshot.checks`, and `checkMessages`, a frozen array of `{ checkId, level, code, message }`. `checkMessages` occurs only on `completed`, `output`, and execution-phase `cancelled` final-snapshot branches. It contains only accepted author attachments, ordered by canonical `snapshot.checks` order and then author item order; progress-disabled and progress-writer-failed runs retain the same readback.

## Run outputs and compatibility boundary

Run-owned outputs are diagnostic logging, machine publication, and progress rendering; Definition establishes their defaults, and
RunControls can partially override each output for one invocation. `diagnosticLogging` defaults to
`{ enabled: false, directory: ".log/vibe-check" }`. Its `directory` is a non-empty relative directory contained by the
effective `projectRoot`; when enabled, Product creates an invocation-specific `run-<UTC 紧凑时间>-<UUID>.log` there for manual core
diagnosis. Invalid Definition, controls or aggregation selection have no trusted effective output configuration, so their
configuration result creates no diagnostic log. The exact output readback, logging failure priority and non-machine boundary
belong to [深入 API 机制](api-mechanics.md#outputs-与-runresult-边界).

Progress is enabled by the Product default: it owns the execution header, settled Check lifecycle
feedback, and final execution summary on its target stream. TTY targets additionally show every running Check
in a temporary region; non-TTY or dumb targets retain only settled feedback and the final summary. On
settlement, `attention` hides only a passed Check with no messages. Every other four-state outcome, and a
passed `attention` Check with messages, emits its row plus all messages as one contiguous write; hidden
Checks still consume the canonical completion ordinal and final counts. Progress presentation is not a project
callback, observer, or renderer API, and a progress write failure fails that output without changing Check
execution facts or accepted `checkMessages`. Flags are callback-local context: Product does not interpret
their tokens or use them for Product-level Check selection or scheduling. Project-owned process transcripts remain
owned by their Check/process adapter. A project may colocate a Product diagnostic log with such transcripts, but the
two materials remain distinct and neither interprets the other.

Product has no shared comparison/reference channel or policy-selection layer. A repository Gate binds selected IDs and an explicit aggregation configuration in its own Project Run; its adapter only maps Run facts and `aggregate` to process exit. A producing Check owns any baseline or comparison behavior through its own options or composition.

Product neither discovers JSON/JSONC configuration nor exposes editor profiles, adjustment helpers, a generic parser/materializer registry, operational dependency maps, a CLI, or a `bin` entry. Package-provided Checks do export their own final-data parsers; Project-owned TypeScript Definition and bound Run remain the only supported execution integration path.
