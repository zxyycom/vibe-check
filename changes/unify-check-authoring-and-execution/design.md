# Design

本文件是实施者的直接入口：它固定目标 Check contract、责任边界、TypeScript 参考签名、current-source 删除清单、测试证据和迁移验收；不再保留需要实施者猜测的临时 API 或开放产品问题。

## Context

### Authority and reading path

1. [`proposal.md`](./proposal.md) 拥有本 Change 的结果、范围与成功标准。
2. 本文件拥有本 Change 的 target contract、source/test audit 和迁移边界。
3. [`tasks.md`](./tasks.md) 只表达实施顺序与完成状态，不重新定义行为。
4. stable docs 与当前 source/tests 是当前实现事实；下列 active decisions 是跨 Change 的目标方向：
   - [`use-recursive-check-values-with-optional-execution`](../../docs/decisions/configuration/use-recursive-check-values-with-optional-execution.md)
   - [`use-direct-check-execution-with-structured-results`](../../docs/decisions/configuration/use-direct-check-execution-with-structured-results.md)
   - [`let-check-options-own-execution-dependencies`](../../docs/decisions/configuration/let-check-options-own-execution-dependencies.md)
   - [`drive-run-from-check-owned-execution-options`](../../docs/decisions/configuration/drive-run-from-check-owned-execution-options.md)
   - [`use-inherit-for-check-collection-edits`](../../docs/decisions/configuration/use-inherit-for-check-collection-edits.md)
   - [`use-native-object-composition-for-check-customization`](../../docs/decisions/configuration/use-native-object-composition-for-check-customization.md)
   - [`project-executable-checks-into-validated-task-graph`](../../docs/decisions/product-contract/project-executable-checks-into-validated-task-graph.md)
   - [`apply-check-parallel-limit-while-task-runs`](../../docs/decisions/configuration/apply-check-parallel-limit-while-task-runs.md)
   - [`expose-ordinary-check-values-with-define-check`](../../docs/decisions/product-contract/expose-ordinary-check-values-with-define-check.md)
   - [`expose-recursive-check-authoring-and-run-surface`](../../docs/decisions/product-contract/expose-recursive-check-authoring-and-run-surface.md)

当前 source 中的 `CheckGroup | BuiltInCheck | CustomCheck`、TaskPlan、group dependency expansion、`replace` / `append` 和 operational dependency resolution 是迁移输入，不是目标 API。

### Target data flow

```text
ProjectDefinition.checks
  -> closed recursive Check validation
  -> root-to-child inheritance resolution
  -> execution-bearing Check projection
  -> one generic Task per executable Check
  -> complete static graph validation
  -> direct callback execution
  -> one callback result + zero or more Records/reference candidates
  -> reporter validation + one Check outcome
  -> Core snapshot + reference facts
```

没有 `execution` 的 node 在传递 inheritance 并展开 children 后停止。它不进入 Task、Core outcome、Record owner 或 dependency alias 边界。

### Current-source audit

| Boundary | Current implementation fact | Required target action | Primary evidence |
| --- | --- | --- | --- |
| Root/public types | `ProjectDefinition.checks: CheckNode[]`; exports group/source variants and adjustment APIs | replace with one recursive `Check`; export final inventory only | [`definition/project.ts`](../../src/product/definition/project.ts), [`public-contract/current.ts`](../../src/product/public-contract/current.ts) |
| Tree parsing | `checks` implies `CheckGroup`; built-in/custom branches parse separately | parse one closed shape where `execution` and `checks` are independent | [`check-tree/authoring.ts`](../../src/product/definition/check-tree/authoring.ts), [`check-tree/index.ts`](../../src/product/definition/check-tree/index.ts) |
| Dependency resolution | groups expand to descendant leaves and Check layer detects unknown/cycles | delete expansion; pass authored effective IDs to generic Task graph | [`check-tree/dependencies.ts`](../../src/product/definition/check-tree/dependencies.ts), [`task-scheduler/graph.ts`](../../src/product/task-scheduler/graph.ts) |
| Scheduling values | scalar/string arrays append from root to leaf | implement missing/exact/clear/`inherit` collections and nearest scalar | [`check-tree/authoring.ts`](../../src/product/definition/check-tree/authoring.ts) |
| Custom execution | separate applicability callback plus direct/TaskPlan binding union | one direct callback returning all three states | [`custom-check.ts`](../../src/product/definition/custom-check.ts), [`run/resolved-check.ts`](../../src/product/run/resolved-check.ts) |
| Task projection | direct Check gets one generated terminal Task; TaskPlan gets leaf and completion Tasks | use `checkId` as the single Task id; one one-Task scope carries its cap | [`run/check-execution-plan.ts`](../../src/product/run/check-execution-plan.ts), [`run/task-plan.ts`](../../src/product/run/task-plan.ts) |
| Outcome adapter | applicability closes before execution; direct result only has verdict; failure categories are partly source-specific | callback result closes completed/not-applicable/declared-unavailable; Product maps distinct owned failures | [`run/check-execution.ts`](../../src/product/run/check-execution.ts), [`check-record/core-session.ts`](../../src/product/quality-core/check-record/core-session.ts) |
| Default customization | complete defaults are wrapped by field-aware `replace` / `append` and patch parsers/materializers | retain complete defaults; delete adjustment files/exports; use native object composition | [`definition/built-ins.ts`](../../src/product/definition/built-ins.ts), [`definition/adjustments.ts`](../../src/product/definition/adjustments.ts), [`definition/adjustment-patches.ts`](../../src/product/definition/adjustment-patches.ts), [`definition/built-in-option-replacements.ts`](../../src/product/definition/built-in-option-replacements.ts) |
| Executable resolution | Project/Run maps and environment precedence resolve `duplication/file/function`; Run joins by built-in id | put scanner configuration in each default Check options; delete maps, overrides and lookup | [`scanner-dependencies/index.ts`](../../src/product/scanner-dependencies/index.ts), [`run/built-ins.ts`](../../src/product/run/built-ins.ts), [`run/control-validation.ts`](../../src/product/run/control-validation.ts) |
| Shared exact inputs | Run prepares root, file scope, quality config, comparison materialization and cache once for built-ins | expose invocation-wide inputs through `project`; default execution owns its scanner-specific preparation | [`run/built-in-inputs.ts`](../../src/product/run/built-in-inputs.ts), [`quality-core/engine-input-preparation.ts`](../../src/product/quality-core/engine-input-preparation.ts) |
| Reference facts | built-in runtime attaches a post-execution callback; policy looks it up through resolved binding | execution reports generic reference candidates through its Check-scoped reporter; Run validates them before Task settlement and later assembles facts from exact retained Record ids | [`run/policy.ts`](../../src/product/run/policy.ts), [`check-record/builtins/*-reference.ts`](../../src/product/quality-core/check-record/builtins/) |
| Cache | Run merges cache effects; duplicate Check receives a cache callback through hidden runtime construction | `project.cache` carries effective invocation config/activity callback; duplicate execution consumes it directly | [`run/effects.ts`](../../src/product/run/effects.ts), [`check-record/builtins/duplicate-detection.ts`](../../src/product/quality-core/check-record/builtins/duplicate-detection.ts) |
| Catalog/fingerprint | every leaf requires `recordTypes`; options and selected dependency IDs enter separate projections | allow authored omission -> `[]`; normalize before policy/Core; hash execution-relevant options without publishing raw executable | [`definition/check-definition.ts`](../../src/product/definition/check-definition.ts), [`check-record/identity.ts`](../../src/product/quality-core/check-record/identity.ts) |
| Consumers | dogfood and downstream package use groups, operational maps, `BuiltInCheck`, `replace` and `append` | migrate to ordinary nodes, native spread, `inherit`, Check-owned scanner options and final inventory | [`scripts/quality/project-definition.ts`](../../scripts/quality/project-definition.ts), [`establish-api-only-npm-product-boundary`](../establish-api-only-npm-product-boundary/) |

The audit assigns every current source-specific runtime responsibility:

- **Check options own:** scanner executable, scanner/availability arguments, scanner-local concurrency and Check semantic thresholds.
- **Run/project context owns:** normalized root, changed files, project file configuration, explicit comparison, effective cache configuration/activity and cooperative signal.
- **Check reporter owns:** Check-scoped Record candidates and reference evidence/relation candidates.
- **Run/Core/policy own:** candidate validation, record identity, reporter closure, terminal outcome selection, reference-fact assembly, policy and publication.

No remaining responsibility requires a `BuiltInRuntime`, operational dependency map, `checkId` switch or object-identity binding.

## Goals / Non-Goals

### Goals

- Make the ordinary recursive object sufficient to author information-only, execution-only and execution-with-children nodes.
- Keep one direct callback and one result grammar for Product defaults and project-authored Checks.
- Make each executable Check responsible for its complete options while keeping invocation-wide inputs in one explicit context.
- Reuse the generic Task graph as the only dependency, mutex, cap and graph-validation owner.
- Preserve Core Check/Record/reference/policy semantics without source-specific runtime lookup.
- Give implementation and review agents a closed source/test/migration checklist.

### Non-Goals

- Add child-first execution, parent completion, aggregate outcome, hierarchy output or per-Check TaskPlan.
- Add a generic merge/patch/materialization layer or compatibility aliases.
- Expose Task, scheduler, Core settle capability, raw scanner output or full `RunControls` to Check code.
- Redesign generic Task engine, policy, publication or package delivery.

## Decisions

### Recursive Check and result types

The reference types below fix the public semantic shape. Implementation may split declarations across files but must preserve these assignability and inference properties.

```ts
type CheckReason = Readonly<{ code: string }>;
type CheckNotApplicableReason = CheckReason;
type CheckDeclaredUnavailableReason = CheckReason;

type ProductCheckUnavailableReason = Readonly<
  | { code: "prerequisite-unavailable"; checkIds: readonly string[] }
  | { code: "execution-threw" }
  | { code: "invalid-execution-result" }
  | { code: "execution-cancelled" }
  | { code: "record-invalid" }
  | { code: "record-conflict" }
  | { code: "reference-invalid" }
>;

type CheckUnavailableReason = Readonly<{
  code: string;
  checkIds?: readonly string[];
}>;

type CheckResult =
  | { status: "completed"; verdict: "passed" | "failed" }
  | { status: "not-applicable"; reason?: CheckNotApplicableReason }
  | { status: "unavailable"; reason: CheckDeclaredUnavailableReason };

type CheckOutcome =
  | { status: "completed"; verdict: "passed" | "failed" }
  | { status: "not-applicable"; reason?: CheckNotApplicableReason }
  | { status: "unavailable"; reason: CheckUnavailableReason };

type CheckExecution<Options extends object = object> = (
  this: void,
  context: CheckExecutionContext<Options>
) => CheckResult | Promise<CheckResult>;

type DeepReadonly<T> =
  T extends string | number | boolean | null ? T
    : T extends readonly (infer Item)[] ? readonly DeepReadonly<Item>[]
      : T extends object ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
        : never;

interface Check<Options extends object = object> {
  readonly checkId: string;
  readonly displayName: string;
  readonly recordTypes?: readonly RecordTypeDefinition[];
  readonly options?: Options;

  execution?(
    this: void,
    context: CheckExecutionContext<Options>
  ): CheckResult | Promise<CheckResult>;

  readonly checks?: readonly Check<object>[];
  readonly dependsOn?: InheritableCheckCollection<string>;
  readonly mutex?: InheritableCheckCollection<string>;
  readonly maxParallel?: number;
}
```

`CheckResult` is what a callback may return; `CheckOutcome` is the normalized final fact. Callback reasons use the closed `{ code: string }` envelope with a non-empty code. Product uses the exact `ProductCheckUnavailableReason` shapes when Product events create an unavailable outcome; only `prerequisite-unavailable` adds the direct `checkIds` needed to explain blocking. Default Checks use `external-dependency-unavailable`, `external-execution-failed` and `external-result-invalid`. The API does not treat a reason string as authority or provenance and does not reserve those spellings from project Checks.

The method signature on `Check` is intentionally shape-equivalent to `CheckExecution` rather than a function-valued property: the compiled prototype confirms this preserves heterogeneous recursive child assignability while `CheckExecution<Options>` remains available for standalone callback annotation. `this: void` and unbound invocation make execution a callback field, not a receiver/member protocol.

For an execution-bearing node, `recordTypes` omission and `recordTypes: []` both normalize to the same empty catalog. Product defaults keep their complete non-empty catalogs. A Record submitted to an omitted/empty catalog is rejected as `record-invalid`.

### Execution context and output ports

The context has exactly four top-level fields. Shared runtime values live under `project`; no source-specific `tools`, binding map or scheduler surface is added.

```ts
interface CheckExecutionContext<Options extends object> {
  readonly options: DeepReadonly<Options>;
  readonly project: CheckProjectContext;
  readonly records: CheckRecordReporter;
  readonly signal: AbortSignal;
}

interface CheckProjectContext {
  readonly root: string;
  readonly changedFiles: readonly string[];
  readonly files: Readonly<{
    codeAreas: ProjectQualityConfiguration["codeAreas"];
    excludeDirs: ProjectQualityConfiguration["excludeDirs"];
    generatedFiles: ProjectQualityConfiguration["generatedFiles"];
    include: ProjectQualityConfiguration["include"];
  }>;
  readonly comparison: Readonly<{
    referenceName: string;
    revision: string;
    root: string;
  }> | null;
  readonly cache: Readonly<{
    directory: string;
    enabled: boolean;
    reportActivity(activity: "failed" | "read" | "write"): void;
  }>;
}

interface CheckRecordReporter {
  report(candidate: QualityRecordCandidate): void;
  reportReference(candidate: CheckReferenceCandidate): void;
}

interface CheckReferenceCandidate {
  readonly referenceName: string;
  readonly status: "complete" | "incomplete" | "unavailable";
  readonly relations: readonly Readonly<{
    record: Pick<
      QualityRecordCandidate,
      "recordTypeId" | "semanticSubject" | "fields"
    >;
    relationId: string;
  }>[];
}
```

Rules:

1. Run validates controls, materializes the optional comparison once and freezes one context before callbacks run. `project.comparison.root` is the contractually read-only materialized reference tree and stays valid until all admitted Tasks settle; Run cleans it afterward. Comparison resolution/materialization failure is a pre-work planning result and creates no Check facts. Package-private pure input helpers may be shared, but Run does not pre-bind a Check implementation.
2. Default Check execution reads its current `options`; scanner executable and args are never looked up by `checkId`.
3. `records.report` binds ownership to the current Check and does not expose Core settle capability.
4. `records.reportReference` binds `checkId`. When the callback promise settles, Run closes the reporter and validates references before settling the Task: the current Check catalog plus each relation's `recordTypeId`, normalized `semanticSubject` and declared identity fields from `record.fields` compute the exact `recordId`. This supports multiple Records with the same type and subject. Unknown comparison names, relation IDs, malformed identities or uncommitted Records produce `reference-invalid`; later fact assembly only joins already validated exact ids.
5. Cache remains an invocation effect: Run owns effective configuration and status, while the Check that performs cache work reports activity.
6. Pre-work cancellation returns a Run cancellation without a synthetic Core snapshot. After Task admission, unresolved Checks close with `execution-cancelled` after admitted work drains.

For the invocation's single optional comparison, one Check may submit at most one reference candidate and its `referenceName` must equal `project.comparison.referenceName`. A candidate without a comparison or any second candidate is `reference-invalid`; relation duplicates coalesce and canonicalize. Only `status: "complete"` may carry relations—`incomplete` / `unavailable` require `relations: []`. If a selected policy requires reference evidence from a Check that submits none, policy facts use `unavailable` evidence rather than inventing a Check failure.

`QualityRecordCandidate` and the relation identity are ordinary data. A Check can keep one candidate value, pass it to `records.report(candidate)`, then reuse its identity fields in `reportReference`; no Record id, Core capability or special receipt object is authored by the Check.

```ts
const finding: QualityRecordCandidate = {
  recordTypeId: "line-budget",
  level: "warning",
  semanticSubject: "src/index.ts",
  message: "File exceeds the configured line budget",
  fields: { metric: "code-lines", value: 420 },
  location: { path: "src/index.ts", line: 1, column: 1 }
};

records.report(finding);
if (project.comparison !== null) {
  records.reportReference({
    referenceName: project.comparison.referenceName,
    status: "complete",
    relations: [{ record: finding, relationId: "regression" }]
  });
}
```

Reporter calls are accepted only while the execution promise is unsettled. A retained reporter called after closure throws synchronously and cannot change Records, outcome or Run result. For calls made in scope, the terminal adapter chooses one deterministic outcome: `record-conflict` outranks `record-invalid`, which outranks `reference-invalid`; otherwise it uses the callback's declared result or the applicable Product-owned execution reason. This preserves one outcome without merging distinct reason values.

Valid Records already accepted before a declared unavailable, throw or execution-phase cancellation remain facts, matching the current Core contract. A callback that returns `not-applicable` must have submitted no Records or reference candidates; otherwise the contradictory stream closes as `record-invalid` rather than publishing a not-applicable Check with findings.

### Run failure ownership

Check-local expected failures use `CheckOutcome`; failures that prevent or invalidate the invocation remain `RunResult` diagnostics. The migration uses this closed mapping:

| Target Run diagnostic | Boundary |
| --- | --- |
| `comparison-preparation-failed` | explicit comparison revision cannot resolve or materialize before Task work |
| `policy-validation-failed` | selected policy or reference requirement is invalid for the normalized executable catalog |
| `task-graph-invalid` | generic pre-work graph rejects duplicate Task id, missing dependency, cycle or invalid scope/cap |
| `progress-failed` | enabled progress effect fails before/during execution |
| `task-engine-failed` | an unexpected generic scheduler/integration invariant escapes contained Check mapping |
| `publication-model-failed` | completed facts cannot form the canonical publication model |

`builtin-preparation-failed`, `resolved-check-planning-failed`, `task-execution-failed` and `invalid-scanner-operational-input` leave the public vocabulary. Invalid scanner option shapes are `invalid-project-definition` diagnostics at their Check option path; unavailable executables and invalid scanner output are Check-declared unavailable results during that Check Task.

### `defineCheck` is a typing helper, not a constructor

The compiled prototype uses two overloads. `Options` is intentionally not a `const` type parameter: object shape remains concrete, while string/number settings widen enough for later native-spread overrides.

```ts
type EmptyCheckOptions = Readonly<Record<never, never>>;

type CheckWithOptions<Id extends string, Options extends object> =
  Omit<Check<Options>, "checkId" | "options"> & {
    readonly checkId: Id;
    readonly options: Options;
  };

type CheckWithoutOptions<Id extends string> =
  Omit<Check<EmptyCheckOptions>, "checkId" | "options"> & {
    readonly checkId: Id;
    readonly options?: never;
  };

function defineCheck<const Id extends string, Options extends object>(
  value: CheckWithOptions<Id, Options>
): CheckWithOptions<Id, Options>;

function defineCheck<const Id extends string>(
  value: CheckWithoutOptions<Id>
): CheckWithoutOptions<Id>;
```

The helper returns its input reference unchanged. It performs no runtime validation, freeze, defaulting, metadata attachment or branding. Runtime validation remains at Project Definition/Run pre-work.

The readiness compile prototype proves:

- standalone options infer into `context.options`;
- absent options yield an empty context with no readable arbitrary fields;
- root unknown fields and invalid result variants fail type checking;
- returned `checkId` and options shape remain usable;
- spreading a default Check and replacing an option value remains type-correct;
- heterogeneous recursive children are accepted.

An option-aware inline child that needs sibling-options contextual inference calls `defineCheck` at that child literal or uses `satisfies Check<ItsOptions>`. Children that are already typed Check values, and information-only inline objects, need no repeated wrapper. This is the verified boundary; the Plan does not promise circular inference across an arbitrary heterogeneous literal tree.

### Reference authoring shape

This is the implementation and documentation reference. `repositoryQuality` is an ordinary information-only object; only the option-aware child uses `defineCheck` for contextual inference. The child has both `execution` and `checks`, so it executes once and its children expand independently.

```ts
const sourceQuality = defineCheck({
  checkId: "source-quality",
  displayName: "Source quality",
  options: { minimumScore: 80 },

  async execution({ options, project, records, signal }) {
    const verdict = await inspectSource({
      minimumScore: options.minimumScore,
      root: project.root,
      records,
      signal
    });
    return { status: "completed", verdict };
  },

  checks: [fileMetrics, functionMetrics]
});

const repositoryQuality = {
  checkId: "repository-quality",
  displayName: "Repository quality",
  checks: [sourceQuality, duplicateDetection]
} satisfies Check;

const project = defineConfig({
  checks: [repositoryQuality]
});
```

Omitting `execution` does not create a virtual parent completion. Omitting `checks` does not make a leaf variant; it only ends traversal. Writing the same values as runtime plain objects is valid—`defineCheck` and `satisfies` only improve TypeScript authoring feedback.

### Recursive node semantics

| Authored node | Normalization/runtime result |
| --- | --- |
| `execution` only | emit one executable Check and one Task |
| `checks` only | pass inheritance and recurse; no parent runtime fact |
| both | emit parent executable Check and independently recurse |
| neither, or `checks: []` | accept; emit non-blocking meaningless-Check Definition warning only |

Containment creates no dependency, order, waiting, parent completion, aggregate outcome, Record copy or output hierarchy. An information-only `checkId` is presentation data, not a runtime identity or dependency alias; only execution-bearing nodes reach the Task graph, where duplicate Task ids are rejected.

`options` and `recordTypes` describe the current node's execution and therefore require `execution`; placing either on an information-only node fails closed instead of implying option inheritance or a non-existent Record owner. Scheduling fields remain legal on information-only nodes because they explicitly flow to descendants.

Validation returns warnings alongside the normalized valid Definition. Every `RunResult` has `definitionWarnings: readonly { code: "meaningless-check"; path: string; checkId: string }[]`; a Definition that fails blocking validation returns `[]` because no normalized warning set exists. The logs effect may render warnings from a valid Definition, but warnings never become Core Checks, Records, policy evidence or gate failures. This is the observable warning channel—`defineCheck` and `defineConfig` do not print or mutate values.

### Scheduling inheritance

Only `dependsOn` and `mutex` use `InheritableCheckCollection<T>`:

| Authored field | Effective collection |
| --- | --- |
| missing | parent effective collection; root base is `[]` |
| array, including `[]` | exact replacement; `[]` clears |
| `inherit({ add, remove })` | remove from parent, then add; add wins if the same value appears in both |

`inherit` accepts a closed object containing at least `add` or `remove`. Arrays may be empty; duplicate identities coalesce. Its result carries a package-private runtime marker so raw `{ add, remove }` is not another accepted spelling. The marker is removed during normalization.

```ts
// missing: inherit the parent exactly
const inherited = defineCheck({ ...fileMetrics });

// ordinary array: use this exact value instead of the parent
const exact = defineCheck({ ...fileMetrics, dependsOn: ["compile"] });
const cleared = defineCheck({ ...fileMetrics, dependsOn: [] });

// inherit helper: edit the parent value
const added = defineCheck({
  ...fileMetrics,
  dependsOn: inherit({ add: ["compile"] })
});
const removed = defineCheck({
  ...fileMetrics,
  dependsOn: inherit({ remove: ["legacy"] })
});
const edited = defineCheck({
  ...fileMetrics,
  dependsOn: inherit({ remove: ["legacy"], add: ["compile"] })
});
```

`maxParallel` uses the nearest explicit positive safe integer; root fallback is `scheduler.maxParallel`. `checks` and `options` do not inherit or merge.

Effective `dependsOn`/`mutex` collections are canonicalized for normalization and fingerprints. Canonical order does not create Task order.

### One executable Check becomes one Task

Before any callback runs, Product:

1. validates the entire recursive Check input;
2. traverses root-to-child and computes effective scheduling values;
3. emits one executable Check for each node with `execution`;
4. creates one generic Task with `id = checkId`, direct `dependsOn` and `mutex`;
5. creates a one-Task generic scope whose activation and terminal are that Task and whose cap is effective `maxParallel`;
6. validates the complete graph with `prepareTaskGraph`;
7. opens Core Check/Record scopes and executes the graph.

The generic graph rejects duplicate Task ids, unknown dependencies, dependency cycles and invalid scope/cap structure. Dependency strings resolve only against emitted Task ids; an information-only node contributes no target. If the same presentation `checkId` also appears on an executable node, the string identifies that executable Task and gains no relationship to the information node.

A completed quality `failed` and not-applicable outcome satisfy dependents. An unavailable outcome makes the scheduler Task fail with an internal contained signal, so generic dependency blocking prevents dependent callbacks while unrelated Tasks continue. Engine settlement values remain private.

For a dependency-blocked Check, `prerequisite-unavailable.checkIds` is the sorted, duplicate-free, non-empty set of its direct prerequisite Task ids that did not complete because of Check unavailability. Transitive cause remains available by following those Checks' own outcomes; Product does not invent a second dependency graph.

### Product default Check values and options

The three defaults are deeply readonly ordinary values with the same `Check<Options>` shape as project Checks. Their option contracts include public scanner configuration:

```ts
interface ScannerCommandOptions {
  readonly executable: string;
  readonly args: readonly string[];
  readonly availabilityArgs: readonly string[];
}

interface FileMetricsOptions {
  readonly scanner: ScannerCommandOptions;
  readonly codeLines: Readonly<{
    readonly absoluteFloor: number;
    readonly changedDelta: number;
    readonly lowDecisionTokenAllowance: Readonly<{
      readonly codeLineFloor: number;
      readonly maxDecisionTokens: number;
    }>;
  }>;
}

interface FunctionMetricsOptions {
  readonly scanner: ScannerCommandOptions;
  readonly codeLines: Readonly<{
    readonly absoluteFloor: number;
    readonly changedDelta: number;
    readonly lowComplexityAllowance: Readonly<{
      readonly codeLineFloor: number;
      readonly maxCyclomaticComplexityExclusive: number;
    }>;
  }>;
  readonly cyclomaticComplexity: Readonly<{
    readonly absoluteFloor: number;
    readonly changedDelta: number;
  }>;
  readonly parameterCount: Readonly<{
    readonly absoluteFloor: number;
    readonly changedDelta: number;
  }>;
}

interface DuplicateDetectionOptions {
  readonly scanner: ScannerCommandOptions & Readonly<{
    readonly maxConcurrency: number;
  }>;
  readonly defaultMinimumTokens: number;
  readonly fragments: { readonly changedDelta: number };
  readonly minimumTokensByCodeArea: Readonly<Record<string, number>>;
}
```

The complete defaults are fixed migration data:

| Check | Scanner default | Semantic defaults |
| --- | --- | --- |
| `fileMetrics` | `executable: "scc"`, `args: []`, `availabilityArgs: ["--version"]` | code lines `absoluteFloor: 300`, `changedDelta: 80`; low-decision-token allowance `codeLineFloor: 500`, `maxDecisionTokens: 10` |
| `functionMetrics` | `executable: "python"`, `args: ["-m", "lizard"]`, `availabilityArgs: ["-m", "lizard", "--version"]` | code lines `absoluteFloor: 50`, `changedDelta: 20`; low-complexity allowance `codeLineFloor: 150`, `maxCyclomaticComplexityExclusive: 5`; cyclomatic complexity `absoluteFloor: 10`, `changedDelta: 5`; parameter count `absoluteFloor: 5`, `changedDelta: 2` |
| `duplicateDetection` | `executable: "jscpd"`, `args: []`, `availabilityArgs: ["--version"]`, `maxConcurrency: 4` | `defaultMinimumTokens: 75`, fragment `changedDelta: 1`, empty per-code-area override map |

All option objects are recursively closed. Scanner executable must be non-empty, args must be string arrays and `maxConcurrency` must be a positive safe integer; existing finite-number and configured-code-area validation remains unchanged for semantic fields.

The adapter continues to own process invocation, fixed protocol, parser, scoped-input validation and safe failure mapping. Public scanner fields do not expose raw output or turn adapters into plugins.

Customization uses ordinary shallow-copy semantics:

```ts
const strictFileMetrics = defineCheck({
  ...fileMetrics,
  options: {
    ...fileMetrics.options,
    scanner: {
      ...fileMetrics.options.scanner,
      executable: "/opt/tools/scc"
    },
    codeLines: {
      ...fileMetrics.options.codeLines,
      absoluteFloor: 250
    }
  }
});
```

Replacing a nested branch does not restore omitted members. Definition validates the final complete object. No `replace`, `append`, partial patch or default materializer remains.

### Deterministic fingerprints

- execution functions, reporter functions, signals and cache callbacks never enter declarative fingerprints or output;
- effective set-like scheduling values and executable Check projection use canonical order;
- `recordTypes` is normalized before catalog fingerprinting and Core registration;
- all Check `options` must be recursively plain JSON-compatible data; functions, symbols, cycles and non-plain instances fail Definition validation;
- normalized option data, including executable selection, affects the Project declarative fingerprint through canonical bytes, while raw option values are not copied into Core or machine output;
- Record catalog fingerprints continue to depend only on normalized Check/record declarations, not execution functions or runtime effects.

### Final public inventory

Runtime functions:

- `defineConfig`
- `defineCheck`
- `inherit`
- `run`

Runtime values:

- `duplicateDetection`
- `fileMetrics`
- `functionMetrics`

Named public type roots:

- authoring: `Check`, `CheckExecution`, `CheckExecutionContext`, `InheritableCheckCollection`;
- Check facts: `CheckResult`, `CheckOutcome`, `CheckUnavailableReason`;
- Records: `QualityRecordCandidate`, `RecordTypeDefinition`;
- project/run: `ProjectDefinition`, `ProjectEffects`, `ProjectQualityConfiguration`, `SchedulerPolicy`, `DecisionPolicy`, `RunControls`, `RunResult`;
- defaults: `DuplicateDetectionOptions`, `FileMetricsOptions`, `FunctionMetricsOptions`.

Supporting reason/context/reporter types may appear in declarations but are not additional runtime exports. Removed names include `BuiltInCheck`, `CustomCheck`, `CheckGroup`, `CheckNode`, `CheckPlanningContext`, `TaskPlan`, TaskPlan factory/leaf/completion types, operational dependency types and every adjustment/patch type.

### Test evidence map

The starting full-tree gate passed with 160 current Bun entities mapped by 38 Cases. Implementation updates the existing Cases according to semantic continuity; it does not create a parallel Change-only ledger.

| Target behavior | Current Case evidence | Required migration evidence |
| --- | --- | --- |
| recursive authoring, defaults, validation and public inventory | `WB-PROJECT-DEFINITION-001` | replace group/source/adjustment assertions with one Check, helper/plain-object/native-spread/empty warning assertions |
| deterministic Definition -> Run resolution | `WB-RUNTIME-CHECK-CATALOG-001` | prove functions stay outside fingerprints while normalized executable Checks/options drive one planning input |
| one Task per Check, dependency/mutex/cancellation | `WB-RUNTIME-CHECK-ORCHESTRATION-001` | remove TaskPlan/group expansion evidence; prove direct Task passthrough, not-applicable and unavailable blocking |
| active `maxParallel` | `CHECK-SCOPED-CONCURRENCY-001` | retain generic engine evidence; add Product projection for one-Task scopes |
| completed/not-applicable/unavailable lifecycle | `WB-RUNTIME-CHECK-LIFECYCLE-001`, `WB-RUNTIME-CHECK-FAILURE-001` | prove Check-declared and each Product-generated reason without premature merging |
| Record and reference reporter | `WB-RUNTIME-RECORD-MANAGER-001`, `WB-POLICY-RUNTIME-001` | prove Check ownership, closed-reporter behavior, invalid/conflicting submissions, complete Record identity resolution, reference candidate validation and retained Records |
| catalog/fingerprint/output | `WB-RUNTIME-CHECK-RECORD-001`, `WB-RUNTIME-CHECKPOINT-001`, `WB-OUTPUT-MACHINE-V3-CONTRACT-001` | prove omitted catalog normalization, canonical fingerprints and new reason vocabulary across Core/output |
| scanner options and exact input | `WB-SCANNER-DEPENDENCY-RESOLUTION-001`, three `WB-SCANNER-*-CHECK-001` Cases, `AUX-CURRENT-SCANNER-EVIDENCE-001` | retire precedence-map Case; preserve adapter protocol and prove native executable override reaches execution |
| cache | `AUX-QUALITY-CACHE-001`, duplicate Check Case | preserve cache identity/revalidation while cache effect arrives through project context |
| repository integration | `AUX-QUALITY-DOGFOOD-001` | migrate bound Project Definition to ordinary tree/native spread/Check-owned scanner options |

Before changing test entities, bodies, Owners or Proves, run `bun run test-evidence:check`; after migration, run the narrow tests and the same full-tree closure.

### Migration acceptance map

| Owner | Artifact to change | Acceptance evidence |
| --- | --- | --- |
| Definition | `src/product/definition/**` | type fixtures + `project.test.ts`; focused search has one Check shape and no adjustment files/exports |
| Run/Task | `src/product/run/**`, unchanged generic engine | Run tests + scheduler tests; one executable Check -> one Task; graph rejected before work |
| Core/records/reference | `src/product/quality-core/**` | Core/session/policy/output tests preserve facts and distinct reasons |
| Scanner dependencies | default Check options and scanner adapters | scanner/default tests; no Project/Run dependency map or environment precedence owner |
| Public inventory | `src/product/public-contract/**` and public entry | exact value/function/type inventory test; removed symbols cannot import |
| Stable docs/decisions | configuration, architecture, metrics, scanner, output and active decisions | `bun run decisions:check`, docs validation and focused stale-term search |
| Examples/schemas | reference TypeScript examples and v3 machine materials if reason vocabulary changes | independent docs/schema/example validation |
| Test ledger | affected Case files | target tests + `bun run test-evidence:check` |
| Dogfood | `scripts/quality/project-definition.ts` and project-run test | repository aliases invoke the migrated bound Run |
| Package handoff | `changes/establish-api-only-npm-product-boundary/` | downstream Plan consumes `defineConfig`/`defineCheck`/`inherit`/`run`, ordinary default values and native spread; no `BuiltInCheck`/`replace`/`append`/operational map |

## Risks / Trade-offs

- **Nested TypeScript inference is deliberately bounded.** One heterogeneous object tree cannot reliably infer every sibling options type through a single identity generic. Option-aware literals use `defineCheck` or `satisfies Check<Options>` at that literal; runtime plain-object support remains unchanged.
- **Reference evidence adds one reporter method.** This is the minimum generic port that removes the post-execution built-in lookup without adding another execution phase.
- **Default scanner strings may be unavailable.** Complete default options are still valid objects; missing external prerequisites produce Check-declared unavailable and can be overridden by native spread.
- **Native nested spread is verbose.** The verbosity is accepted in exchange for language-defined shallow-copy semantics and removal of Product-owned merge rules.
- **Reason vocabulary expands before it can shrink.** Distinct ownership and recovery are preserved first; later consolidation requires evidence that meaning and consumer behavior are equivalent.
- **Source deletion is broad but bounded.** Definition, Run, Core, scanner owner, tests, docs and package planning must move together; the migration map and full verifier close this risk.

## Open Questions

无。Readiness 已通过 current-source、test-evidence、TypeScript prototype、inheritance、public inventory 与 downstream handoff 审计；Implementation 从 task 1.1 开始。
