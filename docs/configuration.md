# Configuration

Vibe Check configuration is a project-owned TypeScript **Project Definition**. `defineConfig` creates its plain value; a project-owned wrapper calls `run(definition, controls)`. Product never discovers, reloads, or accepts a second configuration module.

This document owns authoring and invocation. Check/Record semantics belong to [Quality Metrics](quality-metrics.md), scanner command semantics to [Check-owned scanner dependencies](scanner-dependencies.md), and result/output DTOs to [Output](output.md).

`ProjectDefinition` 只拥有 ordinary Check tree、scheduler 与明确的 machine publication/progress rendering outputs。它没有 package-specific `quality`、file
scope 或 code-area 字段；需要项目文件或领域 policy 的 Check 在自己的完整 `options` 中声明并消费这些输入。

## Public authoring surface

The package surface is `defineConfig`, `defineCheck`, `inherit`, `maintenanceReminders`, `run`, and the complete default values `duplicateDetection`, `fileMetrics`, `functionMetrics`, `jsonValidation`, `jsonSchemaValidation`, and `markdownLinkValidation`. `maintenanceReminders` is a specialized constructor, not a seventh default value. The repository dogfood definition is [`scripts/project/quality/definition.ts`](../scripts/project/quality/definition.ts).

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
} from "vibe-check";

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
      checkId: "repository-quality",
      displayName: "Repository quality",
      maxParallel: 2,
      checks: [
        duplicateDetection,
        fileMetrics,
        functionMetrics,
        jsonValidation,
        jsonSchemaValidation,
        markdownLinkValidation,
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

The public `CheckDataParser` annotation preserves that synchronous boundary even when its result type is
broad: an `async` parser or any parser returning `PromiseLike` is rejected. This does not reject canonical
JSON data merely because it has a `then` property: a non-callable `then` value remains ordinary data; only a
callable `then` would make the returned value thenable.

Runtime Definition validation still accepts a function parser on an executable trusted author object so that
JavaScript and explicitly cast inputs reach the same closed grammar. That validation preserves the function
but does not manufacture the TypeScript relation; the provider remains responsible for those shapes. An own
`parseData: undefined` follows ordinary optional-property semantics: Definition normalizes it to omission and
the materialized Check does not retain that key, so it does not create a typed provider.

```ts
import { defineCheck } from "vibe-check";

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
import { inherit } from "vibe-check";

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

The six package-provided values are complete ordinary `Check` values built on the same contract available to project-owned Checks. Product core does not register them as built-ins. Each value owns full options, block preflight, execution and domain result; execution reuses its Check-local options helper defensively. A project customizes one with normal object spread and must supply every field of a nested branch it replaces; object spread retains preflight. Definition preserves incomplete or unknown authored JSON as declarative input, then the owning block preflight settles that Check unavailable before scanner or callback work rather than filling branches or treating the whole Definition as configuration failure.

All six file-reading Checks own a complete `options.files` branch. Its initial value is:

```ts
{
  include: ["**/*"],
  excludeDirs: [
    ".git", ".vibe-check", ".cache", ".venv", "artifacts", "build", "dist",
    "node_modules", "target", "vendor"
  ],
  generatedFiles: ["**/generated/**", "**/*.generated.*"]
}
```

`duplicateDetection`、`fileMetrics` 与 `functionMetrics` 还分别拥有初始
`codeAreas: { project: { description: "This project", globs: ["**/*"], excludeGlobs: [], warningPolicy: "moderate" } }`。
这些相同初始 values 是随包 Check 各自 options 的组成部分，不是 `ProjectDefinition` 中的共享配置。项目需要统一 policy
时，应像 repository dogfood Definition 一样用普通 TypeScript value 显式组合。

| Package value          | Check ID                  | `scanner.executable`                                      | `scanner.args` | `scanner.availabilityArgs` | Additional Check option                 |
| ---------------------- | ------------------------- | --------------------------------------------------------- | -------------- | -------------------------- | --------------------------------------- |
| `duplicateDetection`   | `duplicate-detection`     | `vibe-check-package-jscpd` (package-owned default marker) | `[]`           | `['--version']`            | `scanner.maxConcurrency: 4`             |
| `fileMetrics`          | `file-metrics`            | `scc`                                                     | `[]`           | `['--version']`            | —                                       |
| `functionMetrics`      | `function-metrics`        | `lizard`                                                  | `[]`           | `['--version']`            | —                                       |
| `jsonValidation`       | `json-validation`         | —                                                         | —              | —                          | `maximumBytes: 1_048_576`               |
| `jsonSchemaValidation` | `json-schema-validation` | —                                                         | —              | —                          | explicit JSON Schema registry/bindings |
| `markdownLinkValidation` | `markdown-link-validation` | —                                                       | —              | —                          | closed local-link options |

`jsonValidation.options` contains exactly `{ files, maximumBytes }`; `maximumBytes` is a positive safe integer. Replacing `options` with native object composition must supply both fields. Each package-provided Check carries block preflight and reuses its Check-local helper for its complete option shape; `duplicateDetection` additionally requires every `minimumTokensByCodeArea` key to exist in its own `codeAreas`. Run invokes preflight without importing the Check or interpreting its domain fields. Environment variables, Run Controls and repository tool state are never scanner overrides.

### `jsonSchemaValidation` option contract

The exported `jsonSchemaValidation.options` value is exactly:

```ts
{
  files: {
    include: ["**/*"],
    excludeDirs: [
      ".git", ".vibe-check", ".cache", ".venv", "artifacts", "build", "dist",
      "node_modules", "target", "vendor"
    ],
    generatedFiles: ["**/generated/**", "**/*.generated.*"]
  },
  maximumBytes: 1_048_576,
  schemaIdentity: { mode: "require-match" },
  referenceResolution: { mode: "offline" },
  schemas: [],
  bindings: []
}
```

All option branches and arrays are closed and dense. `schemas` contains `{ id, path }` records; `bindings` contains
`{ id, instancePath, schemaId }` records. Schema IDs and HTTPS source IDs are safe absolute `https:` or `urn:`
identifiers without userinfo, query, or fragment. Binding IDs are safe labels. Schema and instance paths are
normalized, project-relative, lowercase-`.json` paths.

Schema IDs are unique within `schemas`; HTTPS source IDs are unique within `sources`; binding IDs, schema paths,
and `(instancePath, schemaId)` pairs are each unique. Every binding must name a declared schema. Before execution,
Run calls the ordinary owning block preflight before author execution. Unknown fields, sparse arrays, malformed paths or IDs,
an unknown binding schema, duplicate entries, an incomplete branch, an invalid `files` branch or a non-positive byte
limit settle only that Check as `unavailable / invalid-options`; they do not turn the whole Definition into a configuration result.

#### Root identity

`schemaIdentity` is one Check-level choice, never a per-schema toggle:

| Mode | Root requirement and engine identity |
| --- | --- |
| `require-match` (default) | Root `$id` must equal `schemas[].id`; that configured ID is the engine identity. |
| `configuration-authoritative` | The configured schema ID is the engine identity. An object root receives a private compile copy with that `$id`; a boolean root uses the configured identity directly. |
| `document-authoritative` | Root `$id` must be safe and becomes the engine identity. The configured schema ID remains the public binding and Record label. |

#### Reference policy

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

#### First-release compatibility boundary

The first release treats JSON Schema `format` as a 2020-12 annotation and does not install or load a format
assertion plugin. Ajv `$async` schemas and `$dynamicRef`/`$recursiveRef` are closed schema-compile failures. This
policy applies only at actual schema positions: a JSON instance property literally named `$ref`, `$dynamicRef`, or
`$async` remains ordinary instance data.

The metric package values contain only their documented absolute floors and nested allowances; no initial option
expresses a changed-file delta threshold. `RunControls.changedFiles` remains callback context, not a hidden
metric option.

For the three metric rows, the table gives the complete initial `options.scanner` branch. The duplication value's stable marker keeps its public Definition and declarative fingerprint portable. Only the `duplicate-detection`-owned jscpd adapter recognizes that package marker, resolves the installed package's `jscpd` manifest and declared bin target, and invokes it through the active Bun executable. That resolution is not an additional scanner option, environment lookup, executable-discovery API or shared adapter. A project that replaces a scanner branch still supplies the complete ordinary command values it wants the owning Check to execute. The handoff is defined in [Check-owned scanner dependencies](scanner-dependencies.md#check-owned-command-options).


### Markdown Link Validation

`markdownLinkValidation` 是 `checkId` 为 `markdown-link-validation` 的完整 ordinary Check。它校验受支持的
Markdown occurrence 的本地引用完整性；它不是通用 Markdown syntax、network reachability 或 repository-wide path policy。
source 与 direct target 的边界由 [Project files and Check exact inputs](scan-scope.md) 定义；finding 与 four-state result 由
[Quality Metrics](quality-metrics.md) 定义。

其 closed `options` 均为必填项；完整 default 为：

```ts
{
  files: {
    include: ["**/*"],
    excludeDirs: [
      ".git", ".vibe-check", ".cache", ".venv", "artifacts", "build", "dist",
      "node_modules", "target", "vendor"
    ],
    generatedFiles: ["**/generated/**", "**/*.generated.*"]
  },
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

`requireExistingTargets` 使缺失的 direct regular-file 或 directory target 成为普通 `missing-target` finding；它为
`false` 时，该缺失 target 的 anchor work 停止。`validateSameDocumentAnchors` 和
`validateCrossDocumentAnchors` 分别启用 same-document anchor 与 direct Markdown target anchor lookup。关闭
cross-document anchor validation 时，direct regular-file target 上的 fragment 不触发 Markdown eligibility 或 heading lookup。
`requireNonEmptyDirectories` 是独立作用的 directory policy。`rootExternalTargetMode` 严格为
`"ignore" | "report" | "validate"`；默认 `report` 不读取 root-external target。`limits` 只能包含上面所列的三个
positive safe integer。runtime 拒绝超过 `16_777_216` bytes、`100_000` occurrences 或 `10_000` target reads 的上限。
通过 native composition 替换 `limits` 时必须提供三个字段；Product 不合并缺失 nested field，也不静默提高调用方的 bound。

## 维护提醒

`maintenanceReminders(entries)` 是唯一的专用编写构造函数。它只创建一个普通、可执行的 Check，固定
`checkId: "maintenance-reminders"`、显示名 `Maintenance reminders` 和
`visibility: "attention"`。多个条目仅保留在该 Check 的局部最终数据中，不会成为子 Check、Record、依赖、聚合目标、进度行或机器输出行。

每个稠密条目都必须有唯一的小写短横线命名 `id`、不可变的 40 或 64 位十六进制 `baseCommit`、至少一个正安全整数 `limits.commits` 或 `limits.changedLines`、非空 `message`，以及可省略的 `mode`。省略 `mode` 等同于 `advisory`；`enforcing` 是唯一会阻断的模式。构造函数固定提供 package 持有的 `git.executable: "git"`，且不接受 Git 覆盖参数。返回值是带 owning block preflight 的合法普通 Check，因此调用方可以用原生对象组合替换**完整**的 `options` 分支；只替换 `git` 或省略 `entries` 会在 Run preflight 中结算 owning Check unavailable，Product 不会深度合并默认值。

```ts
import { defineConfig, maintenanceReminders } from "vibe-check";

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

`run` first validates one Project Definition and one closed `RunControls` value. Controls provide only invocation context: `projectRoot`, `changedFiles`, optional `flags`, optional explicit `checkAggregation`, `signal`, and output overrides. They cannot replace Checks, alter scanner commands, register dependencies, or select another definition.

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

A callback receives exactly `{ dependencies, options, project, records, signal }`. `options` is the canonical immutable invocation-local authored snapshot or preflight prepared/fallback value. `project` contains only the normalized root, frozen caller-supplied `changedFiles`, and canonical `flags`; file selection, domain policy, and any cache configuration come from the owning Check's options. All four ordinary upstream outcomes complete dependency ordering and admit downstream callbacks; Product does not translate an `unavailable` outcome into an implicit prerequisite failure. A downstream Check uses `dependencies.get` when its own result depends on upstream data. Cancellation before start, an invalid graph, and trusted engine/Check-facts failures remain separate boundaries that can prevent callback admission. Product contains ordinary execution, record, and cancellation failures as an unavailable Check outcome. Malformed ordinary grammar returns configuration. A throwing, malformed or blocking preflight settles only its owning Check unavailable before callback work; custom Checks may omit preflight. Every `RunResult` branch includes `definitionWarnings`; planning/execution diagnostics use documented run vocabulary. A progress writer failure marks `outputs.progressRendering` failed; when final facts are available it returns the `output` branch with `progress-rendering-failed`, without changing Check facts. A branch with a final `snapshot` also includes `checkDurations`, a frozen canonical-order array of `{ checkId, durationMs }` entries aligned one-for-one with `snapshot.checks`, and `checkMessages`, a frozen array of `{ checkId, level, code, message }`. `checkMessages` occurs only on `completed`, `output`, and execution-phase `cancelled` final-snapshot branches. It contains only accepted author attachments, ordered by canonical `snapshot.checks` order and then author item order; progress-disabled and progress-writer-failed runs retain the same readback.

## Run outputs and compatibility boundary

Run-owned outputs are machine publication and progress rendering; controls may override their settings for an
invocation. Progress is enabled by the Product default: it owns the execution header, settled Check lifecycle
feedback, and final execution summary on its target stream. TTY targets additionally show every running Check
in a temporary region; non-TTY or dumb targets retain only settled feedback and the final summary. On
settlement, `attention` hides only a passed Check with no messages. Every other four-state outcome, and a
passed `attention` Check with messages, emits its row plus all messages as one contiguous write; hidden
Checks still consume the canonical completion ordinal and final counts. Progress presentation is not a project
callback, observer, or renderer API, and a progress write failure fails that output without changing Check
execution facts or accepted `checkMessages`. Flags are callback-local context: Product does not interpret
their tokens or use them for Product-level Check selection or scheduling. Project-owned transcripts, such as
the repository Gate log directory, are not a Product output.

Product has no shared comparison/reference channel or policy-selection layer. A repository Gate binds selected IDs and an explicit aggregation configuration in its own Project Run; its adapter only maps Run facts and `aggregate` to process exit. A producing Check owns any baseline or comparison behavior through its own options or composition.

Product neither discovers JSON/JSONC configuration nor exposes editor profiles, adjustment helpers, parser/materializer APIs, operational dependency maps, a CLI, or a `bin` entry. Project-owned TypeScript Definition and bound Run are the only supported integration path.
